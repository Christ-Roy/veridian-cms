import React from 'react'

/**
 * Petit logo Veridian (V menthe sur fond vert foncé) — sidebar admin.
 * Charte officielle : fond #1a3d2f / symbole #86efac, rect rounded 10/32.
 * Source : https://veridian.site/icon.svg
 */
export const Icon: React.FC = () => (
  <svg
    viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    style={{ width: 30, height: 30 }}
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
)

export default Icon
