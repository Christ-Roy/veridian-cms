/**
 * Vérifie que `maxLength` sur Hero (title 120, subtitle 300, eyebrow 80) est
 * REELLEMENT enforced par Payload — pas juste affiché en warning UI.
 *
 * Bug observé en prod (QA 2026-05-12 sur PR #50) : Didier peut taper 150
 * chars, l'admin affiche "1 Erreur" mais le save passe quand même et persiste
 * 150 chars en DB. Cause : `drafts.autosave` sur Pages bypass la validation
 * en mode draft. En mode published la validation devrait bloquer.
 *
 * Ce spec sert de double-canary :
 *   - en `_status: 'published'` → maxLength enforced (Payload doit throw)
 *   - en `_status: 'draft'` (autosave) → tolérant, on enregistre une note
 *
 * Si le test "published" passe rouge, on a confirmé le bug Payload et on
 * doit ajouter un hook beforeValidate qui throw explicitement.
 */
import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, afterAll, expect } from 'vitest'

let payload: Payload
let tenantId: number

const SUITE_TENANT_SLUG = `int-hero-maxlen-${Date.now()}`

describe('Hero block — maxLength validation', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    const tenant = await payload.create({
      collection: 'tenants',
      data: { slug: SUITE_TENANT_SLUG, name: 'INT Hero MaxLen' },
      overrideAccess: true,
    })
    tenantId = tenant.id as number
  }, 120_000)

  afterAll(async () => {
    if (tenantId) {
      await payload
        .delete({ collection: 'tenants', id: tenantId, overrideAccess: true })
        .catch(() => {})
    }
  })

  it('rejette title > 120 chars en mode published', async () => {
    const longTitle = 'A'.repeat(150)
    await expect(
      payload.create({
        collection: 'pages',
        data: {
          title: 'Page Test Hero MaxLen',
          slug: `int-hero-maxlen-pub-${Date.now()}`,
          tenant: tenantId,
          _status: 'published',
          blocks: [{ blockType: 'hero', title: longTitle }],
        },
        overrideAccess: true,
      }),
    ).rejects.toThrow()
  }, 30_000)

  it('rejette subtitle > 300 chars en mode published', async () => {
    const longSubtitle = 'B'.repeat(350)
    await expect(
      payload.create({
        collection: 'pages',
        data: {
          title: 'Page Test Hero Subtitle',
          slug: `int-hero-subt-${Date.now()}`,
          tenant: tenantId,
          _status: 'published',
          blocks: [{ blockType: 'hero', title: 'OK title', subtitle: longSubtitle }],
        },
        overrideAccess: true,
      }),
    ).rejects.toThrow()
  }, 30_000)

  it('rejette eyebrow > 80 chars en mode published', async () => {
    const longEyebrow = 'C'.repeat(100)
    await expect(
      payload.create({
        collection: 'pages',
        data: {
          title: 'Page Test Hero Eyebrow',
          slug: `int-hero-eye-${Date.now()}`,
          tenant: tenantId,
          _status: 'published',
          blocks: [{ blockType: 'hero', title: 'OK title', eyebrow: longEyebrow }],
        },
        overrideAccess: true,
      }),
    ).rejects.toThrow()
  }, 30_000)

  it('accepte title = 120 chars exactement (limite OK)', async () => {
    const okTitle = 'A'.repeat(120)
    const page = await payload.create({
      collection: 'pages',
      data: {
        title: 'Page Test Hero Limit',
        slug: `int-hero-limit-${Date.now()}`,
        tenant: tenantId,
        _status: 'published',
        blocks: [{ blockType: 'hero', title: okTitle }],
      },
      overrideAccess: true,
    })
    expect(page.id).toBeDefined()
    expect((page.blocks?.[0] as { title?: string })?.title?.length).toBe(120)
    // Cleanup
    await payload.delete({ collection: 'pages', id: page.id, overrideAccess: true })
  }, 30_000)
})
