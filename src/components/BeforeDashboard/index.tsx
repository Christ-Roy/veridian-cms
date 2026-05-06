import React from 'react'
import Link from 'next/link'
import type { Payload, User } from 'payload'

type ServerProps = {
  payload: Payload
  user: User
}

// Icônes Lucide-style inline (évite la dépendance lucide-react pour 4 icônes)
const IconPages = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
)
const IconBox = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
)
const IconImage = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
)
const IconInbox = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
)

type StatCard = {
  href: string
  label: string
  value: string | number
  hint?: string
  accent?: boolean
  icon: React.ReactNode
}

/**
 * Dashboard d'accueil — vraies données du tenant courant.
 * Server Component qui interroge Payload local API directement (pas de HTTP).
 * Affiche : counts par collection + dernières pages éditées.
 */
const BeforeDashboard = async ({ payload, user }: ServerProps) => {
  // Récupère le 1er tenant du user (compte client = 1 tenant en pratique)
  const userTenants = (user as User & { tenants?: Array<{ tenant?: number | { id: number } }> }).tenants ?? []
  const firstTenantRef = userTenants[0]?.tenant
  const tenantId =
    typeof firstTenantRef === 'object' ? firstTenantRef?.id : firstTenantRef

  if (!tenantId) {
    // Super-admin sans tenant scope → affiche un message neutre
    return (
      <div className="veridian-dashboard">
        <p className="veridian-dashboard__empty">
          Aucun tenant rattaché à votre compte. Sélectionnez un tenant via la sidebar pour voir vos données.
        </p>
      </div>
    )
  }

  const tenantWhere = { tenant: { equals: tenantId } }

  // Tous les counts en parallèle
  const [
    pagesPublished,
    pagesDraft,
    products,
    media,
    forms,
    submissions,
    recentPages,
    tenant,
  ] = await Promise.all([
    payload.count({ collection: 'pages', where: { ...tenantWhere, _status: { equals: 'published' } } }),
    payload.count({ collection: 'pages', where: { ...tenantWhere, _status: { equals: 'draft' } } }),
    payload.count({ collection: 'products', where: tenantWhere }).catch(() => ({ totalDocs: 0 })),
    payload.count({ collection: 'media', where: tenantWhere }).catch(() => ({ totalDocs: 0 })),
    payload.count({ collection: 'forms', where: tenantWhere }).catch(() => ({ totalDocs: 0 })),
    payload.count({ collection: 'form-submissions', where: tenantWhere }).catch(() => ({ totalDocs: 0 })),
    payload.find({
      collection: 'pages',
      where: tenantWhere,
      limit: 5,
      sort: '-updatedAt',
      depth: 0,
    }),
    payload.findByID({ collection: 'tenants', id: tenantId, depth: 0 }).catch(() => null),
  ])

  const cards: StatCard[] = [
    {
      href: '/admin/collections/pages',
      label: 'Pages publiées',
      value: pagesPublished.totalDocs,
      hint:
        pagesDraft.totalDocs > 0
          ? `+ ${pagesDraft.totalDocs} brouillon${pagesDraft.totalDocs > 1 ? 's' : ''}`
          : 'À jour',
      accent: true,
      icon: <IconPages />,
    },
    {
      href: '/admin/collections/products',
      label: 'Produits au catalogue',
      value: products.totalDocs,
      hint: products.totalDocs === 0 ? 'Vide' : 'Visibles sur le site',
      icon: <IconBox />,
    },
    {
      href: '/admin/collections/media',
      label: 'Médias',
      value: media.totalDocs,
      hint: 'Photos & images',
      icon: <IconImage />,
    },
    {
      href: '/admin/collections/form-submissions',
      label: 'Soumissions reçues',
      value: submissions.totalDocs,
      hint:
        forms.totalDocs > 0
          ? `Sur ${forms.totalDocs} formulaire${forms.totalDocs > 1 ? 's' : ''}`
          : 'Aucun formulaire',
      accent: submissions.totalDocs > 0,
      icon: <IconInbox />,
    },
  ]

  const tenantName = (tenant as { name?: string } | null)?.name ?? 'votre site'

  return (
    <div className="veridian-dashboard">
      <header className="veridian-dashboard__header">
        <h1 className="veridian-dashboard__title">Bonjour 👋</h1>
        <p className="veridian-dashboard__subtitle">
          Vue d'ensemble de <strong>{tenantName}</strong>.
        </p>
      </header>

      <div className="veridian-dashboard__grid">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`veridian-stat-card${card.accent ? ' veridian-stat-card--accent' : ''}`}
          >
            <div className="veridian-stat-card__top">
              <div className="veridian-stat-card__icon">{card.icon}</div>
              <div className="veridian-stat-card__label">{card.label}</div>
            </div>
            <div className="veridian-stat-card__value">{card.value}</div>
            {card.hint && <div className="veridian-stat-card__hint">{card.hint}</div>}
          </Link>
        ))}
      </div>

      {recentPages.docs.length > 0 && (
        <section className="veridian-dashboard__section">
          <div className="veridian-dashboard__section-header">
            <h2 className="veridian-dashboard__section-title">Dernières pages modifiées</h2>
            <Link href="/admin/collections/pages" className="veridian-dashboard__section-link">
              Voir toutes →
            </Link>
          </div>
          <ul className="veridian-recent-list">
            {recentPages.docs.map((page) => {
              const p = page as {
                id: number
                title?: string
                slug?: string
                _status?: string
                updatedAt?: string
              }
              const updated = p.updatedAt ? new Date(p.updatedAt) : null
              const updatedLabel = updated
                ? new Intl.DateTimeFormat('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(updated)
                : ''
              return (
                <li key={p.id}>
                  <Link
                    href={`/admin/collections/pages/${p.id}`}
                    className="veridian-recent-list__item"
                  >
                    <div className="veridian-recent-list__main">
                      <span className="veridian-recent-list__title">
                        {p.title || p.slug || 'Sans titre'}
                      </span>
                      <span className="veridian-recent-list__slug">/{p.slug}</span>
                    </div>
                    <div className="veridian-recent-list__meta">
                      <span
                        className={`veridian-badge${
                          p._status === 'published' ? ' veridian-badge--published' : ' veridian-badge--draft'
                        }`}
                      >
                        {p._status === 'published' ? 'Publié' : 'Brouillon'}
                      </span>
                      <span className="veridian-recent-list__date">{updatedLabel}</span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

export default BeforeDashboard
