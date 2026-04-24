import type { CollectionConfig } from 'payload'
import {
  HeroBlock,
  ServicesBlock,
  GalleryBlock,
  TestimonialsBlock,
  RichTextBlock,
  CTABlock,
  FormBlock,
} from '../blocks'
import { triggerSiteRebuild } from '../hooks/triggerSiteRebuild'

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
    group: 'Contenu',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
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
        initCollapsed: true,
      },
      blocks: [HeroBlock, ServicesBlock, GalleryBlock, TestimonialsBlock, RichTextBlock, CTABlock, FormBlock],
    },
  ],
}
