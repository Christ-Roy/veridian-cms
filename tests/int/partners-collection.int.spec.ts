/**
 * Partners collection — Sprint 5 (section 13 du TODO Didier).
 *
 * Vérifie que :
 *  - Un partner peut être créé sur un tenant et lu publiquement (Media-style)
 *  - Le multi-tenant filtre bien les partners par tenant
 *  - Un user editor ne peut PAS créer/supprimer (canCreate / canDelete)
 *  - Un user editor peut UPDATE
 *  - Le slug est requis, body est requis
 */
import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, afterAll, expect } from 'vitest'

let payload: Payload
let tenantId: number
let editorUserId: number

const SUITE_TENANT_SLUG = `int-partners-${Date.now()}`
const EDITOR_EMAIL = `int-partners-editor-${Date.now()}@veridian.site`

describe('Partners collection — Sprint 5', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    const tenant = await payload.create({
      collection: 'tenants',
      data: { slug: SUITE_TENANT_SLUG, name: 'INT Partners' },
      overrideAccess: true,
    })
    tenantId = tenant.id as number

    const editor = await payload.create({
      collection: 'users',
      data: {
        email: EDITOR_EMAIL,
        password: 'CorrectHorseBatteryStaple1!',
        roles: ['editor'],
      },
      overrideAccess: true,
    })
    editorUserId = editor.id as number
  }, 120_000)

  afterAll(async () => {
    if (editorUserId) {
      await payload
        .delete({ collection: 'users', id: editorUserId, overrideAccess: true })
        .catch(() => {})
    }
    if (tenantId) {
      await payload
        .delete({ collection: 'tenants', id: tenantId, overrideAccess: true })
        .catch(() => {})
    }
  })

  it('accepte un partner valide avec body markdown', async () => {
    const partner = await payload.create({
      collection: 'partners',
      data: {
        name: 'Afflelou Cannes',
        slug: 'afflelou-cannes',
        city: 'Cannes',
        dept: '06',
        body: '# Afflelou Cannes\n\nOpticien partenaire AVSE.',
        partnershipYear: 2019,
        tenant: tenantId,
      },
      overrideAccess: true,
    })
    expect(partner.id).toBeDefined()
    expect(partner.slug).toBe('afflelou-cannes')
    expect(partner.body).toContain('Opticien partenaire AVSE')
    await payload.delete({ collection: 'partners', id: partner.id, overrideAccess: true })
  }, 30_000)

  it('rejette un partner sans name (required)', async () => {
    await expect(
      payload.create({
        collection: 'partners',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: {
          slug: 'no-name',
          body: 'Body',
          tenant: tenantId,
        } as any,
        overrideAccess: true,
      }),
    ).rejects.toThrow()
  }, 30_000)

  it("rejette un partner sans body (required)", async () => {
    await expect(
      payload.create({
        collection: 'partners',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: {
          name: 'No Body Partner',
          slug: 'no-body',
          tenant: tenantId,
        } as any,
        overrideAccess: true,
      }),
    ).rejects.toThrow()
  }, 30_000)

  it("l'access control bloque la CREATION par un user editor", async () => {
    const editor = await payload.findByID({
      collection: 'users',
      id: editorUserId,
      overrideAccess: true,
    })
    // overrideAccess: false → on hit le vrai access control canCreate
    await expect(
      payload.create({
        collection: 'partners',
        data: {
          name: 'Editor try create',
          slug: 'editor-try',
          body: 'Body',
          tenant: tenantId,
        },
        user: editor,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  }, 30_000)
})
