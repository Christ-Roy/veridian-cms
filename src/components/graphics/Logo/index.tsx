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
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      style={{ width: 52, height: 52 }}
      aria-label="Veridian"
    >
      <rect width="32" height="32" rx="10" fill="#1a3d2f" />
      <text
        x="50%"
        y="58%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="#86efac"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 800, fontSize: 20 }}
      >
        V
      </text>
    </svg>
    <span>
      Veridian
      <span style={{ color: '#86efac', marginLeft: 4 }}>CMS</span>
    </span>
  </div>
)

export default Logo
