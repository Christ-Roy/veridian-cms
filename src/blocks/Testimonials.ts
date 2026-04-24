import type { Block } from 'payload'

export const TestimonialsBlock: Block = {
  slug: 'testimonials',
  labels: { singular: 'Témoignages', plural: 'Témoignages' },
  fields: [
    { name: 'title', type: 'text', label: 'Titre' },
    {
      name: 'items',
      type: 'array',
      label: 'Avis clients',
      labels: { singular: 'Avis', plural: 'Avis' },
      minRows: 1,
      fields: [
        { name: 'quote', type: 'textarea', required: true, label: 'Témoignage' },
        { name: 'author', type: 'text', required: true, label: 'Nom du client' },
        { name: 'role', type: 'text', label: 'Statut', admin: { description: "Ex : 'Cliente particulière, Lyon 2ᵉ'" } },
        { name: 'avatar', type: 'upload', relationTo: 'media', label: 'Photo du client' },
      ],
    },
  ],
}
