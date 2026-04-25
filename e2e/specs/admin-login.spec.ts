import { test, expect } from '@playwright/test'
import { loginAsSuperAdmin } from '../fixtures/auth'

test.describe('admin-login', () => {
  test('login page renders white-label Veridian', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page).toHaveTitle(/Veridian CMS/)
    await expect(page.getByText(/Bienvenue sur votre espace de gestion Veridian/i)).toBeVisible()
  })

  test('login → dashboard navigation works', async ({ page }) => {
    await loginAsSuperAdmin(page)
    await expect(page).toHaveURL(/\/admin(\/|$)/)
    await expect(page.locator('nav.nav__wrap')).toBeVisible()
  })
})
