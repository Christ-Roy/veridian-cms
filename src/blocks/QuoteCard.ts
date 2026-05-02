import type { Block } from 'payload'

/**
 * Bloc "Carte avec citation + image + stats" — utilisé sur AVSE pour la
 * section "Notre histoire" (image gérant + citation + 2 stats côte-à-côte).
 *
 * Structure :
 *  - Image (gérant, vitrine, etc.)
 *  - Citation
 *  - Auteur + rôle
 *  - 2 stats (label + sous-label)
 *  - Eyebrow + titre + paragraphes (côté texte)
 *  - 2 CTAs
 *  - Note italique de bas de section
 */
export const QuoteCardBlock: Block = {
  slug: 'quoteCard',
  labels: {
    singular: 'Carte citation + texte',
    plural: 'Cartes citation + texte',
  },
  fields: [
    // Côté image / citation
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Image',
      admin: {
        description: 'Photo principale de la carte (portrait, format vertical recommandé).',
      },
    },
    {
      name: 'imageFallbackUrl',
      type: 'text',
      label: 'URL image de secours',
      admin: {
        description: 'URL publique si pas d\'upload. Sera remplacé dès qu\'une image est uploadée.',
      },
    },
    {
      name: 'imageAlt',
      type: 'text',
      label: 'Texte alternatif (alt)',
    },
    {
      name: 'quote',
      type: 'textarea',
      label: 'Citation',
    },
    {
      name: 'authorName',
      type: 'text',
      label: 'Auteur',
    },
    {
      name: 'authorRole',
      type: 'text',
      label: 'Rôle / Fonction',
    },
    {
      name: 'stats',
      type: 'array',
      label: 'Stats (en bas de la carte)',
      labels: { singular: 'Stat', plural: 'Stats' },
      maxRows: 2,
      fields: [
        { name: 'label', type: 'text', required: true, label: 'Label principal' },
        { name: 'sublabel', type: 'text', label: 'Sous-label' },
      ],
    },
    // Côté texte
    {
      name: 'eyebrow',
      type: 'text',
      label: 'Pré-titre (côté texte)',
    },
    {
      name: 'title',
      type: 'text',
      label: 'Titre (côté texte)',
    },
    {
      name: 'paragraphs',
      type: 'array',
      label: 'Paragraphes',
      labels: { singular: 'Paragraphe', plural: 'Paragraphes' },
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
    {
      name: 'footnote',
      type: 'textarea',
      label: 'Note de bas de section',
      admin: {
        description: 'Petit texte italique en bas (ex : "Pas de hotline anonyme...").',
      },
    },
  ],
}
