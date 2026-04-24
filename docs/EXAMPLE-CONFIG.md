# Veridian CMS — Configuration de référence

> **Fichier à copier-coller pour éviter de réinventer la roue.**
> Toutes les options importantes de Payload CMS multi-tenant dans UN endroit,
> avec explications de pourquoi elles sont là et quoi éviter.
>
> Dernière mise à jour : 2026-04-24 — basé sur les exemples officiels
> `/tmp/payload-recon/payload/examples/multi-tenant` et `whitelabel`.

---

## 0. Ordre absolu des plugins dans `payload.config.ts`

⚠️ **Le plugin multi-tenant DOIT être le dernier** pour wrapper les collections
ajoutées par les autres plugins (forms, redirects, search, etc.).

```ts
plugins: [
  seoPlugin({...}),
  formBuilderPlugin({...}),
  redirectsPlugin({...}),
  searchPlugin({...}),
  nestedDocsPlugin({...}),
  // ← multi-tenant EN DERNIER
  multiTenantPlugin({...}),
]
```

## 1. `.env` complet de référence

```bash
# === Base Payload ===
DATABASE_URL=postgresql://cms:<password>@cms-postgres:5432/veridian_cms
PAYLOAD_SECRET=<64 chars hex>
SERVER_URL=https://cms.staging.veridian.site
NEXT_TELEMETRY_DISABLED=1

# === Postgres container ===
POSTGRES_PASSWORD=<48 chars hex>

# === SMTP Brevo (envoi mails magic link, reset password, form submissions) ===
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<your Brevo SMTP login, ex: 8b5d2a002@smtp-brevo.com>
SMTP_PASSWORD=<your Brevo SMTP key, format xsmtpsib-...>
SMTP_FROM=notifications@veridian.site

# === GitHub (hook trigger rebuild) ===
GITHUB_TOKEN=<PAT avec scope repo+workflow>
GITHUB_REPO=Christ-Roy/veridian-platform
GITHUB_WORKFLOW=sites-deploy.yml

# === Storage S3/R2 pour médias (recommandé à terme) ===
# S3_BUCKET=veridian-cms-media
# S3_REGION=auto
# S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
# S3_ACCESS_KEY_ID=...
# S3_SECRET_ACCESS_KEY=...
```

## 2. `payload.config.ts` complet commenté

```ts
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { searchPlugin } from '@payloadcms/plugin-search'
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Tenants } from './collections/Tenants'
import { Pages } from './collections/Pages'
import { Header } from './globals/Header'
import { Footer } from './globals/Footer'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  // ⚠️ OBLIGATOIRE : sinon warning CORS à chaque requête +
  //   Payload ne peut pas générer les URLs des emails correctement.
  serverURL: process.env.SERVER_URL || 'https://cms.staging.veridian.site',

  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },

    // === White-label (branding Veridian) ===
    components: {
      graphics: {
        Icon: '/components/graphics/Icon',   // Logo petit (sidebar)
        Logo: '/components/graphics/Logo',   // Logo grand (login)
      },
      // Composants injectés avant login + après login
      beforeLogin: ['/components/BeforeLogin'],
      beforeDashboard: ['/components/BeforeDashboard'],
    },
    meta: {
      titleSuffix: ' — Veridian CMS',
      description: 'Gérez votre site web Veridian',
      icons: [
        { type: 'image/png', rel: 'icon', url: '/favicon.png' },
      ],
    },

    // === Live preview (iframe dans admin) ===
    livePreview: {
      url: ({ data }) => {
        // data.tenant peut être un id numérique OU objet populated.
        // Mapper vers l'URL du site déployé du client.
        let base: string | undefined
        if (typeof data?.tenant === 'object' && data?.tenant?.slug) {
          base = SITE_URL_BY_TENANT_SLUG[data.tenant.slug]
        } else if (typeof data?.tenant === 'number') {
          base = SITE_URL_BY_TENANT_ID[data.tenant]
        }
        if (!base) base = 'https://demo-cms.veridian.site'
        const slug = data?.slug === 'home' ? '' : data?.slug || ''
        return `${base}/${slug}${slug ? '/' : ''}?preview=1`
      },
      collections: ['pages'],
      breakpoints: [
        { label: 'Mobile', name: 'mobile', width: 375, height: 667 },
        { label: 'Tablet', name: 'tablet', width: 768, height: 1024 },
        { label: 'Desktop', name: 'desktop', width: 1440, height: 900 },
      ],
    },
  },

  collections: [Users, Media, Tenants, Pages, Header, Footer],
  // ⚠️ Pas de `globals: []` si tu veux que Header/Footer soient scopés par tenant.
  //     Les mettre dans `collections` avec isGlobal:true dans le plugin multi-tenant.

  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',

  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },

  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || '' },
    // ⚠️ NE PAS mettre `prodMigrations: migrations` ici.
    //     Ça casse le startup dans un container sans TTY (prompt interactif).
    //     Préférer lancer `pnpm payload migrate` en étape CI/CD ou à la main.
  }),

  sharp,

  // === CORS : ajouter TOUS les domaines qui vont fetch l'API ===
  cors: [
    'https://demo-cms.veridian.site',
    'https://template-artisan.veridian.site',
    'https://template-restaurant.veridian.site',
    // Ajouter ici chaque nouveau site client
    'http://localhost:3301',
    'http://localhost:3310',
    'http://localhost:3311',
  ],

  csrf: [
    'https://cms.staging.veridian.site',
    // + n'importe quel sous-domaine custom admin, ex: cms.client.com
  ],

  // === Email adapter (magic links, reset password, form submissions) ===
  email: process.env.SMTP_HOST
    ? nodemailerAdapter({
        defaultFromAddress: process.env.SMTP_FROM || 'notifications@veridian.site',
        defaultFromName: 'Veridian CMS',
        transportOptions: {
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          // secure: true pour 465 (SSL direct), false pour 587 (STARTTLS auto)
          secure: Number(process.env.SMTP_PORT || 587) === 465,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        },
      })
    : undefined,

  plugins: [
    // === SEO (meta title/desc/ogImage + preview Google en live) ===
    seoPlugin({
      collections: ['pages'],
      uploadsCollection: 'media',
      generateTitle: ({ doc }) => (doc as { title?: string })?.title ?? 'Page',
      generateDescription: ({ doc }) =>
        (doc as { heroSubtitle?: string })?.heroSubtitle ?? '',
      // generateURL: pour preview Google, URL absolue du doc
      generateURL: ({ doc }) => `${process.env.SERVER_URL}/${(doc as { slug?: string })?.slug ?? ''}`,
    }),

    // === Form Builder (client crée ses propres formulaires) ===
    formBuilderPlugin({
      fields: {
        payment: false, // pas de Stripe sur le form pour commencer
      },
      formOverrides: {
        admin: {
          description: 'Formulaires éditables par le client (contact, devis...).',
        },
      },
      // Emails envoyés quand un visiteur soumet le form :
      // configurable dans l'admin par le client (to, from, subject, body).
    }),

    // === Redirects (client gère ses 301) ===
    redirectsPlugin({
      collections: ['pages'],
      overrides: {
        admin: { description: 'Redirections 301 pour SEO (rebranding, changement d\'URL).' },
      },
    }),

    // === Search (barre de recherche interne sur le site) ===
    searchPlugin({
      collections: ['pages'],
      defaultPriorities: { pages: 10 },
      // Par défaut reindex auto afterChange des docs (hook inclus).
    }),

    // === Nested Docs (hiérarchie parent/enfant + breadcrumbs auto) ===
    nestedDocsPlugin({
      collections: ['pages'],
      generateLabel: (_, doc) => (doc as { title?: string })?.title ?? '',
      generateURL: (docs) =>
        docs.reduce((url, d) => `${url}/${(d as { slug?: string })?.slug ?? ''}`, ''),
    }),

    // === Multi-tenant (isolation par client) — EN DERNIER ===
    multiTenantPlugin({
      collections: {
        pages: {},
        media: {},
        forms: {},
        'form-submissions': {},
        redirects: {},
        search: {},
        header: { isGlobal: true },  // 1 doc par tenant (singleton)
        footer: { isGlobal: true },
      },
      tenantsSlug: 'tenants',

      // Super-admins voient tous les tenants.
      // Autres users ne voient que leurs tenants assignés.
      userHasAccessToAllTenants: (user) =>
        Boolean((user as { roles?: string[] | null })?.roles?.includes('super-admin')),

      // Champs custom ajoutés sur Users par le plugin :
      //   `tenants[]` : array de { tenant: relation, roles: [] }
      // C'est ce qui scope l'accès.
    }),
  ],
})
```

## 3. Rôles multi-tenant (pattern officiel)

Le template Payload officiel utilise **3 niveaux de rôles** :

```
super-admin         : Veridian (toi)          → voit tous les tenants
tenant-admin        : user invité d'un client  → peut éditer son tenant
tenant-viewer       : user read-only          → peut voir son tenant (preview, stats)
site-reader         : user API key du site    → read-only, utilisé par le site public
                                                (pas par un humain)
```

Dans `collections/Users.ts` les rôles sont ceux du user global **ET** ceux
par tenant (via le champ `tenants[]` créé par le plugin).

## 4. Collections patterns (copier-coller)

### Pages (avec blocks modulaires)

```ts
import type { CollectionConfig } from 'payload'
import { HeroBlock, ServicesBlock, GalleryBlock, TestimonialsBlock, CTABlock, RichTextBlock } from '../blocks'

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'tenant', '_status', 'updatedAt'],
    description: 'Pages du site — composez avec des blocs modulaires.',
  },
  access: {
    read: ({ req }) => Boolean(req.user), // plugin multi-tenant filtre auto
  },
  versions: {
    drafts: {
      autosave: { interval: 2000 },
      schedulePublish: true,
    },
    maxPerDoc: 20,
  },
  hooks: {
    afterChange: [triggerSiteRebuild],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, index: true },
    {
      name: 'blocks',
      type: 'blocks',
      admin: { description: 'Assemblez votre page.', initCollapsed: true },
      blocks: [HeroBlock, ServicesBlock, GalleryBlock, TestimonialsBlock, RichTextBlock, CTABlock],
    },
    // Le SEO plugin ajoute auto un group `meta` si seoPlugin({collections:['pages']})
  ],
}
```

### Users (rôles + tenants array + API key)

```ts
import type { CollectionConfig } from 'payload'

const isSuperAdmin = (req) =>
  req.user?.roles?.includes('super-admin') ?? false

export const Users: CollectionConfig = {
  slug: 'users',
  admin: { useAsTitle: 'email' },
  auth: {
    useAPIKey: true,       // pour les users site-reader qui fetchent l'API
    // tokenExpiration: 7200,  // default 7200s (2h)
    // maxLoginAttempts: 5,
    // lockTime: 600 * 1000,   // 10min
    // verify: true,            // si on veut validation email obligatoire
    // forgotPassword: { ... }, // custom HTML + token URL
  },
  access: {
    create: ({ req }) => isSuperAdmin(req),
    delete: ({ req }) => isSuperAdmin(req),
    read: ({ req }) => {
      if (!req.user) return false
      if (isSuperAdmin(req)) return true
      return { id: { equals: req.user.id } }  // user ne voit que lui
    },
    update: ({ req }) => {
      if (!req.user) return false
      if (isSuperAdmin(req)) return true
      return { id: { equals: req.user.id } }
    },
  },
  fields: [
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      defaultValue: ['client'],
      options: [
        { label: 'Super Admin (Veridian)', value: 'super-admin' },
        { label: 'Client', value: 'client' },
        { label: 'Site Reader (API key site vitrine)', value: 'site-reader' },
      ],
      access: {
        update: ({ req }) => isSuperAdmin(req), // seul super-admin peut changer un rôle
      },
    },
    // Le plugin multi-tenant ajoute auto `tenants[]: [{ tenant: ref, roles: [] }]`
  ],
}
```

## 5. White-label complet

Crée le dossier `cms/src/components/graphics/` :

```tsx
// cms/src/components/graphics/Icon/index.tsx
import React from 'react'
export const Icon = () => (
  <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" style={{ width: 28, height: 28 }}>
    {/* Ton SVG Veridian mini */}
  </svg>
)

// cms/src/components/graphics/Logo/index.tsx
export const Logo = () => (
  <img src="/veridian-logo.png" alt="Veridian CMS" style={{ height: 40 }} />
)

// cms/src/components/BeforeLogin/index.tsx
export default function BeforeLogin() {
  return (
    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
      <p>Bienvenue sur votre espace de gestion <strong>Veridian CMS</strong></p>
      <p style={{ fontSize: 13, color: '#666' }}>
        Connectez-vous avec l'email que vous avez reçu.
      </p>
    </div>
  )
}

// cms/src/components/BeforeDashboard/index.tsx
export default function BeforeDashboard() {
  return (
    <div style={{ padding: '1.5rem', background: '#f5f5f5', borderRadius: 8, marginBottom: '2rem' }}>
      <h2>Bonjour 👋</h2>
      <p>
        Éditez vos pages dans <strong>Collections → Pages</strong>,
        gérez vos formulaires dans <strong>Forms</strong>,
        votre logo et votre pied de page dans <strong>Header / Footer</strong>.
      </p>
    </div>
  )
}
```

Et dans `payload.config.ts` :

```ts
admin: {
  components: {
    graphics: {
      Icon: '/components/graphics/Icon/index.tsx#Icon',
      Logo: '/components/graphics/Logo/index.tsx#Logo',
    },
    beforeLogin: ['/components/BeforeLogin'],
    beforeDashboard: ['/components/BeforeDashboard'],
  },
  meta: {
    titleSuffix: ' — Veridian CMS',
    icons: [{ type: 'image/png', rel: 'icon', url: '/favicon.png' }],
  },
}
```

**Important** : après tout changement de composant admin, rerun
`pnpm payload generate:importmap` pour que Payload les charge.

## 6. Checklist provisioning nouveau client

- [ ] Site dev en local (`sites/<template>/`), contenu dans `src/content/home.ts`
- [ ] `node cms/scripts/seed-from-code.mjs <site-dir> <tenant-slug> "Nom Client"`
- [ ] Clé API du site retournée → update `.env` local + GitHub secret + CF Pages env
- [ ] `node cms/scripts/send-magic-link.mjs client@example.com` → mail envoyé
- [ ] Repo GitHub du client créé + push
- [ ] CF Pages connecté au repo (UI dashboard) → Root dir, Build cmd, env vars
- [ ] DNS custom domain ajouté (CNAME → `<project>.pages.dev` proxied CF)
- [ ] Test : client log → édite hero → save → auto rebuild CF → site mis à jour

## 7. Pièges connus (évite-moi ces erreurs)

| Piège | Cause | Solution |
|---|---|---|
| **Warning "origin not in CORS allowlist"** | `serverURL` manquant dans `buildConfig()` | Toujours définir `serverURL: process.env.SERVER_URL` |
| **`forms.confirmationMessage` required** | Form Builder demande un message de confirmation pour chaque form | Créer un form avec message défini avant le seed |
| **Multi-tenant plugin warning "missing collections"** | Plugin placé avant ceux qui créent les collections | Le placer EN DERNIER dans `plugins:[]` |
| **Migration prompt bloque le container** | `prodMigrations` + pas de TTY | Retirer `prodMigrations`, migrate manuellement |
| **"No emails to send"** | forgot-password silencieux si user inexistant (sécurité) | Vérifier que user existe via `GET /api/users?where[email][equals]=X` |
| **`Header` collection "useAsTitle" fail** | Champ déclaré n'existe pas sur la collection | Mettre un champ réel ou retirer `useAsTitle` |
| **Client ne voit pas ses pages** | Plugin multi-tenant mal configuré OU user sans tenant assigné | Vérifier `user.tenants[]` non vide via l'admin super-admin |
| **Migration foireuse sur rename** | Drizzle détecte un rename ambigu (ex: pages_sections → pages_blocks_*) | Reset schema public + regénérer une migration clean |
| **Magic link ne marche pas** | SMTP mal configuré (mauvais port/secure) OR user pas dans DB | Check logs `docker logs veridian-cms | grep -i mail` |

## 8. Upgrades Payload sans casser

```bash
# Dans cms/
pnpm update payload @payloadcms/*
pnpm payload migrate:create post-upgrade  # si schema change
# Apply
pnpm payload migrate
# Rebuild image
docker compose -f docker-compose.prod.yml up -d --build cms
```

Les migrations Payload sont **append-only** : jamais de DROP. Upgrade
non-destructif tant qu'on suit le flux ci-dessus.

## 9. Références externes

- **Exemples officiels** (téléchargés dans `~/.claude/docs/payload-examples/`) :
  - `multi-tenant/` — config + access + seed
  - `whitelabel/` — components admin custom
  - `custom-components/` — BeforeLogin, BeforeDashboard, Views custom
  - `live-preview/` — implémentation SSR/CSR
- **Docs Payload** (téléchargées dans `~/.claude/docs/payload/`) :
  - `authentication/api-keys.mdx`, `authentication/overview.mdx` (pour magic link custom)
  - `plugins/multi-tenant.mdx`, tous les autres plugins
  - `versions/drafts.mdx`, `versions/autosave.mdx`
  - `live-preview/overview.mdx`
