import type { CollectionBeforeDeleteHook, CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { triggerSiteRebuild } from '../hooks/triggerSiteRebuild'

const blockFooterDelete: CollectionBeforeDeleteHook = ({ req }) => {
  const isSuperAdmin = (req.user as { roles?: string[] | null } | null)?.roles?.includes(
    'super-admin',
  )
  if (isSuperAdmin) return
  throw new APIError(
    "Le pied de page est un élément structurel du site — suppression interdite (contactez un super-admin).",
    403,
  )
}

export const Footer: CollectionConfig = {
  slug: 'footer',
  labels: {
    singular: 'Pied de page',
    plural: 'Pied de page',
  },
  admin: {
    description: 'Pied de page — infos entreprise, contact, réseaux sociaux.',
    group: 'Mon site',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
  },
  hooks: {
    afterChange: [triggerSiteRebuild],
    beforeDelete: [blockFooterDelete],
  },
  fields: [
    {
      name: 'company',
      type: 'group',
      label: 'Entreprise',
      fields: [
        { name: 'name', type: 'text', label: 'Nom' },
        { name: 'tagline', type: 'text', label: 'Slogan', admin: { description: 'Phrase courte sous le nom.' } },
        { name: 'phone', type: 'text', label: 'Téléphone' },
        { name: 'email', type: 'email', label: 'Email' },
        { name: 'address', type: 'textarea', label: 'Adresse' },
      ],
    },
    {
      name: 'hours',
      type: 'array',
      label: 'Horaires d\'ouverture',
      labels: { singular: 'Horaire', plural: 'Horaires' },
      fields: [
        { name: 'day', type: 'text', required: true, label: 'Jours', admin: { description: 'Ex : Lun–Ven' } },
        { name: 'time', type: 'text', required: true, label: 'Créneau', admin: { description: 'Ex : 8h–18h' } },
      ],
    },
    {
      name: 'social',
      type: 'group',
      label: 'Réseaux sociaux',
      fields: [
        { name: 'facebook', type: 'text', label: 'Facebook' },
        { name: 'instagram', type: 'text', label: 'Instagram' },
        { name: 'linkedin', type: 'text', label: 'LinkedIn' },
        { name: 'google', type: 'text', label: 'Google Business', admin: { description: 'URL de votre fiche Google Business.' } },
      ],
    },
    {
      name: 'legal',
      type: 'group',
      label: 'Mentions légales',
      fields: [
        { name: 'siret', type: 'text', label: 'SIRET' },
        { name: 'mentionsUrl', type: 'text', label: 'URL mentions légales' },
      ],
    },
  ],
}
