'use client'
import React from 'react'
import { useAuth } from '@payloadcms/ui'

/**
 * Carte profil utilisateur affichée en bas de la sidebar (slot afterNavLinks).
 * Le bouton settings + logout natifs Payload sont rendus juste en dessous
 * via `.nav__controls` (stylisés dans custom.scss).
 */
const ProfileCard: React.FC = () => {
  const { user } = useAuth()
  if (!user) return null

  const email = (user as { email?: string }).email ?? ''
  const roles = (user as { roles?: string[] | null }).roles ?? []
  const role = roles.includes('super-admin')
    ? 'Super-admin'
    : roles.includes('client')
      ? 'Client'
      : roles[0] ?? 'Utilisateur'

  // Prend la 1ère lettre du local-part de l'email pour l'avatar
  const initial = (email.split('@')[0]?.[0] ?? 'V').toUpperCase()
  const displayName = email.split('@')[0]?.replace(/[._-]+/g, ' ') ?? 'Utilisateur'

  return (
    <div className="veridian-profile" title={email}>
      <div className="veridian-profile__avatar" aria-hidden>
        {initial}
      </div>
      <div className="veridian-profile__info">
        <div className="veridian-profile__name">{displayName}</div>
        <div className="veridian-profile__role">{role}</div>
      </div>
    </div>
  )
}

export default ProfileCard
