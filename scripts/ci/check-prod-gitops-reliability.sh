#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
hcl="$root/deploy/cms.nomad.hcl"
staging_hcl="$root/deploy/cms-staging.nomad.hcl"
ci="$root/.github/workflows/ci.yml"
staging="$root/.github/workflows/cms-staging.yml"
dockerfile="$root/Dockerfile"
trivyignore="$root/.trivyignore.yaml"
rollback="$root/.github/workflows/emergency-rollback.yml"
revert="$root/.github/workflows/emergency-revert.yml"

fail() {
  printf 'ERREUR GitOps prod: %s\n' "$*" >&2
  exit 1
}

require_fixed() {
  local file="$1" needle="$2" label="$3"
  grep -Fq -- "$needle" "$file" || fail "$label"
}

reject_fixed() {
  local file="$1" needle="$2" label="$3"
  if grep -Fq -- "$needle" "$file"; then
    fail "$label"
  fi
}

# Invariants du job prod live: priorité, redémarrage borné, self-heal applicatif,
# init anti-zombies et réservation réaliste avec plafond de burst conservé.
require_fixed "$hcl" 'priority    = 80' 'priorité Nomad prod absente'
require_fixed "$hcl" 'attempts = 10' 'restart Nomad prod non borné ou absent'
require_fixed "$hcl" 'name     = "cms-selfheal"' 'service self-heal absent'
require_fixed "$hcl" 'limit           = 4' 'check_restart applicatif absent'
require_fixed "$hcl" 'init  = true' 'init Docker anti-zombies absent'
require_fixed "$hcl" 'memory     = 384' 'réservation mémoire app inattendue'
require_fixed "$hcl" 'memory_max = 7000' 'plafond mémoire app absent'

# Le HCL de test doit conserver les propriétés prouvées du staging canonique.
# Sans elles, tester une branche feature peut silencieusement dégrader le banc.
require_fixed "$staging_hcl" 'static       = 19094' 'port stable Sablier staging absent'
require_fixed "$staging_hcl" 'name     = "cms-staging-selfheal"' 'self-heal staging absent'
require_fixed "$staging_hcl" 'init  = true' 'init anti-zombies staging absent'
require_fixed "$staging_hcl" 'memory     = 128' 'réservation mémoire staging régressée'

# Constat C4 (~/veridian/secrets-migration/C4-CONTRAT-CI.md) : la clé de
# déploiement du CMS porte désormais une commande forcée sur le bastion
# (`command="/usr/local/sbin/veridian-ci-deploy cms"`). Elle n'ouvre plus de
# shell, donc aucun workflow ne doit plus envoyer de heredoc, sourcer le fichier
# de credentials du bastion ou appeler nomad directement. Le plan, son code
# retour, le pré-pull authentifié, le -check-index anti-TOCTOU et le suivi du
# DeploymentID sont maintenant garantis côté serveur, où le client de CI ne peut
# plus les contourner. Ces invariants-ci verrouillent donc la FORME de l'appel.
for wf in "$ci" "$staging" "$rollback"; do
  reject_fixed "$wf" "bash -s" "heredoc shell distant encore présent dans $(basename "$wf")"
  reject_fixed "$wf" 'source ~/credentials/nomad-bastion.env' "credentials bastion encore sourcés depuis $(basename "$wf")"
  reject_fixed "$wf" '/usr/bin/nomad' "appel direct à nomad encore présent dans $(basename "$wf")"
  reject_fixed "$wf" 'NOMAD_MGMT_TOKEN' "jeton management Nomad encore manipulé dans $(basename "$wf")"
  require_fixed "$wf" '-o BatchMode=yes' "BatchMode absent de $(basename "$wf") (clé en no-pty)"
  require_fixed "$wf" 'ssh-keyscan -T 15 -H' "ssh-keyscan durci absent de $(basename "$wf")"
  require_fixed "$wf" 'shred -u ~/.ssh/id_ed25519' "clé SSH non effacée du runner dans $(basename "$wf")"
done

# Verbes attendus, tier par tier. Le tier est explicite dans l'appel : un
# workflow prod ne doit jamais pouvoir viser staging et réciproquement.
require_fixed "$ci" '"put-job prod" < "$JOB_FILE"' 'HCL prod non transmis par le verbe put-job'
require_fixed "$ci" '"deploy prod ${IMAGE_TAG}"' 'déploiement prod non passé par le verbe deploy'
require_fixed "$ci" '"cleanup prod"' 'nettoyage prod non passé par le verbe cleanup'
reject_fixed "$ci" '"put-job staging"' 'workflow prod ne doit pas déposer un HCL de staging'
reject_fixed "$ci" '"deploy staging' 'workflow prod ne doit pas déclencher un déploiement staging'
reject_fixed "$staging" '"deploy prod' 'workflow staging ne doit pas déclencher un déploiement prod'
reject_fixed "$ci" 'continue-on-error: true  # lint' 'lint prod encore autorisé à échouer'
require_fixed "$staging" '"put-job staging" < "$JOB_FILE"' 'HCL staging non transmis par le verbe put-job'
require_fixed "$staging" '"deploy staging ${IMAGE_TAG}"' 'déploiement staging non passé par le verbe deploy'
require_fixed "$staging" '"cleanup staging"' 'nettoyage staging non passé par le verbe cleanup'
reject_fixed "$staging" 'continue-on-error: true' 'preuve staging encore autorisée à échouer'
require_fixed "$staging" 'docker/setup-buildx-action@v4' 'action buildx staging obsolète'
require_fixed "$staging" 'docker/login-action@v4' 'action login staging obsolète'
require_fixed "$staging" 'nick-fields/retry@v4' 'action retry staging obsolète'
require_fixed "$staging" 'tailscale/github-action@v4' 'action Tailscale staging obsolète'

# Le runner exécute directement node server.js : npm et corepack n'ont aucune
# raison de rester dans l'image exposée et leurs CVE ne doivent pas être ignorées.
require_fixed "$dockerfile" '/usr/local/lib/node_modules/npm' 'suppression npm runtime absente'
require_fixed "$dockerfile" 'test ! -e /usr/local/lib/node_modules/corepack' 'assertion corepack runtime absente'
require_fixed "$dockerfile" '/sharp-libvips' 'copie libvips Sharp runtime absente'
require_fixed "$dockerfile" 'ENV LD_LIBRARY_PATH=/usr/local/lib/sharp' 'chemin linker libvips absent'
require_fixed "$ci" 'Sharp runtime smoke' 'smoke Sharp image prod absent'
require_fixed "$staging" 'Sharp runtime smoke' 'smoke Sharp image staging absent'
require_fixed "$staging" 'tags: tag:ci-github' 'tag Tailscale CI canonique absent'
reject_fixed "$staging" 'tags: tag:ci$' 'ancien tag Tailscale tag:ci encore présent'
reject_fixed "$trivyignore" 'CVE-2026-33671' 'ancienne exception picomatch encore présente'

# Le rollback passe par le verbe `revert prod`. La sélection de la dernière
# version STABLE antérieure, l'exigence d'un Evaluation ID et le suivi du
# déploiement sont dans /usr/local/sbin/veridian-ci-deploy : le verbe sort non
# nul si l'une de ces conditions manque. Ce qui reste vérifiable ici, c'est que
# le workflow appelle bien le verbe et garde son contrôle de santé publique.
require_fixed "$rollback" '"revert prod"' 'rollback prod non passé par le verbe revert'
require_fixed "$rollback" 'Rollback health failed after 3min' 'contrôle de santé post-rollback absent'

# ⚠️ Deux garanties du contrat serveur manquent aujourd'hui pour cms:prod et
# sont suivies hors de ce script, dans le rapport de migration C4 :
#   - aucun PREHOOK de sauvegarde R2 n'est déclaré pour cms:prod alors que le
#     job est stateful (PostgreSQL co-localisé). L'ancien gate de backup
#     bloquant avant run n'a pas d'équivalent côté bastion.
#   - le verbe `revert` traite l'absence de DeploymentID comme un no-op, là où
#     ce workflow en faisait une erreur. Le contrôle de santé ci-dessus reste
#     le filet.

# La PR de revert doit propager le bon nom de variable et échouer franchement si
# la création ou l'auto-merge ne fonctionne pas.
require_fixed "$revert" 'REVERT_BRANCH=$BRANCH' 'branche de revert non propagée'
require_fixed "$revert" '--head "$REVERT_BRANCH"' 'PR de revert créée depuis une variable invalide'
reject_fixed "$revert" '$revert_branch' 'ancienne variable de branche invalide encore présente'
reject_fixed "$revert" 'gh pr merge --auto --squash --delete-branch "$revert_branch" || true' 'échec auto-merge masqué'

bash "$root/scripts/ci/test-check-staging-fresh.sh"

echo 'OK: invariants GitOps CMS prod, verbes contraints du bastion et rollback fail-closed'
