import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Tenants } from './collections/Tenants'
import { Pages } from './collections/Pages'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const SITE_URL_BY_TENANT_SLUG: Record<string, string> = {
  demo: 'https://demo-cms.veridian.site',
  artisan: 'https://template-artisan.veridian.site',
  restaurant: 'https://template-restaurant.veridian.site',
}
// Mapping par ID aussi car data.tenant en mode edit = id numérique
const SITE_URL_BY_TENANT_ID: Record<number, string> = {
  1: SITE_URL_BY_TENANT_SLUG.demo,
  2: SITE_URL_BY_TENANT_SLUG.artisan,
  3: SITE_URL_BY_TENANT_SLUG.restaurant,
}

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    livePreview: {
      url: ({ data }) => {
        // data.tenant peut être un id numérique OU un objet populated selon le contexte
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
  collections: [Users, Media, Tenants, Pages],
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
  plugins: [
    multiTenantPlugin({
      collections: {
        pages: {},
        media: {},
      },
      tenantsSlug: 'tenants',
      userHasAccessToAllTenants: (user) =>
        Boolean((user as { roles?: string[] | null })?.roles?.includes('super-admin')),
    }),
  ],
})
