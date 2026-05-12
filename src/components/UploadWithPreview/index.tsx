'use client'
import React from 'react'
import { UploadField, useField } from '@payloadcms/ui'
import type { UploadFieldClientProps } from 'payload'

/**
 * Wrap the native UploadField and show a 150×100 thumbnail of the currently
 * linked media to the right. Without this, the editor only sees "Choose a
 * media" with no visual cue about what's already selected — so Didier had to
 * open a drawer + guess.
 *
 * `value` shape from useField for an upload field is the media ID (number or
 * string), not the populated doc. We fetch the doc by ID to read the
 * thumbnail URL.
 *
 * Sprint 1 (2026-05-12) — UX upgrades:
 * - Big "Remplacer cette image" button under the thumbnail that clears the
 *   value programmatically. Native Payload UI only exposes 16×16 icons (✕)
 *   which Didier could not find.
 * - Reset preview *immediately* on id change (before fetch lands) to kill
 *   stale thumbnails when navigating product A → product B.
 * - Drag & drop overlay on the wrapper: drop a file anywhere on the field
 *   row, we POST to `/api/<rel>?file=...` and link the new id.
 */

type MediaDoc = {
  id?: number | string
  url?: string | null
  filename?: string | null
  sizes?: {
    thumbnail?: { url?: string | null } | null
    card?: { url?: string | null } | null
  } | null
}

function pickPreviewUrl(doc: MediaDoc | null): string | null {
  if (!doc) return null
  return doc.sizes?.thumbnail?.url || doc.sizes?.card?.url || doc.url || null
}

// Tolerate both `value = 12` and `value = { id: 12, ... }` (Payload depth>=1).
function extractId(value: unknown): string | number | null {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '') return value
  if (value && typeof value === 'object') {
    const id = (value as { id?: unknown }).id
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return null
}

function inlinePopulatedDoc(value: unknown): MediaDoc | null {
  if (!value || typeof value !== 'object') return null
  const v = value as MediaDoc
  if (v.url || v.sizes) return v
  return null
}

// upload fields almost always relate to a single collection — Payload's
// relationTo is `string` here. Default to 'media' for any odd config.
function resolveCollection(props: UploadFieldClientProps): string {
  const field = (props as { field?: { relationTo?: string | string[] } }).field
  const rt = field?.relationTo
  if (typeof rt === 'string') return rt
  if (Array.isArray(rt) && rt.length) return rt[0]
  return 'media'
}

export const UploadWithPreview: React.FC<UploadFieldClientProps> = (props) => {
  const { value, setValue } = useField<unknown>({ path: props.path })
  const collection = resolveCollection(props)
  const id = extractId(value)
  const inline = inlinePopulatedDoc(value)

  const [fetched, setFetched] = React.useState<MediaDoc | null>(null)
  const [fetching, setFetching] = React.useState(false)
  const [isDragging, setIsDragging] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const dragCounter = React.useRef(0)

  React.useEffect(() => {
    // Reset the stale preview immediately on id change — before the fetch
    // resolves. Without this, navigating product A (id=12) → product B (no
    // image) flashes A's thumbnail for ~200ms while the fetch returns null.
    setFetched(null)
    if (inline || id === null) {
      return
    }
    let cancelled = false
    setFetching(true)
    fetch(`/api/${collection}/${id}?depth=0`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((doc: MediaDoc | null) => {
        if (!cancelled) setFetched(doc)
      })
      .catch(() => {
        if (!cancelled) setFetched(null)
      })
      .finally(() => {
        if (!cancelled) setFetching(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, collection, inline])

  const previewUrl = pickPreviewUrl(inline ?? fetched)
  const hasImage = previewUrl !== null

  const handleReplace = React.useCallback(() => {
    // Clear value → Payload re-renders the field with native
    // "Créer un(e) nouveau" / "Choisir parmi les existants" buttons, which
    // is the right place to pick a new image. We just make that path one
    // click away with a visible button.
    setValue(null)
  }, [setValue])

  const uploadFile = React.useCallback(
    async (file: File) => {
      setUploading(true)
      setUploadError(null)
      try {
        const formData = new FormData()
        formData.append('file', file)
        // Default alt to filename so Payload doesn't reject the create
        // (alt is required on Media). Editor can edit it after.
        formData.append(
          '_payload',
          JSON.stringify({ alt: file.name.replace(/\.[^.]+$/, '') }),
        )
        const res = await fetch(`/api/${collection}`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        })
        if (!res.ok) {
          const txt = await res.text().catch(() => '')
          throw new Error(txt || `${res.status} ${res.statusText}`)
        }
        const json = (await res.json()) as { doc?: { id?: number | string } }
        const newId = json?.doc?.id
        if (newId === undefined || newId === null) {
          throw new Error('Upload réussi mais id manquant dans la réponse')
        }
        setValue(newId)
      } catch (err) {
        setUploadError(
          err instanceof Error
            ? err.message
            : 'Erreur inconnue pendant l\'upload',
        )
      } finally {
        setUploading(false)
      }
    },
    [collection, setValue],
  )

  const handleDragEnter = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current += 1
    if (e.dataTransfer?.types?.includes('Files')) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current -= 1
    if (dragCounter.current <= 0) {
      dragCounter.current = 0
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounter.current = 0
      setIsDragging(false)
      const file = e.dataTransfer?.files?.[0]
      if (file) {
        void uploadFile(file)
      }
    },
    [uploadFile],
  )

  return (
    <div
      className={`veridian-upload-with-preview${
        isDragging ? ' veridian-upload-with-preview--dragging' : ''
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="veridian-upload-with-preview__drop-overlay">
          <span>Lâchez pour téléverser</span>
        </div>
      )}
      {uploading && (
        <div className="veridian-upload-with-preview__drop-overlay">
          <span>Téléversement en cours…</span>
        </div>
      )}
      <div className="veridian-upload-with-preview__field">
        <UploadField {...props} />
        {uploadError && (
          <div className="veridian-upload-with-preview__error">
            ⚠️ {uploadError}
          </div>
        )}
      </div>
      {previewUrl ? (
        <div className="veridian-upload-with-preview__preview">
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="veridian-upload-with-preview__thumb"
            title="Ouvrir l'image actuelle dans un nouvel onglet"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Aperçu de l'image actuelle"
              loading="lazy"
            />
          </a>
          <button
            type="button"
            className="veridian-upload-with-preview__replace-btn"
            onClick={handleReplace}
            title="Décrocher l'image actuelle pour en choisir ou téléverser une autre"
          >
            🔄 Remplacer cette image
          </button>
        </div>
      ) : fetching && id !== null ? (
        <div className="veridian-upload-with-preview__thumb veridian-upload-with-preview__thumb--placeholder">
          <span>Chargement…</span>
        </div>
      ) : !hasImage && !uploading ? (
        <div className="veridian-upload-with-preview__hint">
          <span>💡 Astuce : glissez-déposez une image ici</span>
        </div>
      ) : null}
    </div>
  )
}

export default UploadWithPreview
