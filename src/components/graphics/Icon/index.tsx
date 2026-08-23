import React from 'react'

/**
 * Petit logo Veridian (V menthe sur fond vert foncé) — utilisé dans le
 * step-nav (breadcrumb top) de l'admin Payload.
 *
 * Le slot `step-nav__home` contraint le rendu à ~18x18px → on bombarde
 * la SVG à 18x18 (le SVG fait son propre rendu interne via viewBox).
 *
 * Charte officielle : fond #1a3d2f / symbole #86efac, rect rounded 10/32.
 * Source : https://veridian.site/icon.svg
 */
export const Icon: React.FC = () => (
  <span
    aria-label="Veridian"
    style={{
      width: 18,
      height: 18,
      borderRadius: 6,
      background: '#1a3d2f',
      color: '#86efac',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontWeight: 800,
      fontSize: 12,
      lineHeight: 1,
    }}
  >
    V
  </span>
)

export default Icon
