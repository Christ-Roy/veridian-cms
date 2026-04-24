import type { Block } from 'payload'

export const RichTextBlock: Block = {
  slug: 'richtext',
  labels: { singular: 'Texte riche', plural: 'Textes riches' },
  fields: [
    { name: 'title', type: 'text', label: 'Titre' },
    { name: 'body', type: 'richText', required: true, label: 'Contenu' },
    {
      name: 'alignment',
      type: 'select',
      label: 'Alignement',
      defaultValue: 'left',
      options: [
        { label: 'Gauche', value: 'left' },
        { label: 'Centré', value: 'center' },
      ],
    },
  ],
}
