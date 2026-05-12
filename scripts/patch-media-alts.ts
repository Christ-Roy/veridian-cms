/**
 * Patch des alts média génériques (section 2.2 CMS-DIDIER-READY-TODO.md).
 *
 * Aujourd'hui beaucoup de médias prod ont un `alt` recopié du filename
 * (ex: "Café", "Caviste", "stock__Café.png"). Inutile pour Didier qui choisit
 * dans le drawer, et nul pour l'accessibilité.
 *
 * Ce script parse le filename pour déduire la catégorie et préfixer le alt :
 *   used__hero_xxx.webp → "Hero — xxx"
 *   used__partners_xxx.svg → "Logo partenaire — xxx"
 *   used__products_xxx.png → "Produit — xxx"
 *   used__legacy_xxx.png → "Page Services — xxx"
 *   used__brands_xxx.png → "Marque distribuée — xxx"
 *   used__references_xxx.png → "Client référence — xxx"
 *   used__illustrations_xxx.svg → "Illustration UI — xxx"
 *   stock__xxx.png → "Banque image — xxx"
 *   autres → laissés tels quels
 *
 * Idempotent : si l'alt actuel commence déjà par un de nos préfixes, on skip.
 *
 * Usage :
 *   # Dry-run (default) — montre ce qui serait patché, ne touche rien
 *   CMS_URL=https://cms.veridian.site CMS_ADMIN_API_KEY=$CMS_ADMIN_API_KEY_PROD \
 *     ./node_modules/.bin/tsx scripts/patch-media-alts.ts
 *
 *   # Apply (vraiment patcher)
 *   APPLY=1 CMS_URL=https://cms.veridian.site CMS_ADMIN_API_KEY=$CMS_ADMIN_API_KEY_PROD \
 *     ./node_modules/.bin/tsx scripts/patch-media-alts.ts
 *
 *   # Scope à un tenant unique
 *   TENANT_SLUG=avse APPLY=1 ... scripts/patch-media-alts.ts
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
const TENANT_SLUG = process.env.TENANT_SLUG // optionnel — sinon tous les tenants
const APPLY = process.env.APPLY === '1'

if (!ADMIN_KEY) {
  console.error('❌ CMS_ADMIN_API_KEY absente (.all-creds.env ou env)')
  process.exit(1)
}

const AUTH_HEADER = `users API-Key ${ADMIN_KEY}`

// === Règles de patch ===
type Rule = { match: RegExp; prefix: string }
const RULES: Rule[] = [
  { match: /^used__hero[_-]/i, prefix: 'Hero — ' },
  { match: /^used__partners[_-]/i, prefix: 'Logo partenaire — ' },
  { match: /^used__products[_-]/i, prefix: 'Produit — ' },
  { match: /^used__legacy[_-]/i, prefix: 'Page Services — ' },
  { match: /^used__brands[_-]/i, prefix: 'Marque distribuée — ' },
  { match: /^used__references[_-]/i, prefix: 'Client référence — ' },
  { match: /^used__illustrations[_-]/i, prefix: 'Illustration UI — ' },
  { match: /^used__/i, prefix: 'Média — ' }, // catch-all used__
  { match: /^stock__/i, prefix: 'Banque image — ' },
]

const KNOWN_PREFIXES = RULES.map((r) => r.prefix)

/**
 * Construit le nouveau alt depuis le filename, ou null si aucune règle ne matche.
 */
function buildNewAlt(filename: string): string | null {
  // strip extension
  const base = filename.replace(/\.[^.]+$/, '')
  for (const rule of RULES) {
    if (rule.match.test(base)) {
      // strip le préfixe used__xxx_ / stock__ pour ne garder que la partie sémantique
      const stripped = base
        .replace(/^used__[a-z]+[_-]/i, '')
        .replace(/^used__/i, '')
        .replace(/^stock__/i, '')
        .replace(/[_-]/g, ' ')
        .trim()
      return rule.prefix + stripped
    }
  }
  return null
}

/**
 * Skip si l'alt commence déjà par un de nos préfixes (idempotence).
 */
function isAlreadyPatched(alt: string): boolean {
  if (!alt) return false
  return KNOWN_PREFIXES.some((p) => alt.startsWith(p))
}

interface MediaDoc {
  id: number
  alt: string | null
  filename: string | null
  tenant?: { slug?: string } | number | null
}

interface PageResult {
  docs: MediaDoc[]
  totalDocs: number
  hasNextPage: boolean
  nextPage: number | null
}

async function fetchPage(page: number, tenantSlug?: string): Promise<PageResult> {
  const url = new URL(`${CMS_URL}/api/media`)
  url.searchParams.set('limit', '100')
  url.searchParams.set('page', String(page))
  url.searchParams.set('depth', '1') // pour avoir tenant.slug
  if (tenantSlug) {
    url.searchParams.set('where[tenant.slug][equals]', tenantSlug)
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: AUTH_HEADER },
  })
  if (!res.ok) {
    throw new Error(`GET /api/media page=${page} → ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as PageResult
}

async function patchOne(id: number, newAlt: string): Promise<void> {
  const res = await fetch(`${CMS_URL}/api/media/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: AUTH_HEADER,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ alt: newAlt }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`PATCH /api/media/${id} → ${res.status} ${txt.slice(0, 200)}`)
  }
}

async function main() {
  console.log(`\n📋 patch-media-alts — ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  console.log(`   CMS_URL=${CMS_URL}`)
  console.log(`   TENANT=${TENANT_SLUG || '(all)'}`)
  console.log('')

  const stats = {
    total: 0,
    alreadyPatched: 0,
    noRule: 0,
    sameAlt: 0,
    patched: 0,
    errors: 0,
  }
  const samples: Array<{ id: number; before: string; after: string }> = []

  let page = 1
  while (true) {
    const result = await fetchPage(page, TENANT_SLUG)
    for (const doc of result.docs) {
      stats.total++
      const filename = doc.filename || ''
      const currentAlt = doc.alt || ''

      if (!filename) {
        // Pas de filename = pas patchable
        stats.noRule++
        continue
      }
      if (isAlreadyPatched(currentAlt)) {
        stats.alreadyPatched++
        continue
      }
      const newAlt = buildNewAlt(filename)
      if (!newAlt) {
        stats.noRule++
        continue
      }
      if (newAlt === currentAlt) {
        stats.sameAlt++
        continue
      }

      if (samples.length < 10) {
        samples.push({ id: doc.id, before: currentAlt, after: newAlt })
      }

      if (APPLY) {
        try {
          await patchOne(doc.id, newAlt)
          stats.patched++
        } catch (err) {
          stats.errors++
          console.error(`  ❌ #${doc.id}:`, err instanceof Error ? err.message : err)
        }
      } else {
        stats.patched++ // count "would patch"
      }
    }
    if (!result.hasNextPage || !result.nextPage) break
    page = result.nextPage
  }

  console.log('📊 Résumé')
  console.log(`   Total scannés        : ${stats.total}`)
  console.log(`   Déjà patchés         : ${stats.alreadyPatched}`)
  console.log(`   Aucune règle (skip)  : ${stats.noRule}`)
  console.log(`   Alt identique (skip) : ${stats.sameAlt}`)
  console.log(`   ${APPLY ? 'Patchés' : 'À patcher'} : ${stats.patched}`)
  if (stats.errors > 0) {
    console.log(`   ❌ Erreurs           : ${stats.errors}`)
  }

  if (samples.length > 0) {
    console.log('\n🔍 Échantillon des modifications :')
    for (const s of samples) {
      console.log(`   #${s.id}  ${JSON.stringify(s.before).padEnd(40)} → ${JSON.stringify(s.after)}`)
    }
  }

  if (!APPLY && stats.patched > 0) {
    console.log('\n✨ Pour appliquer : APPLY=1 ' + process.argv.slice(1).map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' '))
  }

  process.exit(stats.errors > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('💥 Erreur fatale:', err)
  process.exit(1)
})
