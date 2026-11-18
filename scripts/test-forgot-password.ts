/**
 * test-forgot-password.ts — Crée un tenant + user de test, trigger forgot-password,
 * affiche le token reset généré côté DB (ne consomme pas le mail).
 *
 * Permet de valider en autonomie :
 *   1. Création tenant + user OK (= flow provisioning marche)
 *   2. forgot-password ne throw pas
 *   3. Token reset bien généré et persisté
 *   4. Optionnellement : reset effectif du password via API
 *
 * Le mail SMTP est envoyé en vrai (Lark prod), je peux vérifier avec
 * Gmail MCP si l'adresse cible reçoit bien.
 *
 * Cleanup automatique en fin de run.
 *
 * Usage :
 *   pnpm tsx scripts/test-forgot-password.ts <email>
 *   pnpm tsx scripts/test-forgot-password.ts brunon5robert+cms-test@gmail.com
 */
import { getPayload } from 'payload'
import config from '../src/payload.config'

const email = process.argv[2]
if (!email) {
  console.error('Usage: tsx scripts/test-forgot-password.ts <email>')
  process.exit(1)
}

const SUITE_SLUG = `test-fp-${Date.now()}`

async function main() {
  const payload = await getPayload({ config: await config })

  payload.logger.info(`[test-fp] === START ${email} ===`)

  // 1. Création tenant test
  payload.logger.info(`[test-fp] Création tenant "${SUITE_SLUG}"...`)
  const tenant = await payload.create({
    collection: 'tenants',
    data: { slug: SUITE_SLUG, name: `[TEST] Forgot Password ${SUITE_SLUG}` },
    overrideAccess: true,
  })
  payload.logger.info(`[test-fp] Tenant créé id=${tenant.id}`)

  // 2. Création user test rattaché au tenant
  const initialPassword = `init-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  payload.logger.info(`[test-fp] Création user "${email}"...`)
  const user = await payload.create({
    collection: 'users',
    data: {
      email,
      password: initialPassword,
      tenants: [
        {
          tenant: tenant.id as number,
          roles: ['client'],
        },
      ],
    },
    overrideAccess: true,
  })
  payload.logger.info(`[test-fp] User créé id=${user.id} (password initial caché)`)

  // 3. Trigger forgot-password
  payload.logger.info(`[test-fp] Trigger forgot-password sur ${email}...`)
  const before = Date.now()
  await payload.forgotPassword({
    collection: 'users',
    data: { email },
    overrideAccess: true,
  })
  const elapsed = Date.now() - before
  payload.logger.info(`[test-fp] forgot-password retourné en ${elapsed}ms (envoi SMTP inclus)`)

  // 4. Vérif que le token a bien été persisté en DB
  const updated = await payload.findByID({
    collection: 'users',
    id: user.id,
    overrideAccess: true,
    showHiddenFields: true,
  })
  const token = (updated as { resetPasswordToken?: string }).resetPasswordToken
  const expiration = (updated as { resetPasswordExpiration?: string }).resetPasswordExpiration

  if (!token) {
    payload.logger.error('[test-fp] ✗ ÉCHEC : resetPasswordToken absent en DB')
    process.exitCode = 1
  } else {
    payload.logger.info(`[test-fp] ✓ Token reset persisté en DB (${token.slice(0, 8)}…)`)
    payload.logger.info(`[test-fp] ✓ Expire à : ${expiration}`)
  }

  // 5. Test reset effectif du password via token
  const newPassword = `new-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  payload.logger.info(`[test-fp] Test reset password via token...`)
  try {
    const reset = await payload.resetPassword({
      collection: 'users',
      data: { token: token!, password: newPassword },
      overrideAccess: true,
    })
    payload.logger.info(`[test-fp] ✓ Reset OK, nouveau token JWT user="${(reset.user as { email: string }).email}"`)
  } catch (err) {
    payload.logger.error(`[test-fp] ✗ Reset échoué : ${err instanceof Error ? err.message : err}`)
    process.exitCode = 1
  }

  // 6. Test login avec nouveau password
  payload.logger.info(`[test-fp] Test login avec nouveau password...`)
  try {
    const login = await payload.login({
      collection: 'users',
      data: { email, password: newPassword },
    })
    payload.logger.info(`[test-fp] ✓ Login OK, token JWT renvoyé (${(login.token ?? '').slice(0, 20)}…)`)
  } catch (err) {
    payload.logger.error(`[test-fp] ✗ Login avec new password échoué : ${err instanceof Error ? err.message : err}`)
    process.exitCode = 1
  }

  // 7. Cleanup
  payload.logger.info(`[test-fp] Cleanup...`)
  await payload.delete({ collection: 'users', id: user.id, overrideAccess: true }).catch(() => {})
  await payload.delete({ collection: 'tenants', id: tenant.id as number, overrideAccess: true }).catch(() => {})
  payload.logger.info(`[test-fp] === END ===`)
  process.exit(process.exitCode ?? 0)
}

main().catch((err) => {
  console.error('[test-fp] CRASH :', err)
  process.exit(1)
})
