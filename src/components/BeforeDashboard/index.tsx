import React from 'react'

/** Widget d'accueil sur le dashboard de l'admin. */
const BeforeDashboard: React.FC = () => (
  <div
    style={{
      padding: '1.5rem',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
      borderRadius: 12,
      marginBottom: '2rem',
      border: '1px solid #bbf7d0',
    }}
  >
    <h2 style={{ margin: 0, color: '#15803d', fontSize: '1.5rem' }}>Bonjour 👋</h2>
    <p style={{ marginTop: '0.5rem', marginBottom: 0, color: '#166534', lineHeight: 1.6 }}>
      Votre espace Veridian vous permet de gérer votre site web sans coder :
    </p>
    <ul style={{ marginTop: '1rem', color: '#166534', lineHeight: 1.8, paddingLeft: '1.25rem' }}>
      <li>
        <strong>Pages</strong> : modifiez vos textes, images, sections (Hero, Services, Galerie, etc.)
      </li>
      <li>
        <strong>Header / Footer</strong> : logo, navigation, coordonnées, réseaux sociaux
      </li>
      <li>
        <strong>Formulaires</strong> : créez vos propres formulaires de contact / devis
      </li>
      <li>
        <strong>Médias</strong> : téléchargez et recadrez vos photos
      </li>
      <li>
        <strong>SEO</strong> : optimisez votre référencement page par page
      </li>
    </ul>
    <p style={{ marginTop: '1rem', marginBottom: 0, fontSize: 13, color: '#15803d' }}>
      💡 <strong>Astuce</strong> : vos changements sont enregistrés automatiquement et publiés en un
      clic. Votre site se met à jour en ~1 minute.
    </p>
  </div>
)

export default BeforeDashboard
