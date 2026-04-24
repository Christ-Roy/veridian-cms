import type { CollectionConfig } from 'payload'
import {
  HeroBlock,
  ServicesBlock,
  GalleryBlock,
  TestimonialsBlock,
  RichTextBlock,
  CTABlock,
} from '../blocks'
import { triggerSiteRebuild } from '../hooks/triggerSiteRebuild'

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    description: 'Pages du site — composez avec des blocs modulaires.',
    defaultColumns: ['title', 'slug', 'tenant', '_status', 'updatedAt'],
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
    { name: 'title', type: 'text', required: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      admin: { description: 'Identifiant URL de la page (ex: home, services, contact)' },
    },
    {
      name: 'blocks',
      type: 'blocks',
      minRows: 0,
      admin: {
        description: 'Assemblez votre page avec des blocs modulaires.',
        initCollapsed: true,
      },
      blocks: [HeroBlock, ServicesBlock, GalleryBlock, TestimonialsBlock, RichTextBlock, CTABlock],
    },
    {
      name: 'seo',
      type: 'group',
      label: 'SEO',
      admin: { description: 'Optimisation pour les moteurs de recherche' },
      fields: [
        { name: 'metaTitle', type: 'text', admin: { description: 'Titre affiché dans Google (≤ 60 car.)' } },
        { name: 'metaDescription', type: 'textarea', admin: { description: 'Description Google (≤ 160 car.)' } },
        { name: 'ogImage', type: 'upload', relationTo: 'media', admin: { description: 'Image de partage réseaux sociaux (1200×630)' } },
      ],
    },
  ],
}
