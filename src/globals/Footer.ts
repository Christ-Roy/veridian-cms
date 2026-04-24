import type { CollectionConfig } from 'payload'

export const Footer: CollectionConfig = {
  slug: 'footer',
  admin: {
    description: 'Pied de page — infos entreprise, contact, réseaux sociaux.',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'company',
      type: 'group',
      label: 'Entreprise',
      fields: [
        { name: 'name', type: 'text' },
        { name: 'tagline', type: 'text', admin: { description: 'Phrase courte sous le nom' } },
        { name: 'phone', type: 'text' },
        { name: 'email', type: 'email' },
        { name: 'address', type: 'textarea' },
      ],
    },
    {
      name: 'hours',
      type: 'array',
      label: 'Horaires',
      fields: [
        { name: 'day', type: 'text', required: true, admin: { description: 'ex: Lun–Ven' } },
        { name: 'time', type: 'text', required: true, admin: { description: 'ex: 8h–18h' } },
      ],
    },
    {
      name: 'social',
      type: 'group',
      label: 'Réseaux sociaux',
      fields: [
        { name: 'facebook', type: 'text' },
        { name: 'instagram', type: 'text' },
        { name: 'linkedin', type: 'text' },
        { name: 'google', type: 'text', admin: { description: 'URL de votre fiche Google Business' } },
      ],
    },
    {
      name: 'legal',
      type: 'group',
      label: 'Mentions légales',
      fields: [
        { name: 'siret', type: 'text' },
        { name: 'mentionsUrl', type: 'text', admin: { description: 'URL des mentions légales' } },
      ],
    },
  ],
}
