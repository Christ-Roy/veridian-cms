'use client'

import { useEffect } from 'react'

/**
 * Améliore la Live Preview Payload avec deux features UX :
 *
 *  1. **Bouton Maximiser** dans la toolbar — masque le form admin et donne
 *     100% de la largeur écran à l'iframe (clic pour toggle).
 *
 *  2. **Auto-fit zoom** — quand le breakpoint sélectionné (ex: Desktop 1440,
 *     Desktop XL 1920) est plus large que la zone iframe disponible,
 *     applique automatiquement un `transform: scale()` pour faire tenir le
 *     viewport complet sans scroll horizontal. Recalculé au resize.
 *
 * Implémenté en MutationObserver + ResizeObserver car la toolbar est
 * montée/démontée dynamiquement par Payload selon le mode Live Preview.
 */
const PreviewMaximize: React.FC = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const BTN_ID = 'veridian-preview-maximize'
    const STORAGE_KEY = 'veridian-preview-maximized'
    const AUTOFIT_KEY = 'veridian-preview-autofit'

    /* ----- Maximize toggle ----- */
    const applyMaximized = (maximized: boolean) => {
      document.body.classList.toggle('preview-maximized', maximized)
      try {
        localStorage.setItem(STORAGE_KEY, maximized ? '1' : '0')
      } catch {
        /* ignore */
      }
      const btn = document.getElementById(BTN_ID)
      if (btn) {
        btn.setAttribute('aria-pressed', String(maximized))
        btn.title = maximized ? 'Réduire la preview' : 'Maximiser la preview'
      }
      // Recalcule le fit après animation
      setTimeout(applyAutoFit, 250)
    }

    /* ----- Auto-fit zoom ----- */
    // Track la dernière scale appliquée par nous pour pouvoir distinguer
    // de celle de Payload quand on observe les mutations.
    let appliedScale = 1
    const applyAutoFit = () => {
      const window_ = document.querySelector(
        '.live-preview-window',
      ) as HTMLElement | null
      const iframe = document.querySelector(
        '.live-preview-window iframe',
      ) as HTMLIFrameElement | null
      if (!window_ || !iframe) return

      const enabled = (() => {
        try {
          return localStorage.getItem(AUTOFIT_KEY) !== '0'
        } catch {
          return true
        }
      })()

      const wrapMain = document.querySelector(
        '.live-preview-window__main',
      ) as HTMLElement | null
      const wrapContainer = iframe.parentElement as HTMLElement | null

      if (!enabled) {
        // Reset
        iframe.style.transform = 'scale(1)'
        if (wrapMain) wrapMain.style.removeProperty('height')
        if (wrapContainer) wrapContainer.style.removeProperty('height')
        appliedScale = 1
        return
      }

      // IMPORTANT : reset le transform avant de lire offsetWidth, sinon on
      // mesure la taille post-scale (faussée). On force un reflow.
      const prevTransform = iframe.style.transform
      iframe.style.transform = 'scale(1)'
      // Trigger reflow synchrone
      void iframe.offsetWidth
      const targetW = iframe.offsetWidth
      const availableW = window_.offsetWidth - 16

      if (targetW <= availableW + 1) {
        // Pas de scale nécessaire
        if (wrapMain) wrapMain.style.removeProperty('height')
        if (wrapContainer) wrapContainer.style.removeProperty('height')
        appliedScale = 1
        return
      }
      // Restore (sera écrasé juste après)
      iframe.style.transform = prevTransform

      const scale = Math.max(0.3, availableW / targetW)
      iframe.style.transform = `scale(${scale.toFixed(4)})`
      iframe.style.transformOrigin = '0 0'
      // Compense la hauteur visuelle (sinon scale(0.65) laisse 35% de vide en bas)
      if (wrapMain) wrapMain.style.height = `${(100 / scale).toFixed(2)}%`
      if (wrapContainer) wrapContainer.style.height = `${(100 / scale).toFixed(2)}%`
      appliedScale = scale
    }

    const updateFitButton = () => {
      const btn = document.getElementById('veridian-preview-autofit')
      if (!btn) return
      let enabled = true
      try {
        enabled = localStorage.getItem(AUTOFIT_KEY) !== '0'
      } catch {
        /* ignore */
      }
      btn.setAttribute('aria-pressed', String(enabled))
      btn.title = enabled
        ? 'Auto-zoom : activé (clic pour désactiver)'
        : 'Auto-zoom : désactivé (clic pour activer)'
    }

    /* ----- Page selector ----- */
    type PageRow = {
      id: number | string
      title: string
      slug: string
      collection: 'pages' | 'products'
    }

    let cachedPages: PageRow[] = []
    let lastFetchTenantId: number | string | null | undefined = undefined
    let pageSelectorInjecting = false

    const fetchPages = async (
      tenantId: number | string | null,
    ): Promise<PageRow[]> => {
      const params = new URLSearchParams({ limit: '100', depth: '0' })
      if (tenantId) params.set('where[tenant][equals]', String(tenantId))
      try {
        const [pages, products] = await Promise.all([
          fetch(`/api/pages?${params}`, { credentials: 'include' })
            .then((r) => r.json())
            .then((d) => (d?.docs ?? []) as Array<{ id: number; title: string; slug: string }>),
          fetch(`/api/products?${params}`, { credentials: 'include' })
            .then((r) => r.json())
            .then(
              (d) =>
                (d?.docs ?? []) as Array<{ id: number; title?: string; name?: string; slug: string }>,
            )
            .catch(() => []),
        ])
        const rows: PageRow[] = []
        pages.forEach((p) =>
          rows.push({
            id: p.id,
            title: p.title || p.slug || 'Sans titre',
            slug: p.slug,
            collection: 'pages',
          }),
        )
        products.forEach((p) =>
          rows.push({
            id: p.id,
            title: (p.title || p.name || p.slug || 'Sans titre') as string,
            slug: p.slug,
            collection: 'products',
          }),
        )
        return rows
      } catch {
        return []
      }
    }

    const getCurrentDocId = (): { collection: string; id: string } | null => {
      const m = window.location.pathname.match(/\/collections\/(\w+)\/([\w-]+)/)
      if (!m) return null
      return { collection: m[1], id: m[2] }
    }

    const buildSelector = (
      pages: PageRow[],
      currentId: string | null,
      currentCollection: string | null,
    ): HTMLSelectElement => {
      const select = document.createElement('select')
      select.id = 'veridian-page-selector'
      select.className = 'veridian-page-selector'
      select.title = 'Naviguer vers une autre page du site'

      const groupPages = pages.filter((p) => p.collection === 'pages')
      const groupProducts = pages.filter((p) => p.collection === 'products')

      const addGroup = (label: string, items: PageRow[]) => {
        if (!items.length) return
        const og = document.createElement('optgroup')
        og.label = label
        items.forEach((p) => {
          const opt = document.createElement('option')
          opt.value = `${p.collection}:${p.id}`
          opt.textContent = p.title
          if (
            String(p.id) === String(currentId) &&
            p.collection === currentCollection
          ) {
            opt.selected = true
          }
          og.appendChild(opt)
        })
        select.appendChild(og)
      }
      addGroup('Pages', groupPages)
      addGroup('Catalogue', groupProducts)

      select.addEventListener('change', () => {
        const [coll, id] = select.value.split(':')
        if (coll && id) {
          window.location.href = `/admin/collections/${coll}/${id}`
        }
      })
      return select
    }

    const ensurePageSelector = async (toolbar: Element) => {
      if (document.getElementById('veridian-page-selector')) return
      if (pageSelectorInjecting) return
      pageSelectorInjecting = true
      const current = getCurrentDocId()
      if (!current) {
        pageSelectorInjecting = false
        return
      }

      // 1. Fetch tenant courant si on ne l'a pas
      let tenantId: number | string | null = null
      try {
        const doc = await fetch(`/api/${current.collection}/${current.id}?depth=0`, {
          credentials: 'include',
        }).then((r) => r.json())
        const t = (doc as { tenant?: number | { id: number } }).tenant
        tenantId = typeof t === 'object' && t ? t.id : (t ?? null)
      } catch {
        /* ignore */
      }

      // 2. Cache si même tenant que dernier fetch
      if (lastFetchTenantId !== tenantId) {
        cachedPages = await fetchPages(tenantId)
        lastFetchTenantId = tenantId
      }
      if (!cachedPages.length) {
        pageSelectorInjecting = false
        return
      }

      // Re-vérifie qu'il n'a pas été injecté pendant l'await (race)
      if (document.getElementById('veridian-page-selector')) {
        pageSelectorInjecting = false
        return
      }

      // 3. Insère le select à côté du breakpoint
      const breakpointEl = toolbar.querySelector(
        '.live-preview-toolbar-controls__breakpoint',
      )
      const select = buildSelector(cachedPages, current.id, current.collection)
      if (breakpointEl) {
        breakpointEl.insertAdjacentElement('beforebegin', select)
      } else {
        toolbar.insertBefore(select, toolbar.firstChild)
      }
      pageSelectorInjecting = false
    }

    /* ----- Inject buttons ----- */
    const ensureButtons = () => {
      const toolbar = document.querySelector('.live-preview-toolbar-controls')
      if (!toolbar) return

      // 1. Bouton "Maximiser"
      if (!document.getElementById(BTN_ID)) {
        const btn = document.createElement('button')
        btn.id = BTN_ID
        btn.type = 'button'
        btn.className = 'veridian-preview-maximize-btn'
        btn.setAttribute('aria-label', 'Maximiser ou réduire la preview')
        btn.title = 'Maximiser la preview'
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 3h4M3 3v4M13 3h-4M13 3v4M3 13h4M3 13v-4M13 13h-4M13 13v-4" />
          </svg>
        `
        btn.addEventListener('click', () => {
          const isMax = document.body.classList.contains('preview-maximized')
          applyMaximized(!isMax)
        })
        toolbar.insertBefore(btn, toolbar.firstChild)

        // Restore persisted maximize state
        try {
          if (localStorage.getItem(STORAGE_KEY) === '1') applyMaximized(true)
        } catch {
          /* ignore */
        }
      }

      // 2. Sélecteur de page (navigation rapide entre pages du tenant)
      ensurePageSelector(toolbar)

      // 3. Bouton "Auto-fit zoom"
      if (!document.getElementById('veridian-preview-autofit')) {
        const btn = document.createElement('button')
        btn.id = 'veridian-preview-autofit'
        btn.type = 'button'
        btn.className = 'veridian-preview-autofit-btn'
        btn.setAttribute('aria-label', 'Auto-zoom de la preview pour tout voir')
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M11 11l3 3" />
            <path d="M5 7h4M7 5v4" />
          </svg>
        `
        btn.addEventListener('click', () => {
          let enabled = true
          try {
            enabled = localStorage.getItem(AUTOFIT_KEY) !== '0'
            localStorage.setItem(AUTOFIT_KEY, enabled ? '0' : '1')
          } catch {
            /* ignore */
          }
          updateFitButton()
          applyAutoFit()
        })
        const maxBtn = document.getElementById(BTN_ID)
        if (maxBtn?.nextSibling) toolbar.insertBefore(btn, maxBtn.nextSibling)
        else toolbar.insertBefore(btn, toolbar.firstChild)
        updateFitButton()
      }
    }

    const cleanupIfNoToolbar = () => {
      const toolbar = document.querySelector('.live-preview-toolbar-controls')
      if (!toolbar) {
        document.body.classList.remove('preview-maximized')
        document.getElementById(BTN_ID)?.remove()
        document.getElementById('veridian-preview-autofit')?.remove()
        document.getElementById('veridian-page-selector')?.remove()
      }
    }

    /* ----- Observers ----- */
    // Schedule applyAutoFit avec plusieurs tentatives pour être sûr d'attraper
    // le moment où Payload a fini de propager le breakpoint change. Le
    // re-render React + le layout iframe peuvent prendre quelques frames.
    let pending = false
    const scheduleApply = () => {
      if (pending) return
      pending = true
      // 6 tentatives à 0, 50, 200, 500, 1000, 1500ms pour couvrir les cas où
      // Payload propage le breakpoint en plusieurs frames
      ;[0, 50, 200, 500, 1000, 1500].forEach((delay, i, arr) => {
        setTimeout(() => {
          applyAutoFit()
          if (i === arr.length - 1) pending = false
        }, delay)
      })
    }

    const mo = new MutationObserver(() => {
      ensureButtons()
      cleanupIfNoToolbar()
      scheduleApply()
    })
    mo.observe(document.body, { childList: true, subtree: true })

    const ro = new ResizeObserver(() => scheduleApply())
    ro.observe(document.body)

    // Watch les changements sur l'iframe pour ré-appliquer le scale quand
    // Payload met à jour la width (breakpoint change). Mais on attend les
    // mutations DOM stable avant de relire les dimensions, via scheduleApply
    // qui fait plusieurs tentatives à intervalles différents.
    let iframeAttrObs: MutationObserver | null = null
    const watchIframe = () => {
      const ifr = document.querySelector(
        '.live-preview-window iframe',
      ) as HTMLIFrameElement | null
      if (!ifr) return
      if (iframeAttrObs) iframeAttrObs.disconnect()
      iframeAttrObs = new MutationObserver(() => {
        // À chaque changement d'attribut style/width sur l'iframe,
        // re-fit avec retry pour attraper le DOM stable
        scheduleApply()
      })
      iframeAttrObs.observe(ifr, { attributes: true, attributeFilter: ['style', 'width'] })
    }
    watchIframe()
    const moRoot = new MutationObserver(() => watchIframe())
    moRoot.observe(document.body, { childList: true, subtree: true })

    ensureButtons()
    applyAutoFit()
    window.addEventListener('resize', applyAutoFit)

    return () => {
      mo.disconnect()
      ro.disconnect()
      moRoot.disconnect()
      iframeAttrObs?.disconnect()
      window.removeEventListener('resize', applyAutoFit)
      document.body.classList.remove('preview-maximized')
      document.getElementById(BTN_ID)?.remove()
      document.getElementById('veridian-preview-autofit')?.remove()
      document.getElementById('veridian-page-selector')?.remove()
    }
  }, [])

  return null
}

export default PreviewMaximize
