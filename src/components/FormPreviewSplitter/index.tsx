'use client'
import { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'veridian-form-width'
const MIN_WIDTH = 320
const MAX_WIDTH_RATIO = 0.7 // pas plus de 70% de la viewport

/**
 * Splitter drag horizontal entre form et preview en mode Live Preview.
 *
 * Stratégie :
 *  - Inject un <div.veridian-splitter> dans le DOM via mutation observer
 *    (impossible de modifier le DOM Payload natif sans component override)
 *  - Au mousedown, on bascule body en mode dragging et on track mousemove
 *  - On set --form-width sur le body → applique partout via CSS
 *  - Persiste dans localStorage pour retrouver la largeur au reload
 */
const FormPreviewSplitter = () => {
  const splitterRef = useRef<HTMLDivElement | null>(null)
  const draggingRef = useRef(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Restaure la largeur sauvegardée
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const width = parseInt(saved, 10)
      if (!isNaN(width) && width >= MIN_WIDTH) {
        document.documentElement.style.setProperty('--form-width', `${width}px`)
      }
    }

    // Inject splitter dans le DOM Payload (collection-edit__main-wrapper)
    let splitter: HTMLDivElement | null = null
    let observer: MutationObserver | null = null

    const ensureSplitter = () => {
      if (!document.body.matches(':has(.collection-edit--is-live-previewing)')) {
        if (splitter) {
          splitter.remove()
          splitter = null
        }
        return
      }
      const wrapper = document.querySelector('.collection-edit__main-wrapper')
      if (!wrapper || splitter) return

      splitter = document.createElement('div')
      splitter.className = 'veridian-splitter'
      splitter.setAttribute('role', 'separator')
      splitter.setAttribute('aria-orientation', 'vertical')
      splitter.setAttribute('aria-label', 'Redimensionner le formulaire')
      splitter.title = 'Glisser pour ajuster la largeur du formulaire'
      wrapper.appendChild(splitter)
      splitterRef.current = splitter

      splitter.addEventListener('mousedown', onMouseDown)
    }

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault()
      draggingRef.current = true
      document.body.classList.add('veridian-splitter-dragging')
      splitter?.classList.add('veridian-splitter--dragging')
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return
      // La largeur du form = position X de la souris - offset gauche du wrapper (sidebar 60px)
      const wrapper = document.querySelector('.collection-edit__main-wrapper')
      if (!wrapper) return
      const rect = wrapper.getBoundingClientRect()
      const newWidth = e.clientX - rect.left
      const maxWidth = window.innerWidth * MAX_WIDTH_RATIO
      const clamped = Math.max(MIN_WIDTH, Math.min(maxWidth, newWidth))
      document.documentElement.style.setProperty('--form-width', `${clamped}px`)
    }

    const onMouseUp = () => {
      if (!draggingRef.current) return
      draggingRef.current = false
      document.body.classList.remove('veridian-splitter-dragging')
      splitter?.classList.remove('veridian-splitter--dragging')
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      // Persist
      const current = document.documentElement.style.getPropertyValue('--form-width')
      if (current) {
        const px = parseInt(current.replace('px', ''), 10)
        if (!isNaN(px)) localStorage.setItem(STORAGE_KEY, String(px))
      }
    }

    // Observer DOM pour ré-injecter le splitter quand on entre/sort du mode preview
    observer = new MutationObserver(() => ensureSplitter())
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
    ensureSplitter()

    return () => {
      observer?.disconnect()
      splitter?.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      splitter?.remove()
    }
  }, [])

  // Render rien — tout est fait via DOM imperative + CSS
  if (!mounted) return null
  return null
}

export default FormPreviewSplitter
