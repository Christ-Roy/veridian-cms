import type { Block } from 'payload'

export const CTABlock: Block = {
  slug: 'cta',
  labels: { singular: "Appel à l'action", plural: "Appels à l'action" },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'ctaLabel', type: 'text', required: true },
    { name: 'ctaUrl', type: 'text', required: true },
  ],
}
