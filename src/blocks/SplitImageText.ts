import type { Block } from 'payload'
import { uploadWithPreviewAdmin } from '../components/UploadWithPreview/field'

export const SplitImageTextBlock: Block = {
  slug: 'splitImageText',
  labels: { singular: 'Image + texte', plural: 'Images + texte' },
  fields: [
    { name: 'eyebrow', type: 'text', label: 'Pré-titre' },
    { name: 'title', type: 'text', label: 'Titre' },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Image (upload)', admin: uploadWithPreviewAdmin() },
    {
      name: 'imageFallbackUrl',
      type: 'text',
      label: 'URL image (alternative à upload)',
      admin: { description: 'Si pas d\'upload, on peut donner une URL d\'image (ex: /images/legacy/...). Utile pour le seed initial.' },
    },
    { name: 'imageAlt', type: 'text', label: 'Texte alternatif (accessibilité)' },
    {
      name: 'imagePosition',
      type: 'select',
      label: 'Position de l\'image',
      defaultValue: 'left',
      options: [
        { label: 'À gauche', value: 'left' },
        { label: 'À droite', value: 'right' },
      ],
    },
    {
      name: 'paragraphs',
      type: 'array',
      label: 'Paragraphes',
      labels: { singular: 'Paragraphe', plural: 'Paragraphes' },
      minRows: 1,
      fields: [
        { name: 'text', type: 'textarea', required: true, label: 'Texte' },
      ],
    },
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
  ],
}
