import type { CollectionConfig } from 'payload'

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    description: 'Pages éditables par le client (hero, services, contact...)',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, admin: { description: 'ex: home, contact, services' } },
    { name: 'heroTitle', type: 'text' },
    { name: 'heroSubtitle', type: 'textarea' },
    { name: 'heroImage', type: 'upload', relationTo: 'media' },
    {
      name: 'sections',
      type: 'array',
      fields: [
        { name: 'heading', type: 'text' },
        { name: 'body', type: 'richText' },
        { name: 'image', type: 'upload', relationTo: 'media' },
      ],
    },
  ],
}
