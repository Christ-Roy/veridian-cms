/**
 * Crée (ou met à jour) l'user super-admin "claude-bot" avec une API key.
 * Usage : pnpm tsx scripts/create-admin-api-key.ts
 *
 * Output : affiche l'API key une seule fois. Copie-la dans .all-creds.env :
 *   CMS_ADMIN_API_KEY=<la clé>
 */
import { getPayload } from 'payload'
import config from '../src/payload.config'
import crypto from 'node:crypto'

const BOT_EMAIL = 'claude-bot@veridian.site'

async function main() {
  const payload = await getPayload({ config })

  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: BOT_EMAIL } },
    limit: 1,
  })

  const apiKey = crypto.randomBytes(32).toString('hex')
  const randomPassword = crypto.randomBytes(24).toString('hex')

  if (existing.docs[0]) {
    await payload.update({
      collection: 'users',
      id: existing.docs[0].id,
      data: {
        enableAPIKey: true,
        apiKey,
        roles: ['super-admin'],
      },
    })
    console.log(`✅ User "${BOT_EMAIL}" mis à jour (id=${existing.docs[0].id})`)
  } else {
    const created = await payload.create({
      collection: 'users',
      data: {
        email: BOT_EMAIL,
        password: randomPassword,
        enableAPIKey: true,
        apiKey,
        roles: ['super-admin'],
      },
    })
    console.log(`✅ User "${BOT_EMAIL}" créé (id=${created.id})`)
  }

  console.log('')
  console.log('=== API KEY (à copier UNE SEULE FOIS) ===')
  console.log(apiKey)
  console.log('==========================================')
  console.log('')
  console.log('Ajoute dans ~/credentials/.all-creds.env :')
  console.log(`CMS_ADMIN_API_KEY=${apiKey}`)
  console.log('')
  console.log('Usage :')
  console.log(`curl -H "Authorization: users API-Key ${apiKey}" \\`)
  console.log(`  https://cms.staging.veridian.site/api/tenants`)

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
