import type { CollectionConfig } from 'payload'

const isSuperAdmin = (req: { user?: { roles?: string[] | null } | null }) =>
  req.user?.roles?.includes('super-admin') ?? false

export const Users: CollectionConfig = {
  slug: 'users',
  admin: { useAsTitle: 'email' },
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
      hasMany: true,
      defaultValue: ['client'],
      options: [
        { label: 'Super Admin (Veridian)', value: 'super-admin' },
        { label: 'Client', value: 'client' },
        { label: 'Site Reader (API key site vitrine)', value: 'site-reader' },
      ],
      access: {
        update: ({ req }) => isSuperAdmin(req),
      },
    },
  ],
}
