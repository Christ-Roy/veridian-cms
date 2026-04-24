import type { CollectionConfig } from 'payload'

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  admin: {
    useAsTitle: 'name',
    description: 'Un tenant = un client Veridian (Morel, Tramtech, etc.)',
  },
  access: {
    read: ({ req }) => {
      if (!req.user) return false
      if (req.user.roles?.includes('super-admin')) return true
      const tenantIds = (req.user.tenants ?? [])
        .map((t: { tenant?: number | { id: number } }) =>
          typeof t.tenant === 'object' ? t.tenant?.id : t.tenant,
        )
        .filter((id): id is number => typeof id === 'number')
      return { id: { in: tenantIds } }
    },
    create: ({ req }) => req.user?.roles?.includes('super-admin') ?? false,
    update: ({ req }) => req.user?.roles?.includes('super-admin') ?? false,
    delete: ({ req }) => req.user?.roles?.includes('super-admin') ?? false,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, admin: { description: 'Identifiant URL ex: morel-volailles' } },
    { name: 'cfPagesProject', type: 'text', admin: { description: 'Slug du projet Cloudflare Pages pour rebuild auto' } },
  ],
}
