# Liens vers le monorepo veridian-platform

> Ce repo a été extrait de `Christ-Roy/veridian-platform` le 2026-05-13.
> L'historique git du CMS est préservé (65 commits depuis l'init du monorepo).
> Les autres apps Veridian (analytics, twenty, sites clients) restent dans le
> monorepo. Hub, Prospection, Notifuse ont aussi été extraits (Christ-Roy/veridian-hub,
> Christ-Roy/veridian-prospection, Christ-Roy/notifuse-deploy).

## Quand consulter le monorepo

| Tu cherches… | Va voir là-bas |
|---|---|
| Backlog stratégique cross-apps, ordre des sprints | `veridian-platform/todo/TODO-LIVE.md` |
| Vision globale plateforme, architecture cross-apps | `veridian-platform/CLAUDE.md` |
| Doc d'une autre app (analytics, twenty…) | `veridian-platform/todo/apps/<app>/TODO.md` |
| Sprint GitOps (référence transverse) | `~/Bureau/SPRINT-GITOPS-VERIDIAN.md` (local) |
| Standards CI/CD partagés (futur) | `veridian-platform/runbooks/standards/` |
| Pattern blue-green Veridian | mémoire `project_blue_green_pattern` |

Worktree local du monorepo (read-only par convention) :
`~/Bureau/veridian-platform-main/`

## Inter-app communication (rappel)

Le CMS expose ses tenants via API publique :
`https://cms.veridian.site/api/tenants` (auth via API key).

Les sites clients consomment le CMS via leur ISR / build-time fetch.
Pas de container-to-container interne — toujours via URL publique.

Si tu touches une route que Hub ou un autre service consomme, ping
le team lead de l'app concernée.

## Ne pas copier de code entre les deux repos

- Si une feature CMS demande un changement dans Hub / Analytics / etc.,
  c'est au team lead de l'app concernée de le faire dans le monorepo
  (ou son repo standalone si extraite).
- Si un standard CI doit être partagé (ex : workflow `_audit-cve.yml`
  qu'on a dupliqué ici), maintenir la version monorepo et **importer**
  depuis un fork local de temps en temps. Pas de symlink, pas de submodule.

## Sécurité — secrets cloisonnés

Les secrets GitHub Actions sont **par repo**. veridian-cms a sa propre
copie de :
- `DEPLOY_SSH_KEY` (clé SSH OVH — pour le deploy bypass legacy, désactivé
  depuis Dokploy GitOps)
- `CMS_E2E_ADMIN_PASSWORD` (admin password pour E2E Playwright)
- `CMS_ADMIN_API_KEY_PROD` (API key tenants-listing smoke test)
- `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` (alerts smoke prod, désactivés depuis Dokploy)

Si la clé SSH OVH est rotée, il faut mettre à jour les autres repos
extraits aussi (veridian-hub, veridian-prospection, notifuse-deploy).

## Pattern de déploiement (cluster Nomad, depuis 2026-07-10)

> ⚠️ Le pattern Dokploy GitOps (2026-05-13 → 2026-07-10) est OBSOLÈTE : Dokploy a
> été décommissionné le 2026-07-10, remplacé par le cluster HashiCorp Nomad
> Veridian. Déploiement = `nomad-v` (skill /nomad).

```
push main → build image GHCR → nomad-v deploy <job cms>
                                        ↓
                              Nomad reschedule l'alloc du job CMS
                              (IaC : ~/nomad-veridian/jobs/<tier>/, sur le bastion)
```

CI sur ce repo (`.github/workflows/ci.yml`) :
- ✅ Active : static (tsc), audit (CVE high/critical), int (vitest), build (GHCR), e2e (Playwright)
- ❌ Désactivée : deploy (piloté par `nomad-v` hors CI), smoke (idem)
