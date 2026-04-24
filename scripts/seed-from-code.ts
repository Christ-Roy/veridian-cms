/**
 * Provisionne un tenant CMS à partir du contenu hardcodé d'un site.
 *
 * Tourne EN LOCAL (depuis la racine du monorepo), utilise l'API REST Payload
 * avec CMS_ADMIN_API_KEY depuis ~/credentials/.all-creds.env.
 *
 * Usage :
 *   node cms/scripts/seed-from-code.mjs <site-dir> <tenant-slug> [tenant-name]
 *
 * Exemples :
 *   node cms/scripts/seed-from-code.mjs template-artisan artisan "Dupont BTP"
 *   node cms/scripts/seed-from-code.mjs template-restaurant restaurant "Le Bistro d'Alice"
 *
 * Idempotent. Rejouable. Rotate la clé site-reader à chaque run.
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import os from 'node:os'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MONOREPO_ROOT = path.resolve(__dirname, '../..')

// Load creds
const credsPath = path.join(os.homedir(), 'credentials/.all-creds.env')
const creds: Record<string, string> = {}
if (fs.existsSync(credsPath)) {
  for (const line of fs.readFileSync(credsPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) creds[m[1]] = m[2]
  }
}
const CMS_URL = creds.CMS_URL || 'https://cms.staging.veridian.site'
const ADMIN_KEY = creds.CMS_ADMIN_API_KEY
if (!ADMIN_KEY) {
  console.error('❌ CMS_ADMIN_API_KEY absente de ~/credentials/.all-creds.env')
  process.exit(1)
}

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${CMS_URL}/api${path}`, {
    method,
    headers: {
      Authorization: `users API-Key ${ADMIN_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data: unknown
  try { data = JSON.parse(text) } catch { data = text }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 500)}`)
  }
  return data as T
}

async function main() {
  const [siteDir, tenantSlug, tenantName] = process.argv.slice(2)
  if (!siteDir || !tenantSlug) {
    console.error('Usage: node cms/scripts/seed-from-code.mjs <site-dir> <tenant-slug> [tenant-name]')
    process.exit(1)
  }

  const contentDir = path.join(MONOREPO_ROOT, 'sites', siteDir, 'src/content')
  if (!fs.existsSync(contentDir)) {
    console.error(`❌ Dossier introuvable : ${contentDir}`)
    process.exit(1)
  }

  // 1. Upsert tenant
  const tenants = await api<{ docs: { id: number; slug: string }[] }>('GET', `/tenants?where[slug][equals]=${encodeURIComponent(tenantSlug)}&limit=1`)
  let tenantId: number
  if (tenants.docs[0]) {
    tenantId = tenants.docs[0].id
    console.log(`♻️  Tenant "${tenantSlug}" existe déjà (id=${tenantId})`)
  } else {
    const res = await api<{ doc: { id: number } }>('POST', '/tenants', {
      slug: tenantSlug,
      name: tenantName || tenantSlug,
    })
    tenantId = res.doc.id
    console.log(`✅ Tenant "${tenantSlug}" créé (id=${tenantId})`)
  }

  // 2. Pour chaque src/content/*.ts → upsert page
  const files = fs.readdirSync(contentDir).filter((f) => f.endsWith('.ts'))
  for (const file of files) {
    const pageSlug = file.replace(/\.ts$/, '')
    // Import dynamique via tsx runtime — on passe par esbuild
    const mod = await importTs(path.join(contentDir, file))
    const blocks = mod.HOME || mod.CONTENT || mod.BLOCKS || mod.default
    if (!Array.isArray(blocks)) {
      console.warn(`⚠️  ${file} : pas de export HOME/CONTENT/default array, skip`)
      continue
    }

    const existing = await api<{ docs: { id: number }[] }>(
      'GET',
      `/pages?where[and][0][tenant][equals]=${tenantId}&where[and][1][slug][equals]=${encodeURIComponent(pageSlug)}&limit=1&draft=true`,
    )
    const title = (blocks[0] as { title?: string })?.title || pageSlug

    if (existing.docs[0]) {
      await api('PATCH', `/pages/${existing.docs[0].id}?draft=true`, {
        title, slug: pageSlug, tenant: tenantId, blocks, _status: 'published',
      })
      console.log(`♻️  Page "${pageSlug}" mise à jour (${blocks.length} blocs)`)
    } else {
      await api('POST', '/pages', {
        title, slug: pageSlug, tenant: tenantId, blocks, _status: 'published',
      })
      console.log(`✅ Page "${pageSlug}" créée (${blocks.length} blocs)`)
    }
  }

  // 3. Upsert site-reader + nouvelle API key
  const readerEmail = `site-reader-${tenantSlug}@veridian.site`
  const apiKey = crypto.randomBytes(32).toString('hex')
  const readers = await api<{ docs: { id: number }[] }>('GET', `/users?where[email][equals]=${encodeURIComponent(readerEmail)}&limit=1`)
  if (readers.docs[0]) {
    await api('PATCH', `/users/${readers.docs[0].id}`, {
      enableAPIKey: true, apiKey,
      roles: ['site-reader'],
      tenants: [{ tenant: tenantId }],
    })
    console.log(`♻️  Site reader "${readerEmail}" — nouvelle clé`)
  } else {
    await api('POST', '/users', {
      email: readerEmail,
      password: crypto.randomBytes(24).toString('hex'),
      enableAPIKey: true, apiKey,
      roles: ['site-reader'],
      tenants: [{ tenant: tenantId }],
    })
    console.log(`✅ Site reader "${readerEmail}" créé`)
  }

  console.log('\n=== CONFIG À PROPAGER ===')
  console.log(`\n1) sites/${siteDir}/.env :`)
  console.log(`   CMS_API_URL=${CMS_URL}`)
  console.log(`   CMS_TENANT_SLUG=${tenantSlug}`)
  console.log(`   CMS_API_KEY=${apiKey}`)
  console.log(`\n2) GitHub secret :`)
  console.log(`   echo "${apiKey}" | gh secret set CMS_API_KEY_${tenantSlug.toUpperCase()} --repo Christ-Roy/veridian-platform`)
  console.log('')
}

// Helper pour import .ts en Node pur : on utilise l'API experimental strip-types (Node 22+)
// ou on fait un require via tsx si dispo
async function importTs(filePath: string): Promise<Record<string, unknown>> {
  // Node 22+ : supporte --experimental-strip-types nativement
  // Sinon on utilise tsx register
  try {
    const mod = await import(pathToFileURL(filePath).href)
    return mod
  } catch (err) {
    // Fallback : parse le fichier à la main pour extraire HOME (simple cas POC)
    const src = fs.readFileSync(filePath, 'utf8')
    const match = src.match(/export const HOME\s*:\s*Block\[\]\s*=\s*(\[[\s\S]*\])\s*(\n|$)/m)
    if (match) {
      // Dangereux mais bounded : on eval dans un sandbox minimal
      const fn = new Function(`return ${match[1]}`)
      return { HOME: fn() }
    }
    throw err
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
