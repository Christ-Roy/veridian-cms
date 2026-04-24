/**
 * Fixture Playwright : crée un tenant e2e-<uuid> isolé pour ce test.
 * Nettoyage automatique en teardown (même en cas d'échec).
 *
 * À finaliser session prochaine.
 */
import { test as base } from '@playwright/test'
import crypto from 'node:crypto'

type Tenant = {
  id: number
  slug: string
  name: string
  apiKey: string // site-reader key
}

export const test = base.extend<{ tenant: Tenant }>({
  tenant: async ({}, use) => {
    const slug = `e2e-${crypto.randomBytes(6).toString('hex')}`
    const name = `E2E Test ${slug}`

    // TODO session prochaine : créer via API + user site-reader + clé
    const tenant: Tenant = {
      id: 0,
      slug,
      name,
      apiKey: '',
    }

    await use(tenant)

    // Cleanup (idempotent)
    // TODO : DELETE /api/tenants/<id>
  },
})

export { expect } from '@playwright/test'
