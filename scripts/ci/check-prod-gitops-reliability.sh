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

# Le plan Nomad retourne 0 sans remplacement, 1 avec remplacement et 255 sur
# erreur. Le workflow accepte 0/1 mais ne doit jamais masquer le reste.
require_fixed "$ci" 'PLAN_STATUS=$?' 'code retour du plan Nomad non capturé'
require_fixed "$ci" '1) echo "plan avec remplacement' 'remplacement Nomad normal non accepté'
require_fixed "$ci" '*) echo "::error::nomad job plan a échoué' 'erreur de plan Nomad non bloquante'
reject_fixed "$ci" 'nomad job plan -var "image_tag=${IMAGE_TAG}" "$REMOTE_HCL" || true' 'erreur de plan Nomad masquée'
require_fixed "$ci" 'RUN_INDEX_ARGS=(-check-index "$MODIFY_INDEX")' 'protection TOCTOU check-index absente'
require_fixed "$ci" '/home/brunon5/all-cron/backups/prod-r2-backup.sh' 'backup R2 pré-déploiement absent'
reject_fixed "$ci" 'continue-on-error: true  # lint' 'lint prod encore autorisé à échouer'
reject_fixed "$staging" 'nomad job plan -var "image_tag=${IMAGE_TAG}" "$REMOTE_HCL" || true' 'erreur de plan staging masquée'
require_fixed "$staging" 'PLAN_STATUS=$?' 'code retour du plan staging non capturé'
require_fixed "$staging" 'RUN_INDEX_ARGS=(-check-index "$MODIFY_INDEX")' 'protection check-index staging absente'
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
reject_fixed "$trivyignore" 'CVE-2026-33671' 'ancienne exception picomatch encore présente'

plan_line=$(grep -nF 'PLAN_OUTPUT=$(/usr/bin/nomad job plan' "$ci" | cut -d: -f1)
backup_line=$(grep -nF '/home/brunon5/all-cron/backups/prod-r2-backup.sh' "$ci" | cut -d: -f1)
run_line=$(grep -nF 'EVAL=$(/usr/bin/nomad job run' "$ci" | cut -d: -f1)
[ "$plan_line" -lt "$backup_line" ] || fail 'backup lancé avant validation du plan'
[ "$backup_line" -lt "$run_line" ] || fail 'backup non bloquant avant nomad job run'

# Le rollback choisit une version stable, puis exige les deux identifiants Nomad
# au lieu de valider sur la simple santé de l'ancienne allocation.
require_fixed "$rollback" 'select(.Stable == true and .Version < $current)' 'rollback non limité aux versions stables'
require_fixed "$rollback" 'rollback soumis sans Evaluation ID' 'Evaluation ID de rollback non obligatoire'
require_fixed "$rollback" 'rollback sans Deployment ID après 30s' 'Deployment ID de rollback non obligatoire'

fixture='[{"Version":16,"Stable":true},{"Version":15,"Stable":false},{"Version":14,"Stable":true},{"Version":13,"Stable":true}]'
selected=$(printf '%s' "$fixture" | jq -r --argjson current 16 \
  '[.[] | select(.Stable == true and .Version < $current) | .Version] | max // empty')
[ "$selected" = 14 ] || fail "sélection version stable invalide: $selected"

# La PR de revert doit propager le bon nom de variable et échouer franchement si
# la création ou l'auto-merge ne fonctionne pas.
require_fixed "$revert" 'REVERT_BRANCH=$BRANCH' 'branche de revert non propagée'
require_fixed "$revert" '--head "$REVERT_BRANCH"' 'PR de revert créée depuis une variable invalide'
reject_fixed "$revert" '$revert_branch' 'ancienne variable de branche invalide encore présente'
reject_fixed "$revert" 'gh pr merge --auto --squash --delete-branch "$revert_branch" || true' 'échec auto-merge masqué'

bash "$root/scripts/ci/test-check-staging-fresh.sh"

echo 'OK: invariants GitOps CMS prod et rollback fail-closed'
