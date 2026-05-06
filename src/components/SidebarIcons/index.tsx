'use client'
import { useEffect } from 'react'

/**
 * Injecte des icônes SVG (Lucide-style) dans les liens nav natifs Payload.
 * Payload ne fournit pas d'icônes par défaut → on les ajoute par DOM
 * imperative au mount + observer pour suivre les nav re-renders.
 *
 * Mapping par id natif Payload (nav-{slug}) vers SVG inline.
 * Indispensable en mode preview où la sidebar est icon-only (60px).
 */

const ICONS: Record<string, string> = {
  'nav-pages':
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  'nav-media':
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
  'nav-products':
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
  'nav-header':
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="6" rx="1"/><line x1="3" y1="13" x2="21" y2="13" opacity="0.3"/><line x1="3" y1="17" x2="21" y2="17" opacity="0.3"/></svg>',
  'nav-footer':
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="7" x2="21" y2="7" opacity="0.3"/><line x1="3" y1="11" x2="21" y2="11" opacity="0.3"/><rect x="3" y="15" width="18" height="6" rx="1"/></svg>',
  'nav-forms':
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="7" y1="9" x2="17" y2="9"/><line x1="7" y1="13" x2="17" y2="13"/><line x1="7" y1="17" x2="13" y2="17"/></svg>',
  'nav-form-submissions':
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
  'nav-tenants':
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></svg>',
  'nav-users':
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
}

const FALLBACK_ICON =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/></svg>'

const ATTR = 'data-veridian-iconed'

const injectIcons = () => {
  const links = document.querySelectorAll<HTMLAnchorElement>('.nav__link[id^="nav-"]')
  links.forEach((link) => {
    if (link.dataset.veridianIconed === '1') return
    const id = link.id
    const iconSvg = ICONS[id] ?? FALLBACK_ICON
    const iconWrap = document.createElement('span')
    iconWrap.className = 'nav__link-icon'
    iconWrap.setAttribute('aria-hidden', 'true')
    iconWrap.innerHTML = iconSvg
    // Insère avant le label (au début du <a>)
    link.insertBefore(iconWrap, link.firstChild)
    link.setAttribute(ATTR, '1')
    // Title pour tooltip natif quand on est en mode collapsed
    const labelEl = link.querySelector('.nav__link-label')
    if (labelEl?.textContent && !link.title) {
      link.title = labelEl.textContent.trim()
    }
  })
}

const SidebarIcons = () => {
  useEffect(() => {
    injectIcons()
    const observer = new MutationObserver(() => injectIcons())
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])
  return null
}

export default SidebarIcons
