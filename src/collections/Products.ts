import type { CollectionConfig } from 'payload'
import { triggerSiteRebuild } from '../hooks/triggerSiteRebuild'

/**
 * Catalogue produits multi-tenant.
 *
 * Chaque tenant gère sa propre liste : nom, slug, catégorie, marque, prix HT,
 * tarif location, image, description, ordre d'affichage.
 *
 * Les catégories sont libres en texte (chaque client a les siennes), mais
 * pour AVSE on conseille : tpe, caisses, peripheriques, accessoires,
 * fournitures, forfaits, location.
 *
 * Le webhook triggerSiteRebuild se déclenche à chaque save publié → CF Pages
 * rebuild → catalogue mis à jour ~2 min plus tard.
 */
export const Products: CollectionConfig = {
  slug: 'products',
  labels: {
    singular: 'Produit',
    plural: 'Catalogue',
  },
  admin: {
    useAsTitle: 'name',
    description: 'Catalogue produits — TPE, caisses, périphériques, accessoires, fournitures, forfaits, location.',
    defaultColumns: ['name', 'category', 'brand', 'priceHT', '_status', 'updatedAt'],
    group: 'Catalogue',
    listSearchableFields: ['name', 'brand', 'category'],
  },
  access: {
    read: ({ req }) => Boolean(req.user),
  },
  versions: {
    drafts: {
      autosave: { interval: 2000 },
    },
    maxPerDoc: 10,
  },
  hooks: {
    afterChange: [triggerSiteRebuild],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Nom du produit',
      admin: { description: 'Ex : Verifone Victa VP100, Caisse Aures TRX3000…' },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      label: 'Identifiant URL',
      admin: { description: 'Ex : verifone-victa-vp100. Utilisé dans l\'URL et pour pré-remplir le formulaire de contact.' },
      hooks: {
        // Auto-slug depuis le nom si vide
        beforeValidate: [
          ({ value, data }) => {
            if (value && typeof value === 'string' && value.trim()) return value
            const name = (data as { name?: string })?.name
            if (!name) return value
            return name
              .toLowerCase()
              .normalize('NFD')
              .replace(/[̀-ͯ]/g, '')
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '')
              .slice(0, 80)
          },
        ],
      },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      label: 'Catégorie',
      defaultValue: 'tpe',
      options: [
        { label: 'TPE — Terminaux de paiement', value: 'tpe' },
        { label: 'Caisses tactiles', value: 'caisses' },
        { label: 'Périphériques', value: 'peripheriques' },
        { label: 'Accessoires', value: 'accessoires' },
        { label: 'Fournitures', value: 'fournitures' },
        { label: 'Forfaits télécom', value: 'forfaits' },
        { label: 'Location', value: 'location' },
      ],
    },
    {
      name: 'brand',
      type: 'text',
      label: 'Marque',
      admin: {
        description: 'Ex : Verifone, Ingenico, Pax, Aures, Sunmi, U Pos, Perimatic, Kortex, CSI…',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'priceHT',
          type: 'text',
          label: 'Prix achat (HT)',
          admin: {
            width: '50%',
            description: 'Format libre, ex : "1 400 € HT" ou "à partir de 30 € HT". Laisser vide si uniquement en location.',
          },
        },
        {
          name: 'rentMonth',
          type: 'text',
          label: 'Tarif location / mois',
          admin: {
            width: '50%',
            description: 'Format libre, ex : "45 € / mois HT". Laisser vide si vente uniquement.',
          },
        },
      ],
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Photo produit (upload)',
    },
    {
      name: 'imageFallbackUrl',
      type: 'text',
      label: 'URL image (alternative à upload)',
      admin: {
        description: 'Si vous n\'uploadez pas d\'image, vous pouvez donner une URL (ex : /images/products/xxx.png).',
      },
    },
    {
      name: 'description',
      type: 'array',
      label: 'Caractéristiques',
      labels: { singular: 'Caractéristique', plural: 'Caractéristiques' },
      admin: { description: 'Liste de points (1 ligne par caractéristique). Affichés en bullets sur la fiche produit.' },
      fields: [
        { name: 'text', type: 'text', required: true, label: 'Texte' },
      ],
    },
    {
      name: 'order',
      type: 'number',
      label: 'Ordre d\'affichage',
      defaultValue: 100,
      admin: {
        description: 'Plus petit = affiché en premier. Laisse 100 par défaut, baisse pour mettre en avant.',
        position: 'sidebar',
      },
    },
    {
      name: 'refLegacy',
      type: 'text',
      label: 'Référence interne',
      admin: {
        description: 'Référence privée (ex : N°221). Optionnelle, non affichée publiquement.',
        position: 'sidebar',
      },
    },
  ],
}
