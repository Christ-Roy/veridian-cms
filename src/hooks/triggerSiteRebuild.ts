import type { CollectionAfterChangeHook, GlobalAfterChangeHook } from 'payload'

/**
 * Trigger un rebuild du site quand une page (ou un global header/footer) est
 * modifiée.
 *
 * Deux modes :
 *   1. Si `tenant.cfDeployHook` est renseigné → POST direct sur ce hook
 *      (= Deploy Hook Cloudflare Pages, pas de GitHub Actions intermédiaire).
 *      Utilisé par les sites déployés en direct GitHub→CF Pages (ex AVSE).
 *
 *   2. Sinon → workflow_dispatch GitHub Actions (`sites-deploy.yml`) avec
 *      `inputs.site = tenant.cfPagesProject`. Utilisé par les sites du
 *      monorepo veridian-platform.
 *
 * Si aucun des deux n'est configuré, on log et on skip silencieusement.
 *
 * Anti-spam : si plusieurs saves en moins de 10s, on debounce — un seul
 * rebuild est lancé.
 */

const recentRebuilds = new Map<string, number>()
const DEBOUNCE_MS = 10_000

function shouldDebounce(key: string): boolean {
  const now = Date.now()
  const last = recentRebuilds.get(key) ?? 0
  if (now - last < DEBOUNCE_MS) return true
  recentRebuilds.set(key, now)
  // Cleanup occasionnel
  if (recentRebuilds.size > 100) {
    for (const [k, t] of recentRebuilds) {
      if (now - t > 60_000) recentRebuilds.delete(k)
    }
  }
  return false
}

async function triggerForTenant(
  tenant: { id?: number | string; slug?: string; cfDeployHook?: string | null; cfPagesProject?: string | null } | null,
  logger: { info: (msg: string) => void; warn: (msg: string) => void; error: (...args: unknown[]) => void },
): Promise<void> {
  if (!tenant) {
    logger.warn('[triggerSiteRebuild] tenant non populé, skip')
    return
  }

  const tenantKey = String(tenant.id ?? tenant.slug ?? 'unknown')
  if (shouldDebounce(tenantKey)) {
    logger.info(`[triggerSiteRebuild] debounced (rebuild récent pour ${tenantKey})`)
    return
  }

  // 1) Mode CF Pages Deploy Hook direct
  if (tenant.cfDeployHook) {
    try {
      const res = await fetch(tenant.cfDeployHook, { method: 'POST' })
      if (res.ok) {
        logger.info(`[triggerSiteRebuild] CF deploy hook → ${tenant.slug}`)
      } else {
        const text = await res.text()
        logger.error(`[triggerSiteRebuild] CF hook ${res.status} ${text}`)
      }
    } catch (err) {
      logger.error({ err }, '[triggerSiteRebuild] CF hook fetch failed')
    }
    return
  }

  // 2) Mode GitHub Actions workflow_dispatch (legacy monorepo)
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPO
  const workflow = process.env.GITHUB_WORKFLOW || 'sites-deploy.yml'

  if (!token || !repo) {
    logger.info(
      `[triggerSiteRebuild] tenant ${tenant.slug}: aucun cfDeployHook ni GITHUB_TOKEN/REPO, skip`,
    )
    return
  }

  const site: string = tenant.cfPagesProject || (tenant.slug ? `template-${tenant.slug}` : '')
  if (!site) {
    logger.warn('[triggerSiteRebuild] aucun cfPagesProject ni slug, skip')
    return
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
      logger.info(`[triggerSiteRebuild] GitHub Actions → ${site}`)
    } else {
      const text = await res.text()
      logger.error(`[triggerSiteRebuild] GH ${res.status} ${text}`)
    }
  } catch (err) {
    logger.error({ err }, '[triggerSiteRebuild] GH fetch failed')
  }
}

/**
 * Hook pour collections qui peuvent ou non avoir des drafts.
 * Si la collection utilise des drafts (Pages), `_status` doit être 'published'.
 * Si pas de drafts (Header, Footer), on déclenche systématiquement.
 */
export const triggerSiteRebuild: CollectionAfterChangeHook = async ({ doc, req }) => {
  if (typeof doc._status !== 'undefined' && doc._status !== 'published') return doc

  let tenant = typeof doc.tenant === 'object' ? doc.tenant : null

  // Si tenant est juste un id, le re-fetch pour récupérer cfDeployHook
  if (!tenant && (typeof doc.tenant === 'number' || typeof doc.tenant === 'string')) {
    try {
      tenant = await req.payload.findByID({
        collection: 'tenants',
        id: doc.tenant,
        req,
      })
    } catch {
      tenant = null
    }
  }

  await triggerForTenant(tenant as Parameters<typeof triggerForTenant>[0], req.payload.logger)
  return doc
}

/** Hook pour les globals Header/Footer — eux n'ont pas de _status. */
export const triggerSiteRebuildGlobal: GlobalAfterChangeHook = async ({ doc, req }) => {
  let tenant = typeof doc.tenant === 'object' ? doc.tenant : null
  if (!tenant && (typeof doc.tenant === 'number' || typeof doc.tenant === 'string')) {
    try {
      tenant = await req.payload.findByID({
        collection: 'tenants',
        id: doc.tenant,
        req,
      })
    } catch {
      tenant = null
    }
  }
  await triggerForTenant(tenant as Parameters<typeof triggerForTenant>[0], req.payload.logger)
  return doc
}
