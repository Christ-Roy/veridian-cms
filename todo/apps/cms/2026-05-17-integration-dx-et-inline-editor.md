# CMS — DX intégration sites + Inline editor visuel

> Déposé le 2026-05-17 par Robert.
> **À traiter APRÈS** : (1) intégration GitOps polyrepo terminée, (2) alignement
> sur la nouvelle archi CI commune. Ne pas démarrer avant.
>
> Contexte de la demande : aujourd'hui, brancher un site client sur le CMS est
> un calvaire pour les agents (aller-retours mismatch schéma, BlockRenderer
> à recâbler à chaque fois, types Payload pas synchronisés, env vars
> CMS_API_KEY mal scopée). En parallèle, le Live Preview existe mais reste
> "split-screen" — pas d'édition directe dans le rendu.

## Priorité 1 — Pack "Intégration CMS sans douleur" (DX agents)

**Objectif** : un agent qui branche un nouveau site client passe de ~1h
d'aller-retours à **< 10 min**, sans rien deviner sur le schéma Payload.

### 1.1 SDK partagé `@veridian/cms-sdk`

- Package npm (ou copié in-tree via `cms-init`) exposant :
  - `getPage(slug)`, `getHeader()`, `getFooter()`, `getProducts()`,
    `getCompanyInfo()`, `getPartners()` — tenant-scoped, auth API key
  - `<BlockRenderer />` complet avec **tous les blocs câblés** (Hero,
    Services, Stats, Cards2, Cards4WithIcons, SplitImageText, QuoteCard,
    Gallery, LogoWall, Testimonials, FAQ, RichText, CTA, Form)
  - `<LivePreviewBoundary />` pré-câblé (postMessage + merge debounced)
  - `<HideWhenPreview />` / `<HomePreview />` extraits du pattern AVSE
- L'agent peut **overrider 1 bloc** facilement s'il veut un design custom
  pour ce client (slot pattern ou `blockComponents={{ hero: CustomHero }}`)
- Source : factorisée depuis `template-artisan/src/components/blocks/` et
  `template-artisan/src/lib/cms.ts` (déjà mature)

### 1.2 Types Payload publiés

- Aujourd'hui `payload-types.ts` reste dans le repo CMS. Les sites le
  copient à la main → mismatch garanti à chaque évolution.
- **Option A** : publier `@veridian/cms-types` sur npm (ou GitHub Packages
  privé) au déploiement du CMS via CI.
- **Option B** : endpoint `/api/_types/payload-types.ts` côté CMS qui sert
  le fichier généré, les sites pullent au `postinstall`.
- Reco : Option A (versionnée, lockfile-friendly).

### 1.3 Endpoint `/api/sdk-bootstrap?tenant=<slug>`

- Renvoie un JSON unique avec tout ce dont un site neuf a besoin :
  - tenant info (slug, siteUrl, branding, features)
  - liste des blocs disponibles + leur schéma résumé
  - breakpoints live preview
  - URL admin, URL preview, conventions de naming
- L'agent appelle ce endpoint une fois et **n'a plus rien à deviner**.

### 1.4 Refonte du seed `content-first`

- Convention unique `src/content/{home,services,contact,header,footer}.ts`
  qui correspond **exactement** au schéma Payload.
- Script `validate-content.ts` à lancer **avant** `seed-from-code.ts` qui :
  - vérifie que chaque bloc utilisé existe côté CMS
  - vérifie que chaque champ requis est présent
  - plante avec un message clair (ligne + champ manquant + suggestion)
  - au lieu du seed silencieux actuel qui crée des docs cassés
- Inclure ce check dans le skill `cms-provision` (étape 0 obligatoire).

### 1.5 Commande `pnpm dlx @veridian/cms-init <slug>`

- Copie dans un site Next neuf :
  - `lib/cms.ts` câblé (auth, fetch helpers)
  - `components/blocks/` complet (ou import depuis SDK)
  - `app/page.tsx`, `app/services/page.tsx`, `app/contact/page.tsx` avec
    `LivePreviewBoundary` déjà branché
  - `.env.example` avec les bonnes variables
  - `src/content/*.ts` squelette pré-rempli
- Génère les types Payload sur place.
- L'agent n'a plus qu'à : `cms-init my-client` → renseigner `.env` →
  `pnpm dev` → ça marche.

### 1.6 Mise à jour du skill `cms-provision`

- Documenter le nouveau flow (SDK + cms-init).
- Retirer le pattern B (custom hardcodé) sauf cas legacy AVSE.
- Ajouter check obligatoire `validate-content.ts` avant seed.

## Priorité 2 — Inline editor visuel (style Sanity/Storyblok)

**Objectif** : permettre à Didier (et démo client) de **cliquer sur un
titre dans l'iframe → éditer en place → push direct au CMS**, sans
naviguer dans l'admin Payload.

### 2.1 Inspecter ce qui existe

- `template-artisan/src/components/live-preview/EditOverlay.tsx` —
  vérifier ce qu'il fait déjà. Peut-être une base.
- Évaluer Payload Visual Editor SDK officiel si dispo en v3.82+.

### 2.2 Mécanique cible

- Composant `<Editable field="hero.title" pageId={5}>` côté site qui :
  - en mode preview, wrappe l'élément avec un overlay cliquable
  - au clic, transforme en input (ou ouvre un mini-popover Payload)
  - PATCH `/api/pages/5` avec le champ modifié au blur
  - propage via postMessage au parent admin pour resync
- Côté CMS : endpoint déjà existant (`PATCH /api/pages/:id`), juste
  besoin de CORS + auth cookie cross-origin (déjà câblé pour live preview).

### 2.3 UX

- Mode "édition" toggle dans l'iframe (bouton flottant en preview)
- Indicateurs visuels : champs hoverable = outline pointillé
- Sauvegarde auto au blur + toast confirmation
- Undo simple (Ctrl+Z) — au moins pour la dernière action

### 2.4 Couverture

- Phase 1 : tous les champs `text` / `textarea` des blocs
- Phase 2 : richText (Lexical inline)
- Phase 3 : images (clic → drawer media)
- Phase 4 : array fields (ajout/suppression items)

## Ordre de bataille

1. **Pré-requis** : GitOps polyrepo OK + CI alignée (autres tickets).
2. **Sprint A (DX intégration)** : 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6
   → bénéfice immédiat à chaque nouveau client.
3. **Sprint B (inline editor)** : 2.1 → 2.2 → 2.3 → 2.4
   → wow effect démo + autonomie Didier-like.

## Notes

- Ne PAS démarrer ces chantiers tant que la CI/GitOps n'est pas stable —
  toute itération sur le SDK demande des releases versionnées, qui demandent
  une CI fiable.
- Coordonner avec les agents des sites clients (AVSE, FGMC, template-artisan,
  template-restaurant) pour migration progressive vers le SDK.
- Le SDK doit rester **opt-in** : les sites legacy (AVSE pattern B)
  continuent de marcher sans refactor forcé.
