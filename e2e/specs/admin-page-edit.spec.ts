import { test, expect } from '../fixtures/tenant'
import { loginAsSuperAdmin } from '../fixtures/auth'

test('create page → publish → page accessible via API', async ({ page, tenant }) => {
  await loginAsSuperAdmin(page)
  await page.goto(`/admin/collections/pages/create?tenant=${tenant.id}`)

  const modalBg = page.locator('.assign-tenant-field-modal__bg')
  if (await modalBg.count()) {
    const confirmBtn = page.getByRole('button', { name: /Confirmer|Confirm|Continuer/i })
    if (await confirmBtn.count()) await confirmBtn.first().click()
    await modalBg.first().waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {})
  }

  const title = `E2E page ${Date.now()}`
  await page.locator('input#field-title').fill(title)
  await page.locator('input#field-slug').fill(`e2e-${Date.now()}`)

  await page.locator('button#action-save').click()
  await expect(page.getByText(/Mis à jour avec succès|Updated successfully|Publié|Sauvegardé|Saved/i)).toBeVisible({ timeout: 15_000 })

  const url = page.url()
  const idMatch = url.match(/\/pages\/(\d+)/)
  expect(idMatch).not.toBeNull()

  const adminKey = process.env.CMS_ADMIN_API_KEY!
  const baseURL = process.env.CMS_URL || 'http://localhost:3001'
  const r = await fetch(`${baseURL}/api/pages/${idMatch![1]}`, {
    headers: { Authorization: `users API-Key ${adminKey}` },
  })
  expect(r.ok).toBe(true)
  const json = await r.json()
  expect(json.title).toBe(title)
  expect(json.tenant?.id ?? json.tenant).toBe(tenant.id)
})
