/**
 * Playwright config CMS — anti-flaky en priorité.
 * À finaliser en session prochaine (cf cms/docs/NEXT-SESSION-ROADMAP.md §Phase 3).
 */
import { defineConfig, devices } from '@playwright/test'

const isCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0, // anti-flaky réseau
  workers: isCI ? 4 : undefined,
  reporter: isCI
    ? [['html', { outputFolder: 'playwright-report', open: 'never' }], ['github']]
    : 'list',
  use: {
    baseURL: process.env.CMS_URL || 'https://cms.staging.veridian.site',
    trace: 'on-first-retry', // pas de trace sur le happy path (cher à stocker)
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Headful par défaut même en CI (via xvfb) — permet de vrais tests pixel-perfect
    // et d'attraper des bugs CSS invisibles en headless.
    headless: false,
    viewport: { width: 1440, height: 900 },
    // Timeouts généreux car on passe par internet + CMS peut lag
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02, // 2% tolérance anti-aliasing fonts
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Firefox + WebKit à ajouter session prochaine si besoin cross-browser
  ],
  globalSetup: './global-setup.ts',
})
