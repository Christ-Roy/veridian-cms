import type { Block } from 'payload'

/**
 * Block Formulaire : référence un document de la collection "forms"
 * (créée par le plugin form-builder).
 * Le client choisit un formulaire qu'il a créé dans le CMS et le place
 * où il veut sur n'importe quelle page.
 */
export const FormBlock: Block = {
  slug: 'formBlock',
  labels: { singular: 'Formulaire', plural: 'Formulaires' },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Titre au-dessus du formulaire',
    },
    {
      name: 'subtitle',
      type: 'textarea',
      label: 'Sous-titre',
    },
    {
      name: 'form',
      type: 'relationship',
      relationTo: 'forms',
      required: true,
      label: 'Formulaire à afficher',
      admin: {
        description: 'Sélectionnez un formulaire que vous avez créé dans Formulaires. Si aucun n\'apparaît, créez-en un d\'abord.',
      },
    },
  ],
}
