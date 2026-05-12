/**
 * Vérifie que les nouveaux groupes `company` et `contact` sur Tenants
 * fonctionnent : champs valides acceptés, validators FR appliqués sur les
 * champs avec format strict (SIRET, téléphone, code postal).
 *
 * Validation Sprint 3 — section 12 CMS-DIDIER-READY-TODO.md.
 */
import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, afterAll, expect } from 'vitest'

let payload: Payload
const SUITE_TENANT_SLUG = `int-companyinfo-${Date.now()}`

describe('Tenants — CompanyInfo + Contact (Sprint 3)', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  }, 120_000)

  let createdTenantId: number | undefined
  afterAll(async () => {
    if (createdTenantId) {
      await payload
        .delete({ collection: 'tenants', id: createdTenantId, overrideAccess: true })
        .catch(() => {})
    }
  })

  it('accepte un tenant avec company + contact complets et valides', async () => {
    const tenant = await payload.create({
      collection: 'tenants',
      data: {
        slug: SUITE_TENANT_SLUG,
        name: 'INT CompanyInfo SAS',
        company: {
          legalName: 'INT COMPANYINFO SAS',
          legalForm: 'SAS',
          capital: '10 000 €',
          siren: '123456789',
          siret: '12345678901234',
          tvaIntra: 'FR12123456789',
          naf: '6201Z',
          rcs: 'Paris',
          directorName: 'Robert Brunon',
          foundedYear: 2024,
        },
        contact: {
          email: 'contact@int-companyinfo.fr',
          phones: [
            { label: 'Mobile', number: '+33 6 12 34 56 78', primary: true },
            { label: 'Fixe', number: '01 23 45 67 89' },
          ],
          address: {
            street: '12 rue de la Paix',
            zip: '75001',
            city: 'Paris',
            country: 'France',
          },
          serviceZone: 'Île-de-France',
          hours: [
            { day: 'Lun–Ven', time: '9h–18h' },
            { day: 'Samedi', time: 'Fermé' },
          ],
        },
      },
      overrideAccess: true,
    })
    createdTenantId = tenant.id as number
    expect(tenant.id).toBeDefined()
    expect(tenant.company?.siret).toBe('12345678901234')
    expect(tenant.contact?.phones?.[0]?.number).toContain('33')
    expect(tenant.contact?.phones?.[0]?.primary).toBe(true)
    expect(tenant.contact?.address?.country).toBe('France')
  }, 30_000)

  // Note : Payload wrap les messages des validators dans "Le champ suivant
  // n'est pas valide : <field>". On vérifie via le nom du champ qui apparaît
  // dans le message wrappé (c'est le signal que NOTRE validator a rejeté).
  it('rejette un SIRET à 13 chiffres (validator FR)', async () => {
    await expect(
      payload.create({
        collection: 'tenants',
        data: {
          slug: `${SUITE_TENANT_SLUG}-bad-siret`,
          name: 'Bad SIRET',
          company: { siret: '1234567890123' }, // 13 chiffres
        },
        overrideAccess: true,
      }),
    ).rejects.toThrow(/siret/i)
  }, 30_000)

  it('rejette un téléphone mal formé (validator FR)', async () => {
    await expect(
      payload.create({
        collection: 'tenants',
        data: {
          slug: `${SUITE_TENANT_SLUG}-bad-phone`,
          name: 'Bad Phone',
          contact: { phones: [{ number: '06 12' }] }, // trop court
        },
        overrideAccess: true,
      }),
    ).rejects.toThrow(/number|téléphone/i)
  }, 30_000)

  it('rejette un code postal à 4 chiffres', async () => {
    await expect(
      payload.create({
        collection: 'tenants',
        data: {
          slug: `${SUITE_TENANT_SLUG}-bad-zip`,
          name: 'Bad Zip',
          contact: { address: { zip: '7500' } },
        },
        overrideAccess: true,
      }),
    ).rejects.toThrow(/zip|code postal/i)
  }, 30_000)

  it('accepte un tenant SANS company/contact (champs optionnels, backwards compat)', async () => {
    const tenant = await payload.create({
      collection: 'tenants',
      data: {
        slug: `${SUITE_TENANT_SLUG}-bare`,
        name: 'Bare Tenant',
      },
      overrideAccess: true,
    })
    expect(tenant.id).toBeDefined()
    // Cleanup tenant temporaire
    await payload.delete({ collection: 'tenants', id: tenant.id, overrideAccess: true })
  }, 30_000)

  it('accepte un tenant avec branding valide (hex + select)', async () => {
    const tenant = await payload.create({
      collection: 'tenants',
      data: {
        slug: `${SUITE_TENANT_SLUG}-branding-ok`,
        name: 'Branding OK',
        branding: {
          primaryColor: '#0a2540',
          accentColor: '#ffd23f',
          borderRadius: 'lg',
          fontFamily: 'playfair',
        },
      },
      overrideAccess: true,
    })
    expect(tenant.branding?.primaryColor).toBe('#0a2540')
    expect(tenant.branding?.borderRadius).toBe('lg')
    await payload.delete({ collection: 'tenants', id: tenant.id, overrideAccess: true })
  }, 30_000)

  it('rejette une couleur hex invalide ("blue")', async () => {
    await expect(
      payload.create({
        collection: 'tenants',
        data: {
          slug: `${SUITE_TENANT_SLUG}-branding-bad`,
          name: 'Branding Bad',
          branding: { primaryColor: 'blue' },
        },
        overrideAccess: true,
      }),
    ).rejects.toThrow(/primary|couleur/i)
  }, 30_000)
})
