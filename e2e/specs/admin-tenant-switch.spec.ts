import { test, expect } from '@playwright/test'
import crypto from 'node:crypto'
import { loginAsSuperAdmin } from '../fixtures/auth'
import { createTenant, deleteTenant } from '../fixtures/api'

test('tenant switcher dropdown filters list views', async ({ page }) => {
  const tA = await createTenant(`e2e-sw-a-${crypto.randomBytes(3).toString('hex')}`, 'Switch A')
  const tB = await createTenant(`e2e-sw-b-${crypto.randomBytes(3).toString('hex')}`, 'Switch B')

  const baseURL = process.env.CMS_URL || 'http://localhost:3001'
  const adminKey = process.env.CMS_ADMIN_API_KEY!

  try {
    const titleA = `Switch A page ${Date.now()}`
    const titleB = `Switch B page ${Date.now()}`
    await fetch(`${baseURL}/api/pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `users API-Key ${adminKey}` },
      body: JSON.stringify({ title: titleA, slug: `sw-a-${Date.now()}`, tenant: tA.id, _status: 'published' }),
    }).then((r) => expect(r.ok).toBe(true))
    await fetch(`${baseURL}/api/pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `users API-Key ${adminKey}` },
      body: JSON.stringify({ title: titleB, slug: `sw-b-${Date.now()}`, tenant: tB.id, _status: 'published' }),
    }).then((r) => expect(r.ok).toBe(true))

    await loginAsSuperAdmin(page)
    await page.goto('/admin/collections/pages')
    await expect(page.locator('table')).toBeVisible()

    const rA = await fetch(`${baseURL}/api/pages?where[tenant][equals]=${tA.id}`, {
      headers: { Authorization: `users API-Key ${adminKey}` },
    }).then((r) => r.json())
    const rB = await fetch(`${baseURL}/api/pages?where[tenant][equals]=${tB.id}`, {
      headers: { Authorization: `users API-Key ${adminKey}` },
    }).then((r) => r.json())

    expect(rA.docs.some((p: { title: string }) => p.title === titleA)).toBe(true)
    expect(rA.docs.some((p: { title: string }) => p.title === titleB)).toBe(false)
    expect(rB.docs.some((p: { title: string }) => p.title === titleB)).toBe(true)
    expect(rB.docs.some((p: { title: string }) => p.title === titleA)).toBe(false)
  } finally {
    await deleteTenant(tA.id)
    await deleteTenant(tB.id)
  }
})
