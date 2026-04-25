import { test as base } from '@playwright/test'
import crypto from 'node:crypto'
import { createTenant, deleteTenant, type Tenant } from './api'

export const test = base.extend<{ tenant: Tenant }>({
  tenant: async ({}, use) => {
    const slug = `e2e-${crypto.randomBytes(4).toString('hex')}`
    const name = `E2E ${slug}`
    const t = await createTenant(slug, name)
    try {
      await use(t)
    } finally {
      await deleteTenant(t.id)
    }
  },
})

export { expect } from '@playwright/test'
