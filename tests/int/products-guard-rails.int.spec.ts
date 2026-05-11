/**
 * Hook beforeValidate `rejectEmptyName` on Products — `required: true` alone
 * does not reject whitespace-only `name`, so without this hook AVSE's tenant
 * pollutes itself with ghost rows again (see deleted product id=28).
 *
 * Sabotage check: commenting the `throw` in Products.ts:rejectEmptyName makes
 * the empty + whitespace cases pass (no error). Restoring → green again.
 *
 * Needs DATABASE_URL pointing to a local Postgres — read from .env by
 * vitest.setup.ts.
 */
import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, afterAll, expect } from 'vitest'

let payload: Payload
let tenantId: number

const SUITE_TENANT_SLUG = `int-guardrails-${Date.now()}`

describe('Products — guard rails beforeValidate', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })

    // Crée un tenant dédié (overrideAccess pour bypass auth)
    const created = await payload.create({
      collection: 'tenants',
      data: { slug: SUITE_TENANT_SLUG, name: 'INT Guard Rails' },
      overrideAccess: true,
    })
    tenantId = created.id as number
  }, 60_000)

  afterAll(async () => {
    if (tenantId) {
      await payload
        .delete({ collection: 'tenants', id: tenantId, overrideAccess: true })
        .catch(() => {})
    }
  })

  it('rejette name="" (chaîne vide)', async () => {
    await expect(
      payload.create({
        collection: 'products',
        data: {
          name: '',
          slug: 'valid-slug',
          category: 'tpe',
          tenant: tenantId,
        },
        overrideAccess: true,
      }),
    ).rejects.toThrow(/nom du produit est obligatoire/i)
  })

  it('rejette name="   " (whitespace only) — discrimine le hook vs `required: true` Payload', async () => {
    // C'est LE test qui prouve l'utilité du hook : Payload required ne fail
    // pas sur whitespace, seul le hook le rejette grâce au .trim().
    await expect(
      payload.create({
        collection: 'products',
        data: {
          name: '   ',
          slug: 'valid-slug',
          category: 'tpe',
          tenant: tenantId,
        },
        overrideAccess: true,
      }),
    ).rejects.toThrow(/nom du produit est obligatoire/i)
  })

  // The field-level slug.beforeValidate auto-generates from name. These two
  // tests pin that behavior so the collection-level guard can stay name-only.
  it('slug="" + name rempli → auto-génère le slug depuis le name (comportement attendu)', async () => {
    const product = await payload.create({
      collection: 'products',
      data: {
        name: 'Test Auto Slug Empty',
        slug: '',
        category: 'tpe',
        tenant: tenantId,
      },
      overrideAccess: true,
    })
    expect(product.slug).toBe('test-auto-slug-empty')
    await payload.delete({
      collection: 'products',
      id: product.id,
      overrideAccess: true,
    })
  })

  it('slug="   " + name rempli → auto-génère le slug depuis le name', async () => {
    const product = await payload.create({
      collection: 'products',
      data: {
        name: 'Test Auto Slug WS',
        slug: '   ',
        category: 'tpe',
        tenant: tenantId,
      },
      overrideAccess: true,
    })
    expect(product.slug).toBe('test-auto-slug-ws')
    await payload.delete({
      collection: 'products',
      id: product.id,
      overrideAccess: true,
    })
  })

  it('accepte un produit avec name + slug remplis (test témoin)', async () => {
    const product = await payload.create({
      collection: 'products',
      data: {
        name: 'Produit Témoin Int',
        slug: 'produit-temoin-int',
        category: 'tpe',
        tenant: tenantId,
      },
      overrideAccess: true,
    })
    expect(product.id).toBeDefined()
    expect(product.name).toBe('Produit Témoin Int')
    // Cleanup
    await payload.delete({
      collection: 'products',
      id: product.id,
      overrideAccess: true,
    })
  })
})
