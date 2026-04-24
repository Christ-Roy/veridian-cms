import type { CollectionAfterChangeHook } from 'payload'

/**
 * Hook afterChange sur Pages : trigger un rebuild CF Pages via GitHub Actions
 * workflow_dispatch dès qu'une page est publiée (status=published).
 *
 * Exige les env vars :
 *   - GITHUB_TOKEN : PAT avec scope repo (workflow_dispatch)
 *   - GITHUB_REPO : ex "Christ-Roy/veridian-platform"
 *   - GITHUB_WORKFLOW : ex "sites-deploy.yml"
 *
 * Le tenant.slug est mappé sur le nom du site (convention : tenant-slug == site name,
 * sauf "demo" → "demo-cms").
 */
export const triggerSiteRebuild: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPO
  const workflow = process.env.GITHUB_WORKFLOW || 'sites-deploy.yml'

  if (!token || !repo) {
    req.payload.logger.info('[triggerSiteRebuild] GITHUB_TOKEN/REPO absent, skip')
    return doc
  }

  // Ne rebuild que sur publish (status passe à 'published') ou update de doc déjà publié
  if (doc._status !== 'published') {
    return doc
  }
  if (operation === 'update' && previousDoc?._status !== 'published' && doc._status === 'published') {
    // first publish — on rebuild
  }

  const tenantId =
    typeof doc.tenant === 'object' && doc.tenant?.slug
      ? doc.tenant.slug
      : null

  if (!tenantId) {
    req.payload.logger.warn('[triggerSiteRebuild] tenant.slug introuvable, skip')
    return doc
  }

  const siteMap: Record<string, string> = {
    demo: 'demo-cms',
    artisan: 'template-artisan',
    restaurant: 'template-restaurant',
  }
  const site = siteMap[tenantId] || `template-${tenantId}`

  try {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({ ref: 'main', inputs: { site } }),
      },
    )
    if (res.ok) {
      req.payload.logger.info(`[triggerSiteRebuild] ✅ rebuild déclenché pour ${site}`)
    } else {
      const text = await res.text()
      req.payload.logger.error(`[triggerSiteRebuild] ❌ ${res.status} ${text}`)
    }
  } catch (err) {
    req.payload.logger.error({ err }, '[triggerSiteRebuild] fetch failed')
  }

  return doc
}
