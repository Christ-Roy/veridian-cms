'use client'
import React, { useEffect, useRef, useState } from 'react'
import { useField } from '@payloadcms/ui'
import type { TextFieldClientProps } from 'payload'

/**
 * BrandPicker — vrai dropdown custom pour le champ "marque".
 *
 * - Click → ouvre liste des marques existantes du tenant (fetch à la volée)
 * - Click sur une marque → la sélectionne
 * - "+ Ajouter une marque" → input libre, la marque est mémorisée au save
 *
 * Pas de collection séparée : la liste est extraite des marques distinctes
 * des produits existants. Se construit toute seule au fur et à mesure.
 */
export const BrandPicker: React.FC<TextFieldClientProps> = (props) => {
  const { path, field } = props
  const { value, setValue } = useField<string>({ path })
  const [brands, setBrands] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'list' | 'custom'>('list')
  const [customInput, setCustomInput] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    const fetchBrands = async () => {
      try {
        const res = await fetch(
          '/api/products?limit=1000&depth=0&where[brand][exists]=true',
          { credentials: 'include' },
        )
        if (!res.ok) return
        const data = (await res.json()) as { docs?: Array<{ brand?: string }> }
        if (cancelled) return
        const unique = Array.from(
          new Set(
            (data.docs ?? [])
              .map((d) => (typeof d.brand === 'string' ? d.brand.trim() : ''))
              .filter((b) => b.length > 0),
          ),
        ).sort((a, b) => a.localeCompare(b, 'fr'))
        setBrands(unique)
      } catch {
        // datalist vide → saisie custom uniquement
      }
    }
    void fetchBrands()
    return () => {
      cancelled = true
    }
  }, [value])

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setMode('list')
      }
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const selectBrand = (brand: string) => {
    setValue(brand)
    setOpen(false)
    setMode('list')
    setCustomInput('')
  }

  const submitCustom = () => {
    const trimmed = customInput.trim()
    if (trimmed) {
      setValue(trimmed)
      setOpen(false)
      setMode('list')
      setCustomInput('')
    }
  }

  const label = (field.label as string) ?? 'Marque'
  const description =
    (field.admin?.description as string) ??
    'Choisissez une marque existante ou ajoutez-en une nouvelle.'

  return (
    <div className="field-type text" ref={wrapperRef} style={{ position: 'relative' }}>
      <label
        className="field-label"
        style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}
      >
        {label}
      </label>

      {/* Bouton dropdown */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          padding: '0.5rem 0.75rem',
          textAlign: 'left',
          background: 'var(--theme-input-bg, #fff)',
          border: '1px solid var(--theme-elevation-150, #ddd)',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.95rem',
          color: value ? 'var(--theme-text, #111)' : 'var(--theme-elevation-500, #888)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>{value || 'Sélectionner une marque…'}</span>
        <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{open ? '▲' : '▼'}</span>
      </button>

      {description && (
        <div
          className="field-description"
          style={{
            fontSize: '0.8rem',
            color: 'var(--theme-elevation-500, #777)',
            marginTop: '0.25rem',
          }}
        >
          {description}
        </div>
      )}

      {/* Hidden input pour que Payload puisse sérialiser */}
      <input type="hidden" name={path} value={value ?? ''} readOnly />

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            background: 'var(--theme-input-bg, #fff)',
            border: '1px solid var(--theme-elevation-150, #ddd)',
            borderRadius: '4px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            zIndex: 100,
            maxHeight: '320px',
            overflowY: 'auto',
          }}
        >
          {mode === 'list' ? (
            <>
              {brands.length === 0 && (
                <div
                  style={{
                    padding: '0.75rem',
                    color: 'var(--theme-elevation-500, #888)',
                    fontSize: '0.85rem',
                    fontStyle: 'italic',
                  }}
                >
                  Aucune marque enregistrée pour l&apos;instant.
                </div>
              )}
              {brands.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => selectBrand(b)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    textAlign: 'left',
                    background: b === value ? 'var(--theme-elevation-50, #f5f5f5)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    color: 'var(--theme-text, #111)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--theme-elevation-50, #f5f5f5)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      b === value ? 'var(--theme-elevation-50, #f5f5f5)' : 'transparent'
                  }}
                >
                  {b}
                </button>
              ))}
              <div
                style={{
                  borderTop: '1px solid var(--theme-elevation-100, #eee)',
                  marginTop: '4px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setMode('custom')}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: 'var(--theme-success-500, #16a34a)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--theme-elevation-50, #f5f5f5)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  + Ajouter une nouvelle marque
                </button>
              </div>
            </>
          ) : (
            <div style={{ padding: '0.75rem' }}>
              <input
                type="text"
                autoFocus
                placeholder="Nom de la marque…"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    submitCustom()
                  } else if (e.key === 'Escape') {
                    setMode('list')
                    setCustomInput('')
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.6rem',
                  border: '1px solid var(--theme-elevation-150, #ddd)',
                  borderRadius: '4px',
                  fontSize: '0.95rem',
                  background: 'var(--theme-input-bg, #fff)',
                  color: 'var(--theme-text, #111)',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMode('list')
                    setCustomInput('')
                  }}
                  style={{
                    padding: '0.35rem 0.75rem',
                    background: 'transparent',
                    border: '1px solid var(--theme-elevation-150, #ddd)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={submitCustom}
                  disabled={!customInput.trim()}
                  style={{
                    padding: '0.35rem 0.75rem',
                    background: customInput.trim() ? 'var(--theme-success-500, #16a34a)' : '#ccc',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: customInput.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  Valider
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default BrandPicker
