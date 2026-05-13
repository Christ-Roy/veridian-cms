/**
 * Seed générique pour un tenant Veridian. Provisionne en une commande :
 *  - company (legalName, siren, siret, tvaIntra, directorName, etc.)
 *  - contact (phones, email, address, hours)
 *  - branding (primaryColor, accentColor, borderRadius, fontFamily)
 *  - features (modules activés/désactivés)
 *  - partners[] (clients/partenaires mis en avant sur la page /partenaires)
 *
 * Idempotent : si tenant.company.siret est déjà rempli (ou FORCE=1),
 * patche les groupes ; les partners sont upserted par slug.
 *
 * Format du JSON config attendu :
 * ```json
 * {
 *   "tenantSlug": "morel-volailles",
 *   "company": { "legalName": "...", "siret": "...", ... },
 *   "contact": { "email": "...", "phones": [...], "address": {...} },
 *   "branding": { "primaryColor": "#...", "fontFamily": "inter" },
 *   "features": { "products": true, "partners": false, ... },
 *   "partners": [ { "slug": "...", "name": "...", "body": "..." } ]
 * }
 * ```
 *
 * Tous les blocs sont optionnels — seules les sections présentes dans le JSON
 * sont seedées.
 *
 * Usage :
 *   # Dry-run
 *   CONFIG=./tenant-config-morel.json \
 *     CMS_URL=https://cms.veridian.site \
 *     CMS_ADMIN_API_KEY=$CMS_ADMIN_API_KEY_PROD \
 *     ./node_modules/.bin/tsx scripts/seed-tenant-data.ts
 *
 *   # Apply
 *   APPLY=1 CONFIG=./tenant-config-morel.json ... scripts/seed-tenant-data.ts
 *
 *   # Force overwrite même si déjà seedé
 *   APPLY=1 FORCE=1 CONFIG=... ... scripts/seed-tenant-data.ts
 *
 * Pour AVSE, le config equivalent est embarqué dans
 * `seed-companyinfo-avse.ts` + `seed-partners-avse.ts` (legacy, à
 * migrer vers ce script générique à terme).
 */
import fs from 'fs'
import path from 'path'

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
const CONFIG_PATH = process.env.CONFIG
const APPLY = process.env.APPLY === '1'
const FORCE = process.env.FORCE === '1'

if (!ADMIN_KEY) {
  console.error('❌ CMS_ADMIN_API_KEY absente (.all-creds.env ou env)')
  process.exit(1)
}
if (!CONFIG_PATH) {
  console.error('❌ CONFIG=<path-to-json> requis')
  console.error('   Exemple : CONFIG=./tenant-morel.json APPLY=1 ./node_modules/.bin/tsx scripts/seed-tenant-data.ts')
  process.exit(1)
}
if (!fs.existsSync(CONFIG_PATH)) {
  console.error(`❌ Config file ${CONFIG_PATH} introuvable`)
  process.exit(1)
}

const AUTH_HEADER = `users API-Key ${ADMIN_KEY}`

interface PartnerConfig {
  slug: string
  name: string
  body: string
  city?: string
  dept?: string
  partnershipYear?: number
  featured?: boolean
}

interface TenantConfig {
  tenantSlug: string
  company?: Record<string, unknown>
  contact?: Record<string, unknown>
  branding?: Record<string, unknown>
  features?: Record<string, boolean>
  partners?: PartnerConfig[]
}

interface Tenant {
  id: number
  slug: string
  name: string
  company?: { siret?: string | null } | null
  features?: Record<string, boolean> | null
}

async function findTenant(slug: string): Promise<Tenant | null> {
  const url = `${CMS_URL}/api/tenants?where%5Bslug%5D%5Bequals%5D=${encodeURIComponent(slug)}&depth=0&limit=1`
  const res = await fetch(url, { headers: { Authorization: AUTH_HEADER } })
  if (!res.ok) throw new Error(`GET tenants → ${res.status}`)
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

async function findPartnerBySlug(tenantId: number, slug: string): Promise<{ id: number } | null> {
  const url = `${CMS_URL}/api/partners?where%5Bslug%5D%5Bequals%5D=${encodeURIComponent(slug)}&where%5Btenant%5D%5Bequals%5D=${tenantId}&depth=0&limit=1`
  const res = await fetch(url, { headers: { Authorization: AUTH_HEADER } })
  if (!res.ok) throw new Error(`GET partners → ${res.status}`)
  const data = (await res.json()) as { docs: Array<{ id: number }> }
  return data.docs[0] || null
}

async function createPartner(tenantId: number, p: PartnerConfig): Promise<void> {
  const res = await fetch(`${CMS_URL}/api/partners`, {
    method: 'POST',
    headers: { Authorization: AUTH_HEADER, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenant: tenantId, ...p }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`POST partners → ${res.status} ${txt.slice(0, 300)}`)
  }
}

async function updatePartner(id: number, p: PartnerConfig): Promise<void> {
  // Ne re-PATCH pas le slug (peut briser des liens)
  const { slug: _slug, ...rest } = p
  void _slug
  const res = await fetch(`${CMS_URL}/api/partners/${id}`, {
    method: 'PATCH',
    headers: { Authorization: AUTH_HEADER, 'Content-Type': 'application/json' },
    body: JSON.stringify(rest),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`PATCH partners/${id} → ${res.status} ${txt.slice(0, 300)}`)
  }
}

async function main() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH!, 'utf-8')) as TenantConfig

  console.log(`\n📋 seed-tenant-data — ${APPLY ? (FORCE ? 'APPLY+FORCE' : 'APPLY') : 'DRY-RUN'}`)
  console.log(`   CMS_URL=${CMS_URL}`)
  console.log(`   CONFIG=${CONFIG_PATH}`)
  console.log(`   TENANT=${config.tenantSlug}\n`)

  const tenant = await findTenant(config.tenantSlug)
  if (!tenant) {
    console.error(`❌ Tenant slug="${config.tenantSlug}" introuvable. Le créer via /admin d'abord.`)
    process.exit(1)
  }
  console.log(`✅ Tenant trouvé : id=${tenant.id} name="${tenant.name}"`)

  // === Tenant groups (company + contact + branding + features) ===
  const tenantPatch: Record<string, unknown> = {}
  const alreadySeeded = Boolean(tenant.company?.siret)

  if (config.company) tenantPatch.company = config.company
  if (config.contact) tenantPatch.contact = config.contact
  if (config.branding) tenantPatch.branding = config.branding
  if (config.features) tenantPatch.features = config.features

  if (Object.keys(tenantPatch).length > 0) {
    if (alreadySeeded && !FORCE) {
      console.log(`\n⏭️  tenant.company.siret déjà rempli (${tenant.company?.siret}). Skip company/contact/branding/features.`)
      console.log('   Pour réécrire : FORCE=1')
    } else {
      console.log('\n📦 Tenant groups à appliquer :')
      console.log(JSON.stringify(tenantPatch, null, 2))
      if (APPLY) {
        await patchTenant(tenant.id, tenantPatch)
        console.log(`✅ tenant id=${tenant.id} patché`)
      }
    }
  }

  // === Partners (upsert by slug) ===
  if (config.partners && config.partners.length > 0) {
    console.log(`\n📦 ${config.partners.length} partner(s) à seeder`)
    let created = 0,
      updated = 0,
      errors = 0
    for (const p of config.partners) {
      try {
        const existing = await findPartnerBySlug(tenant.id, p.slug)
        if (existing) {
          if (APPLY) await updatePartner(existing.id, p)
          updated++
          console.log(`  ↻ #${existing.id}  ${p.slug}`)
        } else {
          if (APPLY) await createPartner(tenant.id, p)
          created++
          console.log(`  + ${p.slug}`)
        }
      } catch (err) {
        errors++
        console.error(`  ❌ ${p.slug}:`, err instanceof Error ? err.message : err)
      }
    }
    console.log(`\n📊 Partners : ${created} ${APPLY ? 'créés' : 'à créer'}, ${updated} ${APPLY ? 'updates' : 'à update'}, ${errors} erreurs`)
  }

  if (!APPLY) {
    console.log('\n✨ Dry-run terminé. Pour appliquer : APPLY=1 ' + process.argv.slice(1).join(' '))
  }
  process.exit(0)
}

main().catch((err) => {
  console.error('💥 Erreur fatale:', err)
  process.exit(1)
})
