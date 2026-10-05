import { useState } from 'react'

/**
 * The Lisgar logo. Drop the image into /public as one of these names
 * (first one found wins). Until then, a simple "LC" badge is shown.
 */
const CANDIDATES = ['lisgar-logo.webp', 'lisgar-logo.png', 'lisgar-logo.svg', 'lisgar-logo.jpg', 'lisgar-logo.jpeg']

export function SchoolLogo({ size = 40, className = '' }: { size?: number; className?: string }) {
  const [i, setI] = useState(0)
  if (i >= CANDIDATES.length) {
    return (
      <span className={`sticker grid place-items-center rounded-xl bg-purple font-display text-yellow -rotate-6 ${className}`} style={{ width: size, height: size, fontSize: size * 0.45 }} aria-hidden>
        LC
      </span>
    )
  }
  return (
    <img
      src={`./${CANDIDATES[i]}`}
      alt="Lisgar Collegiate Institute logo"
      onError={() => setI((n) => n + 1)}
      className={`object-contain shrink-0 ${className}`}
      style={{ height: size, width: 'auto', filter: 'drop-shadow(0 3px 0 rgba(3,8,20,.6))' }}
      draggable={false}
    />
  )
}
