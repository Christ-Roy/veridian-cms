import type { CollectionAfterChangeHook } from 'payload'

/**
 * Hook afterChange sur Pages : trigger un rebuild CF Pages via GitHub Actions
 * workflow_dispatch dès qu'une page est publiée.
 *
 * Vars d'env requises :
 *   - GITHUB_TOKEN : PAT avec scope repo (workflow_dispatch)
 *   - GITHUB_REPO : ex "Christ-Roy/veridian-platform"
 *   - GITHUB_WORKFLOW : ex "sites-deploy.yml" (optionnel, défaut sites-deploy.yml)
 *
 * Le nom du site dispatché vient du champ `cfPagesProject` du tenant.
 * Si non renseigné, fallback sur `template-${tenant.slug}` (convention legacy).
 */
export const triggerSiteRebuild: CollectionAfterChangeHook = async ({
  doc,
  req,
}) => {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPO
  const workflow = process.env.GITHUB_WORKFLOW || 'sites-deploy.yml'

  if (!token || !repo) {
    req.payload.logger.info('[triggerSiteRebuild] GITHUB_TOKEN/REPO absent, skip')
    return doc
  }

  if (doc._status !== 'published') {
    return doc
  }

  const tenant = typeof doc.tenant === 'object' ? doc.tenant : null
  if (!tenant) {
    req.payload.logger.warn('[triggerSiteRebuild] tenant non populé, skip')
    return doc
  }

  const site: string = tenant.cfPagesProject || (tenant.slug ? `template-${tenant.slug}` : '')
  if (!site) {
    req.payload.logger.warn('[triggerSiteRebuild] aucun cfPagesProject ni slug, skip')
    return doc
  }

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
      req.payload.logger.info(`[triggerSiteRebuild] rebuild déclenché pour ${site}`)
    } else {
      const text = await res.text()
      req.payload.logger.error(`[triggerSiteRebuild] ${res.status} ${text}`)
    }
  } catch (err) {
    req.payload.logger.error({ err }, '[triggerSiteRebuild] fetch failed')
  }

  return doc
}
