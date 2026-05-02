import type { Block } from 'payload'

export const HeroBlock: Block = {
  slug: 'hero',
  labels: { singular: 'Hero (bannière)', plural: 'Heros' },
  fields: [
    { name: 'eyebrow', type: 'text', label: 'Pré-titre', admin: { description: 'Petit texte au-dessus du titre (ex : "Artisan certifié RGE").' } },
    { name: 'title', type: 'text', required: true, label: 'Titre principal' },
    { name: 'subtitle', type: 'textarea', label: 'Sous-titre' },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Image de fond' },
    {
      name: 'ctas',
      type: 'array',
      label: 'Boutons',
      labels: { singular: 'Bouton', plural: 'Boutons' },
      maxRows: 2,
      fields: [
        { name: 'label', type: 'text', required: true, label: 'Libellé' },
        { name: 'url', type: 'text', required: true, label: 'URL' },
        {
          name: 'variant',
          type: 'select',
          label: 'Style',
          defaultValue: 'primary',
          options: [
            { label: 'Bouton principal', value: 'primary' },
            { label: 'Bouton secondaire', value: 'secondary' },
          ],
        },
      ],
    },
    {
      name: 'bullets',
      type: 'array',
      label: 'Points clés (sous les boutons)',
      labels: { singular: 'Point', plural: 'Points' },
      maxRows: 4,
      admin: {
        description: 'Petits points avec ✓ affichés sous les boutons (ex : "7j/7 de 9h à 22h").',
      },
      fields: [{ name: 'text', type: 'text', required: true, label: 'Texte' }],
    },
  ],
}
