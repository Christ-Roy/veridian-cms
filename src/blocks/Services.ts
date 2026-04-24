import type { Block } from 'payload'

export const ServicesBlock: Block = {
  slug: 'services',
  labels: { singular: 'Services', plural: 'Services' },
  fields: [
    { name: 'title', type: 'text', label: 'Titre de section' },
    { name: 'subtitle', type: 'textarea', label: 'Sous-titre' },
    {
      name: 'items',
      type: 'array',
      label: 'Prestations',
      labels: { singular: 'Prestation', plural: 'Prestations' },
      minRows: 1,
      fields: [
        {
          name: 'icon',
          type: 'select',
          label: 'Icône',
          defaultValue: 'check',
          options: [
            { label: 'Coche', value: 'check' },
            { label: 'Marteau', value: 'hammer' },
            { label: 'Maison', value: 'home' },
            { label: 'Clé', value: 'wrench' },
            { label: 'Étoile', value: 'star' },
            { label: 'Bouclier', value: 'shield' },
            { label: 'Feuille', value: 'leaf' },
            { label: 'Horloge', value: 'clock' },
          ],
        },
        { name: 'title', type: 'text', required: true, label: 'Titre' },
        { name: 'description', type: 'textarea', label: 'Description' },
      ],
    },
  ],
}
