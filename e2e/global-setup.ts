/**
 * Setup global E2E : s'exécute 1 fois avant tous les tests.
 *
 * À finaliser :
 *  - créer un tenant e2e-<uuid> (isolé des autres tests)
 *  - créer un user super-admin e2e-admin@veridian.site
 *  - stocker credentials dans process.env.E2E_*  pour les specs
 *  - vérifier que CMS répond OK
 *
 * Cf. cms/docs/NEXT-SESSION-ROADMAP.md §Phase 3.
 */
import type { FullConfig } from '@playwright/test'

export default async function globalSetup(config: FullConfig) {
  const cmsUrl = process.env.CMS_URL || 'https://cms.staging.veridian.site'
  const adminKey = process.env.CMS_ADMIN_API_KEY
  if (!adminKey) {
    console.warn('⚠️  CMS_ADMIN_API_KEY manquante — les tests qui mutent l\'API seront skipped')
    return
  }

  // Ping health
  const res = await fetch(`${cmsUrl}/api/health`).catch(() => null)
  if (!res?.ok) {
    throw new Error(`CMS ${cmsUrl}/api/health pas répondu — abort E2E`)
  }

  // TODO prochaine session : créer tenant e2e-<uuid> + super-admin E2E
  // et exposer les creds via process.env (file globalState)
}
