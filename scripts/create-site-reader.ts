/**
 * Crée un user "site-reader" scopé à UN tenant, avec une API key read-only.
 *
 * Usage : pnpm tsx scripts/create-site-reader.ts <tenant-slug>
 *   ex : pnpm tsx scripts/create-site-reader.ts artisan
 *
 * Idempotent : si le user existe, rotate la clé.
 */
import { getPayload } from 'payload'
import config from '../src/payload.config'
import crypto from 'node:crypto'

async function main() {
  const tenantSlug = process.argv[2]
  if (!tenantSlug) {
    console.error('Usage: pnpm tsx scripts/create-site-reader.ts <tenant-slug>')
    process.exit(1)
  }

  const payload = await getPayload({ config })

  const tenants = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: tenantSlug } },
    limit: 1,
    overrideAccess: true,
  })
  const tenant = tenants.docs[0]
  if (!tenant) {
    console.error(`❌ Tenant "${tenantSlug}" introuvable. Crée-le d'abord.`)
    process.exit(1)
  }

  const email = `site-reader-${tenantSlug}@veridian.site`
  const apiKey = crypto.randomBytes(32).toString('hex')
  const password = crypto.randomBytes(24).toString('hex')

  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  })

  if (existing.docs[0]) {
    await payload.update({
      collection: 'users',
      id: existing.docs[0].id,
      overrideAccess: true,
      data: {
        enableAPIKey: true,
        apiKey,
        roles: ['site-reader'],
        tenants: [{ tenant: tenant.id }],
      },
    })
    console.log(`♻️  User "${email}" mis à jour — nouvelle clé générée`)
  } else {
    const created = await payload.create({
      collection: 'users',
      overrideAccess: true,
      data: {
        email,
        password,
        enableAPIKey: true,
        apiKey,
        roles: ['site-reader'],
        tenants: [{ tenant: tenant.id }],
      },
    })
    console.log(`✅ User "${email}" créé (id=${created.id})`)
  }

  console.log('')
  console.log(`=== API KEY site-reader ${tenantSlug} ===`)
  console.log(apiKey)
  console.log('==========================================')
  console.log('')
  console.log(`Usage dans sites/template-${tenantSlug}/.env :`)
  console.log(`  CMS_TENANT_SLUG=${tenantSlug}`)
  console.log(`  CMS_API_KEY=${apiKey}`)
  console.log('')
  console.log(`Test :`)
  console.log(`  curl -H "Authorization: users API-Key ${apiKey}" \\`)
  console.log(`    https://cms.staging.veridian.site/api/pages | head -c 400`)

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
