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

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const SITE_URL_BY_TENANT_SLUG: Record<string, string> = {
  demo: 'https://demo-cms.veridian.site',
  artisan: 'https://template-artisan.veridian.site',
  restaurant: 'https://template-restaurant.veridian.site',
}
const SITE_URL_BY_TENANT_ID: Record<number, string> = {
  1: SITE_URL_BY_TENANT_SLUG.demo,
  2: SITE_URL_BY_TENANT_SLUG.artisan,
  3: SITE_URL_BY_TENANT_SLUG.restaurant,
}

export default buildConfig({
  serverURL: process.env.SERVER_URL || 'https://cms.staging.veridian.site',

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
      url: ({ data }) => {
        let base: string | undefined
        if (typeof data?.tenant === 'object' && data?.tenant?.slug) {
          base = SITE_URL_BY_TENANT_SLUG[data.tenant.slug]
        } else if (typeof data?.tenant === 'number') {
          base = SITE_URL_BY_TENANT_ID[data.tenant]
        }
        if (!base) base = SITE_URL_BY_TENANT_SLUG.demo
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
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || '' },
  }),
  sharp,
  cors: [
    'https://demo-cms.veridian.site',
    'https://template-artisan.veridian.site',
    'https://template-restaurant.veridian.site',
    'http://localhost:3301',
    'http://localhost:3310',
    'http://localhost:3311',
  ],
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
        },
      },
    }),
    redirectsPlugin({
      collections: ['pages'],
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
