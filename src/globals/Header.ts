import type { CollectionConfig } from 'payload'

/**
 * Header du site (logo, navigation, CTA principal).
 * Collection avec isGlobal:true dans le plugin multi-tenant = 1 doc par tenant.
 */
export const Header: CollectionConfig = {
  slug: 'header',
  admin: {
    description: 'Barre de navigation en haut du site — éditable par le client.',
    useAsTitle: 'logoText',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'logo', type: 'upload', relationTo: 'media' },
    {
      name: 'logoText',
      type: 'text',
      admin: { description: "Nom affiché à côté du logo (si pas d'image)" },
    },
    {
      name: 'nav',
      type: 'array',
      minRows: 0,
      maxRows: 6,
      admin: { description: 'Liens de navigation (max 6)' },
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'url', type: 'text', required: true, admin: { description: 'ex: /services, /contact' } },
      ],
    },
    {
      name: 'cta',
      type: 'group',
      label: 'Bouton principal',
      admin: { description: 'Optionnel. Ex: "Devis gratuit", "Réserver"' },
      fields: [
        { name: 'label', type: 'text' },
        { name: 'url', type: 'text' },
      ],
    },
  ],
}
