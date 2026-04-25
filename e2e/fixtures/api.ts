import { request } from '@playwright/test'

const CMS_URL = process.env.CMS_URL || 'http://localhost:3001'
const ADMIN_KEY = process.env.CMS_ADMIN_API_KEY || ''

export type Tenant = { id: number; slug: string; name: string }
export type User = { id: number; email: string }

function authHeaders() {
  if (!ADMIN_KEY) throw new Error('CMS_ADMIN_API_KEY manquante')
  return {
    'Content-Type': 'application/json',
    Authorization: `users API-Key ${ADMIN_KEY}`,
  }
}

async function ctx() {
  return request.newContext({ baseURL: CMS_URL, extraHTTPHeaders: authHeaders() })
}

export async function createTenant(slug: string, name: string): Promise<Tenant> {
  const api = await ctx()
  const r = await api.post('/api/tenants', { data: { slug, name } })
  if (!r.ok()) throw new Error(`POST /api/tenants ${r.status()} ${await r.text()}`)
  const json = await r.json()
  return { id: json.doc.id, slug: json.doc.slug, name: json.doc.name }
}

export async function deleteTenant(id: number): Promise<void> {
  const api = await ctx()
  await api.delete(`/api/tenants/${id}`).catch(() => {})
}

export async function createUser(email: string, password: string, tenantIds: number[] = [], roles: string[] = []): Promise<User> {
  const api = await ctx()
  const r = await api.post('/api/users', {
    data: {
      email,
      password,
      roles,
      tenants: tenantIds.map((id) => ({ tenant: id, roles: ['tenant-admin'] })),
    },
  })
  if (!r.ok()) throw new Error(`POST /api/users ${r.status()} ${await r.text()}`)
  const json = await r.json()
  return { id: json.doc.id, email: json.doc.email }
}

export async function deleteUser(id: number): Promise<void> {
  const api = await ctx()
  await api.delete(`/api/users/${id}`).catch(() => {})
}

export async function findPagesByTenant(apiKey: string, tenantId: number): Promise<unknown[]> {
  const api = await request.newContext({
    baseURL: CMS_URL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      Authorization: `users API-Key ${apiKey}`,
    },
  })
  const r = await api.get(`/api/pages?where[tenant][equals]=${tenantId}`)
  if (!r.ok()) return []
  const json = await r.json()
  return json.docs || []
}
