import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { play } from '../lib/sound'

export type ButtonColor = 'yellow' | 'pink' | 'lime' | 'blue' | 'orange' | 'purple' | 'red' | 'ghost'

const COLORS: Record<ButtonColor, [string, string]> = {
  yellow: ['var(--color-yellow)', '#0c1730'],
  pink: ['var(--color-pink)', '#071022'],
  lime: ['var(--color-lime)', '#071022'],
  blue: ['var(--color-blue)', '#071022'],
  orange: ['var(--color-orange)', '#0c1730'],
  purple: ['var(--color-purple)', '#fff'],
  red: ['var(--color-red)', '#fff'],
  ghost: ['var(--color-panel2)', 'var(--color-ink)'],
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  color?: ButtonColor
  size?: 'sm' | 'md' | 'lg'
  mega?: boolean
  silent?: boolean
  children: ReactNode
}

/** Chunky arcade button. Plays a click sound unless `silent`. */
export function Button({ color = 'yellow', size = 'md', mega, silent, className = '', style, onClick, children, ...rest }: Props) {
  const [c, ct] = COLORS[color]
  const sizeCls = mega ? 'btn-mega' : size === 'sm' ? 'text-xs !min-h-[40px] !px-3 !py-2' : size === 'lg' ? 'text-xl' : 'text-sm'
  return (
    <button
      type="button"
      className={`btn ${color === 'ghost' ? 'btn-ghost' : ''} ${sizeCls} ${className}`}
      style={{ '--c': c, '--ct': ct, ...style } as CSSProperties}
      onClick={(e) => {
        if (!silent) play('click')
        onClick?.(e)
      }}
      {...rest}
    >
      {children}
    </button>
  )
}

/** Same look as Button but a real link (for navigation). */
export function LinkButton({ href, color = 'yellow', size = 'md', className = '', children }: { href: string; color?: ButtonColor; size?: 'sm' | 'md' | 'lg'; className?: string; children: ReactNode }) {
  const [c, ct] = COLORS[color]
  const sizeCls = size === 'sm' ? 'text-xs !min-h-[40px] !px-3 !py-2' : size === 'lg' ? 'text-xl' : 'text-sm'
  return (
    <a href={href} onClick={() => play('click')} className={`btn no-underline ${color === 'ghost' ? 'btn-ghost' : ''} ${sizeCls} ${className}`} style={{ '--c': c, '--ct': ct } as CSSProperties}>
      {children}
    </a>
  )
}
