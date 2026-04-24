import type { Block } from 'payload'

export const RichTextBlock: Block = {
  slug: 'richtext',
  labels: { singular: 'Bloc de texte', plural: 'Blocs de texte' },
  fields: [
    { name: 'title', type: 'text' },
    { name: 'body', type: 'richText', required: true },
    {
      name: 'alignment',
      type: 'select',
      defaultValue: 'left',
      options: [
        { label: 'Gauche', value: 'left' },
        { label: 'Centré', value: 'center' },
      ],
    },
  ],
}
