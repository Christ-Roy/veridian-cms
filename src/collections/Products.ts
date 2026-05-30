import type { CollectionConfig } from 'payload'
import { canCreate, canDelete, canRead, canUpdate } from '../lib/access'
import { triggerSiteRebuild } from '../hooks/triggerSiteRebuild'
import { uploadWithPreviewAdmin } from '../components/UploadWithPreview/field'

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
    read: canRead,
    create: canCreate, // super-admin + client (PAS editor)
    update: canUpdate, // tous
    delete: canDelete, // super-admin + client (PAS editor)
  },
  versions: {
    // Drafts manuels : pas d'autosave, le client clique explicitement "Publier"
    // pour activer le produit (cf demande Robert/Didier 2026-05-30). Tant que
    // _status = 'draft', le site public ne le sert pas (filtré côté front).
    drafts: true,
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
      validate: (value: unknown) => {
        if (typeof value !== 'string' || !value.trim()) {
          return 'Le nom du produit est obligatoire.'
        }
        return true
      },
    },
    {
      name: 'slug',
      type: 'text',
      label: 'Identifiant URL',
      admin: {
        // Caché du form admin — auto-généré côté serveur depuis `name`.
        // Le client n'a pas à se soucier de l'URL.
        hidden: true,
      },
      hooks: {
        beforeChange: [
          ({ value, data }) => {
            // Toujours régénérer depuis le name pour garantir cohérence.
            // (Si on garde la valeur user, le slug peut diverger du nom après
            // un rename → on force la régénération.)
            const name = (data as { name?: string })?.name
            if (typeof name === 'string' && name.trim()) {
              return name
                .toLowerCase()
                .normalize('NFD')
                .replace(/[̀-ͯ]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '')
                .slice(0, 80)
            }
            return value
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
        description: 'Tapez une marque existante (autocomplete) ou ajoutez-en une nouvelle — elle sera mémorisée.',
        components: {
          Field: '/components/BrandPicker/index.tsx#BrandPicker',
        },
      },
      hooks: {
        // Normalise la marque au save pour éviter les doublons par casse :
        // "INGENICO" / "Ingenico" / "ingenico" → "Ingenico" (Title Case).
        // Si une variante existe déjà dans la collection, on s'aligne dessus.
        beforeChange: [
          async ({ value, req, operation, originalDoc }) => {
            if (typeof value !== 'string') return value
            const trimmed = value.trim()
            if (!trimmed) return null

            // Title Case basique : première lettre maj, reste minuscule.
            const titleCased = trimmed
              .split(/\s+/)
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
              .join(' ')

            // Cherche si une variante (case-insensitive) existe déjà — on aligne dessus
            // pour ne pas créer "Ingenico" + "ingenico" + "INGENICO".
            try {
              const existing = await req.payload.find({
                collection: 'products',
                where: {
                  brand: { like: trimmed },
                  ...(operation === 'update' && originalDoc?.id ? { id: { not_equals: originalDoc.id } } : {}),
                },
                limit: 1,
                depth: 0,
                req,
              })
              const match = (existing.docs[0] as { brand?: string } | undefined)?.brand
              if (match && match.toLowerCase() === trimmed.toLowerCase()) {
                return match // s'aligne sur la casse existante
              }
            } catch {
              // best-effort, on tombe sur Title Case
            }
            return titleCased
          },
        ],
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
      admin: uploadWithPreviewAdmin(),
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
      name: '_preview',
      type: 'ui',
      label: 'Aperçu',
      admin: {
        position: 'sidebar',
        components: {
          Field: '/components/ProductPreview/index.tsx#ProductPreview',
        },
      },
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
