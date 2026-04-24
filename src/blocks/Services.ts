import type { Block } from 'payload'

export const ServicesBlock: Block = {
  slug: 'services',
  labels: { singular: 'Services', plural: 'Services' },
  fields: [
    { name: 'title', type: 'text' },
    { name: 'subtitle', type: 'textarea' },
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      fields: [
        {
          name: 'icon',
          type: 'select',
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
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'textarea' },
      ],
    },
  ],
}
