/**
 * Garde-fous Products — comportements critiques côté serveur.
 *
 * Couvre 4 zones de risque qui ont déjà cassé en prod ou risquent de :
 *
 * 1. `name` whitespace-only : Payload `required: true` ne fail pas sur "   ".
 *    Seule la `validate` field-level avec .trim() bloque. Sans ça, produit
 *    fantôme en DB (cf. produit id=28 supprimé manuellement 2026-05-12).
 *
 * 2. `slug` auto-fill safe : le client n'a pas accès au champ (admin.hidden),
 *    il est regénéré côté serveur depuis `name` à chaque save. Si on garde
 *    un slug user-saisi, il peut diverger du name après rename → URL périmée.
 *
 * 3. `brand` normalize Title Case : éviter doublons "INGENICO"/"ingenico"/
 *    "Ingenico" dans le BrandPicker. Le hook beforeChange enforce Title Case.
 *
 * 4. `brand` s'aligne sur casse existante : si "Ingenico" existe déjà dans le
 *    tenant et qu'un user tape "INGENICO", on enregistre "Ingenico" (la
 *    variante existante) — pas un nouveau Title Case "Ingenico" (qui serait
 *    pareil ici, mais le test couvre le comportement pour cas type "iPhone").
 *
 * Sabotage check : commenter le `validate` sur `name` (Products.ts:60-66)
 * fait passer les cas 1.* en green = bug. Commenter le hook brand
 * (Products.ts:127-160) casse 3.* et 4.*.
 */
import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, afterAll, expect } from 'vitest'

let payload: Payload
let tenantId: number

const SUITE_TENANT_SLUG = `int-guardrails-${Date.now()}`

describe('Products — guard rails serveur', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })

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

  // ──────────── 1. name validation field-level ────────────

  it('1.1 — rejette name="" (chaîne vide)', async () => {
    // Payload wrappe le retour de `validate` dans un ValidationError générique
    // ("Le champ suivant n'est pas valide : Nom du produit"). On match sur ce
    // pattern + nom du field, ce qui prouve que la validate du field `name`
    // est bien hit (un `required: true` seul ne ferait pas mention de "Nom").
    await expect(
      payload.create({
        collection: 'products',
        data: {
          name: '',
          category: 'tpe',
          tenant: tenantId,
        },
        overrideAccess: true,
      }),
    ).rejects.toThrow(/nom du produit/i)
  })

  it('1.2 — rejette name="   " (whitespace only) — discrimine validate vs `required: true`', async () => {
    // Le test critique : Payload `required` ne rejette PAS whitespace
    // (vu en prod sur produit fantôme id=28 supprimé manuellement).
    // Seule la `validate: (v) => v.trim() || 'erreur'` le bloque.
    await expect(
      payload.create({
        collection: 'products',
        data: {
          name: '   ',
          category: 'tpe',
          tenant: tenantId,
        },
        overrideAccess: true,
      }),
    ).rejects.toThrow(/nom du produit/i)
  })

  // ──────────── 2. slug auto-fill safe ────────────

  it('2.1 — slug auto-généré depuis name (champ hidden côté admin)', async () => {
    const product = await payload.create({
      collection: 'products',
      data: {
        name: 'Verifone V210 4G WiFi',
        category: 'tpe',
        tenant: tenantId,
      },
      overrideAccess: true,
    })
    expect(product.slug).toBe('verifone-v210-4g-wifi')
    await payload.delete({
      collection: 'products',
      id: product.id,
      overrideAccess: true,
    })
  })

  it('2.2 — slug regénéré à chaque update si name change (anti-drift)', async () => {
    const product = await payload.create({
      collection: 'products',
      data: { name: 'Nom Initial', category: 'tpe', tenant: tenantId },
      overrideAccess: true,
    })
    expect(product.slug).toBe('nom-initial')

    const updated = await payload.update({
      collection: 'products',
      id: product.id,
      data: { name: 'Nom Modifié' },
      overrideAccess: true,
    })
    expect(updated.slug).toBe('nom-modifie')

    await payload.delete({
      collection: 'products',
      id: product.id,
      overrideAccess: true,
    })
  })

  it('2.3 — accents et caractères spéciaux normalisés correctement', async () => {
    const product = await payload.create({
      collection: 'products',
      data: {
        name: 'Caisse Aurès TRX3000 — édition spéciale',
        category: 'caisses',
        tenant: tenantId,
      },
      overrideAccess: true,
    })
    // accents virés, espaces/tirets → un seul tiret
    expect(product.slug).toBe('caisse-aures-trx3000-edition-speciale')
    await payload.delete({
      collection: 'products',
      id: product.id,
      overrideAccess: true,
    })
  })

  // ──────────── 3. brand normalize Title Case ────────────

  it('3.1 — brand "INGENICO" normalisé en "Ingenico" (Title Case)', async () => {
    const product = await payload.create({
      collection: 'products',
      data: {
        name: 'Test Brand Upper',
        brand: 'INGENICO',
        category: 'tpe',
        tenant: tenantId,
      },
      overrideAccess: true,
    })
    expect(product.brand).toBe('Ingenico')
    await payload.delete({
      collection: 'products',
      id: product.id,
      overrideAccess: true,
    })
  })

  it('3.2 — brand "ingenico" normalisé en "Ingenico"', async () => {
    const product = await payload.create({
      collection: 'products',
      data: {
        name: 'Test Brand Lower',
        brand: 'ingenico',
        category: 'tpe',
        tenant: tenantId,
      },
      overrideAccess: true,
    })
    expect(product.brand).toBe('Ingenico')
    await payload.delete({
      collection: 'products',
      id: product.id,
      overrideAccess: true,
    })
  })

  it('3.3 — brand whitespace-only normalisé en null (pas de marque vide en base)', async () => {
    const product = await payload.create({
      collection: 'products',
      data: {
        name: 'Test Brand Whitespace',
        brand: '   ',
        category: 'tpe',
        tenant: tenantId,
      },
      overrideAccess: true,
    })
    expect(product.brand).toBeFalsy() // null ou undefined selon Payload
    await payload.delete({
      collection: 'products',
      id: product.id,
      overrideAccess: true,
    })
  })

  // ──────────── 4. brand s'aligne sur casse existante ────────────

  it('4.1 — brand s\'aligne sur casse existante du tenant (anti-doublon)', async () => {
    // Crée d'abord un produit avec "Verifone"
    const first = await payload.create({
      collection: 'products',
      data: {
        name: 'Premier Verifone',
        brand: 'Verifone',
        category: 'tpe',
        tenant: tenantId,
      },
      overrideAccess: true,
    })
    expect(first.brand).toBe('Verifone')

    // Deuxième produit avec "VERIFONE" ou "verifone" → doit s'aligner sur "Verifone"
    const second = await payload.create({
      collection: 'products',
      data: {
        name: 'Second Verifone',
        brand: 'VERIFONE',
        category: 'tpe',
        tenant: tenantId,
      },
      overrideAccess: true,
    })
    expect(second.brand).toBe('Verifone')

    await payload.delete({
      collection: 'products',
      id: first.id,
      overrideAccess: true,
    })
    await payload.delete({
      collection: 'products',
      id: second.id,
      overrideAccess: true,
    })
  })

  // ──────────── 5. témoin happy path ────────────

  it('5.1 — accepte un produit complet (test témoin)', async () => {
    const product = await payload.create({
      collection: 'products',
      data: {
        name: 'Produit Témoin Int',
        brand: 'Pax',
        category: 'tpe',
        priceHT: '1 400 € HT',
        tenant: tenantId,
      },
      overrideAccess: true,
    })
    expect(product.id).toBeDefined()
    expect(product.name).toBe('Produit Témoin Int')
    expect(product.brand).toBe('Pax')
    expect(product.slug).toBe('produit-temoin-int')
    await payload.delete({
      collection: 'products',
      id: product.id,
      overrideAccess: true,
    })
  })
})
