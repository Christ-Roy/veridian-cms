/**
 * Hook `beforeDelete` sur Media — refuse la suppression si le média est encore
 * référencé par au moins un doc (page, produit, header). Évite à Didier de
 * supprimer une image utilisée → images cassées sur le site.
 *
 * Sabotage check : commenter le `throw new APIError(...)` dans
 * `cms/src/collections/Media.ts:blockMediaDeleteIfReferenced` fait passer
 * tous les cas "rejette" → c'est ce qui prouve l'utilité du hook.
 *
 * Besoin de DATABASE_URL pointant sur un Postgres local (lu via vitest.setup.ts).
 *
 * Note : vitest tourne en `environment: 'node'` par défaut (cf. vitest.config.mts)
 * — c'est requis pour les tests qui touchent l'upload pipeline Payload
 * (`file-type` v21 vs realm jsdom).
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, afterAll, expect } from 'vitest'

let payload: Payload
let tenantId: number
let superAdminId: number
let pngPath: string

const SUITE_TENANT_SLUG = `int-media-delete-${Date.now()}`
const SUPER_ADMIN_EMAIL = `int-media-superadmin-${Date.now()}@veridian.site`

/**
 * 1x1 px transparent PNG. La magic number `89 50 4E 47` est suffisante pour
 * que file-type v21 reconnaisse `image/png`. Écrit sur disque temporaire car
 * `payload.create({ filePath })` attend un chemin de fichier.
 */
const ONE_BY_ONE_PNG = Buffer.from(
  '89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D49444154789C636000010000000500010D0A2DB40000000049454E44AE426082',
  'hex',
)

async function createMedia(alt: string): Promise<{ id: number }> {
  const created = await payload.create({
    collection: 'media',
    data: { alt, tenant: tenantId },
    filePath: pngPath,
    overrideAccess: true,
  })
  return { id: created.id as number }
}

describe('Media — beforeDelete guard rails', () => {
  beforeAll(async () => {
    pngPath = path.join(os.tmpdir(), `int-media-${Date.now()}.png`)
    fs.writeFileSync(pngPath, ONE_BY_ONE_PNG)

    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })

    const tenant = await payload.create({
      collection: 'tenants',
      data: { slug: SUITE_TENANT_SLUG, name: 'INT Media Delete' },
      overrideAccess: true,
    })
    tenantId = tenant.id as number

    // User super-admin pour le cas "force delete" (cleanup orphelins)
    const superAdmin = await payload.create({
      collection: 'users',
      data: {
        email: SUPER_ADMIN_EMAIL,
        password: 'CorrectHorseBatteryStaple1!',
        roles: ['super-admin'],
      },
      overrideAccess: true,
    })
    superAdminId = superAdmin.id as number
  }, 120_000)

  afterAll(async () => {
    if (superAdminId) {
      await payload
        .delete({ collection: 'users', id: superAdminId, overrideAccess: true })
        .catch(() => {})
    }
    if (tenantId) {
      // Cascade côté multi-tenant supprime les médias / pages / produits liés.
      await payload
        .delete({ collection: 'tenants', id: tenantId, overrideAccess: true })
        .catch(() => {})
    }
    if (pngPath && fs.existsSync(pngPath)) {
      fs.unlinkSync(pngPath)
    }
  })

  it('rejette la suppression si le média est référencé par un Hero block d\'une page', async () => {
    const { id: mediaId } = await createMedia('hero-media')

    const page = await payload.create({
      collection: 'pages',
      data: {
        title: 'Page Hero Test',
        slug: `int-hero-page-${Date.now()}`,
        tenant: tenantId,
        blocks: [
          {
            blockType: 'hero',
            title: 'Hero with image',
            image: mediaId,
          },
        ],
      },
      overrideAccess: true,
    })

    await expect(
      payload.delete({
        collection: 'media',
        id: mediaId,
        overrideAccess: true,
      }),
    ).rejects.toThrow(/utilisé par .* page/i)

    // Cleanup : retirer la page puis le média (sinon il pollue la DB)
    await payload.delete({
      collection: 'pages',
      id: page.id,
      overrideAccess: true,
    })
    await payload.delete({
      collection: 'media',
      id: mediaId,
      overrideAccess: true,
    })
  }, 60_000)

  it('rejette la suppression si le média est référencé par un produit (product.image)', async () => {
    const { id: mediaId } = await createMedia('product-media')

    const product = await payload.create({
      collection: 'products',
      data: {
        name: 'Produit Référence Image',
        slug: `int-prod-ref-${Date.now()}`,
        category: 'tpe',
        tenant: tenantId,
        image: mediaId,
      },
      overrideAccess: true,
    })

    await expect(
      payload.delete({
        collection: 'media',
        id: mediaId,
        overrideAccess: true,
      }),
    ).rejects.toThrow(/utilisé par .* produit/i)

    // Cleanup
    await payload.delete({
      collection: 'products',
      id: product.id,
      overrideAccess: true,
    })
    await payload.delete({
      collection: 'media',
      id: mediaId,
      overrideAccess: true,
    })
  }, 60_000)

  it('accepte la suppression si le média n\'est référencé nulle part (témoin)', async () => {
    const { id: mediaId } = await createMedia('orphan-media')

    // Ne doit PAS throw — aucune référence.
    await expect(
      payload.delete({
        collection: 'media',
        id: mediaId,
        overrideAccess: true,
      }),
    ).resolves.toBeDefined()

    // Vérifie qu'il a bien été supprimé
    const found = await payload
      .findByID({ collection: 'media', id: mediaId, overrideAccess: true })
      .catch(() => null)
    expect(found).toBeNull()
  }, 60_000)

  it('accepte la suppression par un super-admin même si le média est référencé (cas cleanup)', async () => {
    const { id: mediaId } = await createMedia('super-admin-force')

    const product = await payload.create({
      collection: 'products',
      data: {
        name: 'Produit Force Delete',
        slug: `int-force-${Date.now()}`,
        category: 'tpe',
        tenant: tenantId,
        image: mediaId,
      },
      overrideAccess: true,
    })

    const superAdminUser = await payload.findByID({
      collection: 'users',
      id: superAdminId,
      overrideAccess: true,
    })

    // overrideAccess reste true (on n'est pas en train de tester l'access
    // control mais bien le hook beforeDelete). Le hook lit `req.user.roles`
    // pour décider de bypasser, donc on passe le user explicitement.
    await expect(
      payload.delete({
        collection: 'media',
        id: mediaId,
        user: superAdminUser,
        overrideAccess: true,
      }),
    ).resolves.toBeDefined()

    // Cleanup : produit reste avec image cassée (c'est attendu, cleanup
    // côté admin si besoin), on supprime le produit pour ne pas polluer.
    await payload.delete({
      collection: 'products',
      id: product.id,
      overrideAccess: true,
    })
  }, 60_000)
})
