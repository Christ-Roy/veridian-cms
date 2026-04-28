import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
// import { searchPlugin } from '@payloadcms/plugin-search'  // disabled V1
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { fr } from '@payloadcms/translations/languages/fr'
import { en } from '@payloadcms/translations/languages/en'
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
import { healthEndpoint } from './endpoints/health'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const SERVER_URL = process.env.SERVER_URL
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'
if (!SERVER_URL && process.env.NODE_ENV === 'production' && !isBuildPhase) {
  throw new Error('SERVER_URL env var required in production')
}

const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

export default buildConfig({
  serverURL: SERVER_URL || 'http://localhost:3000',

  // i18n : français par défaut pour le client, anglais en option pour Robert
  i18n: {
    fallbackLanguage: 'fr',
    supportedLanguages: { fr, en },
    // Custom translations pour surcharger certains labels Payload
    translations: {
      fr: {
        general: {
          dashboard: 'Tableau de bord',
        },
      },
    },
  },

  admin: {
    user: Users.slug,
    theme: 'light', // force light mode (défaut = 'all' qui suit l'OS)
    importMap: { baseDir: path.resolve(dirname) },
    components: {
      graphics: {
        Icon: '/components/graphics/Icon/index.tsx#Icon',
        Logo: '/components/graphics/Logo/index.tsx#Logo',
      },
      beforeLogin: ['/components/BeforeLogin/index.tsx#default'],
      beforeDashboard: ['/components/BeforeDashboard/index.tsx#default'],
    },
    meta: {
      titleSuffix: ' — Veridian CMS',
      description: 'Espace de gestion Veridian — Modifiez votre site en toute autonomie.',
      icons: [
        {
          type: 'image/svg+xml',
          rel: 'icon',
          url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="%2316a34a"/><path d="M12 20 L18 26 L28 14" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
        },
      ],
      openGraph: {
        description: 'Espace de gestion Veridian — Modifiez votre site en toute autonomie.',
        title: 'Veridian CMS',
        siteName: 'Veridian CMS',
      },
    },
    livePreview: {
      url: async ({ data, payload, collectionConfig, globalConfig }) => {
        const t = data?.tenant
        let base: string | undefined
        if (typeof t === 'object' && t?.siteUrl) {
          base = t.siteUrl
        } else if (typeof t === 'number' || typeof t === 'string') {
          try {
            const tenant = await payload.findByID({ collection: 'tenants', id: t, depth: 0 })
            base = (tenant as { siteUrl?: string })?.siteUrl
          } catch {
            base = undefined
          }
        }
        if (!base) return 'about:blank'
        // Header/Footer : preview sur la page d'accueil (ils s'affichent partout)
        const editingChrome =
          collectionConfig?.slug === 'header' ||
          collectionConfig?.slug === 'footer' ||
          globalConfig?.slug === 'header' ||
          globalConfig?.slug === 'footer'
        const slug = editingChrome ? '' : data?.slug === 'home' ? '' : data?.slug || ''
        return `${base.replace(/\/$/, '')}/${slug}${slug ? '/' : ''}?preview=1`
      },
      collections: ['pages', 'header', 'footer'],
      breakpoints: [
        { label: 'Mobile', name: 'mobile', width: 375, height: 667 },
        { label: 'Tablet', name: 'tablet', width: 768, height: 1024 },
        { label: 'Desktop', name: 'desktop', width: 1280, height: 800 },
        { label: 'Plein écran', name: 'fullhd', width: 1920, height: 1080 },
      ],
    },
  },
  collections: [Users, Media, Tenants, Pages, Header, Footer],
  endpoints: [healthEndpoint],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    },
    push: process.env.PAYLOAD_DB_PUSH === 'true',
  }),
  sharp,
  cors: corsOrigins.length > 0 ? corsOrigins : '*',
  email: process.env.SMTP_HOST
    ? nodemailerAdapter({
        defaultFromAddress: process.env.SMTP_FROM || 'cms@veridian.site',
        defaultFromName: 'Veridian CMS',
        transportOptions: {
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 465),
          secure: Number(process.env.SMTP_PORT || 465) === 465,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        },
      })
    : undefined,
  plugins: [
    seoPlugin({
      collections: ['pages'],
      uploadsCollection: 'media',
      generateTitle: ({ doc }) =>
        (doc as { title?: string })?.title ?? 'Page',
    }),
    formBuilderPlugin({
      fields: {
        payment: false,
      },
      formOverrides: {
        admin: {
          description: 'Formulaires éditables par le client (contact, devis...).',
          group: 'Formulaires',
        },
      },
      formSubmissionOverrides: {
        admin: {
          group: 'Formulaires',
        },
      },
    }),
    redirectsPlugin({
      collections: ['pages'],
      overrides: {
        admin: {
          group: 'Administration',
        },
      },
    }),
    // searchPlugin disabled V1 (incompat multi-tenant)
    nestedDocsPlugin({
      collections: ['pages'],
      generateLabel: (_, doc) => (doc as { title?: string })?.title ?? '',
      generateURL: (docs) => docs.reduce((url, d) => `${url}/${(d as { slug?: string })?.slug ?? ''}`, ''),
    }),
    // Multi-tenant DOIT être le dernier pour wrapper correctement les collections ajoutées par les autres plugins
    multiTenantPlugin({
      collections: {
        pages: {},
        media: {},
        forms: {},
        'form-submissions': {},
        redirects: {},
        // search: {},  // disabled V1

        header: { isGlobal: true },
        footer: { isGlobal: true },
      },
      tenantsSlug: 'tenants',
      userHasAccessToAllTenants: (user) =>
        Boolean((user as { roles?: string[] | null })?.roles?.includes('super-admin')),
    }),
  ],
})
