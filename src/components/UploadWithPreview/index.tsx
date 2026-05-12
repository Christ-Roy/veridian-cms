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
 * `value` shape:
 *   - undefined / null  → no media linked yet, no preview
 *   - number / string   → just the ID (depth=0 fetch). We can't preview that
 *                         without an extra fetch; show a small placeholder
 *                         "Aperçu non disponible" instead of being silent.
 *   - { id, url, sizes } → populated media doc; pick the thumbnail size if
 *                          available, fall back to full url.
 */

type MediaDoc = {
  id?: number | string
  url?: string | null
  filename?: string | null
  mimeType?: string | null
  sizes?: {
    thumbnail?: { url?: string | null } | null
    card?: { url?: string | null } | null
  } | null
}

function pickPreviewUrl(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const doc = value as MediaDoc
  return doc.sizes?.thumbnail?.url || doc.sizes?.card?.url || doc.url || null
}

export const UploadWithPreview: React.FC<UploadFieldClientProps> = (props) => {
  const { value } = useField<unknown>({ path: props.path })
  const previewUrl = pickPreviewUrl(value)
  const hasIdOnly =
    !previewUrl &&
    (typeof value === 'number' || typeof value === 'string') &&
    value !== ''

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
      ) : hasIdOnly ? (
        <div className="veridian-upload-with-preview__thumb veridian-upload-with-preview__thumb--placeholder">
          <span>Aperçu indisponible</span>
        </div>
      ) : null}
    </div>
  )
}

export default UploadWithPreview
