import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { searchPlugin } from '@payloadcms/plugin-search'
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
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
      description: 'Gérez votre site web Veridian',
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
    searchPlugin({
      collections: ['pages'],
      defaultPriorities: { pages: 10 },
    }),
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
        search: {},
        header: { isGlobal: true },
        footer: { isGlobal: true },
      },
      tenantsSlug: 'tenants',
      userHasAccessToAllTenants: (user) =>
        Boolean((user as { roles?: string[] | null })?.roles?.includes('super-admin')),
    }),
  ],
})
