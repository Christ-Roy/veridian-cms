import type { Block } from 'payload'
import { uploadWithPreviewAdmin } from '../components/UploadWithPreview/field'

export const GalleryBlock: Block = {
  slug: 'gallery',
  labels: { singular: 'Galerie', plural: 'Galeries' },
  fields: [
    { name: 'title', type: 'text', label: 'Titre' },
    { name: 'subtitle', type: 'textarea', label: 'Sous-titre' },
    {
      name: 'images',
      type: 'array',
      label: 'Photos',
      labels: { singular: 'Photo', plural: 'Photos' },
      minRows: 1,
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media', required: true, label: 'Image', admin: uploadWithPreviewAdmin() },
        { name: 'caption', type: 'text', label: 'Légende' },
      ],
    },
  ],
}
