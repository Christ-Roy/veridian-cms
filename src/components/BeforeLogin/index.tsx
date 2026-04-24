import React from 'react'

/** Message de bienvenue avant la page de login. */
const BeforeLogin: React.FC = () => (
  <div
    style={{
      textAlign: 'center',
      marginBottom: '2rem',
      padding: '1rem',
      borderRadius: 8,
      background: '#f0fdf4',
      border: '1px solid #bbf7d0',
    }}
  >
    <p style={{ margin: 0, fontSize: 15, color: '#15803d', fontWeight: 600 }}>
      Bienvenue sur votre espace de gestion Veridian
    </p>
    <p style={{ marginTop: 6, marginBottom: 0, fontSize: 13, color: '#166534' }}>
      Connectez-vous avec l&apos;email que vous avez reçu pour gérer votre site web.
    </p>
  </div>
)

export default BeforeLogin
