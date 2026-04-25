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

  test('login page pixel-perfect', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.getByText(/Bienvenue sur votre espace de gestion Veridian/i)).toBeVisible()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('login.png', {
      maxDiffPixelRatio: 0.02,
      fullPage: true,
      animations: 'disabled',
    })
  })

  test('dashboard pixel-perfect', async ({ page }) => {
    await loginAsSuperAdmin(page)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('dashboard.png', {
      maxDiffPixelRatio: 0.02,
      fullPage: true,
      animations: 'disabled',
      mask: [
        page.locator('time, [data-time], [class*="updatedAt"], [class*="createdAt"]'),
        page.locator('[data-testid="last-updated"]'),
      ],
    })
  })
})
