import type { Block } from 'payload'
import { uploadWithPreviewAdmin } from '../components/UploadWithPreview/field'

export const Cards2Block: Block = {
  slug: 'cards2',
  labels: { singular: 'Deux cartes', plural: 'Deux cartes' },
  fields: [
    { name: 'eyebrow', type: 'text', label: 'Pré-titre' },
    { name: 'title', type: 'text', label: 'Titre de section' },
    { name: 'subtitle', type: 'textarea', label: 'Sous-titre' },
    {
      name: 'cards',
      type: 'array',
      label: 'Cartes',
      labels: { singular: 'Carte', plural: 'Cartes' },
      minRows: 2,
      maxRows: 2,
      admin: { description: 'Exactement 2 cartes côte à côte.' },
      fields: [
        { name: 'eyebrow', type: 'text', label: 'Pré-titre de la carte', admin: { description: 'Ex : "Recommandé · TPE portable"' } },
        { name: 'title', type: 'text', required: true, label: 'Titre de la carte' },
        { name: 'description', type: 'textarea', required: true, label: 'Description' },
        {
          name: 'points',
          type: 'array',
          label: 'Points clés',
          labels: { singular: 'Point', plural: 'Points' },
          fields: [
            { name: 'text', type: 'text', required: true, label: 'Texte' },
          ],
        },
        { name: 'image', type: 'upload', relationTo: 'media', label: 'Image (optionnelle)', admin: uploadWithPreviewAdmin() },
      ],
    },
  ],
}
