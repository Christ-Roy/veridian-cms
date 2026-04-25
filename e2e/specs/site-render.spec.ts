import { test, expect } from '../fixtures/tenant'

test('site reader API key fetches published pages with blocks', async ({ tenant }) => {
  const baseURL = process.env.CMS_URL || 'http://localhost:3001'
  const adminKey = process.env.CMS_ADMIN_API_KEY!

  const pageTitle = `Site render ${Date.now()}`
  const heroTitle = 'Bienvenue sur notre site'
  const slug = `site-${Date.now()}`

  const created = await fetch(`${baseURL}/api/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `users API-Key ${adminKey}` },
    body: JSON.stringify({
      title: pageTitle,
      slug,
      tenant: tenant.id,
      _status: 'published',
      blocks: [
        { blockType: 'hero', title: heroTitle, subtitle: 'Sous-titre' },
      ],
    }),
  })
  expect(created.ok).toBe(true)

  const r = await fetch(
    `${baseURL}/api/pages?where[slug][equals]=${slug}&where[tenant][equals]=${tenant.id}&depth=2`,
    { headers: { Authorization: `users API-Key ${adminKey}` } },
  )
  expect(r.ok).toBe(true)
  const json = await r.json()
  expect(json.docs).toHaveLength(1)

  const page = json.docs[0]
  expect(page.title).toBe(pageTitle)
  expect(page.slug).toBe(slug)
  expect(Array.isArray(page.blocks)).toBe(true)
  expect(page.blocks.length).toBeGreaterThan(0)
  const hero = page.blocks.find((b: { blockType: string }) => b.blockType === 'hero')
  expect(hero).toBeDefined()
  expect(hero.title).toBe(heroTitle)
})
