/**
 * Seed des données CompanyInfo + Contact du tenant AVSE depuis
 * `/home/brunon5/www.avse-monetique.fr/site/src/lib/site.ts` vers
 * `tenants.company` + `tenants.contact` (Sprint 3 — section 12 TODO).
 *
 * Idempotent : si tenant.company.siret est déjà rempli, skip (rejouable
 * sans risque). Pour forcer un overwrite : `FORCE=1`.
 *
 * Usage :
 *   # Dry-run (default)
 *   CMS_URL=https://cms.veridian.site \
 *     CMS_ADMIN_API_KEY=$CMS_ADMIN_API_KEY_PROD \
 *     ./node_modules/.bin/tsx scripts/seed-companyinfo-avse.ts
 *
 *   # Apply
 *   APPLY=1 CMS_URL=... CMS_ADMIN_API_KEY=... \
 *     ./node_modules/.bin/tsx scripts/seed-companyinfo-avse.ts
 *
 *   # Réécrire même si déjà rempli
 *   APPLY=1 FORCE=1 ... scripts/seed-companyinfo-avse.ts
 */
import fs from 'fs'
import path from 'path'

// === Credentials fallback ===
const creds: Record<string, string> = {}
const credsPath = path.join(process.env.HOME || '', 'credentials/.all-creds.env')
if (fs.existsSync(credsPath)) {
  for (const line of fs.readFileSync(credsPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) creds[m[1]] = m[2]
  }
}
const CMS_URL = (process.env.CMS_URL || creds.CMS_URL || 'https://cms.staging.veridian.site').replace(/\/$/, '')
const ADMIN_KEY = process.env.CMS_ADMIN_API_KEY || creds.CMS_ADMIN_API_KEY_PROD
const TENANT_SLUG = 'avse'
const APPLY = process.env.APPLY === '1'
const FORCE = process.env.FORCE === '1'

if (!ADMIN_KEY) {
  console.error('❌ CMS_ADMIN_API_KEY absente (.all-creds.env ou env)')
  process.exit(1)
}

const AUTH_HEADER = `users API-Key ${ADMIN_KEY}`

// Source : /home/brunon5/www.avse-monetique.fr/site/src/lib/site.ts (2026-05-12)
const AVSE_DATA = {
  company: {
    legalName: "SARL AVSE (Assistance Vente de Système d'Encaissement)",
    legalForm: 'SARL' as const,
    capital: '21 000 €',
    siren: '485357214', // strip espaces
    siret: '48535721400033',
    tvaIntra: 'FR95485357214',
    naf: '46.66Z',
    rcs: 'Grasse',
    directorName: 'Didier Bollard',
    foundedYear: 2005,
  },
  contact: {
    email: 'avse.monetique@gmail.com',
    phones: [
      { label: 'Mobile', number: '+33 6 10 44 03 63', primary: true },
      { label: 'Fixe', number: '09 62 12 12 64', primary: false },
    ],
    address: {
      street: '19 Avenue Sidi Brahim',
      zip: '06130',
      city: 'Grasse',
      country: 'France',
    },
    serviceZone: 'PACA — Alpes-Maritimes, Var',
    hours: [{ day: '7 j / 7', time: '9 h à 22 h' }],
  },
}

interface Tenant {
  id: number
  slug: string
  name: string
  company?: { siret?: string | null } | null
  contact?: { email?: string | null } | null
}

async function findTenant(slug: string): Promise<Tenant | null> {
  const url = `${CMS_URL}/api/tenants?where[slug][equals]=${encodeURIComponent(slug)}&depth=0&limit=1`
  const res = await fetch(url, { headers: { Authorization: AUTH_HEADER } })
  if (!res.ok) throw new Error(`GET tenants?slug=${slug} → ${res.status}`)
  const data = (await res.json()) as { docs: Tenant[] }
  return data.docs[0] || null
}

async function patchTenant(id: number, patch: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${CMS_URL}/api/tenants/${id}`, {
    method: 'PATCH',
    headers: { Authorization: AUTH_HEADER, 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`PATCH tenants/${id} → ${res.status} ${txt.slice(0, 300)}`)
  }
}

async function main() {
  console.log(`\n📋 seed-companyinfo-avse — ${APPLY ? (FORCE ? 'APPLY+FORCE' : 'APPLY') : 'DRY-RUN'}`)
  console.log(`   CMS_URL=${CMS_URL}`)
  console.log(`   TENANT=${TENANT_SLUG}\n`)

  const tenant = await findTenant(TENANT_SLUG)
  if (!tenant) {
    console.error(`❌ Tenant slug="${TENANT_SLUG}" introuvable sur ${CMS_URL}`)
    process.exit(1)
  }
  console.log(`✅ Tenant trouvé : id=${tenant.id} name="${tenant.name}"`)

  const alreadySeeded = Boolean(tenant.company?.siret)
  if (alreadySeeded && !FORCE) {
    console.log(`\n⏭️  tenant.company.siret déjà rempli (${tenant.company?.siret}). Skip.`)
    console.log('   Pour réécrire : FORCE=1\n')
    process.exit(0)
  }

  console.log('\n📦 Données à appliquer :')
  console.log(JSON.stringify(AVSE_DATA, null, 2))

  if (!APPLY) {
    console.log('\n✨ Dry-run terminé. Pour appliquer : APPLY=1 ' + process.argv.slice(1).join(' '))
    process.exit(0)
  }

  await patchTenant(tenant.id, AVSE_DATA)
  console.log(`\n✅ tenant id=${tenant.id} patché avec company + contact`)

  // Verify
  const updated = await findTenant(TENANT_SLUG)
  console.log(`\n🔍 Vérif : tenant.company.siret = ${updated?.company?.siret ?? '(null)'}`)
  console.log(`         tenant.contact.email = ${updated?.contact?.email ?? '(null)'}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('💥 Erreur fatale:', err)
  process.exit(1)
})
