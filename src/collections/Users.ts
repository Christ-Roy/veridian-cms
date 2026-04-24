import type { CollectionConfig } from 'payload'

const isSuperAdmin = (req: { user?: { roles?: string[] | null } | null }) =>
  req.user?.roles?.includes('super-admin') ?? false

export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: 'Utilisateur',
    plural: 'Utilisateurs',
  },
  admin: {
    useAsTitle: 'email',
    description: 'Utilisateurs du CMS (vous, votre équipe, vos clients).',
    group: 'Administration',
  },
  auth: {
    useAPIKey: true,
  },
  access: {
    create: ({ req }) => isSuperAdmin(req),
    delete: ({ req }) => isSuperAdmin(req),
    read: ({ req }) => {
      if (!req.user) return false
      if (isSuperAdmin(req)) return true
      return { id: { equals: req.user.id } }
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
      label: 'Rôles',
      hasMany: true,
      defaultValue: ['client'],
      options: [
        { label: 'Super administrateur (Veridian)', value: 'super-admin' },
        { label: 'Client', value: 'client' },
        { label: 'Lecteur site (clé API)', value: 'site-reader' },
      ],
      access: {
        update: ({ req }) => isSuperAdmin(req),
      },
    },
  ],
}
