import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  open: boolean
  onClose?: () => void
  title?: string
  children: ReactNode
  /** Accent colour for the frame. */
  color?: string
  wide?: boolean
}

/** Accessible modal: Escape closes, focus moves inside, background is inert to clicks. */
export function Modal({ open, onClose, title, children, color = 'var(--color-pink)', wide }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const first = ref.current?.querySelector<HTMLElement>('input, button, [href], [tabindex]:not([tabindex="-1"])')
    first?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose()
      if (e.key === 'Tab' && ref.current) {
        const items = ref.current.querySelectorAll<HTMLElement>('input, button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])')
        if (!items.length) return
        const a = items[0]
        const b = items[items.length - 1]
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault()
          b.focus()
        } else if (!e.shiftKey && document.activeElement === b) {
          e.preventDefault()
          a.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-4 bg-black/70 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`anim-pop panel w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90dvh] overflow-y-auto p-5 sm:p-7`}
        style={{ borderColor: color, boxShadow: `0 8px 0 #030814, 0 0 60px color-mix(in srgb, ${color} 40%, transparent)` }}
      >
        {(title || onClose) && (
          <div className="flex items-start justify-between gap-3 mb-4">
            {title && <h2 className="font-display text-2xl sm:text-3xl leading-tight">{title}</h2>}
            {onClose && (
              <button onClick={onClose} aria-label="Close" className="sticker shrink-0 w-11 h-11 rounded-xl bg-panel2 text-xl font-display hover:bg-red transition-colors">
                ✕
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
