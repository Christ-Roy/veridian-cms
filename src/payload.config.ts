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

const SITE_URL_BY_TENANT: Record<string, string> = {
  demo: 'https://demo-cms.veridian.site',
  artisan: 'https://template-artisan.veridian.site',
  restaurant: 'https://template-restaurant.veridian.site',
}

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    livePreview: {
      url: ({ data }) => {
        const tenantSlug =
          typeof data?.tenant === 'object' && data?.tenant?.slug
            ? data.tenant.slug
            : 'demo'
        const base = SITE_URL_BY_TENANT[tenantSlug] || SITE_URL_BY_TENANT.demo
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
