# CMS Veridian — Giga TODO pour rendre l'admin "Didier-ready" en un sprint

> **Contexte** : tests menés le 2026-05-12 dans l'admin prod
> (`cms.veridian.site/admin`) ont révélé qu'avec ce qui est déjà livré
> (`UploadWithPreview` commits `35751ef` + `ac1d611`, public read media `20bbb30`,
> volume Docker `f5a9713`, ServicesAlternated imagePosition côté site `1918665`),
> **Didier ne peut toujours pas remplacer une image dans la pratique**. Cette
> TODO liste tout ce qui doit être livré dans la branche `fix/cms-upload-preview-fetch`
> (ou splittée si trop gros) pour qu'il soit autonome dès la première démo.
>
> **Audience** : agent CMS travaillant dans
> `/home/brunon5/Bureau/veridian-platform-cms/` (worktree dédié, branche
> `fix/cms-upload-preview-fetch`).
>
> **Cadre architectural à respecter** :
> - Multi-tenant strict (jamais de feature monolithique)
> - Robert est dev solo → simplicité avant tout
> - Source de vérité = CMS (pas de hardcode dans les sites)
> - Provisionner un nouveau client < 30 min
> - Ne JAMAIS toucher la prod sans backup DB :
>   `ssh prod-pub "docker exec veridian-cms-postgres-prod pg_dump -U cms veridian_cms" > /tmp/cms-backup-$(date +%F-%H%M).sql`
>
> **Priorité** : items marqués 🔴 sont bloquants pour la démo Didier. Le reste
> est confort éditorial / robustesse / scale futur.

---

## SOMMAIRE

1. [🔴 BLOCK DIDIER — UploadWithPreview UX (3 fix)](#1--block-didier--uploadwithpreview-ux-3-fix)
2. [🔴 BLOCK DIDIER — Drawer de sélection média (vignettes + alts propres)](#2--block-didier--drawer-de-sélection-média-vignettes--alts-propres)
3. [🔴 BLOCK DIDIER — Bloquer suppressions accidentelles](#3--block-didier--bloquer-suppressions-accidentelles)
4. [🟡 Confort Didier — Dashboard d'accueil + raccourcis](#4--confort-didier--dashboard-daccueil--raccourcis)
5. [🟡 Confort Didier — Rôle "editor" intermédiaire](#5--confort-didier--rôle-editor-intermédiaire)
6. [🟡 Confort Didier — Media : champs category/usage/tags](#6--confort-didier--media--champs-categoryusagetags)
7. [🟡 Confort Didier — Validations strictes par champ](#7--confort-didier--validations-strictes-par-champ)
8. [🟡 Confort Didier — Notifications rebuild dans l'admin](#8--confort-didier--notifications-rebuild-dans-ladmin)
9. [🟡 Confort Didier — Live preview multipage](#9--confort-didier--live-preview-multipage)
10. [🟢 Modularité tenant — Features JSON](#10--modularité-tenant--features-json)
11. [🟢 Modularité tenant — Branding (couleurs, typo, radius)](#11--modularité-tenant--branding-couleurs-typo-radius)
12. [🟢 Modularité tenant — CompanyInfo collection (lib/site.ts → CMS)](#12--modularité-tenant--companyinfo-collection-libsitets--cms)
13. [🟢 Modularité tenant — Partners collection (partners.json → CMS)](#13--modularité-tenant--partners-collection-partnersjson--cms)
14. [🟢 Blocs CMS manquants (Stats, FAQ, Contact, Team, Timeline)](#14--blocs-cms-manquants-stats-faq-contact-team-timeline)
15. [🟢 Catégories de produits par tenant](#15--catégories-de-produits-par-tenant)
16. [🟢 Sécurité — 2FA super-admin, rate limit, headers](#16--sécurité--2fa-super-admin-rate-limit-headers)
17. [🟢 Infra — Storage R2, backup DB, monitoring](#17--infra--storage-r2-backup-db-monitoring)
18. [🟢 DX — Skill /cms-provision, tests e2e, docs](#18--dx--skill-cms-provision-tests-e2e-docs)
19. [🟢 Workflow review (draft → review → publish)](#19--workflow-review-draft--review--publish)
20. [🟢 Bulk operations media (sélection multiple, import CSV products)](#20--bulk-operations-media-sélection-multiple-import-csv-products)
21. [🟢 Cleanup CMS prod après live (produit fantôme id=28, etc.)](#21--cleanup-cms-prod-après-live-produit-fantôme-id28-etc)

---

## 1. 🔴 BLOCK DIDIER — UploadWithPreview UX (3 fix)

### 1.1 Bouton "Remplacer cette image" gros et visible

**Problème observé** : aujourd'hui le wrapper `UploadWithPreview` affiche
la miniature 150×100 à droite + le champ natif Payload à gauche (`{filename}.png  330KB ✏️ ✕`). Les 2 icônes ✏️ et ✕ sont 16×16 sans label.

Workflow réel pour remplacer une image :
1. Cliquer ✕ (micro-icône) pour déconnecter
2. Apparaissent alors 2 gros boutons "Créer un(e) nouveau" / "Choisir parmi les existants"
3. Cliquer "Choisir parmi les existants" → drawer

Workflow attendu par Didier : un bouton visible "Remplacer cette image" qui
ouvre directement le drawer.

**Fix** dans `cms/src/components/UploadWithPreview/index.tsx` :

Ajouter sous la miniature (ou à côté) deux boutons clairement labelés :

```tsx
{previewUrl && (
  <div className="veridian-upload-with-preview__actions">
    <button
      type="button"
      className="btn btn--style-secondary btn--size-small"
      onClick={() => {
        // Vide la value → re-render avec les boutons "Créer/Choisir" natifs
        setValue(null)
      }}
    >
      🔄 Remplacer cette image
    </button>
    <button
      type="button"
      className="btn btn--style-secondary btn--size-small"
      onClick={() => openMediaEditDrawer(id)}  // alt + légende
    >
      ✏️ Modifier les infos
    </button>
  </div>
)}
```

Utiliser `useField` exposé `setValue` pour clear la value programmatiquement.
Pour `openMediaEditDrawer`, soit appeler la nav drawer Payload natif (cf.
`@payloadcms/ui` exports `useDrawer`), soit naviguer vers
`/admin/collections/media/{id}` dans un nouvel onglet.

**Test acceptance** :
- [ ] Cliquer "🔄 Remplacer cette image" → bascule en mode "vide" → boutons
      "Créer/Choisir parmi les existants" visibles dans le champ Payload
- [ ] Cliquer "✏️ Modifier les infos" → ouvre l'édition du média actuel
- [ ] Garde la miniature visible jusqu'à ce qu'une nouvelle image soit liée
- [ ] Test sur Hero, SplitImageText, Cards2, Gallery, LogoWall, QuoteCard,
      Testimonials, Products.image — tous les 8 champs

### 1.2 Fix stale display dans UploadWithPreview

**Problème observé** : produit id=27 (DX 8000) avec `image=null` en DB
affichait stale `stock__Café.png` (id=255) dans le wrapper après navigation
(probablement reste d'un produit consulté juste avant).

Le commit `ac1d611` ("fetches media when useField returns only the id") a
résolu une partie. Mais reste à vérifier en navigation :

**Test repro** :
1. Ouvrir produit A avec image lié X
2. Naviguer (sidebar) vers produit B sans image
3. Observer : la miniature de X est-elle encore affichée ?

**Fix recommandé** dans `cms/src/components/UploadWithPreview/index.tsx` :

Le state local `fetched` doit être reset au changement de `id` :

```tsx
React.useEffect(() => {
  setFetched(null)  // reset immédiatement, avant le fetch
  if (inline || id === null) return
  // ... fetch logic existant
}, [id, collection, inline])
```

Actuellement le `setFetched(null)` n'est appelé que si `inline || id === null`,
donc en transition d'un id A vers un id B, la valeur stale de A reste
affichée pendant le fetch de B.

**Test acceptance** :
- [ ] Reproduire le repro ci-dessus → la miniature de X disparaît
      instantanément quand on arrive sur B (avant le fetch)
- [ ] Naviguer A → B → A : la miniature affiche bien X (pas Y)

### 1.3 Drag & drop visible directement sur le wrapper

**Problème observé** : la drop zone "ou glisser-déposer un fichier" n'est
visible qu'après avoir cliqué ✕ pour vider. Pour Didier qui veut juste
uploader rapidement, c'est caché.

**Fix** : permettre le drop n'importe où sur le composant (overlay drop
zone qui se révèle au dragenter). Optionnel — pas bloquant. Mais bonne UX.

```tsx
const [isDragging, setIsDragging] = React.useState(false)
return (
  <div
    className="veridian-upload-with-preview"
    onDragEnter={() => setIsDragging(true)}
    onDragLeave={() => setIsDragging(false)}
    onDrop={async (e) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) await uploadAndLink(file)
    }}
  >
    {isDragging && <div className="drop-overlay">Lâchez pour remplacer</div>}
    {/* existing JSX */}
  </div>
)
```

**Test acceptance** : drag d'un fichier depuis le bureau sur n'importe quel
champ image → uploadé + lié sans clic.

---

## 2. 🔴 BLOCK DIDIER — Drawer de sélection média (vignettes + alts propres)

### 2.1 Liste media en grille avec vignettes (pas en tableau texte)

**Problème observé** : le drawer "Choisir parmi les existants" affiche les
253 médias dans un tableau `Texte alt / Légende / Date`. **Pas de vignette**.
Pour Didier qui cherche "la photo du caviste" parmi 50 photos secteurs
(toutes nommées "Café", "Caviste", etc.), c'est l'enfer.

**Fix** : custom list view pour la collection `media` qui force un
affichage grille avec thumbnails.

Dans `cms/src/collections/Media.ts` :

```ts
admin: {
  // ...existant
  components: {
    views: {
      list: {
        Component: '/components/MediaGridView/index.tsx#MediaGridView',
      },
    },
  },
}
```

Créer `cms/src/components/MediaGridView/index.tsx` qui :
1. Utilise `useListQuery` ou équivalent Payload pour fetcher les docs
2. Affiche en grille 4-6 colonnes : carte avec thumbnail + alt en
   sous-titre + checkbox de sélection si on est dans un drawer
3. Garde la recherche par alt + filtres (date, taille, mime type)
4. Pagination

**Inspiration** : Payload v3 list view native `DefaultList` —
`@payloadcms/ui/elements/Table` exports `DefaultListView` que tu peux
wrapper. Ou repartir from scratch avec `useListQuery`.

**Test acceptance** :
- [ ] Naviguer vers `/admin/collections/media` → grille avec vignettes
- [ ] Ouvrir le drawer depuis un champ Hero.image → mêmes vignettes
- [ ] Cliquer une vignette dans le drawer → lié au champ + drawer ferme
- [ ] La recherche par alt fonctionne
- [ ] Performance : 253 médias = 1 fetch + lazy loading des images

### 2.2 Renommer les alts génériques "Café", "Caviste"... en quelque chose d'utile

**Problème observé** : le script `upload-images.py` a généré des alts depuis
le filename (`Café.png` → `"Café"`). Pour 253 médias, beaucoup ont des alts
identiques ou peu descriptifs.

**Fix** : c'est un cleanup côté data, pas code. Un script SQL ou un script
admin à lancer 1× pour patcher les alts.

Critères de patch :
- Préfixer chaque alt avec sa catégorie inférée du filename
- Ex: `used__partners_sunmi.svg` → alt `"Logo partenaire Sunmi"`
- Ex: `stock__Café.png` → alt `"Photo secteur — Café (banque image)"`
- Ex: `used__hero_hero-verifone-spa-desktop.webp` → alt `"Hero — TPE Verifone Android (desktop)"`

Script à créer `cms/scripts/patch-media-alts.ts` :

```ts
const PATTERNS = [
  { match: /^used__hero_/, prefix: 'Hero — ' },
  { match: /^used__partners_/, prefix: 'Logo partenaire — ' },
  { match: /^used__products_/, prefix: 'Produit — ' },
  { match: /^used__legacy_/, prefix: 'Page Services — ' },
  { match: /^used__brands_/, prefix: 'Marque distribuée — ' },
  { match: /^used__references_/, prefix: 'Client référence — ' },
  { match: /^used__illustrations_/, prefix: 'Illustration UI — ' },
  { match: /^stock__/, prefix: 'Banque image (stock) — ' },
]
// fetch all media, patch alt with prefix + clean filename
```

**Test acceptance** :
- [ ] Lancer le script → 253 alts patchés
- [ ] Vérifier dans le drawer admin : les alts sont distinctifs et
      informatifs

---

## 3. 🔴 BLOCK DIDIER — Bloquer suppressions accidentelles

### 3.1 Pages critiques non supprimables (home, contact, mentions-legales, politique-confidentialite)

**Problème** : aujourd'hui Didier peut accidentellement supprimer sa home
ou ses mentions légales depuis l'admin → site cassé.

**Fix** dans `cms/src/collections/Pages.ts` :

```ts
const CRITICAL_SLUGS = ['home', 'contact', 'mentions-legales', 'politique-confidentialite']

access: {
  read: ({ req }) => Boolean(req.user),
  delete: ({ req, id }) => {
    if (!req.user) return false
    if (req.user.roles?.includes('super-admin')) return true
    // Pour les clients : interdire si la page a un slug critique
    // (resolveCriticalSlugFromId pourrait fetch le doc ou stocker en cache)
    return { slug: { not_in: CRITICAL_SLUGS } }
  },
}
```

Bonus : ajouter un message UI clair quand l'utilisateur essaye :
`admin.preview` ou hook `beforeDelete` qui throw avec message FR.

**Test acceptance** :
- [ ] Connecté en tant que `client` (compte avse.monetique@gmail.com) →
      tentative suppression home → refusé avec message
- [ ] Connecté en tant que `super-admin` → autorisé

### 3.2 Tenant non supprimable depuis l'admin par les clients

Tenant.access.delete = `super-admin` only (déjà le cas, vérifier).

### 3.3 Header / Footer non supprimables (collection avec 1 doc par tenant)

Empêcher la suppression du Header/Footer du tenant courant (sinon site cassé).
Hook `beforeDelete` qui refuse.

### 3.4 Médias référencés non supprimables

**Problème** : Didier supprime une image qui est utilisée par un bloc Hero
→ image cassée sur le site.

**Fix** dans `cms/src/collections/Media.ts` :

Hook `beforeDelete` qui scan toutes les collections (pages, products,
header, footer) pour voir si le media id est référencé → throw si oui avec
liste des références.

```ts
hooks: {
  beforeDelete: [async ({ id, req }) => {
    const usages = await Promise.all([
      req.payload.find({ collection: 'pages', where: { 'blocks.image': { equals: id } } }),
      req.payload.find({ collection: 'pages', where: { 'blocks.cards.image': { equals: id } } }),
      req.payload.find({ collection: 'products', where: { image: { equals: id } } }),
      req.payload.find({ collection: 'header', where: { logo: { equals: id } } }),
      // ... etc
    ])
    const totalUsage = usages.reduce((sum, u) => sum + u.totalDocs, 0)
    if (totalUsage > 0) {
      throw new Error(`Ce média est utilisé par ${totalUsage} document(s). Retirez-le d'abord avant de le supprimer.`)
    }
  }]
}
```

**Test acceptance** :
- [ ] Supprimer un média utilisé → erreur avec message clair
- [ ] Supprimer un média non utilisé → OK

---

## 4. 🟡 Confort Didier — Dashboard d'accueil + raccourcis

**Problème** : Didier ouvre `cms.veridian.site/admin` → atterrit sur la
landing Payload standard. Pas user-friendly.

**Fix** : `BeforeDashboard` est déjà présent (`cms/src/components/BeforeDashboard`).
À enrichir avec :
- Carte "Bonjour Didier" personnalisée (nom du user connecté)
- 3 raccourcis : "Modifier l'accueil" → `/admin/collections/pages/5`,
  "Catalogue produits" → `/admin/collections/products`, "Médiathèque" →
  `/admin/collections/media`
- "Voir mon site" → `https://avse-monetique.veridian.site` (depuis
  `tenant.siteUrl`)
- Dernières modifs (top 5 across pages/products/media du tenant courant)
- État rebuild courant (si possible : query CF Pages API)

**Test acceptance** :
- [ ] Login Didier → dashboard custom visible
- [ ] Tous les raccourcis fonctionnent
- [ ] "Voir mon site" ouvre dans un nouvel onglet

---

## 5. 🟡 Confort Didier — Rôle "editor" intermédiaire

**Problème** : Didier est `client` = peut TOUT modifier (créer/supprimer
pages, produits, etc.). Trop permissif.

**Fix** dans `cms/src/collections/Users.ts` :

Ajouter rôle `editor` aux options :

```ts
{ name: 'roles', type: 'select', hasMany: true,
  options: [
    { label: 'Super administrateur (Veridian)', value: 'super-admin' },
    { label: 'Client (autonomie totale)', value: 'client' },
    { label: 'Éditeur (peut modifier le contenu, pas créer/supprimer)', value: 'editor' },
    { label: 'Lecteur site (clé API)', value: 'site-reader' },
  ],
}
```

Puis sur Pages/Products :

```ts
access: {
  create: ({ req }) => isSuperAdmin(req) || isClient(req),  // PAS editor
  delete: ({ req }) => isSuperAdmin(req),  // PAS client ni editor pour pages critiques
  update: ({ req }) => Boolean(req.user),  // tous
  read: ({ req }) => Boolean(req.user),
}
```

Passer Didier en `editor` par défaut. Robert reste `super-admin`.

**Test acceptance** :
- [ ] Didier en `editor` ne peut PAS créer une nouvelle page (bouton
      "Créer" caché ou refusé côté API)
- [ ] Didier en `editor` ne peut PAS supprimer une page
- [ ] Didier en `editor` peut éditer le contenu de toutes les pages
      existantes

---

## 6. 🟡 Confort Didier — Media : champs category/usage/tags

**Problème** : aujourd'hui le schéma `Media` ne stocke que `alt` + `caption`.
Le workaround actuel = préfixe filename (`used__` vs `stock__`). Pas
filtrable nativement dans l'admin.

**Fix** dans `cms/src/collections/Media.ts` :

```ts
fields: [
  { name: 'alt', type: 'text', required: true },
  { name: 'caption', type: 'text' },
  {
    name: 'category',
    type: 'select',
    label: 'Catégorie',
    defaultValue: 'in-use',
    options: [
      { label: 'En usage sur le site', value: 'in-use' },
      { label: 'Banque (pas encore utilisée)', value: 'stock' },
      { label: 'Archive (ancien, gardé pour mémoire)', value: 'archive' },
    ],
  },
  {
    name: 'usage',
    type: 'select',
    hasMany: true,
    label: 'Type d\'usage',
    options: [
      { label: 'Hero / bannière', value: 'hero' },
      { label: 'Produit', value: 'product' },
      { label: 'Logo partenaire', value: 'partner-logo' },
      { label: 'Photo équipe', value: 'team' },
      { label: 'Mascotte', value: 'mascot' },
      { label: 'Icône', value: 'icon' },
      { label: 'Illustration', value: 'illustration' },
      { label: 'Photo secteur commerce', value: 'sector' },
    ],
  },
  { name: 'tags', type: 'array', fields: [{ name: 'tag', type: 'text' }] },
]
```

Auto-set `category` au upload :
```ts
hooks: {
  beforeChange: [({ data, operation }) => {
    if (operation === 'create' && !data.category) {
      if (data.filename?.startsWith('stock__')) data.category = 'stock'
      else data.category = 'in-use'
    }
    return data
  }]
}
```

Migration des 253 médias existants : script `scripts/migrate-media-category.ts`
qui parse le filename pour set la category.

**Test acceptance** :
- [ ] Migration ok : 50 stock, 203 in-use
- [ ] Filtre `category=stock` dans l'admin liste → 50 docs
- [ ] Upload nouveau → category auto-set

---

## 7. 🟡 Confort Didier — Validations strictes par champ

Empêcher Didier de coller un texte trop long, un email mal formé, un
numéro de téléphone mauvais format.

### 7.1 Hero : titre max 120, subtitle max 300

Dans `cms/src/blocks/Hero.ts` :
```ts
{ name: 'title', type: 'text', required: true, maxLength: 120 },
{ name: 'subtitle', type: 'textarea', maxLength: 300 },
{ name: 'eyebrow', type: 'text', maxLength: 80 },
```

### 7.2 Validators custom (SIRET, téléphone, email)

À utiliser sur CompanyInfo (cf. section 12) :
```ts
const validateSiret = (val: string | null | undefined) => {
  if (!val) return true
  return /^\d{9}\s?\d{5}$/.test(val.replace(/\s/g, '')) || 'SIRET = 14 chiffres'
}
const validateFrenchPhone = (val: string | null | undefined) => {
  if (!val) return true
  return /^(?:\+33|0)[1-9](?:\s?\d{2}){4}$/.test(val) || 'Format: 06 12 34 56 78 ou +33 6 12 34 56 78'
}
const validateFrenchZip = (val: string | null | undefined) => {
  if (!val) return true
  return /^\d{5}$/.test(val) || 'Code postal = 5 chiffres'
}
```

À placer dans `cms/src/lib/validators.ts` (fichier à créer).

**Test acceptance** :
- [ ] Coller un title de 200 chars dans Hero → admin refuse avec message
- [ ] SIRET incorrect → refus
- [ ] Téléphone "+33 666" → refus

---

## 8. 🟡 Confort Didier — Notifications rebuild dans l'admin

**Problème** : quand Didier publie une page, le webhook CF Pages part en
silencieux. Aucun feedback dans l'UI. Il ne sait pas si le rebuild a réussi
ou échoué.

**Fix** : hook `afterChange` qui poste un message dans une collection
`rebuild-logs` (à créer) ou qui set un toast via Payload UI.

Simple : ajouter un toast Payload via la lib `@payloadcms/ui` :

```tsx
// cms/src/hooks/triggerSiteRebuild.ts
// après le POST :
if (req.user) {
  // expose un message structuré pour l'UI
  req.payload.logger.info(`[rebuild] tenant ${tenant.slug} déclenché`)
  // Optionnel : insérer dans une collection 'rebuild-logs' pour audit
}
```

Plus poussé : un endpoint custom `/api/_internal/rebuild-status` que le
dashboard interroge en polling toutes les 10s pour afficher l'état.

**Test acceptance** :
- [ ] Publier une page → toast vert "Site en cours de mise à jour, ~2 min"
- [ ] Si rebuild fail → toast rouge avec lien vers les logs
- [ ] Optionnel : badge "Mise à jour terminée" qui apparaît au prochain
      login

---

## 9. 🟡 Confort Didier — Live preview multipage

**Problème** : `payload.config.ts:livePreview` configuré pour
`['pages','header','footer']`. La home AVSE a `HomePreview` qui marche.
**Mais les autres pages (services, partenaires, contact) n'ont pas de
preview configurée côté site.**

**Vérification** :
1. Aller dans l'admin → `/admin/collections/pages/6` (services)
2. Cliquer "Live preview"
3. L'iframe charge-t-elle `avse-monetique.veridian.site/services?preview=1` ?
4. Le bouton "Live preview" est-il même visible sur cette page ?

**Fix côté site** (probablement Robert/agent AVSE) : étendre
`LivePreviewBoundary` aux pages services, partenaires, contact.

Côté CMS : pas de fix nécessaire si l'URL builder dans
`payload.config.ts:livePreview.url` retourne déjà la bonne URL pour
chaque slug.

**Test acceptance** :
- [ ] Live preview fonctionne sur les 6 pages CMS d'AVSE
- [ ] Changer le hero title sur /services → l'iframe re-render dans les 3s

---

## 10. 🟢 Modularité tenant — Features JSON

**Use case** : chaque tenant a son propre profil de features actives.
Morel Volailles n'a pas besoin de `products`, Tramtech n'a pas besoin de
`partners`, etc.

**Fix** dans `cms/src/collections/Tenants.ts` :

```ts
{
  name: 'features',
  type: 'json',
  label: 'Fonctionnalités activées',
  defaultValue: {
    products: true,
    partners: false,
    map: false,
    testimonials: false,
    floatingCta: true,
    livePreview: true,
  },
  admin: {
    description: 'Active/désactive les modules pour ce client',
    condition: (_, __, { user }) =>
      Boolean(user?.roles?.includes('super-admin')),
  },
}
```

Conséquences :
- Pages.access.read filter sur `tenant.features.partners` si on accède à
  des données partenaires
- Custom view dans la sidebar admin qui cache les collections désactivées
  pour ce tenant
- Côté site : lit `tenant.features` au build, désactive les sections
  correspondantes

**Test acceptance** :
- [ ] Toggle `features.products: false` sur tenant test → collection
      "Catalogue" cachée de la sidebar admin
- [ ] Le site rebuild ignore la page catalogue

---

## 11. 🟢 Modularité tenant — Branding (couleurs, typo, radius)

**Use case** : Didier veut changer la couleur primaire de son site sans
toucher au code.

**Fix** dans `cms/src/collections/Tenants.ts` :

```ts
{
  name: 'branding',
  type: 'group',
  label: 'Identité visuelle',
  fields: [
    {
      name: 'primaryColor',
      type: 'text',
      label: 'Couleur principale (hex)',
      defaultValue: '#0a2540',
      validate: (val: string | undefined) => {
        if (!val) return true
        return /^#[0-9a-fA-F]{6}$/.test(val) || 'Format : #RRGGBB'
      },
      admin: { description: 'Ex : #0a2540 (bleu marine)' },
    },
    { name: 'accentColor', type: 'text', defaultValue: '#ffd23f',
      validate: hexValidator },
    {
      name: 'borderRadius',
      type: 'select',
      defaultValue: 'md',
      options: [
        { label: 'Brutaliste (0px)', value: 'none' },
        { label: 'Doux (4px)', value: 'sm' },
        { label: 'Standard (8px)', value: 'md' },
        { label: 'Arrondi (16px)', value: 'lg' },
        { label: 'Pilule (9999px)', value: 'pill' },
      ],
    },
    {
      name: 'fontFamily',
      type: 'select',
      defaultValue: 'inter',
      options: ['inter', 'playfair', 'cormorant', 'lora', 'system'],
    },
  ],
}
```

Côté site : layout.tsx lit `tenant.branding` au build, injecte des CSS
variables overrides dans `<style>` (cf. section 8 de
`AVSE-CMS-FEATURES-TODO.md`).

**Test acceptance** :
- [ ] Changer `branding.primaryColor` dans l'admin → CF Pages rebuild →
      les boutons/headers du site adoptent la nouvelle couleur
- [ ] Validation hex refuse "blue" ou "rgb(...)"

---

## 12. 🟢 Modularité tenant — CompanyInfo collection (lib/site.ts → CMS)

**Use case** : aujourd'hui `site/src/lib/site.ts` hardcode SIRET, phones,
adresse, dirigeant. Didier ne peut rien modifier. **Plus gros manque
fonctionnel actuel.**

**Fix** : nouvelle collection `company-info` (1 doc par tenant) ou
groupe sur `Tenants` (plus simple).

Option A — Groupe sur Tenants (recommandé pour V1, simple) :

```ts
// Tenants.ts
{
  name: 'company',
  type: 'group',
  label: 'Informations entreprise',
  fields: [
    { name: 'legalName', type: 'text', label: 'Raison sociale' },
    { name: 'legalForm', type: 'select',
      options: ['SARL','SAS','SASU','EI','EURL','SA','Auto-entrepreneur'] },
    { name: 'capital', type: 'text', label: 'Capital social (texte libre)' },
    { name: 'siren', type: 'text', validate: validateSiren },
    { name: 'siret', type: 'text', validate: validateSiret },
    { name: 'tvaIntra', type: 'text', validate: validateTvaIntra },
    { name: 'naf', type: 'text', label: 'Code NAF/APE' },
    { name: 'rcs', type: 'text', label: 'Ville RCS' },
    { name: 'directorName', type: 'text', label: 'Dirigeant' },
    { name: 'foundedYear', type: 'number', min: 1900, max: 2100 },
  ],
},
{
  name: 'contact',
  type: 'group',
  label: 'Contact',
  fields: [
    {
      name: 'phones',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', admin: { description: 'Ex: Mobile, Fixe' } },
        { name: 'number', type: 'text', validate: validateFrenchPhone },
        { name: 'primary', type: 'checkbox', label: 'Numéro principal (CTA)' },
      ],
    },
    { name: 'email', type: 'email', required: true },
    {
      name: 'address',
      type: 'group',
      fields: [
        { name: 'street', type: 'text', required: true },
        { name: 'zip', type: 'text', validate: validateFrenchZip },
        { name: 'city', type: 'text', required: true },
        { name: 'country', type: 'text', defaultValue: 'France' },
      ],
    },
    { name: 'serviceZone', type: 'textarea', label: 'Zone d\'intervention' },
    {
      name: 'hours',
      type: 'array',
      fields: [
        { name: 'day', type: 'text' },
        { name: 'time', type: 'text' },
      ],
    },
  ],
}
```

Migration : script `scripts/migrate-site-to-tenant.ts` qui prend
`sites/avse/src/lib/site.ts` et populate `tenant.company` + `tenant.contact`.

Côté site Robert : remplacer `import { SITE } from '@/lib/site'` par lecture
depuis le CMS (passer `tenant` populé en context au layout).

**Test acceptance** :
- [ ] Migration → tenant AVSE id=1 a tous les champs company + contact
      remplis
- [ ] Modifier le téléphone principal dans l'admin → re-publier → site
      rebuild → le nouveau numéro apparaît dans tous les `tel:` du site
- [ ] Modifier le SIRET → mentions légales générées dynamiquement reflètent
      le nouveau

---

## 13. 🟢 Modularité tenant — Partners collection (partners.json → CMS)

**Use case** : AVSE a 47 partenaires détaillés dans
`sites/avse/src/data/partners.json` (377 lignes JSON). Didier ne peut pas
les modifier sans toucher au code.

**Fix** : nouvelle collection `partners` (cf. section 2.5 de
`AVSE-CMS-FEATURES-TODO.md`). Migration via
`scripts/seed-partners-avse.ts`.

**Test acceptance** :
- [ ] 47 partenaires importés en collection `partners` tenant=1
- [ ] Modifier le body d'un partenaire dans l'admin → site rebuild →
      page `/partenaires/{slug}` reflète le changement

---

## 14. 🟢 Blocs CMS manquants (Stats, FAQ, Contact, Team, Timeline)

Cf. `AVSE-CMS-FEATURES-TODO.md` section 4. Liste résumée :

- `StatsBlock` : chiffres clés (1500+, 20 ans, 7j/7)
- `FAQBlock` : `<details><summary>` + JSON-LD FAQPage SEO
- `ContactBlock` : carte Google Maps embed + formulaire intégré
- `TeamBlock` / `PortraitBlock` : portrait dirigeant standardisé
- `TimelineBlock` : historique (1989 → 2005 → 2026)
- `PricingBlock` : tableau de tarifs côte à côte

Chaque bloc = 1 fichier `cms/src/blocks/<Name>.ts` + 1 composant React
côté site (Robert) + ajout dans `Pages.blocks` array.

**Test acceptance** :
- [ ] Chaque nouveau bloc est sélectionnable dans l'admin
- [ ] Rendu côté site OK
- [ ] Live preview re-render correct

---

## 15. 🟢 Catégories de produits par tenant

**Use case** : aujourd'hui `Products.category` a 7 options hardcodées
(tpe, caisses, peripheriques...). Pour Morel Volailles ces options
n'ont pas de sens.

**Fix** : déplacer la liste en champ `tenant.productCategories` (array
de `{ value, label }`), puis `Products.category` devient un select
dynamique qui lit du tenant courant.

```ts
// Products.ts
{
  name: 'category',
  type: 'select',
  required: true,
  options: async ({ req }) => {
    const tenantId = req.user?.tenants?.[0]?.tenant
    if (!tenantId) return [{ label: 'Général', value: 'general' }]
    const tenant = await req.payload.findByID({ collection: 'tenants', id: tenantId })
    return tenant?.productCategories ?? [{ label: 'Général', value: 'general' }]
  },
}
```

**Note** : `options` async dans Payload existe via `admin.components` ou
hook `beforeChange`. À vérifier la bonne API v3.82.

**Test acceptance** :
- [ ] Tenant AVSE a ses 7 catégories TPE/Caisses/etc.
- [ ] Création nouveau tenant → catégories vides par défaut, super-admin
      les remplit

---

## 16. 🟢 Sécurité — 2FA super-admin, rate limit, headers

### 16.1 2FA TOTP pour super-admin

Plugin communautaire `payload-2fa` ou intégration custom via `otplib`.

### 16.2 Rate limit login admin

Middleware Express `express-rate-limit` sur `/admin/login` :
- 5 tentatives / 15 min / IP
- Lock 1h après dépassement

Ou Cloudflare WAF rule sur `cms.veridian.site/admin/login`.

### 16.3 Headers sécurité

Vérifier que Payload renvoie : CSP, HSTS, X-Frame-Options (sauf pour
l'iframe live preview qui doit autoriser `cms.veridian.site` en frame
ancestor).

`payload.config.ts` :
```ts
cors: [...],  // déjà OK
csrf: [...],  // déjà OK
// Ajouter middleware express :
custom: {
  middleware: [
    (req, res, next) => {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
      next()
    }
  ]
}
```

### 16.4 CVE — audit ci-bloquant

Cf. CLAUDE.md global section CVE. Ajouter dans `cms/.github/workflows/cve-audit.yml` :

```yaml
- name: pnpm audit
  run: pnpm audit --audit-level high
- name: Trivy image scan
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: 'ghcr.io/christ-roy/veridian-cms:${{ github.sha }}'
    severity: 'CRITICAL,HIGH'
    exit-code: '1'
```

---

## 17. 🟢 Infra — Storage R2, backup DB, monitoring

### 17.1 Migration storage local → Cloudflare R2

Aujourd'hui le volume Docker stocke 65 Mo localement. À ce rythme on
peut continuer des mois. Mais :
- Pas de backup auto (si VPS crash → tout perdu)
- Pas de CDN devant
- Pas scalable au-delà de quelques milliers d'images

Migration recommandée vers `@payloadcms/storage-s3` (compat R2). Cf.
section 1.1 de `AVSE-CMS-FEATURES-TODO.md` pour les détails de config.

### 17.2 Backup DB Postgres quotidien

```bash
# cron sur le VPS : 0 3 * * * /home/ubuntu/backup-cms.sh
docker exec veridian-cms-postgres-prod pg_dump -U cms veridian_cms \
  | gzip > /home/ubuntu/backups/cms-$(date +%F).sql.gz
# Retention 30 jours
find /home/ubuntu/backups -name 'cms-*.sql.gz' -mtime +30 -delete
```

### 17.3 Health endpoint enrichi

`cms/src/endpoints/health.ts` :
```ts
{
  path: '/health',
  method: 'get',
  handler: async (req, res) => {
    const checks = {
      db: false,
      mediaStorage: false,
      secretSet: Boolean(process.env.PAYLOAD_SECRET),
    }
    try {
      await req.payload.find({ collection: 'users', limit: 1 })
      checks.db = true
    } catch {}
    try {
      const fs = await import('fs/promises')
      await fs.access('/app/media', fs.constants.W_OK)
      checks.mediaStorage = true
    } catch {}
    const ok = Object.values(checks).every(Boolean)
    res.status(ok ? 200 : 503).json({ ok, checks })
  }
}
```

### 17.4 Monitoring spécifique CMS

Ajouter dans `/opt/veridian/monitoring/docker-monitor.sh` (PROD) un check
spécifique pour `veridian-cms-prod` et `veridian-cms-postgres-prod` qui
ping `/api/health` et alerte Telegram si fail.

---

## 18. 🟢 DX — Skill /cms-provision, tests e2e, docs

### 18.1 Skill /cms-provision à enrichir

Vérifier que le skill provisione bien un tenant en < 30 min de bout en
bout :
1. Créer tenant
2. Seed pages depuis `sites/<slug>/src/content/`
3. Seed produits si applicable
4. Créer user client + magic link
5. Configurer CF Pages (project + custom domain + env vars)
6. Vérifier rebuild webhook
7. Premier deploy

Documenter dans `~/.claude/skills/cms-provision/SKILL.md`.

### 18.2 Tests e2e Playwright

Le dossier `cms/e2e/` existe. Vérifier que les tests couvrent :
- Login admin
- Édition d'une page → autosave → preview iframe
- Upload media (post-fix volume)
- Création produit
- Suppression refusée d'une page critique
- Logout

CI : `pnpm test:e2e` qui passe sur chaque PR.

### 18.3 Docs CMS pour Robert + futurs collaborateurs

`cms/README.md` à enrichir :
- Setup local
- Comment provisionner un tenant
- Liste des hooks afterChange et leur effet
- Glossaire (tenant, collection, global, bloc, draft, version)
- Comment debug un rebuild qui ne part pas

---

## 19. 🟢 Workflow review (draft → review → publish)

Pour les sites importants, ne pas laisser Didier publier directement.

**Fix** : ajouter champ `reviewStatus` sur Pages avec workflow :
- draft → "Demande de revue" → email à Robert → "Validé" → status=published

Implémentation : champ `select` + hooks email (`@payloadcms/email-nodemailer`
déjà actif).

Optionnel — peut être skippé pour V1 si Didier est seul.

---

## 20. 🟢 Bulk operations media (sélection multiple, import CSV products)

### 20.1 Sélection multiple Media

Custom list view (cf. section 2.1) qui ajoute des checkboxes + actions :
- Supprimer N médias
- Changer category de N médias en lot
- Tagger N médias

### 20.2 Import CSV produits

Endpoint custom `cms/src/endpoints/products-import.ts` qui accepte un
CSV (multipart upload) avec colonnes `slug,name,category,brand,priceHT,
rentMonth,imageFallbackUrl,description,refLegacy` et fait un bulk upsert.

Pour Robert qui veut ajouter 50 produits d'un coup.

---

## 21. 🟢 Cleanup CMS prod après live (produit fantôme id=28, etc.)

### 21.1 Supprimer produit fantôme tenant 1 id=28

```bash
PROD_KEY=$(grep '^CMS_ADMIN_API_KEY_PROD=' ~/credentials/.all-creds.env | cut -d= -f2)
curl -X DELETE "https://cms.veridian.site/api/products/28" \
  -H "Authorization: users API-Key $PROD_KEY"
```

Et ajouter validation `Products.beforeValidate` qui refuse name/slug vide
pour éviter récidive.

### 21.2 Patcher les alts media génériques

Cf. section 2.2.

### 21.3 Lier les `imageFallbackUrl` restants vers les media_id

Côté Pages : déjà fait (script `tmp/cms-upload/link-media-to-blocks.py`).
Reste à faire pour Products : 27 produits ont encore `imageFallbackUrl` mais
pas de `image` lié. Script `scripts/link-product-images.ts` à créer (mapping
`imageFallbackUrl` → media_id via `used-mapping.json` du repo AVSE).

---

## ORDRE DE LIVRAISON RECOMMANDÉ

**Sprint 1 (bloquant Didier — 2-3 jours)** :
1. UploadWithPreview UX 3 fix (section 1) — 1 jour
2. Drawer media grille vignettes (section 2.1) — 1 jour
3. Patch alts media (section 2.2) — 1h script
4. Bloquer suppressions critiques (section 3.1-3.3) — 2h
5. Bloquer suppression media référencé (section 3.4) — 3h
6. Suppr produit fantôme + validate (section 21.1) — 30 min

→ **Démo Didier OK à la fin du Sprint 1.**

**Sprint 2 (confort éditorial — 1 semaine)** :
7. Dashboard custom (section 4)
8. Rôle editor (section 5)
9. Media category/usage/tags (section 6)
10. Validations strictes (section 7)
11. Notifications rebuild (section 8)
12. Live preview multipage (section 9)

**Sprint 3 (modularité multi-tenant — 1-2 semaines)** :
13. Tenants.features JSON (section 10)
14. Branding par tenant (section 11)
15. CompanyInfo (section 12) — gros morceau
16. Partners collection (section 13)
17. Catégories produits par tenant (section 15)

**Sprint 4 (nouveaux blocs + DX — 1 semaine)** :
18. 5 nouveaux blocs (section 14)
19. Skill /cms-provision audit (section 18.1)
20. Tests e2e Playwright (section 18.2)

**Sprint 5 (infra & sécurité — au fil de l'eau)** :
21. R2 storage (section 17.1)
22. Backup DB (section 17.2)
23. Health endpoint (section 17.3)
24. Monitoring CMS (section 17.4)
25. 2FA + rate limit + CVE CI (section 16)

**Sprint 6 (nice-to-have, post-démo Didier)** :
26. Workflow review (section 19)
27. Bulk operations (section 20)
28. Inline editing depuis le site (cf. section 6.2 AVSE-CMS-FEATURES-TODO.md)

---

## NOTES POUR L'AGENT QUI VA TRAITER CETTE TODO

1. **Worktree** : tu bosses dans
   `/home/brunon5/Bureau/veridian-platform-cms/`, branche
   `fix/cms-upload-preview-fetch` (ou splittée). PAS dans `~/Bureau/veridian-platform/`.

2. **Ne JAMAIS** déployer sur cms.veridian.site sans :
   - Backup DB préalable
   - Test sur staging (`cms.staging.veridian.site`)
   - Accord explicite Robert

3. **Toujours** lancer en local d'abord avec `pnpm dev` (DB dev).

4. **Migrations Postgres** : préférer `payload migrate:create` à
   `PAYLOAD_DB_PUSH=true` (dangereux en prod).

5. **Hardlink** : `sites/avse/src/content/` est hardlinké à
   `/home/brunon5/www.avse-monetique.fr/site/src/content/`.
   Ne pas casser en remplaçant les fichiers.

6. **Idempotence** des scripts : Robert relance plusieurs fois, ils doivent
   être rejouables.

7. **Test acceptance** : checker chaque "Test acceptance" listé.

8. **Communication avec l'agent AVSE** : si une feature nécessite une modif
   côté site Next.js, prévenir l'agent AVSE via le main thread (Robert).

9. **CVE check obligatoire** : avant chaque deploy, `pnpm audit
   --audit-level high` doit retourner 0 vulnérabilité bloquante.

---

**État au 2026-05-12 (post-test browser)** :
- ✅ Volume Docker media writable (`f5a9713`)
- ✅ Media.access.read public (`20bbb30`)
- ✅ UploadWithPreview wrapper visible 7 blocs + Products (`35751ef`)
- ✅ Fix stale value via fetch by id (`ac1d611`)
- ✅ Côté site : `cms.hero.image` câblé sur HomeView + 3 pages PageHero (commit `45406f6`)
- ✅ Côté site : `imagePosition` lu par ServicesAlternated (commit `1918665`)
- ❌ **3 fix UX UploadWithPreview** (section 1) — empêche Didier de remplacer une image facilement
- ❌ **Drawer sélection sans vignettes** (section 2.1) — Didier ne peut pas choisir visuellement
- ❌ **Alts media génériques** (section 2.2) — 253 médias avec alts identiques
- ❌ Suppressions accidentelles non bloquées (section 3)
- ❌ Tout le reste (sections 4-21)

**Recommandation Robert** : Sprint 1 seul (sections 1-3 + 21.1) suffit pour démo Didier réussie. Le reste peut attendre selon ton calendrier.
