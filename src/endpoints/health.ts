import type { Endpoint } from 'payload'

export const healthEndpoint: Endpoint = {
  path: '/health',
  method: 'get',
  handler: async (req) => {
    try {
      const t = await req.payload.count({ collection: 'tenants', overrideAccess: true })
      return Response.json({ status: 'ok', tenants: t.totalDocs })
    } catch {
      return Response.json({ status: 'error' }, { status: 500 })
    }
  },
}
