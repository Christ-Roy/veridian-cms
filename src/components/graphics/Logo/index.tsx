import React from 'react'

/** Grand logo affiché sur la page de login. */
export const Logo: React.FC = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      fontWeight: 700,
      fontSize: '1.75rem',
      color: '#15803d',
    }}
  >
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" style={{ width: 40, height: 40 }}>
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
    <span>Veridian CMS</span>
  </div>
)

export default Logo
