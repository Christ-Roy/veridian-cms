# Prochaine session — Migration Prod + CI/CD + E2E

> **Pose de bases le 2026-04-24 soir.** À exécuter dans cet ordre strict la
> prochaine session. Chaque phase a ses **prérequis**, son **rollback**,
> et ses **checks de validation**.

## 🎯 Objectifs

1. Migrer le CMS de **staging (dev-server)** vers **prod (OVH Dokploy)** sur `cms.veridian.site`
2. CI/CD complète avec **tests E2E Playwright headful** (pas headless — comme prospection)
3. Pipeline **anti-flaky** avec retry, concurrency cancel-in-progress, seeds idempotents
4. Couverture **pixel-perfect** des parcours critiques (login admin, édit page, publish → site mis à jour)

## 📐 Architecture cible prod

```
GitHub (push main → cms/**)
  │
  ├─[1. UNIT]─ lint + typecheck + vitest unit (~60s)
  ├─[2. BUILD]─ docker build + push GHCR (~2min)
  ├─[3. E2E]─ Playwright headful sur runner self-hosted (~5min)
  │         ├── login admin → page load → créer page → publish
  │         ├── fetch API avec clé scopée → vérif isolation
  │         └── build site artisan → vérif contenu rendu
  ├─[4. DEPLOY]─ SSH OVH → Dokploy pull + migrate + up → health check (~1min)
  └─[5. SMOKE]─ curl cms.veridian.site/admin (200) + /api/health (200)

TOTAL : ~10 min push → prod verte.
```

## 📦 Phase 1 — Préparer l'env prod (45 min)

### 1.1 DNS + Traefik Dokploy

```bash
# DNS CNAME cms.veridian.site → OVH
source ~/credentials/.all-creds.env
curl -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"A","name":"cms","content":"51.210.7.44","proxied":true}'
```

### 1.2 Postgres prod dédié

Dans Dokploy OVH → créer nouveau service Postgres `cms-postgres-prod` :
- Image : `postgres:16-alpine`
- Volume persistent : `cms-pgdata-prod`
- Backup auto **quotidien** vers R2 via Dokploy Scheduled Jobs
- Vars : `POSTGRES_USER`, `POSTGRES_PASSWORD` (32 chars), `POSTGRES_DB=veridian_cms`

### 1.3 Service CMS via Dokploy

Créer `cms.veridian.site` service Dokploy :
- **Source** : GitHub `Christ-Roy/veridian-platform`, branche `main`, root `cms/`
- **Build** : Dockerfile (déjà existant)
- **Env vars** (secrets Dokploy) :
  - `DATABASE_URL` → vers le Postgres prod
  - `PAYLOAD_SECRET` → nouveau 64 chars hex (**pas** celui de staging)
  - `SERVER_URL=https://cms.veridian.site`
  - SMTP Brevo (idem staging)
  - `GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_WORKFLOW` (pour hook rebuild)
- **Labels Traefik** : `cms.veridian.site` + certresolver letsencrypt
- **Restart** : `unless-stopped`
- **Health check** : `GET /api/health` (à créer côté Payload)

### 1.4 Migration initiale + seed super-admin

```bash
# Sur OVH après premier deploy
ssh prod-pub
cd /etc/dokploy/compose/<cms-compose-id>/code/cms
set -a; source .env; set +a
pnpm payload migrate
# Créer le bot admin depuis sur l'host (pas dans container car DNS)
pnpm tsx scripts/create-admin-api-key.ts
```

### 1.5 Storage R2 pour médias (optionnel mais recommandé)

Éviter l'explosion disque VPS (déjà 72%). Ajouter `@payloadcms/storage-s3` dans
`payload.config.ts` conditionné à `process.env.S3_BUCKET`. Config R2 déjà sur
le compte CF.

## 📦 Phase 2 — Workflow CI/CD `cms-ci.yml` (30 min)

Voir fichier `.github/workflows/cms-ci.yml` (squelette posé en §6 de ce doc).

### Architecture en 5 couches (copié sur prospection)

| Couche | Temps max | Bloquant ? | Contenu |
|---|---|---|---|
| **unit** | 60s | ✅ oui | tsc --noEmit + eslint + vitest unit (si on ajoute des tests) |
| **build** | 2min | ✅ oui | docker build + push GHCR |
| **e2e** | 5min | ✅ oui | Playwright headful sur runner self-hosted |
| **deploy** | 1min | ✅ oui | SSH Dokploy → pull + migrate + up --build |
| **smoke** | 30s | ❌ warn | curl health checks |

### Gates anti-flaky

- `concurrency: ci-cms-${{ github.ref }}` + `cancel-in-progress: true`
- Playwright `retries: 2` en CI, `0` en local
- Fixtures **idempotentes** : chaque test utilise son propre tenant `e2e-<random>` qu'il nettoie en `afterAll`
- Health check deploy : retry jusqu'à 3 min avant rollback auto
- Rollback auto : SSH re-tag `cms:previous` si smoke fail

### Secrets GH à créer

```bash
gh secret set CMS_DATABASE_URL_PROD --repo Christ-Roy/veridian-platform
gh secret set CMS_PAYLOAD_SECRET_PROD
gh secret set CMS_SSH_KEY_OVH                # déjà existante sûrement
gh secret set DOKPLOY_CMS_COMPOSE_ID         # compose ID du service Dokploy
gh secret set CMS_ADMIN_API_KEY_PROD         # pour les tests E2E
```

## 📦 Phase 3 — Tests E2E Playwright headful (1h)

### Structure

```
cms/e2e/
├── playwright.config.ts         # config CI avec retries + screenshots
├── fixtures/
│   ├── tenant.ts                # crée tenant e2e-<uuid>, cleanup après
│   ├── api.ts                   # helpers fetch CMS API avec auth
│   └── browser.ts               # login helper réutilisable
├── specs/
│   ├── admin-login.spec.ts      # 1. page login → saisir creds → dashboard
│   ├── admin-tenant-switch.spec.ts  # 2. dropdown tenant → URL change
│   ├── admin-page-edit.spec.ts  # 3. create draft → publish → check DB
│   ├── admin-form-builder.spec.ts   # 4. créer form avec 3 champs → submission
│   ├── api-isolation.spec.ts    # 5. clé artisan ne voit pas restaurant
│   ├── site-render.spec.ts      # 6. fetch site template-artisan → check HTML
│   └── magic-link.spec.ts       # 7. forgot-password → clic lien → reset mdp
└── global-setup.ts              # créer tenants e2e + clean au départ
```

### Anti-flaky : patterns obligatoires

- **Pas de `page.waitForTimeout()`**. Toujours `waitForSelector` / `waitForLoadState` / `expect().toBeVisible()`
- **Data-testids** sur les éléments critiques (pas de CSS selectors fragiles)
- **Screenshots on failure** (pas on success → coûteux)
- **Trace uniquement au retry** (`trace: 'on-first-retry'`)
- **Parallélisme** : `fullyParallel: true` + workers=4 sur runner self-hosted
- **Cleanup idempotent** : chaque test crée sa data avec un UUID prefix et DELETE à la fin, même en cas d'échec

### Pixel-perfect visuel

Playwright a `toHaveScreenshot()` pour comparer pixels. À utiliser avec parcimonie :

```ts
test('admin dashboard pixel match', async ({ page }) => {
  await page.goto('/admin')
  await login(page)
  await expect(page).toHaveScreenshot('dashboard.png', {
    maxDiffPixelRatio: 0.02, // 2% de tolérance (anti-aliasing fonts)
    mask: [page.locator('[data-testid="last-updated"]')], // masque timestamps dynamiques
  })
})
```

Les snapshots sont versionnés dans `cms/e2e/specs/__screenshots__/` et CI
compare automatiquement.

### Runner self-hosted

Réutiliser le runner `dev-server-1` existant (prospection l'utilise déjà).
Pour l'image Playwright headful, installer Xvfb sur le runner :

```bash
ssh dev-pub "sudo apt install -y xvfb"
```

Et dans le workflow GH Actions :

```yaml
e2e:
  runs-on: [self-hosted, linux, x64]  # dev-server
  steps:
    - uses: actions/checkout@v4
    - run: npm ci --prefix cms/e2e
    - run: xvfb-run -a npx playwright test --config=cms/e2e/playwright.config.ts
```

## 📦 Phase 4 — Déploiement safe + rollback (30 min)

### Deploy step

```yaml
deploy:
  needs: [build, e2e]
  runs-on: ubuntu-latest
  steps:
    - name: SSH → Dokploy pull + up
      run: |
        ssh -i ~/.ssh/ovh ubuntu@51.210.7.44 <<'EOF'
          cd /etc/dokploy/compose/<cms-id>/code/cms
          git fetch origin main
          git reset --hard origin/main
          # migrate AVANT restart (pour éviter window broken)
          docker compose exec cms pnpm payload migrate
          # restart avec nouvelle image
          docker compose up -d --build --no-deps cms
        EOF

    - name: Wait for health + rollback if fail
      run: |
        for i in {1..30}; do
          if curl -sf https://cms.veridian.site/api/health; then
            echo "✅ Health OK"; exit 0
          fi
          sleep 6
        done
        echo "❌ Deploy failed — rolling back"
        ssh ubuntu@51.210.7.44 "cd /etc/dokploy/... && git reset --hard HEAD@{1} && docker compose up -d --build --no-deps cms"
        exit 1
```

### Endpoint health à créer côté Payload

```ts
// cms/src/endpoints/health.ts
import type { Endpoint } from 'payload'
export const healthEndpoint: Endpoint = {
  path: '/health',
  method: 'get',
  handler: async (req) => {
    try {
      // Test DB + vérif count tenants
      const t = await req.payload.count({ collection: 'tenants' })
      return Response.json({ status: 'ok', tenants: t.totalDocs })
    } catch (e) {
      return Response.json({ status: 'error' }, { status: 500 })
    }
  },
}
```

À ajouter dans `payload.config.ts` → `endpoints: [healthEndpoint]`.

## 📦 Phase 5 — Monitoring prod

- Ajouter `cms.veridian.site` à la liste des endpoints surveillés par
  **`veridian-prod-healthcheck`** (systemd unit sur dev-server, voir
  `/opt/veridian/monitoring/`)
- Ajouter alerte Telegram si `/api/health` down > 2min
- Dashboard Dokploy : sur `cms-postgres-prod`, alerte si backup > 24h

## 🗂️ Checklist complète (à cocher au fil de la session)

### Pré-requis (avant de commencer)
- [ ] Backup de staging (dump Postgres cms-postgres dev)
- [ ] Export des tenants/pages/forms staging en JSON (via `node cms/scripts/export-data.mjs` à créer)
- [ ] DNS `cms.veridian.site` créé, proxied CF, propagé
- [ ] Nouveau `PAYLOAD_SECRET` prod généré et stocké dans Dokploy

### Phase 1 — Prod infra
- [ ] Postgres prod créé sur Dokploy
- [ ] Service CMS prod créé sur Dokploy (source git branche main)
- [ ] Première migration appliquée
- [ ] Admin bot prod créé (API key stockée dans `CMS_ADMIN_API_KEY_PROD`)
- [ ] Import des tenants depuis export staging
- [ ] Backup auto Postgres vers R2 configuré

### Phase 2 — CI
- [ ] `.github/workflows/cms-ci.yml` créé (squelette §6)
- [ ] Secrets GH configurés
- [ ] Runner self-hosted dev-server accepte les jobs CMS (label `cms` si besoin)
- [ ] Premier run sur branche `feat/cms-prod-ci` en mode `workflow_dispatch` OK

### Phase 3 — E2E
- [ ] `cms/e2e/` structure créée
- [ ] 7 specs écrites et passent en local avec Xvfb
- [ ] Fixtures idempotentes validées (rejouable 10× sans drift)
- [ ] `toHaveScreenshot()` configuré avec masks pour éléments dynamiques
- [ ] Snapshots de référence committés

### Phase 4 — Deploy
- [ ] Health endpoint `/api/health` créé et testé
- [ ] Workflow deploy avec rollback auto validé sur un fake-fail
- [ ] Smoke test post-deploy OK
- [ ] DNS switch `cms.veridian.site` → prod
- [ ] Sites clients (artisan/restaurant) updatés avec `CMS_API_URL=https://cms.veridian.site`

### Phase 5 — Monitoring
- [ ] Ajout endpoint au healthcheck systemd dev-server
- [ ] Alerte Telegram down > 2min
- [ ] Alerte backup Postgres non effectué > 24h

## 🔐 Rollback plan (en cas de catastrophe)

Si prod plante après deploy :

```bash
ssh prod-pub
cd /etc/dokploy/compose/<cms-id>/code
git reset --hard HEAD@{1}                   # revert au commit précédent
docker compose up -d --build --no-deps cms
# Si migration foireuse
docker compose exec cms pnpm payload migrate:down
```

Si DB corrompue : restore depuis dernier backup R2 (quotidien).

## 📄 Squelettes à créer (déjà posés dans cette session)

- `cms/docs/NEXT-SESSION-ROADMAP.md` — **CE FICHIER**
- `.github/workflows/cms-ci.yml` — squelette CI/CD 5 couches
- `cms/e2e/playwright.config.ts` — config anti-flaky
- `cms/e2e/fixtures/tenant.ts` — fixture création tenant e2e isolé
- `cms/e2e/specs/admin-login.spec.ts` — premier test de référence
- `cms/src/endpoints/health.ts` — endpoint santé pour deploy check

Ces 6 fichiers sont posés maintenant. La prochaine session démarre en les
remplissant et en enchainant les 5 phases dans l'ordre.

## ⏱️ Estimation

| Phase | Temps |
|---|---|
| Pré-requis | 30 min |
| Phase 1 (prod infra) | 45 min |
| Phase 2 (CI) | 30 min |
| Phase 3 (E2E) | 1h |
| Phase 4 (deploy + rollback) | 30 min |
| Phase 5 (monitoring) | 15 min |
| **Total** | **~3h30** |

Avec des bases solides posées maintenant, la prochaine session peut avancer
sans rediscussion d'architecture — juste de l'exécution.
