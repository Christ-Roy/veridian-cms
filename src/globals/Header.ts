import type { CollectionConfig } from 'payload'
import { triggerSiteRebuild } from '../hooks/triggerSiteRebuild'

export const Header: CollectionConfig = {
  slug: 'header',
  labels: {
    singular: 'En-tête',
    plural: 'En-tête',
  },
  admin: {
    description: 'Barre de navigation en haut du site.',
    useAsTitle: 'logoText',
    group: 'Mon site',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
  },
  hooks: {
    afterChange: [triggerSiteRebuild],
  },
  fields: [
    { name: 'logo', type: 'upload', relationTo: 'media', label: 'Logo' },
    {
      name: 'logoText',
      type: 'text',
      label: 'Nom affiché',
      admin: { description: "Nom affiché à côté du logo (si pas d'image)." },
    },
    {
      name: 'nav',
      type: 'array',
      label: 'Menu de navigation',
      labels: { singular: 'Lien', plural: 'Liens' },
      minRows: 0,
      maxRows: 6,
      admin: { description: 'Liens de navigation (max 6).' },
      fields: [
        { name: 'label', type: 'text', required: true, label: 'Libellé' },
        { name: 'url', type: 'text', required: true, label: 'URL', admin: { description: 'Ex : /services, /contact' } },
      ],
    },
    {
      name: 'cta',
      type: 'group',
      label: 'Bouton principal',
      admin: { description: 'Optionnel. Ex : "Devis gratuit", "Réserver".' },
      fields: [
        { name: 'label', type: 'text', label: 'Libellé' },
        { name: 'url', type: 'text', label: 'URL' },
      ],
    },
  ],
}
