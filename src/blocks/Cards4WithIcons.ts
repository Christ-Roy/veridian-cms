import type { Block } from 'payload'

export const Cards4WithIconsBlock: Block = {
  slug: 'cards4WithIcons',
  labels: { singular: 'Cartes avec icônes', plural: 'Cartes avec icônes' },
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
      maxRows: 4,
      admin: { description: 'De 2 à 4 cartes alignées (services, catégories, etc.).' },
      fields: [
        {
          name: 'icon',
          type: 'select',
          required: true,
          label: 'Icône',
          defaultValue: 'check',
          options: [
            { label: 'Téléphone', value: 'phone' },
            { label: 'Coche', value: 'check' },
            { label: 'Réglages', value: 'settings' },
            { label: 'Outils', value: 'tools' },
            { label: 'Email', value: 'mail' },
            { label: 'Bouclier', value: 'shield' },
            { label: 'Récompense', value: 'award' },
            { label: 'Étoile', value: 'star' },
            { label: 'Paquet', value: 'package' },
            { label: 'Globe', value: 'globe' },
            { label: 'Localisation', value: 'map-pin' },
            { label: 'Camion', value: 'truck' },
          ],
        },
        { name: 'title', type: 'text', required: true, label: 'Titre' },
        { name: 'description', type: 'textarea', required: true, label: 'Description' },
        { name: 'linkUrl', type: 'text', label: 'URL du lien (optionnel)' },
        { name: 'linkLabel', type: 'text', label: 'Libellé du lien (optionnel)' },
      ],
    },
  ],
}
