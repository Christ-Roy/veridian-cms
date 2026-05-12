'use client'

/**
 * MediaGrid — vignettes en grille au-dessus de la table standard de la
 * collection `media`.
 *
 * Choix d'implémentation (Sprint 1 — section 2.1 de CMS-DIDIER-READY-TODO.md) :
 * Option B = `admin.components.beforeListTable`. On laisse la table native
 * Payload (recherche par alt, filtres, pagination, sélection multiple,
 * comportement drawer click→select) **intacte** et on rajoute simplement
 * une bande de vignettes au-dessus pour que Didier voie ses images.
 *
 * Pourquoi pas un full custom view :
 * - Re-implémenter pagination + filtres + bulk select coûte > 2h et duplique
 *   du code Payload qui marche déjà.
 * - Le drawer "Choisir parmi les existants" rend `beforeListTable`. La
 *   grille apparaît donc aussi dans le drawer, qui était le vrai blocker
 *   pour Didier.
 *
 * Comportement :
 * - On lit `useListQuery()` pour récupérer la query courante (search,
 *   filtres, sort, page) → on l'utilise pour fetcher /api/media et afficher
 *   les vignettes correspondant à la page courante.
 * - Le plugin multi-tenant filtre `/api/media` automatiquement côté serveur
 *   selon le tenant du user → on ne refiltre pas côté client.
 * - Click sur une vignette dans un drawer (`isInDrawer === true`) →
 *   `onSelect({ collectionSlug, doc, docID })` qui lie le média au champ et
 *   ferme le drawer.
 * - Click sur une vignette hors drawer → navigue vers la page d'édition
 *   `/admin/collections/media/{id}` (comportement standard list view).
 * - Images en `loading="lazy"` pour ne pas downloader les 253 médias d'un coup.
 */

import React from 'react'
import { useListQuery, useListDrawerContext, useConfig } from '@payloadcms/ui'
import type { ListViewSlotSharedClientProps } from 'payload'

type MediaDoc = {
  id: number | string
  alt?: string | null
  filename?: string | null
  mimeType?: string | null
  url?: string | null
  sizes?: {
    thumbnail?: { url?: string | null } | null
    card?: { url?: string | null } | null
  } | null
}

function pickThumb(doc: MediaDoc): string | null {
  return (
    doc.sizes?.thumbnail?.url || doc.sizes?.card?.url || doc.url || null
  )
}

function isImage(doc: MediaDoc): boolean {
  if (doc.mimeType) return doc.mimeType.startsWith('image/')
  if (doc.filename) return /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(doc.filename)
  return false
}

export const MediaGrid: React.FC<ListViewSlotSharedClientProps> = (props) => {
  const { collectionSlug } = props
  const listQuery = useListQuery()
  const drawerContext = useListDrawerContext()
  const config = useConfig()

  // L'API REST est servie sous `${serverURL}${routes.api}` (ex. `/api`).
  // useConfig renvoie le client config sanitized — `routes.api` est par défaut '/api'.
  const apiBase = React.useMemo(() => {
    const clientConfig = (config as { config?: { routes?: { api?: string }; serverURL?: string } }).config
    const api = clientConfig?.routes?.api ?? '/api'
    const serverURL = clientConfig?.serverURL ?? ''
    return `${serverURL}${api}`
  }, [config])

  const query = listQuery?.query
  const [docs, setDocs] = React.useState<MediaDoc[] | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // On (re)fetch quand la query change (search, page, filtres, sort).
  // Idéalement on lirait `listQuery.data?.docs` directement, mais ce data ne
  // contient pas les `sizes.thumbnail.url` peuplés — Payload renvoie au
  // depth de la list view. On refait donc un GET dédié avec depth=1 + un
  // select restreint pour ne pas re-tirer tout le doc.
  React.useEffect(() => {
    if (!query) return
    let cancelled = false
    setLoading(true)
    setError(null)

    const params = new URLSearchParams()
    params.set('depth', '1')
    params.set('limit', String(query.limit ?? 20))
    params.set('page', String(query.page ?? 1))
    if (query.sort) params.set('sort', String(query.sort))
    if (query.search) params.set('search', String(query.search))
    // `where` peut être un objet imbriqué — on le serialize façon Payload
    // (recursive bracket notation). Pour Sprint 1 on saute si trop complexe,
    // la grille restera cohérente avec la pagination simple.
    if (query.where && typeof query.where === 'object') {
      try {
        flattenWhere(query.where as Record<string, unknown>, 'where', params)
      } catch {
        // si on ne sait pas serializer, on laisse la grille montrer la
        // page courante sans le filtre — la table en dessous, elle, filtre
        // toujours. Pas dramatique.
      }
    }

    fetch(`${apiBase}/${collectionSlug}?${params.toString()}`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
        return r.json() as Promise<{ docs: MediaDoc[] }>
      })
      .then((json) => {
        if (cancelled) return
        setDocs(json.docs ?? [])
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Erreur de chargement')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [apiBase, collectionSlug, query])

  const isInDrawer = drawerContext?.isInDrawer ?? false

  const handleClick = React.useCallback(
    (doc: MediaDoc) => {
      if (isInDrawer && drawerContext?.onSelect) {
        drawerContext.onSelect({
          collectionSlug: collectionSlug as never,
          doc: doc as never,
          docID: String(doc.id),
        })
        return
      }
      // Hors drawer : navigation classique vers l'édition.
      window.location.href = `/admin/collections/${collectionSlug}/${doc.id}`
    },
    [collectionSlug, drawerContext, isInDrawer],
  )

  // Si on n'a rien fetché encore (ou query absente), on ne rend rien — la
  // table native gère son skeleton elle-même, pas la peine de doubler.
  if (!docs && !loading && !error) return null

  return (
    <div className="veridian-media-grid">
      <div className="veridian-media-grid__header">
        <span className="veridian-media-grid__title">
          {isInDrawer
            ? 'Cliquez sur une vignette pour la sélectionner'
            : 'Aperçu visuel des médias (cliquez pour éditer)'}
        </span>
        {loading && <span className="veridian-media-grid__loading">Chargement…</span>}
      </div>
      {error && (
        <div className="veridian-media-grid__error">
          Impossible de charger les vignettes : {error}
        </div>
      )}
      {docs && docs.length === 0 && !loading && (
        <div className="veridian-media-grid__empty">
          Aucun média ne correspond aux filtres actuels.
        </div>
      )}
      {docs && docs.length > 0 && (
        <ul className="veridian-media-grid__list">
          {docs.map((doc) => {
            const thumb = pickThumb(doc)
            const showImage = isImage(doc) && thumb
            return (
              <li key={doc.id} className="veridian-media-grid__item">
                <button
                  type="button"
                  className="veridian-media-grid__card"
                  onClick={() => handleClick(doc)}
                  title={doc.alt || doc.filename || `#${doc.id}`}
                >
                  <div className="veridian-media-grid__thumb">
                    {showImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt={doc.alt || doc.filename || ''}
                        loading="lazy"
                      />
                    ) : (
                      <span className="veridian-media-grid__placeholder">
                        {doc.filename?.split('.').pop()?.toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  <div className="veridian-media-grid__label">
                    {doc.alt || doc.filename || `Média #${doc.id}`}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/**
 * Convertit récursivement un objet `where` Payload en bracket-params pour
 * l'URL `?where[alt][equals]=foo`. Implémentation minimale qui couvre
 * `{ field: { operator: value } }` et imbrications.
 */
function flattenWhere(
  obj: Record<string, unknown>,
  prefix: string,
  out: URLSearchParams,
): void {
  for (const [key, value] of Object.entries(obj)) {
    const next = `${prefix}[${key}]`
    if (value === null || value === undefined) continue
    if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (v && typeof v === 'object') {
          flattenWhere(v as Record<string, unknown>, `${next}[${i}]`, out)
        } else {
          out.append(`${next}[${i}]`, String(v))
        }
      })
    } else if (typeof value === 'object') {
      flattenWhere(value as Record<string, unknown>, next, out)
    } else {
      out.set(next, String(value))
    }
  }
}

export default MediaGrid
