import type { CollectionConfig } from 'payload'

/**
 * Collection Partners — section 13 du CMS-DIDIER-READY-TODO.md.
 *
 * Remplace `sites/avse/src/data/partners.json` (47 partenaires). Permet à
 * Didier d'éditer ses partenaires (texte, logo, ville) sans toucher au code.
 *
 * Multi-tenant : chaque partenaire est attaché à un tenant. Plugin
 * `@payloadcms/plugin-multi-tenant` filtre automatiquement par tenant
 * courant (le plugin l'ajoute via la config racine).
 *
 * Pour le rendu :
 *  - Page liste `/partenaires` → liste tous les partenaires triés par nom
 *  - Page détail `/partenaires/[slug]` → rendu du body markdown du partenaire
 *  - Le slug est unique par tenant (un client peut avoir "afflelou", un
 *    autre client peut avoir aussi "afflelou" sans conflit)
 */
export const Partners: CollectionConfig = {
  slug: 'partners',
  labels: {
    singular: 'Partenaire',
    plural: 'Partenaires',
  },
  admin: {
    useAsTitle: 'name',
    description: 'Clients & partenaires que vous mettez en avant sur votre site (page /partenaires).',
    defaultColumns: ['name', 'city', 'dept', 'tenant', 'updatedAt'],
    group: 'Mon site',
  },
  access: {
    // Lecture publique : page partenaires côté site doit pouvoir hit l'API
    // sans cookie ni clé. Le plugin multi-tenant filtrera par tenant.
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Nom du partenaire',
      maxLength: 200,
      admin: { description: 'Ex : "Afflelou à Cannes, Monaco et Menton"' },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      label: 'Identifiant URL',
      maxLength: 100,
      admin: {
        description: 'URL : /partenaires/<slug>. Lettres minuscules, tirets, pas d\'espaces. Ex : afflelou-cannes-monaco',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'city',
          type: 'text',
          label: 'Ville',
          maxLength: 120,
          admin: { width: '60%', description: 'Ex : "Cannes · Monaco · Menton"' },
        },
        {
          name: 'dept',
          type: 'text',
          label: 'Département',
          maxLength: 5,
          admin: { width: '40%', description: 'Code département. Ex : 06, 75, 73' },
        },
      ],
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      label: 'Logo du partenaire',
      admin: { description: 'Logo affiché sur la liste + page détail. Format PNG/SVG recommandé.' },
    },
    {
      name: 'body',
      type: 'textarea',
      required: true,
      label: 'Description (markdown)',
      admin: {
        description: 'Format markdown : titres `# H1`, listes `- item`, gras `**texte**`. Détaille le matériel installé, la durée de partenariat, etc.',
      },
    },
    {
      name: 'partnershipYear',
      type: 'number',
      label: 'Année de début de partenariat',
      min: 1990,
      max: 2100,
      admin: { description: 'Optionnel — utilisé pour le tri "ancienneté" si besoin.' },
    },
    {
      name: 'featured',
      type: 'checkbox',
      label: 'Mis en avant',
      defaultValue: false,
      admin: { description: 'Affiché en tête de la page partenaires.' },
    },
  ],
}
