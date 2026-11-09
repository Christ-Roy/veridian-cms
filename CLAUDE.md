# veridian-cms : CMS Payload (cms.veridian.site)

Dépôt public. Le CI (`.github/workflows/ci.yml`) tourne sur `main`, et le job Deploy déploie le CMS en prod
(canari, bascule bleu-vert, `auto_revert`) à chaque push sur `main` hors `paths-ignore`.

## Source de déploiement

- **Source canonique : `deploy/cms.nomad.hcl`** (branche `main`). `nomad-veridian` ne porte plus de copie du CMS
  (`jobs/SOURCES.tsv`). Toute modification du job passe par ce fichier.
- Image : `ghcr.io/christ-roy/veridian-cms:<tag>`. Le CI injecte `image_tag` ; le défaut du fichier suit la version
  vivante (mesurée avant chaque changement de défaut).
- Base : **pg-saas**, entrée fixe `172.26.64.1:15432`, base `veridian_cms`, rôle `cms`. Le mot de passe vient de la
  variable Nomad `nomad/jobs/cms` (`PG_SAAS_PASSWORD`), posé par `~/nomad-veridian/scripts/var-poser-cle.py`.
  Ne jamais lire ce secret : on en pose un neuf.
- Pas de base dans le job (`cms-db` retiré le 09/11/2026). L'invariant `scripts/ci/check-prod-gitops-reliability.sh`
  refuse un Postgres embarqué ou un retour à `cms-postgres`.

## Vérifier avant de pousser

- `bash scripts/ci/check-prod-gitops-reliability.sh` (rc 0 attendu).
- Un changement de base ou d'image se teste sur une copie avant : base de test dans pg-saas, conteneur `docker run --rm`
  au premier plan (un `docker run -d` est arrêté par le contrôle du control plane).
- Après la bascule : sonde à la seconde depuis rise (jamais depuis le bastion), parcours réel (page, admin, écriture relue en base).

## Pièges

- `PAYLOAD_DB_PUSH=true` au démarrage : Payload pousse le schéma. Vérifier le schéma avant/après sur une copie.
- Changer les tags Traefik d'un job en canari retire la route (404) : ne pas toucher aux tags dans un déploiement ordinaire.
- Les hooks `triggerSiteRebuild` (Pages, Products, Partners, Header, Footer) déclenchent un rebuild Cloudflare par tenant.
  Un test d'écriture doit cibler une collection sans hook (ex. `redirects`).
- Admin : compte `claude-bot` pour les tests de prod ; son mot de passe est remis à l'état initial après chaque test.
