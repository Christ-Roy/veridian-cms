import type { Block } from 'payload'

/**
 * Bloc FAQ — questions/réponses pliables (`<details><summary>`).
 *
 * Section 14 du CMS-DIDIER-READY-TODO.md. Permet à Didier d'éditer
 * ses FAQ sans toucher au code, et de générer automatiquement le
 * JSON-LD FAQPage côté site pour le SEO Google (rich snippets).
 *
 * Rendu côté site : `<section><details><summary>` natif, pas de JS
 * nécessaire. Le composant React peut ajouter un script JSON-LD
 * `application/ld+json` qui transforme les items en FAQPage Schema.org.
 */
export const FAQBlock: Block = {
  slug: 'faq',
  labels: { singular: 'FAQ (questions)', plural: 'FAQ' },
  fields: [
    { name: 'eyebrow', type: 'text', label: 'Pré-titre', maxLength: 80 },
    { name: 'title', type: 'text', label: 'Titre de section', maxLength: 120, defaultValue: 'Questions fréquentes' },
    { name: 'subtitle', type: 'textarea', label: 'Sous-titre', maxLength: 300 },
    {
      name: 'items',
      type: 'array',
      label: 'Questions',
      labels: { singular: 'Question', plural: 'Questions' },
      minRows: 1,
      admin: {
        description: 'Liste de questions/réponses. Pas de limite, mais 5-10 questions est l\'idéal pour le SEO.',
      },
      fields: [
        {
          name: 'question',
          type: 'text',
          required: true,
          label: 'Question',
          maxLength: 200,
          admin: { description: 'Formuler comme l\'utilisateur la poserait. Ex : "Quel délai de livraison pour un TPE ?"' },
        },
        {
          name: 'answer',
          type: 'textarea',
          required: true,
          label: 'Réponse',
          maxLength: 1000,
          admin: { description: 'Réponse concise (1-3 paragraphes). Pour du texte riche, créer un bloc séparé.' },
        },
      ],
    },
    {
      name: 'jsonLd',
      type: 'checkbox',
      label: 'Activer le JSON-LD SEO (rich snippet Google)',
      defaultValue: true,
      admin: {
        description: 'Permet à Google d\'afficher les questions directement dans les résultats de recherche. Recommandé.',
      },
    },
  ],
}
