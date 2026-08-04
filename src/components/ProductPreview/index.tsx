'use client'
import React, { useEffect, useState } from 'react'
import { useFormFields } from '@payloadcms/ui'

/**
 * ProductPreview — reproduction de la MODAL produit du site AVSE
 * (cf ~/www.avse-monetique.fr/site/src/app/catalogue/CatalogueClient.tsx
 * function ProductModal — ligne 255).
 *
 * Affiche TOUS les champs édités (marque, nom, catégorie, prix, location,
 * caractéristiques) en simulant pixel-juste ce que le client final voit
 * quand il clique sur la card du catalogue.
 *
 * Couleurs AVSE (depuis globals.css du site) :
 *  --primary   #0A2540  bleu nuit
 *  --secondary #0B5FFF  bleu vif marque/CTA
 *  --accent    #00C48C  vert bullets
 *  --surface-alt #EEF3F9 fond image
 *  --border    #E4E9F2
 *  --muted     #54617A
 *  --radius    10px
 */

type MediaDoc = {
  id?: number | string
  url?: string | null
  sizes?: {
    thumbnail?: { url?: string | null }
    card?: { url?: string | null }
  }
}

type DescItem = { text?: string }

const categoryLabels: Record<string, string> = {
  tpe: 'TPE — Terminaux de paiement',
  caisses: 'Caisses tactiles',
  peripheriques: 'Périphériques',
  accessoires: 'Accessoires',
  fournitures: 'Fournitures',
  forfaits: 'Forfaits télécom',
  location: 'Location',
}

const C = {
  primary: '#0A2540',
  secondary: '#0B5FFF',
  accent: '#00C48C',
  surfaceAlt: '#EEF3F9',
  border: '#E4E9F2',
  muted: '#54617A',
  white: '#FFFFFF',
  foreground: '#0A2540',
}
const RADIUS = '10px'

export const ProductPreview: React.FC = () => {
  // useFormFields capture tous les champs édités (re-render à chaque saisie)
  const fields = useFormFields(([fields]) => {
    // description = array → on parcourt les sous-keys description.N.text
    const descKeys = Object.keys(fields).filter((k) => /^description\.\d+\.text$/.test(k))
    const description: string[] = descKeys
      .sort((a, b) => {
        const ai = parseInt(a.match(/\d+/)?.[0] ?? '0', 10)
        const bi = parseInt(b.match(/\d+/)?.[0] ?? '0', 10)
        return ai - bi
      })
      .map((k) => (fields[k]?.value as string | undefined) ?? '')
      .filter((s) => s.trim().length > 0)

    return {
      name: fields.name?.value as string | undefined,
      brand: fields.brand?.value as string | undefined,
      category: fields.category?.value as string | undefined,
      priceHT: fields.priceHT?.value as string | undefined,
      rentMonth: fields.rentMonth?.value as string | undefined,
      image: fields.image?.value as number | string | undefined,
      imageFallbackUrl: fields.imageFallbackUrl?.value as string | undefined,
      status: fields._status?.value as string | undefined,
      description,
    }
  })

  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!fields.image) {
      setImageUrl(null)
      return
    }
    let cancelled = false
    fetch(`/api/media/${fields.image}?depth=0`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((doc: MediaDoc | null) => {
        if (cancelled) return
        // On utilise l'URL originale (doc.url) plutôt que les `sizes` :
        // les sizes Payload sont générées par Sharp avec width+height fixes
        // (cf Media.ts:167-171) = crop physique du fichier au format
        // 400×300 / 768×512. Les produits ont souvent des images paysage
        // (300×158) → bas + côtés coupés en dur dans le fichier.
        // L'original n'est jamais transformé → toujours intact.
        const url = doc?.url || doc?.sizes?.card?.url || doc?.sizes?.thumbnail?.url
        setImageUrl(url ?? null)
      })
      .catch(() => {
        if (!cancelled) setImageUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [fields.image])

  const finalImage = imageUrl || fields.imageFallbackUrl || null
  const catLabel = fields.category ? categoryLabels[fields.category] ?? fields.category : ''
  const isDraft = fields.status !== 'published'

  return (
    <div
      style={{
        marginTop: '0.5rem',
        // Safe zone : marge inférieure pour ne pas chevaucher
        // les autres champs sidebar (ordre d'affichage, réf interne).
        marginBottom: '2rem',
      }}
    >
      {/* Sous-titre admin */}
      <div
        style={{
          fontSize: '0.7rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--theme-elevation-500, #888)',
          marginBottom: '0.5rem',
        }}
      >
        Aperçu fiche produit (modal AVSE)
      </div>

      {/* Wrapper qui simule le backdrop sombre de la modal */}
      <div
        style={{
          padding: '0.85rem',
          background: 'rgba(10, 37, 64, 0.85)', // primary/85 — le backdrop AVSE
          borderRadius: '8px',
          opacity: isDraft ? 0.85 : 1,
        }}
      >
        {/* La modal — rounded-[--global-radius] shadow-2xl bg-white */}
        <div
          style={{
            background: C.white,
            borderRadius: RADIUS,
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            fontFamily:
              'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            position: 'relative',
          }}
        >
          {isDraft && (
            <div
              style={{
                position: 'absolute',
                top: '0.6rem',
                left: '0.6rem',
                padding: '3px 9px',
                borderRadius: '4px',
                background: '#FEF3C7',
                color: '#92400E',
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                zIndex: 2,
                textTransform: 'uppercase',
              }}
            >
              Brouillon — non publié
            </div>
          )}

          {/* Bouton X close cosmétique (juste visuel) */}
          <div
            style={{
              position: 'absolute',
              top: '0.6rem',
              right: '0.6rem',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: C.surfaceAlt,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem',
              color: C.primary,
              fontWeight: 400,
              zIndex: 2,
              cursor: 'default',
            }}
          >
            ×
          </div>

          {/* Image — bg-surface-alt p-8 aspect-square object-contain.
             Pixel-juste avec la modal AVSE :
              <div class="aspect-square bg-surface-alt flex items-center justify-center p-8">
                <img class="max-w-full max-h-[400px] object-contain" />
             On garde le ratio carré pour rester fidèle. L'image utilise
             max-width/max-height: 100% pour s'intégrer dans le carré sans
             débordement quel que soit son ratio natif. */}
          <div
            style={{
              aspectRatio: '1 / 1',
              background: C.surfaceAlt,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.25rem',
              overflow: 'hidden',
            }}
          >
            {finalImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={finalImage}
                alt={fields.name ?? ''}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            ) : (
              <span style={{ color: C.muted, fontSize: '0.85rem' }}>Pas d&apos;image</span>
            )}
          </div>

          {/* Détails — p-6 */}
          <div
            style={{
              padding: '1rem 1.1rem 1.25rem',
            }}
          >
            {/* Marque + nom + catégorie */}
            <div>
              {fields.brand && (
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: C.secondary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {fields.brand}
                </p>
              )}
              <h2
                style={{
                  margin: '0.25rem 0 0 0',
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  color: C.primary,
                  lineHeight: 1.25,
                }}
              >
                {fields.name || (
                  <span style={{ color: C.muted, fontStyle: 'italic', fontWeight: 400 }}>
                    Nom du produit…
                  </span>
                )}
              </h2>
              {catLabel && (
                <p
                  style={{
                    margin: '0.3rem 0 0 0',
                    fontSize: '0.8rem',
                    color: C.muted,
                  }}
                >
                  {catLabel}
                </p>
              )}
            </div>

            {/* Prix / Location — flex border-y border-border */}
            {(fields.priceHT || fields.rentMonth) && (
              <div
                style={{
                  marginTop: '0.85rem',
                  padding: '0.65rem 0',
                  borderTop: `1px solid ${C.border}`,
                  borderBottom: `1px solid ${C.border}`,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  alignItems: 'flex-end',
                }}
              >
                {fields.priceHT && (
                  <div>
                    <p style={{ margin: 0, fontSize: '0.65rem', color: C.muted }}>Prix de vente</p>
                    <p
                      style={{
                        margin: '2px 0 0 0',
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: C.primary,
                        lineHeight: 1.15,
                      }}
                    >
                      {fields.priceHT}
                    </p>
                  </div>
                )}
                {fields.rentMonth && (
                  <div
                    style={{
                      paddingLeft: fields.priceHT ? '0.75rem' : 0,
                      borderLeft: fields.priceHT ? `1px solid ${C.border}` : 'none',
                    }}
                  >
                    <p style={{ margin: 0, fontSize: '0.65rem', color: C.muted }}>Location</p>
                    <p
                      style={{
                        margin: '2px 0 0 0',
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: C.secondary,
                        lineHeight: 1.15,
                      }}
                    >
                      {fields.rentMonth}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Caractéristiques — bullets accent */}
            {fields.description.length > 0 && (
              <div style={{ marginTop: '0.85rem' }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: C.primary,
                    marginBottom: '0.4rem',
                  }}
                >
                  Caractéristiques & services
                </p>
                <ul
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.3rem',
                  }}
                >
                  {fields.description.map((d, i) => (
                    <li
                      key={i}
                      style={{
                        display: 'flex',
                        gap: '0.4rem',
                        fontSize: '0.78rem',
                        color: 'rgba(10, 37, 64, 0.85)',
                        lineHeight: 1.4,
                      }}
                    >
                      <span style={{ color: C.accent, flexShrink: 0, fontWeight: 700 }}>•</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* CTA — btn-primary / btn-accent stack */}
            <div
              style={{
                marginTop: '1rem',
                paddingTop: '0.75rem',
                borderTop: `1px solid ${C.border}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
              }}
            >
              <div
                style={{
                  background: C.secondary,
                  color: C.white,
                  padding: '0.55rem 1rem',
                  borderRadius: RADIUS,
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  textAlign: 'center',
                  cursor: 'default',
                }}
              >
                Demander ce produit →
              </div>
              <div
                style={{
                  background: C.accent,
                  color: C.white,
                  padding: '0.45rem 1rem',
                  borderRadius: RADIUS,
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  textAlign: 'center',
                  cursor: 'default',
                }}
              >
                06 10 44 03 63
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hint admin sous la modal */}
      <div
        style={{
          marginTop: '0.5rem',
          fontSize: '0.7rem',
          color: 'var(--theme-elevation-500, #888)',
          textAlign: 'center',
          fontStyle: 'italic',
        }}
      >
        {isDraft
          ? 'Cet aperçu ne sera visible publiquement qu\'une fois "Publier" cliqué.'
          : 'Cette fiche est publiée et visible sur le catalogue.'}
      </div>
    </div>
  )
}

export default ProductPreview
