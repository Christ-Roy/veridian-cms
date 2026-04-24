/**
 * Envoie un magic link à un user client pour qu'il se connecte sans password.
 *
 * Flow : appelle /api/users/forgot-password → Payload génère un token + envoie
 * un email via le nodemailerAdapter (SMTP Lark). User clique → /admin/reset →
 * définit son mdp → connecté.
 *
 * Usage : node cms/scripts/send-magic-link.mjs <email>
 *
 * Ex : node cms/scripts/send-magic-link.mjs client-morel@veridian.site
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const credsPath = path.join(os.homedir(), 'credentials/.all-creds.env')
const creds = {}
if (fs.existsSync(credsPath)) {
  for (const line of fs.readFileSync(credsPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) creds[m[1]] = m[2]
  }
}

const CMS_URL = creds.CMS_URL || 'https://cms.staging.veridian.site'
const email = process.argv[2]

if (!email) {
  console.error('Usage: node cms/scripts/send-magic-link.mjs <email>')
  process.exit(1)
}

const res = await fetch(`${CMS_URL}/api/users/forgot-password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email }),
})

if (res.ok) {
  console.log(`✅ Magic link envoyé à ${email}`)
  console.log(`   Le user reçoit un email avec un lien pour définir son mdp`)
  console.log(`   et se connecter à ${CMS_URL}/admin`)
} else {
  const txt = await res.text()
  console.error(`❌ ${res.status} ${txt.slice(0, 300)}`)
  process.exit(1)
}
