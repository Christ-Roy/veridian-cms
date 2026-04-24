/**
 * Test 1 — Login admin. Référence pour tous les autres specs.
 *
 * Patterns obligatoires :
 *  - pas de waitForTimeout
 *  - data-testids sur éléments critiques
 *  - screenshots seulement on failure (config playwright)
 *  - fixtures idempotentes (tenant e2e-<uuid>)
 */
import { test, expect } from '@playwright/test'

test('admin login → dashboard', async ({ page }) => {
  await page.goto('/admin/login')
  await expect(page).toHaveTitle(/Veridian CMS/)

  // Page de login visible (white-label Veridian)
  await expect(page.getByText(/Bienvenue sur votre espace de gestion Veridian/i)).toBeVisible()

  // TODO session prochaine : saisir creds + login + vérif dashboard
  // await page.getByLabel('E-mail').fill(process.env.E2E_ADMIN_EMAIL!)
  // await page.getByLabel('Mot de passe').fill(process.env.E2E_ADMIN_PASSWORD!)
  // await page.getByRole('button', { name: /Connexion/i }).click()
  // await expect(page.getByText(/Bonjour/)).toBeVisible() // BeforeDashboard
})

test('admin login page pixel-perfect', async ({ page }) => {
  await page.goto('/admin/login')
  await page.waitForLoadState('networkidle')
  // Screenshot visuel du login — détecte toute régression CSS
  await expect(page).toHaveScreenshot('login.png', {
    maxDiffPixelRatio: 0.02,
    fullPage: true,
  })
})
