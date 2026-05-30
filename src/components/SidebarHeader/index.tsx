'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth, useConfig } from '@payloadcms/ui'

/**
 * En-tête sidebar (slot beforeNavLinks).
 *
 * Layout :
 *   [Édition site web — AVSE Monétique]              (eyebrow + tenant)
 *   [Avatar] [Nom + email]                [chevron]  (carte profil → /admin/account)
 *
 * Remplace l'ancien ProfileCard en bas. Plus propre + situe immédiatement le client.
 *
 * Note : le toggle "replier la sidebar" natif Payload est dans la top-bar
 * (à gauche du titre de page). Pas de doublon ici — on évite la complexité
 * d'appeler useNav() qui ne marche que dans certains contextes.
 */
const SidebarHeader: React.FC = () => {
  const { user } = useAuth()
  const config = useConfig()
  const pathname = usePathname()
  const adminRoute = (config?.config?.routes?.admin as string) ?? '/admin'

  if (!user) return null

  // Active si on est exactement sur /admin (pas /admin/collections/...)
  const isDashboardActive = pathname === adminRoute || pathname === `${adminRoute}/`

  const email = (user as { email?: string }).email ?? ''
  const tenantsArr = (user as { tenants?: Array<{ tenant?: { name?: string } | number }> }).tenants ?? []
  const firstTenant = tenantsArr[0]?.tenant
  const tenantName =
    typeof firstTenant === 'object' ? firstTenant?.name : undefined

  const initial = (email.split('@')[0]?.[0] ?? 'V').toUpperCase()
  const displayName = email.split('@')[0]?.replace(/[._-]+/g, ' ') ?? 'Utilisateur'

  return (
    <div className="veridian-sidebar-header">
      <div className="veridian-sidebar-header__eyebrow">
        <span className="veridian-sidebar-header__label">Édition site web</span>
        {tenantName && (
          <span className="veridian-sidebar-header__tenant">{tenantName}</span>
        )}
      </div>

      <Link
        href={`${adminRoute}/account`}
        className="veridian-profile"
        title={`${email} — Mon compte`}
      >
        <div className="veridian-profile__avatar" aria-hidden>
          {initial}
        </div>
        <div className="veridian-profile__info">
          <div className="veridian-profile__name">{displayName}</div>
          <div className="veridian-profile__email">{email}</div>
        </div>
      </Link>

      {/* Lien Tableau de bord — premier item de nav, au-dessus des collections.
          On reproduit le markup des liens Payload natifs (.nav__link) pour
          qu'il hérite des hover/active styles définis dans custom.scss. */}
      <Link
        href={adminRoute}
        className={`nav__link veridian-sidebar-header__dashboard-link${
          isDashboardActive ? ' veridian-sidebar-header__dashboard-link--active' : ''
        }`}
        title="Tableau de bord"
      >
        <span className="nav__link-icon" aria-hidden>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="7" height="9" rx="1" />
            <rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1" />
            <rect x="3" y="16" width="7" height="5" rx="1" />
          </svg>
        </span>
        <span className="nav__link-label">Tableau de bord</span>
      </Link>
    </div>
  )
}

export default SidebarHeader
