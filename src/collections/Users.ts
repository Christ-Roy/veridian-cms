import type { CollectionConfig, CollectionAfterChangeHook } from 'payload'

const isSuperAdmin = (req: { user?: { roles?: string[] | null } | null }) =>
  req.user?.roles?.includes('super-admin') ?? false

/**
 * Auto-attache un user à un tenant si :
 *  - opération = create
 *  - roles inclut 'client' ou 'site-reader' (= user qui a besoin d'un tenant)
 *  - aucun tenant déjà assigné
 *
 * Stratégie : attache au tenant le plus récent (pratique pour le pattern
 * "je crée le tenant puis le user juste après"). Si aucun tenant n'existe,
 * skip silencieusement (l'admin pourra l'attacher manuellement).
 *
 * Note : ne touche jamais aux super-admin — eux choisissent leurs tenants
 * via le selector multi-tenant.
 */
const autoAttachTenant: CollectionAfterChangeHook = async ({
  doc,
  req,
  operation,
}) => {
  if (operation !== 'create') return doc
  const roles: string[] = doc.roles ?? []
  const isClientOrReader =
    roles.includes('client') || roles.includes('site-reader')
  if (!isClientOrReader) return doc
  const existingTenants = doc.tenants ?? []
  if (existingTenants.length > 0) return doc

  try {
    const recent = await req.payload.find({
      collection: 'tenants',
      sort: '-createdAt',
      limit: 1,
      req,
    })
    const tenantId = recent.docs[0]?.id
    if (!tenantId) return doc

    await req.payload.update({
      collection: 'users',
      id: doc.id,
      data: {
        tenants: [{ tenant: tenantId }],
      },
      req,
      // Évite la récursion infinie du hook
      context: { skipAutoAttach: true },
    })
    req.payload.logger.info(
      `[autoAttachTenant] user ${doc.email} → tenant ${tenantId}`,
    )
  } catch (err) {
    req.payload.logger.error({ err }, '[autoAttachTenant] failed')
  }
  return doc
}

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
    // Caché aux non-super-admin (les clients n'ont pas à gérer les users)
    hidden: ({ user }) =>
      !((user as { roles?: string[] | null } | null)?.roles?.includes('super-admin')),
  },
  auth: {
    useAPIKey: true,
  },
  hooks: {
    afterChange: [
      async (args) => {
        if (args.req.context?.skipAutoAttach) return args.doc
        return autoAttachTenant(args)
      },
    ],
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
