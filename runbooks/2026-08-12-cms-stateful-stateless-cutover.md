# Cutover CMS stateful/stateless pour rightsizing sûr

## Résultat visé

Séparer le CMS prod en deux jobs Nomad :

- `cms-state` : Postgres, volume local `/opt/veridian-lab/cms/pgdata`, épinglé `ovh-prod`, reschedule désactivé.
- `cms` : app Payload seule, connexion DB via service discovery Nomad.

Objectif : un changement d'image ou de ressources Payload ne doit plus redémarrer PostgreSQL. Ce n'est pas encore une HA multi-nœud : les médias Payload restent montés depuis `/opt/veridian-lab/cms/media`.

## Préconditions

1. Dernière preuve backup complète et répliquée < 26 h.
2. `nomad-v doctor`, `nomad-v state`, `nomad-v free`, `nomad-v drift` lus.
3. `nomad job validate deploy/cms-state.nomad.hcl` et `nomad job validate -var image_tag=<tag> deploy/cms.nomad.hcl` OK.
4. `bash scripts/ci/check-cms-state-split.sh` OK.
5. Fenêtre de maintenance acceptée : la première bascule stoppe l'ancien group monolithique pour éviter deux Postgres sur le même volume.

## Cutover exact

Ne jamais lancer `cms-state` pendant que l'ancien job `cms` monolithique tourne encore avec sa task `postgres`.

1. Capturer l'état live : `nomad-v job cms` et `curl -fsS https://cms.veridian.site/api/health`.
2. Vérifier le backup restaurable, ou lancer/attendre une preuve backup avant de continuer.
3. Committer `deploy/cms-state.nomad.hcl`, `deploy/cms.nomad.hcl` et les garde-fous CI.
4. `nomad-v plan deploy/cms-state.nomad.hcl`, relire qu'il crée seulement `cms-state`.
5. Stop contrôlé de l'ancien monolithe pendant la fenêtre : `nomad-v stop cms`.
6. `nomad-v deploy deploy/cms-state.nomad.hcl`.
7. Attendre `cms-postgres` healthy dans `nomad-v job cms-state`.
8. `nomad-v plan deploy/cms.nomad.hcl`, avec le tag image prod courant, relire qu'il crée seulement l'app `cms`.
9. `nomad-v deploy deploy/cms.nomad.hcl`.
10. Surveiller : `nomad-v job cms`, logs app, `curl -fsS https://cms.veridian.site/api/health`, `/admin`, API tenants avec clé admin.
11. `nomad-v drift` doit redevenir explicable ou clean.

## Rollback exact

1. `nomad-v stop cms`.
2. `nomad-v stop cms-state`.
3. Revenir au HCL monolithique précédent de `cms`.
4. `nomad-v plan deploy/cms.nomad.hcl`.
5. `nomad-v deploy deploy/cms.nomad.hcl`.
6. Vérifier `/api/health`, `/admin`, API tenants. Si le volume DB a été corrompu, restaurer depuis le backup validé.

## Dette restante

Pour rendre l'app CMS vraiment stateless et reschedulable, migrer `/app/media` vers un stockage objet ou un volume CSI portable. Tant que ce n'est pas fait, le job applicatif reste épinglé `ovh-prod` et `reschedule` reste désactivé.
