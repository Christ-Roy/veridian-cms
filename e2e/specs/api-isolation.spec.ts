import { test, expect } from '@playwright/test'
import crypto from 'node:crypto'
import { createTenant, deleteTenant, createUser, deleteUser, findPagesByTenant } from '../fixtures/api'

test('tenant A api key cannot read tenant B pages', async () => {
  const baseURL = process.env.CMS_URL || 'http://localhost:3001'
  const adminKey = process.env.CMS_ADMIN_API_KEY!

  const tA = await createTenant(`e2e-iso-a-${crypto.randomBytes(3).toString('hex')}`, 'Tenant A')
  const tB = await createTenant(`e2e-iso-b-${crypto.randomBytes(3).toString('hex')}`, 'Tenant B')

  let userAId = 0
  try {
    const passA = crypto.randomBytes(16).toString('hex')
    const userA = await createUser(`e2e-reader-a-${crypto.randomBytes(3).toString('hex')}@veridian.site`, passA, [tA.id])
    userAId = userA.id

    const r = await fetch(`${baseURL}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userA.email, password: passA }),
    })
    expect(r.ok).toBe(true)
    const { token } = await r.json()

    const pageRes = await fetch(`${baseURL}/api/pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `users API-Key ${adminKey}` },
      body: JSON.stringify({ title: 'Secret B', slug: 'secret-b', tenant: tB.id, _status: 'published' }),
    })
    expect(pageRes.ok).toBe(true)

    const ownPagesRes = await fetch(`${baseURL}/api/pages?where[tenant][equals]=${tA.id}`, {
      headers: { Authorization: `JWT ${token}` },
    })
    expect(ownPagesRes.ok).toBe(true)

    const crossRes = await fetch(`${baseURL}/api/pages?where[tenant][equals]=${tB.id}`, {
      headers: { Authorization: `JWT ${token}` },
    })
    const crossJson = await crossRes.json()
    const docs = crossJson.docs || []
    expect(docs.length).toBe(0)
  } finally {
    if (userAId) await deleteUser(userAId)
    await deleteTenant(tA.id)
    await deleteTenant(tB.id)
  }
})
