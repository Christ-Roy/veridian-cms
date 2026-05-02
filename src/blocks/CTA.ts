import type { Block } from 'payload'

export const CTABlock: Block = {
  slug: 'cta',
  labels: { singular: "Appel à l'action", plural: "Appels à l'action" },
  fields: [
    { name: 'title', type: 'text', required: true, label: 'Titre' },
    { name: 'description', type: 'textarea', label: 'Description' },
    // Champs legacy (1 bouton). Conservés en lecture pour les contenus
    // existants ; nouveaux contenus utilisent `ctas` (jusqu'à 2 boutons).
    {
      name: 'ctaLabel',
      type: 'text',
      label: 'Libellé du bouton (legacy — préférez "Boutons")',
      admin: {
        description:
          'Champ historique. Pour ajouter plusieurs boutons, utiliser le tableau "Boutons" ci-dessous.',
      },
    },
    {
      name: 'ctaUrl',
      type: 'text',
      label: 'URL du bouton (legacy)',
    },
    {
      name: 'ctas',
      type: 'array',
      label: 'Boutons',
      labels: { singular: 'Bouton', plural: 'Boutons' },
      maxRows: 2,
      admin: {
        description:
          'Si rempli, remplace le bouton legacy ci-dessus. Jusqu\'à 2 boutons.',
      },
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
