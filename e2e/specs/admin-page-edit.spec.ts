import { test, expect } from '../fixtures/tenant'
import { loginAsSuperAdmin } from '../fixtures/auth'

test('create page via API → edit in admin → save → verify via API', async ({ page, tenant }) => {
  const baseURL = process.env.CMS_URL || 'http://localhost:3001'
  const adminKey = process.env.CMS_ADMIN_API_KEY!

  const initialTitle = `E2E init ${Date.now()}`
  const slug = `e2e-${Date.now()}`
  const created = await fetch(`${baseURL}/api/pages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `users API-Key ${adminKey}` },
    body: JSON.stringify({ title: initialTitle, slug, tenant: tenant.id, _status: 'published' }),
  })
  expect(created.ok).toBe(true)
  const { doc } = await created.json()
  const pageId = doc.id

  await loginAsSuperAdmin(page)
  await page.goto(`/admin/collections/pages/${pageId}`)
  await expect(page.locator('input#field-title')).toBeVisible()

  const modalBg = page.locator('.assign-tenant-field-modal__bg')
  if (await modalBg.count()) {
    await page.keyboard.press('Escape')
    await modalBg.first().waitFor({ state: 'detached', timeout: 5_000 }).catch(() => {})
  }

  const updatedTitle = `E2E updated ${Date.now()}`
  await page.locator('input#field-title').fill(updatedTitle)

  await page.locator('button#action-save').click()

  await expect(page.locator('.toast-title, [class*="toast"][class*="title"]').first()).toBeVisible({ timeout: 15_000 })

  const r = await fetch(`${baseURL}/api/pages/${pageId}`, {
    headers: { Authorization: `users API-Key ${adminKey}` },
  })
  expect(r.ok).toBe(true)
  const json = await r.json()
  expect(json.title).toBe(updatedTitle)
  expect(json.tenant?.id ?? json.tenant).toBe(tenant.id)
})
