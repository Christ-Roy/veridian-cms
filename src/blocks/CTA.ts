import type { Block } from 'payload'

export const CTABlock: Block = {
  slug: 'cta',
  labels: { singular: "Appel à l'action", plural: "Appels à l'action" },
  fields: [
    { name: 'title', type: 'text', required: true, label: 'Titre' },
    { name: 'description', type: 'textarea', label: 'Description' },
    { name: 'ctaLabel', type: 'text', required: true, label: 'Libellé du bouton' },
    { name: 'ctaUrl', type: 'text', required: true, label: 'URL du bouton' },
  ],
}
