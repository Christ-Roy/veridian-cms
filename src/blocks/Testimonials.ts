import type { Block } from 'payload'

export const TestimonialsBlock: Block = {
  slug: 'testimonials',
  labels: { singular: 'Témoignages', plural: 'Témoignages' },
  fields: [
    { name: 'title', type: 'text' },
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      fields: [
        { name: 'quote', type: 'textarea', required: true },
        { name: 'author', type: 'text', required: true },
        { name: 'role', type: 'text', admin: { description: "Ex: 'Cliente particulière, Lyon 2ᵉ'" } },
        { name: 'avatar', type: 'upload', relationTo: 'media' },
      ],
    },
  ],
}
