import type { Block } from 'payload'

/**
 * Bloc Stats — chiffres clés (ex : "1500+ clients", "20 ans d'expérience", "7j/7").
 *
 * Section 14 du CMS-DIDIER-READY-TODO.md. Remplace les hardcodés sur
 * HomeView.tsx côté site AVSE. Pattern : un value + label + optional hint.
 *
 * Rendu côté site : grille horizontale 3-4 colonnes avec chiffres grands
 * et labels en dessous. Idéal pour Hero secondaire ou section "Pourquoi
 * nous choisir".
 */
export const StatsBlock: Block = {
  slug: 'stats',
  labels: { singular: 'Chiffres clés', plural: 'Chiffres clés' },
  fields: [
    { name: 'eyebrow', type: 'text', label: 'Pré-titre', maxLength: 80 },
    { name: 'title', type: 'text', label: 'Titre de section', maxLength: 120 },
    { name: 'subtitle', type: 'textarea', label: 'Sous-titre', maxLength: 300 },
    {
      name: 'items',
      type: 'array',
      label: 'Chiffres',
      labels: { singular: 'Chiffre', plural: 'Chiffres' },
      minRows: 1,
      maxRows: 6,
      admin: {
        description: '2 à 6 chiffres affichés en grille. Au-delà ça devient illisible.',
      },
      fields: [
        {
          name: 'value',
          type: 'text',
          required: true,
          label: 'Valeur',
          maxLength: 20,
          admin: { description: 'Ex : "1500+", "20 ans", "7j/7", "98%"' },
        },
        {
          name: 'label',
          type: 'text',
          required: true,
          label: 'Libellé',
          maxLength: 60,
          admin: { description: 'Ex : "Clients accompagnés", "D\'expérience", "Disponibilité"' },
        },
        {
          name: 'hint',
          type: 'text',
          label: 'Précision (optionnelle)',
          maxLength: 100,
          admin: { description: 'Petite phrase sous le label. Ex : "Toutes tailles confondues"' },
        },
      ],
    },
  ],
}
