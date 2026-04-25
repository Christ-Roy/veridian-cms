import type { FullConfig } from '@playwright/test'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const CMS_URL = process.env.CMS_URL || 'http://localhost:3001'
const ADMIN_KEY = process.env.CMS_ADMIN_API_KEY || ''
const STATE_FILE = path.join(process.cwd(), '.e2e-state.json')

async function waitForHealth(timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  let lastErr: unknown
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${CMS_URL}/api/health`)
      if (r.ok) {
        const j = await r.json()
        if (j.status === 'ok') return
      }
      lastErr = new Error(`status=${r.status}`)
    } catch (e) {
      lastErr = e
    }
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error(`CMS ${CMS_URL} pas sain après ${timeoutMs}ms (last=${String(lastErr)})`)
}

async function ensureSuperAdmin(): Promise<{ email: string; password: string }> {
  const email = `e2e-super-${crypto.randomBytes(4).toString('hex')}@veridian.site`
  const password = process.env.CMS_E2E_ADMIN_PASSWORD || crypto.randomBytes(16).toString('hex')

  const r = await fetch(`${CMS_URL}/api/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `users API-Key ${ADMIN_KEY}`,
    },
    body: JSON.stringify({ email, password, roles: ['super-admin'] }),
  })
  if (!r.ok) throw new Error(`Création super-admin E2E échouée: ${r.status} ${await r.text()}`)
  return { email, password }
}

export default async function globalSetup(_config: FullConfig) {
  if (!ADMIN_KEY) throw new Error('CMS_ADMIN_API_KEY manquante — abort E2E')
  await waitForHealth()
  const admin = await ensureSuperAdmin()
  fs.writeFileSync(STATE_FILE, JSON.stringify(admin), { mode: 0o600 })
}
