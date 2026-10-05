import { useEffect, useState } from 'react'
import { onFx, type ToastMsg, type ToastTone } from '../lib/fx'

const TONE: Record<ToastTone, string> = {
  xp: 'var(--color-lime)',
  token: 'var(--color-yellow)',
  info: 'var(--color-blue)',
  warn: 'var(--color-red)',
  event: 'var(--color-pink)',
  achievement: 'var(--color-orange)',
}

/** Stacked pop-up notifications (top-right on desktop, top-center on mobile). */
export function ToastHost() {
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  useEffect(
    () =>
      onFx((e) => {
        if (e.type !== 'toast') return
        setToasts((t) => [...t.slice(-3), e.toast])
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== e.toast.id)), 3600)
      }),
    [],
  )
  return (
    <div className="fixed z-[85] top-3 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-4 sm:top-20 flex flex-col gap-2 w-[min(92vw,340px)] pointer-events-none" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="anim-pop sticker rounded-2xl bg-panel px-4 py-3 flex items-center gap-3" style={{ boxShadow: `4px 4px 0 #071022, inset 6px 0 0 ${TONE[t.tone ?? 'info']}` }}>
          {t.icon && <span className="text-3xl shrink-0" aria-hidden>{t.icon}</span>}
          <div className="min-w-0">
            <div className="font-display text-sm leading-tight" style={{ color: TONE[t.tone ?? 'info'] }}>
              {t.title}
            </div>
            {t.body && <div className="text-sm text-dim leading-snug">{t.body}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}
