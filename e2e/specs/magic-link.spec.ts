import { test, expect } from '@playwright/test'
import crypto from 'node:crypto'

test('forgot password flow generates a reset token via Payload', async () => {
  const baseURL = process.env.CMS_URL || 'http://localhost:3001'
  const adminKey = process.env.CMS_ADMIN_API_KEY!

  const email = `e2e-magic-${crypto.randomBytes(4).toString('hex')}@veridian.site`
  const password = crypto.randomBytes(16).toString('hex')

  const u = await fetch(`${baseURL}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `users API-Key ${adminKey}` },
    body: JSON.stringify({ email, password, roles: ['client'] }),
  })
  expect(u.ok).toBe(true)
  const userId = (await u.json()).doc.id

  try {
    const forgot = await fetch(`${baseURL}/api/users/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    expect(forgot.ok).toBe(true)

    const lookup = await fetch(`${baseURL}/api/users/${userId}`, {
      headers: { Authorization: `users API-Key ${adminKey}` },
    })
    expect(lookup.ok).toBe(true)
    const userJson = await lookup.json()
    expect(userJson.email).toBe(email)
  } finally {
    await fetch(`${baseURL}/api/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `users API-Key ${adminKey}` },
    }).catch(() => {})
  }
})
