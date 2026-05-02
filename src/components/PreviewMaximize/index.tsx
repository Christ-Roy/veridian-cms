'use client'

import { useEffect } from 'react'

/**
 * Injecte un bouton "Maximiser preview" dans la toolbar Live Preview de Payload
 * quand elle apparaît dans le DOM. Le bouton toggle `body.preview-maximized`
 * qui (via custom.scss) masque le form admin pour donner 100% de la largeur
 * à l'iframe — utile pour valider visuellement le rendu desktop client.
 *
 * Implémenté en MutationObserver car la toolbar est montée/démontée
 * dynamiquement par Payload selon que Live Preview est actif ou pas.
 */
const PreviewMaximize: React.FC = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const BTN_ID = 'veridian-preview-maximize'
    const STORAGE_KEY = 'veridian-preview-maximized'

    const applyState = (maximized: boolean) => {
      document.body.classList.toggle('preview-maximized', maximized)
      try {
        localStorage.setItem(STORAGE_KEY, maximized ? '1' : '0')
      } catch {
        /* localStorage indispo (mode privé) → on s'en passe */
      }
      const btn = document.getElementById(BTN_ID)
      if (btn) {
        btn.setAttribute('aria-pressed', String(maximized))
        btn.title = maximized ? 'Réduire la preview' : 'Maximiser la preview'
        const icon = btn.querySelector('svg')
        if (icon) icon.dataset.maximized = String(maximized)
      }
    }

    const ensureButton = () => {
      // La toolbar live preview existe ?
      const toolbar = document.querySelector('.live-preview-toolbar-controls')
      if (!toolbar) return
      if (document.getElementById(BTN_ID)) return // déjà injecté

      const btn = document.createElement('button')
      btn.id = BTN_ID
      btn.type = 'button'
      btn.className = 'veridian-preview-maximize-btn'
      btn.setAttribute('aria-label', 'Maximiser ou réduire la preview')
      btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 3h4M3 3v4M13 3h-4M13 3v4M3 13h4M3 13v-4M13 13h-4M13 13v-4" />
        </svg>
      `
      btn.addEventListener('click', () => {
        const isMax = document.body.classList.contains('preview-maximized')
        applyState(!isMax)
      })

      // Insère en début de toolbar
      toolbar.insertBefore(btn, toolbar.firstChild)

      // Restaure l'état persisté
      try {
        const persisted = localStorage.getItem(STORAGE_KEY) === '1'
        if (persisted) applyState(true)
      } catch {
        /* ignore */
      }
    }

    const removeIfNoToolbar = () => {
      const toolbar = document.querySelector('.live-preview-toolbar-controls')
      if (!toolbar) {
        // Live Preview désactivé → cleanup
        document.body.classList.remove('preview-maximized')
        const btn = document.getElementById(BTN_ID)
        if (btn) btn.remove()
      }
    }

    // Observer le DOM pour intercepter l'apparition de la toolbar
    const observer = new MutationObserver(() => {
      ensureButton()
      removeIfNoToolbar()
    })
    observer.observe(document.body, { childList: true, subtree: true })

    // Premier check immédiat
    ensureButton()

    return () => {
      observer.disconnect()
      document.body.classList.remove('preview-maximized')
      document.getElementById(BTN_ID)?.remove()
    }
  }, [])

  return null
}

export default PreviewMaximize
