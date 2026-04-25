import { test, expect } from '../fixtures/tenant'

test('create form via API → form retrievable with fields', async ({ tenant }) => {
  const baseURL = process.env.CMS_URL || 'http://localhost:3001'
  const adminKey = process.env.CMS_ADMIN_API_KEY!

  const formTitle = `Contact ${Date.now()}`
  const created = await fetch(`${baseURL}/api/forms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `users API-Key ${adminKey}` },
    body: JSON.stringify({
      title: formTitle,
      tenant: tenant.id,
      fields: [
        { blockType: 'text', name: 'name', label: 'Nom', required: true, width: 100 },
        { blockType: 'email', name: 'email', label: 'Email', required: true, width: 100 },
        { blockType: 'textarea', name: 'message', label: 'Message', required: false, width: 100 },
      ],
      submitButtonLabel: 'Envoyer',
      confirmationType: 'message',
      confirmationMessage: { root: { type: 'root', children: [{ type: 'paragraph', children: [{ text: 'Merci !' }] }] } },
    }),
  })
  expect(created.ok).toBe(true)
  const { doc } = await created.json()
  const formId = doc.id

  const fetched = await fetch(`${baseURL}/api/forms/${formId}`, {
    headers: { Authorization: `users API-Key ${adminKey}` },
  })
  expect(fetched.ok).toBe(true)
  const json = await fetched.json()

  expect(json.title).toBe(formTitle)
  expect(json.fields).toHaveLength(3)
  expect(json.fields.map((f: { name: string }) => f.name)).toEqual(['name', 'email', 'message'])

  const submission = await fetch(`${baseURL}/api/form-submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `users API-Key ${adminKey}` },
    body: JSON.stringify({
      form: formId,
      tenant: tenant.id,
      submissionData: [
        { field: 'name', value: 'Test User' },
        { field: 'email', value: 'test@example.com' },
        { field: 'message', value: 'Hello E2E' },
      ],
    }),
  })
  expect(submission.ok).toBe(true)
})
