import React from 'react'

/**
 * Grand logo Veridian — page de login.
 * Charte officielle : fond #1a3d2f / symbole #86efac.
 */
export const Logo: React.FC = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.875rem',
      fontWeight: 700,
      fontSize: '1.75rem',
      color: '#1a3d2f',
    }}
  >
    <span
      aria-hidden="true"
      style={{
        width: 52,
        height: 52,
        borderRadius: 16,
        background: '#1a3d2f',
        color: '#86efac',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontWeight: 800,
        fontSize: 28,
        lineHeight: 1,
      }}
    >
      V
    </span>
    <span>
      Veridian
      <span style={{ color: '#86efac', marginLeft: 4 }}>CMS</span>
    </span>
  </div>
)

export default Logo
