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
 * Payload's import map injects all `UploadFieldClientProps` (path, schemaPath,
 * field config, etc.) — we forward them as-is to UploadField, then read the
 * value via `useField` to render the preview.
 *
 * `value` shape from useField for an upload field is the media ID (number or
 * string), not the populated doc. We fetch the doc by ID to read the
 * thumbnail URL. The fetch is keyed on the id + the field's collection so
 * switching media re-fetches.
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
  const { value } = useField<unknown>({ path: props.path })
  const collection = resolveCollection(props)
  const id = extractId(value)
  const inline = inlinePopulatedDoc(value)

  const [fetched, setFetched] = React.useState<MediaDoc | null>(null)
  const [fetching, setFetching] = React.useState(false)

  React.useEffect(() => {
    if (inline || id === null) {
      setFetched(null)
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

  return (
    <div className="veridian-upload-with-preview">
      <div className="veridian-upload-with-preview__field">
        <UploadField {...props} />
      </div>
      {previewUrl ? (
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
      ) : fetching && id !== null ? (
        <div className="veridian-upload-with-preview__thumb veridian-upload-with-preview__thumb--placeholder">
          <span>Chargement…</span>
        </div>
      ) : null}
    </div>
  )
}

export default UploadWithPreview
