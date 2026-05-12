import type { Block } from 'payload'
import { uploadWithPreviewAdmin } from '../components/UploadWithPreview/field'

export const LogoWallBlock: Block = {
  slug: 'logoWall',
  labels: { singular: 'Mur de logos', plural: 'Murs de logos' },
  fields: [
    { name: 'eyebrow', type: 'text', label: 'Pré-titre' },
    { name: 'title', type: 'text', label: 'Titre' },
    { name: 'subtitle', type: 'textarea', label: 'Sous-titre' },
    {
      name: 'logos',
      type: 'array',
      label: 'Logos',
      labels: { singular: 'Logo', plural: 'Logos' },
      minRows: 1,
      fields: [
        { name: 'name', type: 'text', required: true, label: 'Nom du partenaire' },
        { name: 'image', type: 'upload', relationTo: 'media', label: 'Logo (sinon le nom est affiché en wordmark)', admin: uploadWithPreviewAdmin() },
        { name: 'linkUrl', type: 'text', label: 'URL (optionnel)' },
      ],
    },
  ],
}
