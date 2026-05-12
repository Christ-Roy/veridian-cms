import type { CollectionConfig } from 'payload'
import {
  validateSiren,
  validateSiret,
  validateTvaIntra,
  validateFrenchPhone,
  validateFrenchZip,
  validateHexColor,
} from '../lib/validators'

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  labels: {
    singular: 'Client',
    plural: 'Clients',
  },
  admin: {
    useAsTitle: 'name',
    description: 'Un client Veridian (ex : Morel Volailles, Dupont BTP...). Chaque client a son propre espace isolé.',
    group: 'Administration',
    // Caché aux non-super-admin
    hidden: ({ user }) =>
      !((user as { roles?: string[] | null } | null)?.roles?.includes('super-admin')),
  },
  access: {
    read: ({ req }) => {
      if (!req.user) return false
      if (req.user.roles?.includes('super-admin')) return true
      const tenantIds = (req.user.tenants ?? [])
        .map((t: { tenant?: number | { id: number } }) =>
          typeof t.tenant === 'object' ? t.tenant?.id : t.tenant,
        )
        .filter((id): id is number => typeof id === 'number')
      return { id: { in: tenantIds } }
    },
    create: ({ req }) => req.user?.roles?.includes('super-admin') ?? false,
    update: ({ req }) => req.user?.roles?.includes('super-admin') ?? false,
    delete: ({ req }) => req.user?.roles?.includes('super-admin') ?? false,
  },
  fields: [
    { name: 'name', type: 'text', required: true, label: 'Nom du client' },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      label: 'Identifiant URL',
      admin: { description: 'Ex : morel-volailles, dupont-btp' },
    },
    {
      name: 'siteUrl',
      type: 'text',
      label: 'URL du site public',
      admin: {
        description: 'URL HTTPS du site déployé pour ce client (ex : https://morel-volailles.fr). Utilisée pour la live preview et les builds.',
        placeholder: 'https://exemple.fr',
      },
    },
    {
      name: 'cfPagesProject',
      type: 'text',
      label: 'Projet Cloudflare Pages',
      admin: {
        description: 'Slug du projet CF Pages associé (pour le rebuild auto)',
        condition: (_, __, { user }) =>
          Boolean((user as { roles?: string[] | null } | null)?.roles?.includes('super-admin')),
      },
    },
    {
      name: 'cfDeployHook',
      type: 'text',
      label: 'URL du Deploy Hook Cloudflare',
      admin: {
        description: 'URL appelée pour rebuild le site quand une page est publiée',
        condition: (_, __, { user }) =>
          Boolean((user as { roles?: string[] | null } | null)?.roles?.includes('super-admin')),
      },
    },
    {
      name: 'features',
      type: 'json',
      label: 'Modules activés (super-admin)',
      defaultValue: {
        products: true,
        partners: true,
        map: false,
        testimonials: true,
        floatingCta: true,
        livePreview: true,
      },
      admin: {
        description: 'Active ou désactive les modules pour ce client. Le site lit ce JSON au build pour skipper les sections désactivées.',
        condition: (_, __, { user }) =>
          Boolean((user as { roles?: string[] | null } | null)?.roles?.includes('super-admin')),
      },
    },
    {
      name: 'company',
      type: 'group',
      label: 'Informations entreprise',
      admin: {
        description: 'Données légales et identité juridique — affichées sur les mentions légales du site et dans les emails.',
      },
      fields: [
        { name: 'legalName', type: 'text', label: 'Raison sociale', admin: { description: 'Ex : VERIDIAN SAS' } },
        {
          name: 'legalForm',
          type: 'select',
          label: 'Forme juridique',
          options: [
            { label: 'SARL', value: 'SARL' },
            { label: 'SAS', value: 'SAS' },
            { label: 'SASU', value: 'SASU' },
            { label: 'EURL', value: 'EURL' },
            { label: 'SA', value: 'SA' },
            { label: 'EI (Entrepreneur individuel)', value: 'EI' },
            { label: 'Auto-entrepreneur', value: 'AE' },
            { label: 'Association', value: 'ASSO' },
          ],
        },
        { name: 'capital', type: 'text', label: 'Capital social (texte libre)', admin: { description: 'Ex : "10 000 €" ou "Variable"' } },
        { name: 'siren', type: 'text', label: 'SIREN', validate: validateSiren, admin: { description: '9 chiffres' } },
        { name: 'siret', type: 'text', label: 'SIRET', validate: validateSiret, admin: { description: '14 chiffres (siège social)' } },
        { name: 'tvaIntra', type: 'text', label: 'TVA intracommunautaire', validate: validateTvaIntra, admin: { description: 'Ex : FR12345678901' } },
        { name: 'naf', type: 'text', label: 'Code NAF/APE', admin: { description: 'Ex : 6201Z' } },
        { name: 'rcs', type: 'text', label: 'Ville RCS', admin: { description: 'Ex : Paris, Lyon' } },
        { name: 'directorName', type: 'text', label: 'Nom du dirigeant', admin: { description: 'Ex : Robert Brunon' } },
        { name: 'foundedYear', type: 'number', label: 'Année de création', min: 1900, max: 2100 },
      ],
    },
    {
      name: 'branding',
      type: 'group',
      label: 'Identité visuelle',
      admin: {
        description: "Couleurs et typographie du site. Modifier puis publier une page pour déclencher le rebuild Cloudflare Pages.",
      },
      fields: [
        {
          name: 'primaryColor',
          type: 'text',
          label: 'Couleur principale (hex)',
          validate: validateHexColor,
          admin: { description: 'Ex : #0a2540 (bleu marine). Utilisée sur boutons primaires, liens, focus rings.' },
        },
        {
          name: 'accentColor',
          type: 'text',
          label: 'Couleur d\'accent (hex)',
          validate: validateHexColor,
          admin: { description: 'Ex : #ffd23f (jaune). Utilisée pour les highlights, badges, hover states.' },
        },
        {
          name: 'borderRadius',
          type: 'select',
          label: 'Style des coins',
          options: [
            { label: 'Brutaliste (0px)', value: 'none' },
            { label: 'Doux (4px)', value: 'sm' },
            { label: 'Standard (8px)', value: 'md' },
            { label: 'Arrondi (16px)', value: 'lg' },
            { label: 'Pilule (9999px)', value: 'pill' },
          ],
          defaultValue: 'md',
        },
        {
          name: 'fontFamily',
          type: 'select',
          label: 'Typographie',
          options: [
            { label: 'Inter (moderne, neutre)', value: 'inter' },
            { label: 'Playfair Display (chic, sérieux)', value: 'playfair' },
            { label: 'Cormorant (élégant, classique)', value: 'cormorant' },
            { label: 'Lora (lisible, magazine)', value: 'lora' },
            { label: 'System (police OS, défaut)', value: 'system' },
          ],
          defaultValue: 'inter',
        },
      ],
    },
    {
      name: 'contact',
      type: 'group',
      label: 'Contact public',
      admin: {
        description: 'Coordonnées affichées sur le site (header, footer, page contact).',
      },
      fields: [
        {
          name: 'phones',
          type: 'array',
          label: 'Téléphones',
          labels: { singular: 'Téléphone', plural: 'Téléphones' },
          fields: [
            { name: 'label', type: 'text', label: 'Libellé', admin: { description: 'Ex : Mobile, Fixe, Hotline 24/7' } },
            { name: 'number', type: 'text', required: true, validate: validateFrenchPhone, admin: { description: 'Format FR : 06 12 34 56 78 ou +33 6 12 34 56 78' } },
            { name: 'primary', type: 'checkbox', label: 'Numéro principal (CTA du site)', admin: { description: 'Un seul numéro principal — il sera utilisé sur les boutons "Appelez-nous".' } },
          ],
        },
        { name: 'email', type: 'email', label: 'Email public' },
        {
          name: 'address',
          type: 'group',
          label: 'Adresse postale',
          fields: [
            { name: 'street', type: 'text', label: 'Rue' },
            { name: 'zip', type: 'text', label: 'Code postal', validate: validateFrenchZip, admin: { description: '5 chiffres' } },
            { name: 'city', type: 'text', label: 'Ville' },
            { name: 'country', type: 'text', label: 'Pays', defaultValue: 'France' },
          ],
        },
        { name: 'serviceZone', type: 'textarea', label: "Zone d'intervention", admin: { description: "Ex : Île-de-France et Hauts-de-France" } },
        {
          name: 'hours',
          type: 'array',
          label: 'Horaires d\'ouverture',
          labels: { singular: 'Horaire', plural: 'Horaires' },
          fields: [
            { name: 'day', type: 'text', required: true, label: 'Jours', admin: { description: 'Ex : Lun–Ven, Samedi' } },
            { name: 'time', type: 'text', required: true, label: 'Créneau', admin: { description: 'Ex : 8h–18h, Fermé' } },
          ],
        },
      ],
    },
  ],
}
