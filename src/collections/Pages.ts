import type { CollectionBeforeDeleteHook, CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { canCreate, canDelete, canRead, canUpdate } from '../lib/access'
import {
  HeroBlock,
  ServicesBlock,
  GalleryBlock,
  TestimonialsBlock,
  RichTextBlock,
  CTABlock,
  FormBlock,
  Cards2Block,
  Cards4WithIconsBlock,
  LogoWallBlock,
  SplitImageTextBlock,
  QuoteCardBlock,
  StatsBlock,
  FAQBlock,
} from '../blocks'
import { triggerSiteRebuild } from '../hooks/triggerSiteRebuild'

const PROTECTED_SLUGS = new Set([
  'home',
  'contact',
  'mentions-legales',
  'politique-confidentialite',
])

const blockProtectedSlugDelete: CollectionBeforeDeleteHook = async ({ req, id }) => {
  const isSuperAdmin = (req.user as { roles?: string[] | null } | null)?.roles?.includes(
    'super-admin',
  )
  if (isSuperAdmin) return
  const page = await req.payload.findByID({ collection: 'pages', id, depth: 0, req })
  const slug = (page as { slug?: string })?.slug
  if (slug && PROTECTED_SLUGS.has(slug)) {
    throw new APIError(
      `Page "${slug}" protégée — suppression interdite (contactez un super-admin).`,
      403,
    )
  }
}

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: {
    singular: 'Page',
    plural: 'Pages',
  },
  admin: {
    useAsTitle: 'title',
    description: 'Les pages de votre site — composez-les avec des blocs modulaires.',
    defaultColumns: ['title', 'slug', 'tenant', '_status', 'updatedAt'],
    group: 'Mon site',
  },
  access: {
    read: canRead,
    create: canCreate, // super-admin + client (PAS editor)
    update: canUpdate, // tous (multi-tenant filtre par tenant)
    delete: canDelete, // super-admin + client (PAS editor)
  },
  versions: {
    drafts: {
      autosave: { interval: 2000 },
      schedulePublish: true,
    },
    maxPerDoc: 20,
  },
  hooks: {
    afterChange: [triggerSiteRebuild],
    beforeDelete: [blockProtectedSlugDelete],
  },
  fields: [
    { name: 'title', type: 'text', required: true, label: 'Titre de la page' },
    {
      name: 'slug',
      type: 'text',
      required: true,
      label: 'Identifiant URL',
      admin: { description: 'Ex : home (page d\'accueil), services, contact, a-propos' },
    },
    {
      name: 'blocks',
      type: 'blocks',
      label: 'Blocs',
      labels: { singular: 'Bloc', plural: 'Blocs' },
      minRows: 0,
      admin: {
        description: 'Composez votre page avec des blocs modulaires (Hero, Services, Galerie, Témoignages, Texte riche, Appel à l\'action).',
        initCollapsed: false,
      },
      blocks: [
        HeroBlock,
        ServicesBlock,
        StatsBlock,
        Cards2Block,
        Cards4WithIconsBlock,
        SplitImageTextBlock,
        QuoteCardBlock,
        GalleryBlock,
        LogoWallBlock,
        TestimonialsBlock,
        FAQBlock,
        RichTextBlock,
        CTABlock,
        FormBlock,
      ],
    },
  ],
}
