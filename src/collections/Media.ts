import type { CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: 'Média',
    plural: 'Médias',
  },
  admin: {
    useAsTitle: 'alt',
    description: 'Toutes vos images du site. Téléversez, recadrez, réutilisez.',
    group: 'Contenu',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      label: 'Texte alternatif',
      admin: {
        description: "Décrit l'image pour l'accessibilité et le référencement (obligatoire).",
      },
    },
    {
      name: 'caption',
      type: 'text',
      label: 'Légende',
      admin: { description: "Légende optionnelle affichée sous l'image." },
    },
  ],
  upload: {
    mimeTypes: ['image/*'],
    focalPoint: true,
    crop: true,
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 300, position: 'centre' },
      { name: 'card', width: 768, height: 512, position: 'centre' },
      { name: 'hero', width: 1920, height: 1080, position: 'centre' },
    ],
  },
}
