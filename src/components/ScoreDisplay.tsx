import type { ReactNode } from 'react'

interface Props {
  label: string
  value: ReactNode
  color?: string
  icon?: string
  /** Bumps when value changes (pass the value) to retrigger the pop animation. */
  bump?: number | string
  className?: string
}

/** HUD chip used inside games: "SCORE 1,200" etc. */
export function ScoreDisplay({ label, value, color = 'var(--color-yellow)', icon, bump, className = '' }: Props) {
  return (
    <div className={`sticker rounded-xl bg-panel px-3 py-1.5 min-w-[72px] ${className}`} style={{ borderColor: '#0b0614' }}>
      <div className="font-pixel text-[0.5rem] text-dim leading-tight">{label}</div>
      <div key={bump} className="font-display text-lg sm:text-xl leading-tight anim-pop tabular-nums" style={{ color }}>
        {icon && <span className="mr-1">{icon}</span>}
        {value}
      </div>
    </div>
  )
}
