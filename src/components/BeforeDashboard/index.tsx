import React from 'react'

/**
 * Widget d'accueil sur le dashboard de l'admin.
 * Aligné sur la charte Veridian (#1a3d2f vert foncé / #86efac menthe).
 */
const BeforeDashboard: React.FC = () => (
  <div
    style={{
      padding: '1.75rem 2rem',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
      borderRadius: 16,
      marginBottom: '2rem',
      border: '1px solid #bbf7d0',
      boxShadow: '0 1px 2px rgba(26, 61, 47, 0.04)',
    }}
  >
    <h2
      style={{
        margin: 0,
        color: '#1a3d2f',
        fontSize: '1.6rem',
        fontWeight: 700,
        letterSpacing: '-0.01em',
      }}
    >
      Bienvenue sur Veridian CMS
    </h2>
    <p
      style={{
        marginTop: '0.5rem',
        marginBottom: 0,
        color: '#1a3d2f',
        opacity: 0.78,
        lineHeight: 1.6,
      }}
    >
      Votre espace pour gérer votre site web sans coder, en autonomie.
    </p>

    <div
      style={{
        marginTop: '1.5rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '0.75rem',
      }}
    >
      {[
        { icon: '📄', title: 'Pages', desc: 'Textes, images, sections (Hero, Services, Galerie…)' },
        { icon: '🧭', title: 'Header / Footer', desc: 'Logo, menu, coordonnées, réseaux sociaux' },
        { icon: '✉️', title: 'Formulaires', desc: 'Contact, devis — éditables par vos soins' },
        { icon: '🖼️', title: 'Médias', desc: 'Téléchargez et recadrez vos photos' },
        { icon: '🔎', title: 'SEO', desc: 'Optimisez votre référencement page par page' },
        { icon: '👁️', title: 'Aperçu en direct', desc: 'Voyez vos changements avant publication' },
      ].map(({ icon, title, desc }) => (
        <div
          key={title}
          style={{
            background: 'rgba(255, 255, 255, 0.7)',
            border: '1px solid rgba(26, 61, 47, 0.08)',
            borderRadius: 10,
            padding: '0.75rem 0.9rem',
          }}
        >
          <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a3d2f' }}>{title}</div>
          <div style={{ fontSize: 12, color: '#1a3d2f', opacity: 0.65, lineHeight: 1.4, marginTop: 2 }}>
            {desc}
          </div>
        </div>
      ))}
    </div>

    <div
      style={{
        marginTop: '1.25rem',
        padding: '0.75rem 1rem',
        background: '#1a3d2f',
        color: '#86efac',
        borderRadius: 10,
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      💡 <strong style={{ color: 'white' }}>Astuce</strong> : utilisez le bouton{' '}
      <span style={{ color: 'white', fontWeight: 600 }}>« Aperçu en direct »</span> en haut à droite
      d'une page pour voir vos modifications instantanément, avant publication. Vos changements sont
      enregistrés automatiquement et le site se met à jour en ~1 minute après publication.
    </div>
  </div>
)

export default BeforeDashboard
