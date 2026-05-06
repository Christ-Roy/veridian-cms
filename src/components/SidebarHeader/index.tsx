'use client'
import React from 'react'
import Link from 'next/link'
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
  const adminRoute = (config?.config?.routes?.admin as string) ?? '/admin'

  if (!user) return null

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
    </div>
  )
}

export default SidebarHeader
