# CMS — TODO detaille

> Source de verite strategique cross-apps : monorepo legacy
> `Christ-Roy/veridian-platform/todo/TODO-LIVE.md` (consultation seulement,
> CMS extrait depuis 2026-05-13).
> UI polish solo : [`UI-REVIEW.md`](./UI-REVIEW.md)
> Skill operationnel : `~/.claude/skills/cms-provision/SKILL.md`
> Config de reference : `docs/EXAMPLE-CONFIG.md`
> Roadmap prochaine session : `docs/NEXT-SESSION-ROADMAP.md`
>
> App : Veridian CMS Payload 3 multi-tenant. Une seule instance sert tous
> les sites clients (Morel, Tramtech, Dupont BTP, etc.).
> Repo standalone depuis 2026-05-13 : `Christ-Roy/veridian-cms`. Compose path
> `./docker-compose.yml`. CI `.github/workflows/ci.yml`. Deploy Dokploy GitOps
> auto sur push main → composeId `275o-9E3ZWWi0X32wY8hM`.

## Etat actuel

- **Version** : Payload 3.82.1
- **URL staging** : https://cms.staging.veridian.site/admin
- **URL prod** : 🟢 https://cms.veridian.site/admin (déployée 2026-04-25)
- **Sante** : 🟢 staging stable + prod live + CI/CD complet + monitoring
  - ⚠️ backup R2 quotidien : Dokploy schedule `schedule-transmit-neural-firewall-jy3xp9`
    backupe supabase/twenty/notifuse mais **PAS le CMS** (constat 2026-05-11).
    Diff à appliquer dans script.sh : `backup_db "veridian-cms-postgres-prod" "veridian_cms" "cms" "cms"`
- **Langue** : FR par defaut (i18n natif), EN fallback
- **White-label** : actif (logo vert, BeforeLogin/Dashboard FR, favicon)
- **Theme** : light force

## Architecture

> NOTE 2026-05-13 : depuis l'extraction polyrepo, ce qui était dans `cms/` du
> monorepo est désormais à la racine du repo `Christ-Roy/veridian-cms`.

```
veridian-cms/                  (racine repo standalone)
├── src/
│   ├── payload.config.ts      # Config principale + 5 plugins
│   ├── collections/           # Users, Tenants, Pages, Media
│   ├── globals/               # Header, Footer (via plugin multi-tenant)
│   ├── blocks/                # Hero, Services, Gallery, Testimonials, RichText, CTA, Form
│   ├── components/            # White-label (graphics, BeforeLogin, BeforeDashboard)
│   ├── hooks/                 # triggerSiteRebuild
│   └── endpoints/             # health (posee pour deploy check)
├── scripts/                   # seed-from-code, send-magic-link, status-tenant, ...
├── docs/
│   ├── EXAMPLE-CONFIG.md          # Config de reference commentee
│   └── NEXT-SESSION-ROADMAP.md    # Roadmap passage prod + CI/CD
├── e2e/                       # Squelette Playwright pose
├── tests/int/                 # vitest integration (validators, products guard, media delete)
├── docker-compose.yml         # Compose unique racine (Dokploy GitOps build localement)
├── Dockerfile                 # Build context = .
├── .github/workflows/         # ci.yml (static + audit + int), _audit-cve.yml
└── todo/apps/cms/             # Ce fichier
```

## Plugins officiels actifs

- `@payloadcms/plugin-multi-tenant` (DOIT etre en dernier)
- `@payloadcms/plugin-seo`
- `@payloadcms/plugin-form-builder`
- `@payloadcms/plugin-redirects`
- `@payloadcms/plugin-nested-docs`
- `@payloadcms/email-nodemailer` (Brevo SMTP)
- ❌ `@payloadcms/plugin-search` — desactive V1 (incompat multi-tenant,
  hook afterChange rollback silencieux)

## Sites consommant le CMS

| Site | URL | Tenant |
|---|---|---|
| `sites/template-artisan/` | https://template-artisan.veridian.site | `artisan` |
| `sites/template-restaurant/` | https://template-restaurant.veridian.site | `restaurant` |
| `sites/demo-cms/` | https://demo-cms.veridian.site | `demo` |

Pattern **content-first** : `src/content/*.ts` = source de verite initiale,
seed-from-code provisionne le CMS avec exactement ces blocs.

## Backlog priorise

### 🟢 Session 2026-05-13 (soir) — Extraction polyrepo + Dokploy GitOps

- [x] **Extraction monorepo → repo standalone `Christ-Roy/veridian-cms`**
  - 65 commits préservés via `git filter-repo --subdirectory-filter cms`
  - 0 data loss : volumes external `veridian-cms-prod_cms-{media,pgdata}-prod` réutilisés
  - 1m40s downtime au switch initial Dokploy (acceptable pour bascule one-shot)
  - PR cleanup monorepo : `Christ-Roy/veridian-platform#108` mergée (commit `fbb327f`)
- [x] **Bascule Dokploy mode Git pur**
  - composeId `275o-9E3ZWWi0X32wY8hM`, appName `compose-copy-wireless-bus-e9xlnn`
  - `sourceType: git`, `composeFile: <0 chars>` (zero compose en parallèle)
  - Webhook GitHub `622971739` actif sur watchPaths `[docker-compose.yml, Dockerfile, src/**, package.json, pnpm-lock.yaml]`
  - ENV prod pushed via API Dokploy AVANT premier deploy (piège prospection #1 évité)
- [x] **CI adaptée nouveau repo** (run `25815902874` ✅)
  - `static + audit + int` verts (les 3 critères qui comptent côté code)
  - `build push GHCR` et `e2e` désactivés `if: false` (cf TODO post-session)
- [ ] **Transfert packages GHCR** (suite immédiate)
  - `ghcr.io/christ-roy/veridian-cms{,-builder}` encore liés à `veridian-platform`
  - Action UI : Settings → Packages → Manage access → re-link `veridian-cms`
  - Puis remettre `if: true` sur job `build` du workflow CI
- [ ] **Enregistrement self-hosted runner** sur le nouveau repo
  - Pour réactiver job `e2e` (Playwright headful)
  - Action UI : Settings → Actions → Runners → "New self-hosted runner"
- [ ] **Secrets repo manquants** à recréer
  - `CMS_E2E_ADMIN_PASSWORD`, `CMS_ADMIN_API_KEY_PROD`
  - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
  - `DEPLOY_SSH_KEY` (backup au cas où, deploy SSH désactivé)
- [ ] **Nettoyage post-validation 7j**
  - Supprimer `/home/ubuntu/veridian-cms-prod.deprecated-20260513-extraction/` sur OVH
  - Supprimer snapshots `/tmp/cms-extraction-snapshots-20260513-1915/` (local)

### 🟢 Session 2026-05-12 (PM) — Sprint 1 Didier-ready (PR #TBD `feat/cms-sprint1-didier-ready`)

Branche unique groupée. Toutes les modifs CMS pour livrer le client AVSE
proprement (cf. `CMS-DIDIER-READY-TODO.md`).

- [x] **UploadWithPreview UX** (section 1 TODO Didier)
  - Bouton "🔄 Remplacer cette image" 150px sous la vignette (clear value)
  - Reset `fetched=null` immédiat au changement d'id (kill stale preview)
  - Overlay drag&drop + upload direct via POST /api/<rel>
  - Hint "💡 glissez-déposez ici" quand champ vide
  - Validé visuellement sur cms.dev.veridian.site
- [x] **Bloquer suppressions accidentelles** (section 3 TODO Didier)
  - Header.beforeDelete : super-admin only (était : sans guard)
  - Footer.beforeDelete : idem
  - Media.beforeDelete : refuse si referenced par Pages(blocks.image/items.image/cards.image/items.avatar), Products.image, Header.logo. Bypass super-admin avec warn log. APIError 409 + breakdown FR.
- [x] **Validators FR réutilisables** (section 7 TODO Didier)
  - `src/lib/validators.ts` : SIRET, SIREN, TVA intra, téléphone FR,
    code postal FR, hex color, https URL
  - Hero.title maxLength 120, Hero.subtitle maxLength 300, Hero.eyebrow maxLength 80
  - Utilisables pour Sprint 3 (CompanyInfo / Branding tenant)
- [x] **MediaGrid beforeListTable** (section 2.1 TODO Didier — Option B pragmatique)
  - Vignettes en bande au-dessus de la table standard
  - Apparaît dans /admin/collections/media + drawer "Choisir parmi les existants"
  - click vignette → navigate (list) / onSelect (drawer)
  - Table native intacte en dessous (recherche, filtres, bulk select, pagination)
  - Limites : pas de checkbox sur vignette + serializer where→bracket minimal
    (différé Sprint 2 si besoin full grid view)
- [x] **Tests vitest int + env Node par défaut**
  - vitest.config.mts : `environment: 'node'` par défaut (jsdom cassait
    `file-type` v21 sur Buffer/Uint8Array)
  - 45 tests `validators.int.spec.ts` (purs, sans Payload)
  - 4 tests `media-delete-guard.int.spec.ts` (vrai pipeline upload, pas SQL direct)
  - 54 tests int total en 13.6s, tous green
- [x] **Cleanup produit fantôme prod (id=28)** : déjà supprimé en session
  précédente, vérifié via API (404).
- [ ] **Patch alts media génériques** (section 2.2 TODO Didier) — différé
  Sprint 2 (253 docs à patcher, script séparé).

### 🔵 Session 2026-05-12 (AM) — Tests int + Media public + UploadWithPreview (PR #38/#40/#41/#42)

- [x] **PR #38** `int` job vitest + Postgres dans CI, 5 tests Products guard rails
  (sabotage prouvé), refactor `rejectEmptyName`, bump `next 16.2.6` (CVE high
  GHSA-8h8q-6873-q5fj DoS Server Components)
- [x] **PR #40** `Media.access.read = () => true` — débloque tous les sites CF
  Pages qui servaient des images broken. Create/update/delete restent auth.
- [x] **PR #41** `UploadWithPreview` composant + câblage 9 champs upload
- [x] **PR #42** Fix critique : `useField` v3 retourne l'ID, pas le doc populé.
  Fetch `/api/<rel>/<id>?depth=0` ajouté.

**Validation visuelle prod** : link media 255 → product 27, reload admin,
thumbnail 150x100 affichée. OK.

**Bugs identifiés à traiter** (priorité décroissante) :

1. **`cms.dev.veridian.site` cassé** — DB vide (no relations). Cause :
   `PAYLOAD_DB_PUSH=true` manquant dans le compose dev (le fix pnpm@10.33.0 a
   été appliqué manuellement sur dev-pub). Ce dev URL est obligatoire pour
   éviter de pousser des bugs en prod (cf. cas PR #41). Fix : PR `fix(cms):
   add PAYLOAD_DB_PUSH=true to dev compose`.

2. ~~**Drift compose live ≠ repo**~~ — **RÉSOLU 2026-05-13** par l'extraction
   polyrepo + bascule Dokploy GitOps. Le compose live vient désormais
   directement du repo `Christ-Roy/veridian-cms` cloné par Dokploy à chaque
   webhook push. `composeFile: <0 chars>` dans Dokploy → zero drift possible.
   Ancien dossier OVH `/home/ubuntu/veridian-cms-prod/` renommé
   `.deprecated-20260513-extraction` (à supprimer après 7j de validation).

3. **Branch protection main absente** — `gh api .../branches/main/protection`
   → 404. `gh pr merge --auto` peut merger avant CI. À sécuriser côté GitHub
   settings.

4. **Tests e2e n'a aucun test "linker un media à un upload field"** — c'est
   pourquoi PR #41 cassée a passé tout vert. À combler par l'agent CI
   bouclage : créer page → ajouter bloc Hero → lier média → vérifier
   thumbnail visible dans admin.

5. **Lint cassé** (`pnpm run lint` crash sur eslint-config-next schema error).
   Pas dans la CI, donc silent. À fixer.

6. **AVSE n'utilise aucun média Payload** — confirmé via API (fetch
   `/api/pages?tenant=1&depth=2` → aucun bloc avec `image` populé). Tout
   passe par `imageFallbackUrl`. Pour que les uploads CMS de Didier
   apparaissent sur le site, audit AVSE côté `site/src/components/` :
   ordre `block.image.url ?? block.imageFallbackUrl ?? placeholder`.

### 🔵 Sprint 1 quick wins (2026-05-11) — PR #36

Audit basé sur `~/Bureau/AVSE-CMS-FEATURES-TODO.md` Sprint 1 débloquant.

- [x] **Volume Docker `/app/media`** — Dockerfile crée `/app/media` chown
  nextjs:nodejs ; `cms-media-prod` ajouté aux composes. Débloque les uploads
  (EACCES depuis 2026-04-25, 0 doc Media en base avant fix).
- [x] **CVE high patchées** — `pnpm.overrides` pour `fast-uri >=3.1.2` et
  `drizzle-orm >=0.45.2`. Audit prod : 0 high / 0 critical.
- [x] **Job CI audit CVE bloquant** — `_audit-cve.yml` hook dans `cms-ci.yml`,
  `build needs: [static, audit]`. Pas de publish d'image si CVE high.
- [x] **Pages.beforeDelete** protège slugs critiques (home, contact,
  mentions-legales, politique-confidentialite) pour non super-admin.
- [x] **Products.beforeValidate** rejette name/slug vide (ghost product
  id=28 sur tenant 1 DELETE manuellement séparément).
- [x] **seed-from-code** supporte `{ pageTitle, blocks }` (admin label court
  séparé du hero title long).
- [ ] **Volume media à monter sur compose live OVH** (à faire post-merge) :
  ```bash
  ssh prod-pub
  cd /home/ubuntu/veridian-cms-prod
  # ajouter `volumes: [cms-media-prod:/app/media]` sur le service cms
  # + `volumes: { cms-media-prod: {} }` racine
  docker compose -f docker-compose.prod.yml -p veridian-cms-prod up -d --force-recreate cms
  docker exec veridian-cms-prod ls -la /app/media  # writable nextjs:nodejs
  ```
- [ ] **Backup CMS Dokploy** : ajouter `backup_db "veridian-cms-postgres-prod"
  "veridian_cms" "cms" "cms"` au script `schedule-transmit-neural-firewall-jy3xp9`
  via Dokploy UI.
- [ ] **`cms.dev.veridian.site`** : DNS fixé (`*.dev.veridian.site` pointait
  vers un dev-server offline 76 jours), reste à monter le service systemd
  pnpm dev + reverse proxy + sync script.

### ✅ P0 DONE — Polish white-label + Live Preview SDK (2026-05-01)

- [x] **Logo Veridian charté** (icon + login)
  - Récupéré depuis `veridian.site/icon.svg` : V menthe `#86efac` sur rect
    rounded vert foncé `#1a3d2f`. Remplace le checkmark générique vert.
  - `src/components/graphics/Icon/index.tsx` + `Logo/index.tsx`

- [x] **Sidebar admin gradient menthe + carte profil**
  - Gradient 3 stops `#f0fdf4 → #dcfce7 → #bbf7d0` sur `.nav`
  - Liens arrondis 8px, hover blanc, active = fond `#1a3d2f` texte blanc
  - Carte profil utilisateur (avatar initiale + nom email + rôle FR) en
    bas via slot `afterNavLinks` → `src/components/ProfileCard/`
  - Bouton primaire en charte `#1a3d2f`, AppHeader fond blanc bordure
  - Tout dans `src/app/(payload)/custom.scss` (importé par layout.tsx)

- [x] **Live Preview SDK côté template-artisan**
  - `@payloadcms/live-preview-react` (^3.84.1) installé
  - `LivePreviewBoundary` lazy client : SSG inchangé en prod, en `?preview=1`
    le hook `useLivePreview` re-render les blocks à chaque édition admin
  - 3 pages couvertes (home, services, contact)
  - Compatible `output: 'export'` (Cloudflare Pages static)

- [x] **EditOverlay click-to-edit en mode preview**
  - Au survol d'un block → bouton flottant "✏️ Éditer · <type>" qui
    deeplink vers `/admin/collections/pages/{id}#field-blocks__{i}__{type}`
  - Badge "● Aperçu en direct" fixé top-right
  - Labels FR par block (Bandeau, Services, Galerie, Témoignages, etc.)
  - `BlockRenderer` accepte `previewMode + pageId` propagés depuis boundary

- [x] **Fix bug TS pré-existant `autoAttachTenant`**
  - Code essayait d'écrire `roles: ['tenant-viewer']` dans `tenants[]`
    mais le sous-champ n'existe pas (plugin multi-tenant n'a pas de
    `rowFields` configuré). tsc échouait → bloquait la CI prod depuis le
    sprint Products.
  - Fix : retire le `roles`, l'auto-attach assigne juste le tenant.
  - Note : voir Bugs connus pour le câblage propre via `tenantsArrayField`.

- [x] **Drift staging résolu**
  - `cms.staging.veridian.site` (sur dev-pub) était énormément en retard
    (pas de `endpoints/`, `Header.ts/Footer.ts`, `Products.ts`, ni les
    nouveaux blocks Cards2/Cards4WithIcons/LogoWall/SplitImageText).
  - Resync complet `src/` + `package.json` + `pnpm-lock.yaml` +
    `Dockerfile` + ajout `SERVER_URL=https://cms.staging.veridian.site`
    et `CORS_ORIGINS` au `.env`.
  - **Action de fond** : la prochaine session devrait soit intégrer
    staging dans la CI (auto-rebuild dev-pub à chaque push main), soit
    désactiver `cms.staging.veridian.site` (la CI couvre déjà le E2E
    via stack éphémère). Le drift d'aujourd'hui était évitable.

- [x] **Disque dev-server libéré**
  - Pruned 15.75 GB de docker images/cache (passé de 97% → 75% disk).

### ✅ P0 DONE — Passage prod + CI/CD + monitoring (2026-04-25)

- [x] **Phase 1 — Prod infra OVH**
  - Postgres prod (`veridian-cms-postgres-prod`) volume dédié, healthcheck
  - Service `cms.veridian.site` via docker compose (`/home/ubuntu/veridian-cms-prod/`)
  - Migration `20260425_085354` (régénérée from current schema)
  - DNS `cms.veridian.site` Cloudflare A → 51.210.7.44 proxied
  - Super-admin `claude-bot@veridian.site`, API key dans `~/credentials/.all-creds.env` (CMS_ADMIN_API_KEY_PROD)

- [x] **Phase 2 — CI/CD `cms-ci.yml`**
  - 5 couches : static / build / e2e / deploy / smoke
  - Build runner + builder images (push GHCR avec sha + latest)
  - `concurrency: cancel-in-progress` anti-pile-de-runs
  - Rollback auto si health prod KO après 3min
  - Alerte Telegram succès/échec dans le smoke
  - Secrets GH : CMS_ADMIN_API_KEY_PROD, CMS_E2E_ADMIN_PASSWORD, DEPLOY_SSH_KEY

- [x] **Phase 3 — E2E Playwright headful**
  - Stack docker compose éphémère (Postgres tmpfs + CMS + migrate init container)
  - Runner self-hosted `dev-server-1` avec `xvfb-run` pour vrai headful
  - 7 specs : admin-login (×4 dont 2 pixel-perfect) / page-edit / api-isolation / tenant-switch / form-builder / site-render / magic-link
  - Fixtures `tenant-per-test` idempotentes avec cleanup `finally`
  - `retries: 2` CI / `0` local, `trace: on-first-retry`, `screenshot/video: only-on-failure`
  - Sélecteurs Payload français validés (`#field-email`, `#field-title`, `nav.nav__wrap`, `button#action-save`)
  - Pixel-perfect `maxDiffPixelRatio: 0.02` avec masks pour timestamps

- [x] **Phase 4 — Backup auto Postgres → R2**
  - Script `scripts/backup-cms-postgres.sh` dump + gzip + rclone copy
  - Cron quotidien `0 4 * * *` (`/etc/cron.d/cms-backup`)
  - Bucket `r2:veridian-backups/cms/`, retention 30 derniers
  - Alerte Telegram si fail (env vars dans `.backup-env` mode 600)

- [x] **Phase 5 — Monitoring**
  - Healthcheck systemd `veridian-prod-healthcheck` étendu :
    - `check_cms_health` : `/api/health` retourne `{"status":"ok"}`
    - `check_cms_backup` : last R2 backup < 26h
  - Telegram alerte DOWN/RECOVERED rate-limited

- [x] **Bug fix Dockerfile critique**
  - Ajout `RUN pnpm payload generate:importmap` AVANT `next build`
  - Sans ça, composants white-label non dans importMap → login form vide
  - Fixé sur prod via image rebuilt

### Notes anti-flaky E2E (apprises à la dure)
- `workers: 1` en CI (Next.js standalone supporte mal le concurrent
  avec xvfb + Chromium + Postgres tmpfs)
- `actionTimeout: 30s`, `navigationTimeout: 45s`, `test timeout: 60s`
- `apiRequestContext` timeout explicite à 60s
- `expect.toPass()` pour les checks API qui dépendent du save Payload
  (PATCH peut prendre du retard pour persister)
- Toujours `await page.waitForResponse()` AVANT d'asserter sur la DB
- Sélecteurs Payload français : `input#field-X`, `nav.nav__wrap`,
  `button#action-save`, label exact = `E-mail*` (avec astérisque)
- Modal `.assign-tenant-field-modal__bg` : intercepte clicks, fermer
  avec Escape ou bypass en pré-créant via API
- Le toast Payload affiche `Mis à jour avec succès` mais le badge
  status `Publié` matche aussi → cibler `.toast-title` spécifiquement

### P1 — Fix critiques

- [ ] **Fix auto-seed formBlock**
  Actuellement le script seed-from-code ne sauvegarde pas les blocks
  `formBlock` (API accepte mais ne persiste pas, surement un champ relation
  qui echoue silencieusement). Workaround V1 : ajouter le bloc manuellement
  via l'UI admin.
  Investigation : logs CMS lors du POST, verifier format attendu du champ
  `form` (id numerique, objet, relationship type).

- [ ] **Fix plugin-search + multi-tenant**
  Le hook afterChange de `@payloadcms/plugin-search` cree un doc search sans
  tenant → ValidationError → rollback silencieux. Solution : custom
  beforeChange hook qui injecte le tenant depuis le doc source. A tester
  sur un tenant dedie, puis reactiver le plugin.

### P2 — Enrichissement fonctionnel

- [ ] **Script unique `provision-client.ts` tout-en-un**
  Enchainer : seed-from-code + creation user humain + magic link +
  creation projet CF Pages via API + Deploy Hook + stockage sur tenant.
  Objectif : 1 commande = client operationnel en < 3 min.

- [ ] **Auto-creation CF Pages via API** (vs clic-bouton UI)
  Endpoint `POST /accounts/:id/pages/projects`. Challenge : config build
  (root, command, env vars) via API.

- [ ] **Auto-connexion GitHub → CF Pages via API**
  Installation GitHub App + binding projet. Complexe mais interessant.

- [ ] **Storage R2 Cloudflare pour images**
  `@payloadcms/storage-s3` configure avec endpoint R2. Evite explosion
  disque VPS (deja 72%). Migration : script qui re-upload medias existants.

- [ ] **Custom email templates** (magic link + welcome) avec MJML
  Pattern deja utilise dans le skill `notifuse-templates`. Branding
  Veridian complet.

### P3 — UI / UX avances

- [ ] **Catalogue dynamique avec filtres editables** (pour clients e-commerce)
  Collections Products + Categories + **Filters** (slug/type/field/mergeable/options).
  Le client peut dans son admin :
    - Creer un filtre "Marque" avec valeurs libres
    - Fusionner 2 filtres existants en 1
    - Reordonner les filtres (drag-n-drop Payload natif via `order`)
    - Activer/desactiver un filtre par page categorie
  Cote site : block `CategoryPage` + API route Next qui match produits.
  Effort ~2-3 jours pour catalogue bien ficele (pas un POC).
  A faire quand premier client catalogue arrive (ex: Apical Informatique).

- [ ] **Profils de tenants** (UI / collections variables par client)
  Pour les clients complexes (catalogue, boutique, blog multi-auteurs),
  ajouter un champ `tenant.profile` et activer conditionnellement des
  collections via `admin.condition`. Pattern inspire de l'exemple officiel
  `~/.claude/docs/payload-examples/multi-tenant/`. Effort ~1 jour. A faire
  quand premier client "complexe" arrive, pas avant.

- [ ] **Polish admin Payload "pro"** (au-dela du white-label basique)
  L'admin actuel est fonctionnel mais neutre (type Supabase dashboard).
  Pour donner un vrai "wow effect" sur les demos clients :
    - Override `admin.components` pour Dashboard/ListView/EditView custom
    - Widgets dashboard : "dernieres pages publiees", "vues 7j" (analytics)
    - ListView en preview cards au lieu de tableau pour les Pages
    - Sidebar de presets/templates sur EditView
  Effort ~1 jour. **Ne PAS faire avant un besoin client concret** — l'admin
  actuel est deja mieux qu'un WordPress pour la plupart des PME.

### 🌟 AXE STRATEGIQUE LONG TERME — Editeur visuel premium

> **Decision Robert (2026-04-25)** : a terme, Veridian doit avoir un
> editeur de pages visuel "wow" pour **justifier des prix de site eleves**
> face aux clients. C'est un differentiateur business, pas une feature
> technique optionnelle.
>
> Pas de date imposee — moment opportun a definir, mais c'est dans la
> trajectoire du produit.

**Vision** : quand un prospect compare Veridian avec un freelance WordPress
a 1500€, il doit dire "ah, l'admin c'est tres different, je peux modifier
mon site comme sur Webflow" → ça permet de tarifer ~3000-5000€ en creation
+ maintenance plus elevee.

**Phase 1 — Etat actuel (V1 prod)**
- Pattern `blocks` Payload natif + iframe side-by-side
- Suffisant pour les premieres PME (Morel, Tramtech, Dupont BTP) qui
  viennent de WordPress
- Permet de livrer ET facturer ces premiers clients pour generer cashflow

**Phase 2 — Tester `@delmaredigital/payload-puck`** (quand le plugin sera mur)
- Plugin communautaire qui ajoute Puck Editor dans Payload
- npm : `@delmaredigital/payload-puck` (https://github.com/delmaredigital/payload-puck)
- Ce que ca apporte : click-to-edit visuel sur canvas + Puck AI (generation
  par prompt) + fields custom (MediaField, ColorPicker, Padding, etc.)
- Etat 2026-04-25 : 58 stars, v0.6.23, **bug de securite access control
  fixe le 6 avril 2026** → trop jeune pour un multi-tenant
- **A re-evaluer** quand le plugin aura :
    - v1.0+ (API stable)
    - 500+ stars (adoption)
    - 6 mois sans bug de securite critique
    - Compat multi-tenant officiellement testee
- Effort integration : ~1-2 jours pour adapter Hero/Services/etc. en
  composants Puck

**Phase 3 — Eventuelle solution custom** (si Puck reste pas mur)
- Fork des bases (Payload natif + Puck open-source MIT) pour faire
  un editeur Veridian premium
- Coherent avec ton modele plateforme : fields custom, AI, integrations
  Veridian Analytics intégrées, etc.
- **Coût realiste : 1-2 mois de dev solo + maintenance a vie**
- A justifier par : minimum 3-5 clients a tarif eleve qui paient ce
  differenciateur, ou demande explicite d'un client haut de gamme

**Decision moment** : pas avant que :
- ✅ V1 prod soit stable (~prochaine session)
- ✅ 1-2 vrais clients soient livres avec V1 (cashflow generee)
- ✅ Retour client confirme : "l'admin pourrait etre plus visuel" est une
  vraie objection commerciale, pas un nice-to-have

**Quand ca arrive, ressources utiles** :
- Plugin reference : https://github.com/delmaredigital/payload-puck
- Starter exemple : https://github.com/delmaredigital/dd-starter
- POC simple : https://github.com/Copystrike/puckload-poc
- Doc Puck : https://puckeditor.com
- Pattern Payload custom field : `~/.claude/docs/payload/custom-components/`

- [ ] **Click-to-edit inline sur la preview** (Webflow-style)
  **Pas natif Payload**, sur leur roadmap. Solution custom = injection
  script dans site preview, detection clics sur `data-cms-field="X"`,
  ouverture admin sur le bon champ. 2-3 jours dev + maintenance. **A ne
  PAS faire avant 5+ clients payants.**

- [ ] **Logo du client dans SON admin** (vs logo Veridian generique)
  Composant custom qui lit `tenant.logo` et override `admin.components.graphics.Icon`.
  Feature "wow" relativement simple. ~2h.

- [ ] **Collection `SiteSettings` globale par tenant**
  Pour tout ce qui n'est pas block/page : fonts, favicon custom, couleurs
  brand (primary/accent), politique cookies. A ajouter quand plusieurs
  clients ont des besoins de branding avance.

- [ ] **Custom CSS admin** (au-dela du white-label default)
  Override des CSS variables Payload pour avoir du vert Veridian en
  primary, corners plus arrondis, shadows douces. ~30 min.

- [ ] **Pre-seed images** (Unsplash ou AssetBank) dans le seed
  Actuellement le client voit un CMS avec 0 medias. Pre-seeder 3-4 photos
  d'exemple par site pour demonstration visuelle immediate.

### P4 — Tests et qualite

- [ ] Tests e2e d'isolation multi-tenant dans la CI (clé artisan ne voit
  pas restaurant) → couverture explicite du risque #1 de securite.

- [ ] Charger plusieurs langues FR/EN/DE sur les sites clients (feature
  `localization` native Payload).

## Decisions techniques

### 2026-04-24 — Architecture V1 validee

- **Postgres** (pas MongoDB) — coherent avec stack Veridian
- **1 seule instance multi-tenant** (pas N instances) — tenant isolation
  via plugin multi-tenant officiel
- **Auto-deploy CF Pages connecte a git** par client (pas de workflow
  GH Actions custom) — scale infini sans maintenance
- **Content-first pattern** : `src/content/*.ts` = source de verite initiale
- **Magic links** via SMTP Brevo (pas link natif Payload)
- **Plugin-search desactive** V1 (incompat multi-tenant)
- **Plugin multi-tenant en DERNIER** dans l'ordre des plugins (sinon il
  ne wrappe pas les collections ajoutees par les autres plugins)

### Choix a valider plus tard

- **i18n sur les sites** — pour l'instant sites mono-lang FR. Payload a
  une `localization` config native, a activer si un client bilingue arrive.
- **Versionning Git des migrations** — actuellement migrations dans le
  repo, commit a chaque changement de schema. OK pour 1 dev. A revoir si
  une equipe rejoint.

## Bugs connus

- **Permissions par tenant non câblées** (noté 2026-05-01)
  La collection Users a `roles: ['super-admin' | 'client' | 'site-reader']`
  au niveau racine, mais pas de `roles` au niveau `tenants[]`. L'exemple
  officiel Payload utilise `tenantsArrayField({ rowFields: [{ name: 'roles',
  options: ['tenant-admin', 'tenant-viewer'] }] })` pour avoir un contrôle
  d'accès par tenant. À ajouter quand un client demandera un user avec
  rôles différents selon le tenant (peu probable en V1, OK comme c'est).
  Voir `~/.claude/docs/payload-examples/multi-tenant/src/collections/Users/`
  pour le pattern.

- **formBlock auto-seed silencieusement rejete** (voir P1) — workaround
  manuel via UI admin.
- **Cookie tenant obsolete apres reset DB** — fix = re-selectionner un
  tenant dans le dropdown admin.
- **Super-admin voit 0 docs sans tenant selectionne** (comportement
  volontaire du plugin multi-tenant) — pas un bug.

## Metriques de succes V1

- ✅ Admin CMS en FR, white-label, light mode
- ✅ 3 tenants isoles testes (clés API ne franchissent pas la frontiere)
- ✅ 3 sites live sur CF Pages (demo/artisan/restaurant)
- ✅ Magic link fonctionnel via Brevo
- ✅ Header + Footer editables par tenant
- ✅ Pages avec 7 types de blocks
- ✅ SEO par page
- ✅ Formulaires editables par le client (avec reserve sur auto-seed formBlock)
- ⏳ Prod deployed → objectif prochaine session
