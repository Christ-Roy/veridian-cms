import type { CollectionBeforeDeleteHook, CollectionConfig } from 'payload'
import { APIError } from 'payload'

/**
 * Scan toutes les collections qui peuvent référencer un media et empêche la
 * suppression si au moins un doc l'utilise. Évite que Didier supprime une
 * image utilisée par une page → image cassée sur le site.
 *
 * Les blocks Pages référencent media via des chemins imbriqués que Payload
 * indexe automatiquement (les requêtes `blocks.image` traversent l'array de
 * blocks de tout type). On scanne aussi les blocks à items répétés (Gallery,
 * Cards2, LogoWall, Testimonials) qui ont leur propre sous-array.
 */
const blockMediaDeleteIfReferenced: CollectionBeforeDeleteHook = async ({
  id,
  req,
}) => {
  const isSuperAdmin = (req.user as { roles?: string[] | null } | null)?.roles?.includes(
    'super-admin',
  )

  // Scans en parallèle. Chaque query retourne `totalDocs` directement, on
  // ne fetch pas les docs eux-mêmes (limit: 0 économise du JSON).
  const queries: Array<Promise<{ totalDocs: number; collection: string; label: string }>> = [
    // Pages : Hero.image, SplitImageText.image, Cards2.cards.image,
    //         Gallery.items.image, LogoWall.items.image, Testimonials.items.avatar
    // Payload indexe les uploads imbriqués sous `blocks.<champ>` traversant
    // tous les types de blocks de l'array.
    req.payload
      .find({
        collection: 'pages',
        where: { 'blocks.image': { equals: id } },
        limit: 0,
        depth: 0,
        req,
      })
      .then((r) => ({ totalDocs: r.totalDocs, collection: 'pages', label: 'page(s)' })),
    req.payload
      .find({
        collection: 'pages',
        where: { 'blocks.items.image': { equals: id } },
        limit: 0,
        depth: 0,
        req,
      })
      .then((r) => ({ totalDocs: r.totalDocs, collection: 'pages-items', label: 'page(s) (galerie/cards)' })),
    req.payload
      .find({
        collection: 'pages',
        where: { 'blocks.cards.image': { equals: id } },
        limit: 0,
        depth: 0,
        req,
      })
      .then((r) => ({ totalDocs: r.totalDocs, collection: 'pages-cards', label: 'page(s) (cards2)' })),
    req.payload
      .find({
        collection: 'pages',
        where: { 'blocks.items.avatar': { equals: id } },
        limit: 0,
        depth: 0,
        req,
      })
      .then((r) => ({ totalDocs: r.totalDocs, collection: 'pages-avatars', label: 'témoignage(s)' })),
    req.payload
      .find({
        collection: 'products',
        where: { image: { equals: id } },
        limit: 0,
        depth: 0,
        req,
      })
      .then((r) => ({ totalDocs: r.totalDocs, collection: 'products', label: 'produit(s)' })),
    req.payload
      .find({
        collection: 'header',
        where: { logo: { equals: id } },
        limit: 0,
        depth: 0,
        req,
      })
      .then((r) => ({ totalDocs: r.totalDocs, collection: 'header', label: 'en-tête' })),
  ]

  const results = await Promise.all(
    queries.map((p) =>
      p.catch(() => ({ totalDocs: 0, collection: 'unknown', label: 'unknown' })),
    ),
  )

  // Dédupe par collection pour éviter de compter 3× la même page (qui
  // pourrait matcher blocks.image ET blocks.items.image en même temps si
  // jamais Payload coalesce les chemins — improbable mais pas testé).
  const totalRefs = results.reduce((sum, r) => sum + r.totalDocs, 0)
  if (totalRefs === 0) return

  const breakdown = results
    .filter((r) => r.totalDocs > 0)
    .map((r) => `${r.totalDocs} ${r.label}`)
    .join(', ')

  // Super-admin peut forcer la suppression (cas cleanup orphelins).
  if (isSuperAdmin) {
    req.payload.logger.warn(
      `[Media #${id}] suppression super-admin malgré ${totalRefs} référence(s) : ${breakdown}`,
    )
    return
  }

  throw new APIError(
    `Ce média est utilisé par ${breakdown}. Retirez-le d'abord des pages/produits avant de le supprimer.`,
    409,
  )
}

export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: 'Média',
    plural: 'Médias',
  },
  admin: {
    useAsTitle: 'alt',
    description: 'Toutes vos images du site. Téléversez, recadrez, réutilisez.',
    group: 'Mon site',
    // Vignettes en grille au-dessus de la table standard (list view +
    // drawer "Choisir parmi les existants"). La table native reste
    // en dessous avec recherche/filtres/pagination/bulk select intacts.
    // cf. cms/src/components/MediaGrid/index.tsx pour le rationale.
    components: {
      beforeListTable: ['/components/MediaGrid/index.tsx#MediaGrid'],
    },
  },
  access: {
    // Public : les sites clients servent les médias via cms.veridian.site/api/media/file/*
    // sans cookie ni API key (visiteurs anonymes des sites CF Pages).
    read: () => true,
    // Auth requis pour modifier — multi-tenant plugin filtre ensuite par tenant.
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  hooks: {
    beforeDelete: [blockMediaDeleteIfReferenced],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      label: 'Texte alternatif',
      admin: {
        description: "Décrit l'image pour l'accessibilité et le référencement (obligatoire).",
      },
    },
    {
      name: 'caption',
      type: 'text',
      label: 'Légende',
      admin: { description: "Légende optionnelle affichée sous l'image." },
    },
  ],
  upload: {
    mimeTypes: ['image/*'],
    focalPoint: true,
    crop: true,
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 300, position: 'centre' },
      { name: 'card', width: 768, height: 512, position: 'centre' },
      { name: 'hero', width: 1920, height: 1080, position: 'centre' },
    ],
  },
}
