import type { CSSProperties } from 'react'

interface Props {
  value: number // 0..1
  color?: string
  height?: number
  label?: string
  className?: string
}

export function ProgressBar({ value, color = 'var(--color-lime)', height = 22, label, className = '' }: Props) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div
      className={`bar ${className}`}
      style={{ height } as CSSProperties}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label}
    >
      <div className="fill" style={{ width: `${pct}%`, '--fill': color } as CSSProperties} />
    </div>
  )
}
