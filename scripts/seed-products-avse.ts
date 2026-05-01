/**
 * Seed one-shot des produits AVSE depuis sites/avse/src/data/products.ts → tenant 1.
 * Idempotent : upsert par slug. Skip si déjà présent à l'identique.
 *
 * Usage :
 *   CMS_URL=https://cms.veridian.site CMS_ADMIN_API_KEY=$CMS_ADMIN_API_KEY_PROD \
 *     ./node_modules/.bin/tsx scripts/seed-products-avse.ts
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const MONOREPO_ROOT = path.resolve(__dirname, '../..')

// Lire creds file fallback
const creds: Record<string, string> = {}
const credsPath = path.join(process.env.HOME || '', 'credentials/.all-creds.env')
if (fs.existsSync(credsPath)) {
  for (const line of fs.readFileSync(credsPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) creds[m[1]] = m[2]
  }
}
const CMS_URL = process.env.CMS_URL || creds.CMS_URL || 'https://cms.staging.veridian.site'
const ADMIN_KEY = process.env.CMS_ADMIN_API_KEY || creds.CMS_ADMIN_API_KEY
const TENANT_SLUG = process.env.TENANT_SLUG || 'avse'

if (!ADMIN_KEY) {
  console.error('❌ CMS_ADMIN_API_KEY absente')
  process.exit(1)
}

interface ProductSrc {
  slug: string
  name: string
  category: string
  brand: string
  priceHT: string
  rentMonth: string
  image: string
  description: string[]
  refLegacy: string
}

async function api<T>(method: string, p: string, body?: unknown): Promise<T> {
  const res = await fetch(`${CMS_URL}/api${p}`, {
    method,
    headers: {
      Authorization: `users API-Key ${ADMIN_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`${method} ${p} → ${res.status}: ${text.slice(0, 400)}`)
  }
  try {
    return JSON.parse(text) as T
  } catch {
    return {} as T
  }
}

async function main() {
  // 1. Récupérer tenant id
  const tenants = await api<{ docs: { id: number; slug: string }[] }>(
    'GET',
    `/tenants?where[slug][equals]=${TENANT_SLUG}&limit=1`,
  )
  const tenantId = tenants.docs[0]?.id
  if (!tenantId) {
    console.error(`❌ Tenant "${TENANT_SLUG}" introuvable`)
    process.exit(1)
  }
  console.log(`✅ Tenant id=${tenantId}`)

  // 2. Lire products.ts du site (via symlink monorepo)
  const productsPath = path.join(MONOREPO_ROOT, 'sites', TENANT_SLUG, 'src/data/products.ts')
  if (!fs.existsSync(productsPath)) {
    console.error(`❌ ${productsPath} introuvable`)
    process.exit(1)
  }
  // Extraction simple : on cherche le tableau JSON après "export const PRODUCTS: Product[] = [
  const src = fs.readFileSync(productsPath, 'utf-8')
  const arrMatch = src.match(/export const PRODUCTS:\s*Product\[\]\s*=\s*(\[[\s\S]*?\n\]);/m)
  if (!arrMatch) {
    console.error('❌ Pas de export const PRODUCTS = [...] reconnu')
    process.exit(1)
  }
  let products: ProductSrc[]
  try {
    // Le tableau utilise des keys quoted donc c'est du JSON valide modulo trailing commas
    const cleaned = arrMatch[1]
      .replace(/,(\s*[}\]])/g, '$1') // remove trailing commas
    products = JSON.parse(cleaned) as ProductSrc[]
  } catch (e) {
    console.error('❌ Parse PRODUCTS échoué :', e)
    process.exit(1)
  }
  console.log(`📦 ${products.length} produits à seeder`)

  // 3. Pour chaque produit : upsert
  let created = 0
  let updated = 0
  for (const p of products) {
    const data = {
      name: p.name,
      slug: p.slug,
      category: p.category,
      brand: p.brand || undefined,
      priceHT: p.priceHT || undefined,
      rentMonth: p.rentMonth || undefined,
      imageFallbackUrl: p.image || undefined,
      description: (p.description || []).map((text) => ({ text })),
      refLegacy: p.refLegacy || undefined,
      tenant: tenantId,
      _status: 'published',
    }

    const existing = await api<{ docs: { id: number }[] }>(
      'GET',
      `/products?where[and][0][tenant][equals]=${tenantId}&where[and][1][slug][equals]=${encodeURIComponent(p.slug)}&limit=1&draft=true`,
    )
    if (existing.docs[0]) {
      await api('PATCH', `/products/${existing.docs[0].id}?draft=false`, data)
      console.log(`♻️  ${p.slug}`)
      updated++
    } else {
      await api('POST', '/products?draft=false', data)
      console.log(`✅ ${p.slug}`)
      created++
    }
  }
  console.log(`\n✨ Done. ${created} créés, ${updated} mis à jour.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
