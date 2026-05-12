/**
 * Seed des 47 partenaires AVSE depuis
 * `/home/brunon5/www.avse-monetique.fr/site/src/data/partners.json` vers
 * la collection `partners` du tenant AVSE.
 *
 * Idempotent : upsert par (tenant, slug). Si un partner existe déjà avec
 * le même slug, il est mis à jour (avec son body markdown, ville, dept).
 *
 * Le champ `logo` (upload media) n'est PAS migré ici — les filenames JSON
 * pointent vers des assets locaux du site, pas vers des Media uploadés.
 * L'agent AVSE re-uploadera les logos via l'admin si besoin.
 *
 * Usage :
 *   # Dry-run
 *   CMS_URL=https://cms.veridian.site \
 *     CMS_ADMIN_API_KEY=$CMS_ADMIN_API_KEY_PROD \
 *     ./node_modules/.bin/tsx scripts/seed-partners-avse.ts
 *
 *   # Apply
 *   APPLY=1 CMS_URL=... CMS_ADMIN_API_KEY=... \
 *     ./node_modules/.bin/tsx scripts/seed-partners-avse.ts
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
const TENANT_SLUG = 'avse'
const APPLY = process.env.APPLY === '1'

const PARTNERS_JSON = '/home/brunon5/www.avse-monetique.fr/site/src/data/partners.json'

if (!ADMIN_KEY) {
  console.error('❌ CMS_ADMIN_API_KEY absente')
  process.exit(1)
}
if (!fs.existsSync(PARTNERS_JSON)) {
  console.error(`❌ ${PARTNERS_JSON} introuvable`)
  process.exit(1)
}

const AUTH_HEADER = `users API-Key ${ADMIN_KEY}`

interface PartnerSrc {
  slug: string
  nom: string
  ville: string
  dept: string
  logo: string
  body: string
}

interface PartnerCMS {
  id: number
  slug: string
}

async function findTenantId(slug: string): Promise<number> {
  const url = `${CMS_URL}/api/tenants?where%5Bslug%5D%5Bequals%5D=${encodeURIComponent(slug)}&depth=0&limit=1`
  const res = await fetch(url, { headers: { Authorization: AUTH_HEADER } })
  if (!res.ok) throw new Error(`GET tenants → ${res.status}`)
  const data = (await res.json()) as { docs: Array<{ id: number }> }
  if (!data.docs[0]) throw new Error(`Tenant slug=${slug} introuvable`)
  return data.docs[0].id
}

async function findPartnerBySlug(tenantId: number, slug: string): Promise<PartnerCMS | null> {
  const url = `${CMS_URL}/api/partners?where%5Bslug%5D%5Bequals%5D=${encodeURIComponent(slug)}&where%5Btenant%5D%5Bequals%5D=${tenantId}&depth=0&limit=1`
  const res = await fetch(url, { headers: { Authorization: AUTH_HEADER } })
  if (!res.ok) throw new Error(`GET partners → ${res.status}`)
  const data = (await res.json()) as { docs: PartnerCMS[] }
  return data.docs[0] || null
}

async function createPartner(tenantId: number, p: PartnerSrc): Promise<void> {
  const res = await fetch(`${CMS_URL}/api/partners`, {
    method: 'POST',
    headers: { Authorization: AUTH_HEADER, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenant: tenantId,
      name: p.nom,
      slug: p.slug,
      city: p.ville,
      dept: p.dept,
      body: p.body,
    }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`POST → ${res.status} ${txt.slice(0, 200)}`)
  }
}

async function updatePartner(id: number, p: PartnerSrc): Promise<void> {
  const res = await fetch(`${CMS_URL}/api/partners/${id}`, {
    method: 'PATCH',
    headers: { Authorization: AUTH_HEADER, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: p.nom,
      city: p.ville,
      dept: p.dept,
      body: p.body,
    }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`PATCH → ${res.status} ${txt.slice(0, 200)}`)
  }
}

async function main() {
  console.log(`\n📋 seed-partners-avse — ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  console.log(`   CMS_URL=${CMS_URL}`)
  console.log(`   TENANT=${TENANT_SLUG}\n`)

  const partners = JSON.parse(fs.readFileSync(PARTNERS_JSON, 'utf-8')) as PartnerSrc[]
  console.log(`📦 ${partners.length} partenaires à seeder depuis le JSON\n`)

  const tenantId = await findTenantId(TENANT_SLUG)
  console.log(`✅ Tenant id=${tenantId}\n`)

  let created = 0,
    updated = 0,
    skipped = 0,
    errors = 0

  for (const p of partners) {
    try {
      const existing = await findPartnerBySlug(tenantId, p.slug)
      if (existing) {
        if (APPLY) {
          await updatePartner(existing.id, p)
          updated++
        } else {
          updated++ // count "would update"
        }
        console.log(`  ↻ #${existing.id}  ${p.slug}`)
      } else {
        if (APPLY) {
          await createPartner(tenantId, p)
          created++
        } else {
          created++ // count "would create"
        }
        console.log(`  + ${p.slug}`)
      }
    } catch (err) {
      errors++
      console.error(`  ❌ ${p.slug}:`, err instanceof Error ? err.message : err)
    }
  }

  console.log('\n📊 Résumé')
  console.log(`   ${APPLY ? 'Créés' : 'À créer'}    : ${created}`)
  console.log(`   ${APPLY ? 'Updates' : 'À update'}  : ${updated}`)
  console.log(`   Skipped    : ${skipped}`)
  if (errors > 0) console.log(`   ❌ Erreurs : ${errors}`)

  if (!APPLY) console.log('\n✨ Pour appliquer : APPLY=1 ' + process.argv.slice(1).join(' '))
  process.exit(errors > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('💥 Erreur fatale:', err)
  process.exit(1)
})
