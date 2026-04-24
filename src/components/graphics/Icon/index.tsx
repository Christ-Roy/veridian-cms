import React from 'react'

/** Petit logo Veridian affiché dans la sidebar de l'admin. */
export const Icon: React.FC = () => (
  <svg
    viewBox="0 0 40 40"
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: 28, height: 28 }}
    aria-label="Veridian"
  >
    <circle cx="20" cy="20" r="18" fill="#16a34a" />
    <path
      d="M12 20 L18 26 L28 14"
      stroke="white"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
)

export default Icon
