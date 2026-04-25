import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const STATE_FILE = path.join(process.cwd(), '.e2e-state.json')

export function getAdminCreds(): { email: string; password: string } {
  if (!fs.existsSync(STATE_FILE)) throw new Error('.e2e-state.json absent — global-setup a foiré')
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'))
}

export async function loginAsSuperAdmin(page: Page): Promise<void> {
  const { email, password } = getAdminCreds()
  await page.goto('/admin/login')
  await page.locator('input#field-email').fill(email)
  await page.locator('input#field-password').fill(password)
  await page.getByRole('button', { name: /Se connecter|Login/i }).click()
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 30_000 })
  await expect(page.locator('nav.nav__wrap')).toBeVisible({ timeout: 15_000 })
}
