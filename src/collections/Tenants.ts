import type { CollectionConfig } from 'payload'

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  labels: {
    singular: 'Client',
    plural: 'Clients',
  },
  admin: {
    useAsTitle: 'name',
    description: 'Un client Veridian (ex : Morel Volailles, Dupont BTP...). Chaque client a son propre espace isolé.',
    group: 'Administration',
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
    { name: 'name', type: 'text', required: true, label: 'Nom du client' },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      label: 'Identifiant URL',
      admin: { description: 'Ex : morel-volailles, dupont-btp' },
    },
    {
      name: 'cfPagesProject',
      type: 'text',
      label: 'Projet Cloudflare Pages',
      admin: { description: 'Slug du projet CF Pages associé (pour le rebuild auto)' },
    },
    {
      name: 'cfDeployHook',
      type: 'text',
      label: 'URL du Deploy Hook Cloudflare',
      admin: { description: 'URL appelée pour rebuild le site quand une page est publiée' },
    },
  ],
}
