/**
 * Check l'état complet d'un tenant via l'API CMS.
 *
 * Usage : node cms/scripts/status-tenant.mjs <slug>
 * Ex :    node cms/scripts/status-tenant.mjs artisan
 *
 * Affiche :
 *  - tenant (id, name, cfDeployHook si set)
 *  - nombre de pages, header/footer set, forms, redirects, media
 *  - users scopés + rôles
 *  - API key site-reader (si on doit la propager)
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const creds = {}
const credsPath = path.join(os.homedir(), 'credentials/.all-creds.env')
if (fs.existsSync(credsPath)) {
  for (const line of fs.readFileSync(credsPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) creds[m[1]] = m[2]
  }
}

const CMS = creds.CMS_URL || 'https://cms.staging.veridian.site'
const KEY = creds.CMS_ADMIN_API_KEY
const slug = process.argv[2]

if (!slug || !KEY) {
  console.error('Usage: node cms/scripts/status-tenant.mjs <tenant-slug>')
  process.exit(1)
}

async function api(path) {
  const res = await fetch(`${CMS}/api${path}`, {
    headers: { Authorization: `users API-Key ${KEY}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${path} : ${text.slice(0, 200)}`)
  }
  return res.json()
}

async function main() {
  // 1. Tenant
  const tenants = await api(`/tenants?where[slug][equals]=${slug}&limit=1`)
  const tenant = tenants.docs[0]
  if (!tenant) {
    console.error(`❌ Tenant "${slug}" introuvable`)
    process.exit(1)
  }
  console.log(`\n🏢 Tenant : ${tenant.name} (id=${tenant.id}, slug=${tenant.slug})`)
  console.log(`   CF Pages project : ${tenant.cfPagesProject ?? '(non configuré)'}`)
  console.log(`   CF Deploy Hook   : ${tenant.cfDeployHook ? '✅ configuré' : '❌ manquant'}`)

  const tid = tenant.id

  // 2. Pages
  const pages = await api(`/pages?where[tenant][equals]=${tid}&limit=100&depth=0`)
  console.log(`\n📄 Pages : ${pages.totalDocs}`)
  for (const p of pages.docs) {
    const blocksCount = Array.isArray(p.blocks) ? p.blocks.length : 0
    console.log(`   - ${p.slug} "${p.title}" (${blocksCount} blocs, status=${p._status})`)
  }

  // 3. Header + Footer
  const headers = await api(`/header?where[tenant][equals]=${tid}&limit=1`)
  const footers = await api(`/footer?where[tenant][equals]=${tid}&limit=1`)
  console.log(`\n🧭 Header : ${headers.docs[0] ? `✅ "${headers.docs[0].logoText || '(sans logo texte)'}" (${headers.docs[0].nav?.length ?? 0} liens)` : '❌ non défini'}`)
  console.log(`🦶 Footer : ${footers.docs[0] ? `✅ "${footers.docs[0].company?.name ?? '(sans nom)'}"` : '❌ non défini'}`)

  // 4. Media
  const media = await api(`/media?where[tenant][equals]=${tid}&limit=0`)
  console.log(`\n🖼️  Médias : ${media.totalDocs}`)

  // 5. Forms + submissions
  try {
    const forms = await api(`/forms?where[tenant][equals]=${tid}&limit=50`)
    console.log(`📝 Forms : ${forms.totalDocs}`)
    for (const f of forms.docs) {
      console.log(`   - "${f.title}" (${f.fields?.length ?? 0} champs)`)
    }
  } catch (e) {
    console.log(`📝 Forms : erreur (${e.message})`)
  }

  // 6. Redirects
  try {
    const redirects = await api(`/redirects?where[tenant][equals]=${tid}&limit=0`)
    console.log(`↪️  Redirects : ${redirects.totalDocs}`)
  } catch (e) {
    // optional
  }

  // 7. Users scopés au tenant
  // Les users ont un array `tenants[].tenant` qui référence le tenant
  const users = await api(`/users?limit=100&depth=1`)
  const scoped = users.docs.filter((u) => {
    if (u.roles?.includes('super-admin')) return false
    return (u.tenants ?? []).some((t) => {
      const tObj = t.tenant
      return (typeof tObj === 'object' ? tObj?.id : tObj) === tid
    })
  })
  console.log(`\n👥 Users scopés : ${scoped.length}`)
  for (const u of scoped) {
    const hasKey = u.enableAPIKey ? ' (API key)' : ''
    console.log(`   - ${u.email} roles=[${u.roles}]${hasKey}`)
  }

  // 8. Récap health check
  console.log('\n=== HEALTH ===')
  const checks = [
    ['Tenant existe', true],
    ['Au moins 1 page', pages.totalDocs > 0],
    ['Header configuré', Boolean(headers.docs[0])],
    ['Footer configuré', Boolean(footers.docs[0])],
    ['Au moins 1 user scopé', scoped.length > 0],
    ['CF Deploy Hook configuré', Boolean(tenant.cfDeployHook)],
  ]
  for (const [label, ok] of checks) {
    console.log(`${ok ? '✅' : '❌'} ${label}`)
  }
  console.log('')
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
