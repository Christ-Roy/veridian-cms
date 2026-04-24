/**
 * Seed complet staging : super-admin + 3 tenants (demo/artisan/restaurant)
 * + site-readers scopés + pages home avec blocs d'exemple.
 *
 * Idempotent : rejouable plusieurs fois. Les clés sont régénérées à chaque run.
 *
 * Usage : pnpm tsx scripts/seed-staging.ts
 */
import { getPayload } from 'payload'
import config from '../src/payload.config'
import crypto from 'node:crypto'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'robert.brunon@veridian.site'
const BOT_EMAIL = 'claude-bot@veridian.site'

const TENANTS = [
  { slug: 'demo', name: 'Demo' },
  { slug: 'artisan', name: 'Artisan — Dupont BTP' },
  { slug: 'restaurant', name: 'Restaurant — Le Bistro d\'Alice' },
] as const

async function upsertUser(
  payload: any,
  email: string,
  overrides: Record<string, unknown>,
) {
  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  })
  if (existing.docs[0]) {
    return payload.update({
      collection: 'users',
      id: existing.docs[0].id,
      overrideAccess: true,
      data: overrides,
    })
  }
  return payload.create({
    collection: 'users',
    overrideAccess: true,
    data: {
      email,
      password: crypto.randomBytes(24).toString('hex'),
      ...overrides,
    },
  })
}

async function upsertTenant(payload: any, slug: string, name: string) {
  const existing = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: slug } },
    limit: 1,
    overrideAccess: true,
  })
  if (existing.docs[0]) return existing.docs[0]
  return payload.create({
    collection: 'tenants',
    overrideAccess: true,
    data: { slug, name },
  })
}

async function upsertHomePage(payload: any, tenantId: number, tenantSlug: string) {
  const existing = await payload.find({
    collection: 'pages',
    where: { and: [{ tenant: { equals: tenantId } }, { slug: { equals: 'home' } }] },
    limit: 1,
    overrideAccess: true,
    draft: true,
  })

  const titles: Record<string, { title: string; hero: { title: string; subtitle: string } }> = {
    demo: {
      title: 'Accueil',
      hero: {
        title: 'Demo CMS Veridian',
        subtitle: 'Ce contenu est édité via Payload CMS multi-tenant, buildé en static sur Cloudflare Pages.',
      },
    },
    artisan: {
      title: 'Accueil',
      hero: {
        title: 'Dupont BTP — Artisan maçon à Lyon',
        subtitle: "35 ans d'expérience, garantie décennale, devis gratuit sous 48h.",
      },
    },
    restaurant: {
      title: 'Accueil',
      hero: {
        title: "Le Bistro d'Alice",
        subtitle: 'Une cuisine française de saison, au cœur de Lyon 2ᵉ.',
      },
    },
  }

  const conf = titles[tenantSlug] || titles.demo
  const data = {
    title: conf.title,
    slug: 'home',
    tenant: tenantId,
    _status: 'published' as const,
    blocks: [
      {
        blockType: 'hero' as const,
        eyebrow: tenantSlug === 'artisan' ? 'Artisan certifié RGE' : tenantSlug === 'restaurant' ? 'Cuisine française · Lyon 2ᵉ' : 'Demo Veridian',
        title: conf.hero.title,
        subtitle: conf.hero.subtitle,
      },
    ],
  }

  if (existing.docs[0]) {
    return payload.update({
      collection: 'pages',
      id: existing.docs[0].id,
      overrideAccess: true,
      data,
    })
  }
  return payload.create({
    collection: 'pages',
    overrideAccess: true,
    data,
  })
}

async function main() {
  const payload = await getPayload({ config })
  const results: Record<string, string> = {}

  // 1. Super-admin (ton compte)
  const hasAdmin = await payload.find({
    collection: 'users',
    where: { email: { equals: ADMIN_EMAIL } },
    limit: 1,
    overrideAccess: true,
  })
  if (!hasAdmin.docs[0]) {
    const pwd = crypto.randomBytes(12).toString('hex')
    await upsertUser(payload, ADMIN_EMAIL, {
      password: pwd,
      roles: ['super-admin'],
    })
    results._admin_password = pwd
    console.log(`✅ Super-admin créé : ${ADMIN_EMAIL} / ${pwd}`)
  } else {
    await upsertUser(payload, ADMIN_EMAIL, { roles: ['super-admin'] })
    console.log(`♻️  Super-admin existant : ${ADMIN_EMAIL}`)
  }

  // 2. Bot admin avec API key
  const botKey = crypto.randomBytes(32).toString('hex')
  await upsertUser(payload, BOT_EMAIL, {
    roles: ['super-admin'],
    enableAPIKey: true,
    apiKey: botKey,
  })
  results.CMS_ADMIN_API_KEY = botKey
  console.log(`✅ Bot admin : ${BOT_EMAIL}`)

  // 3. Tenants + pages + site-readers
  for (const t of TENANTS) {
    const tenant = await upsertTenant(payload, t.slug, t.name)
    console.log(`✅ Tenant : ${t.slug} (id=${tenant.id})`)

    await upsertHomePage(payload, tenant.id, t.slug)
    console.log(`✅ Page home/${t.slug} (published)`)

    const readerKey = crypto.randomBytes(32).toString('hex')
    await upsertUser(payload, `site-reader-${t.slug}@veridian.site`, {
      roles: ['site-reader'],
      tenants: [{ tenant: tenant.id }],
      enableAPIKey: true,
      apiKey: readerKey,
    })
    results[`CMS_API_KEY_${t.slug.toUpperCase()}`] = readerKey
    console.log(`✅ Site reader : site-reader-${t.slug}@veridian.site`)
  }

  console.log('\n=== SECRETS À SAUVEGARDER ===')
  for (const [k, v] of Object.entries(results)) {
    console.log(`${k}=${v}`)
  }
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
