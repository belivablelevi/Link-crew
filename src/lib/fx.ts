/**
 * Tiny global event bus for UI effects (toasts, confetti, flashes, shakes, overlays).
 * Anything can fire an effect; the overlay components in App listen and render.
 */
export type ToastTone = 'xp' | 'token' | 'info' | 'warn' | 'event' | 'achievement'

export interface ToastMsg {
  id: number
  title: string
  body?: string
  icon?: string
  tone?: ToastTone
}

export type FxEvent =
  | { type: 'toast'; toast: ToastMsg }
  | { type: 'confetti'; amount?: number; origin?: { x: number; y: number }; style?: string }
  | { type: 'flash'; color?: string }
  | { type: 'shake'; intensity?: 'sm' | 'md' | 'lg' }
  | { type: 'levelup'; level: number; tokens: number; unlocks: string[] }
  | { type: 'achievement'; id: string }

type Listener = (e: FxEvent) => void
const listeners = new Set<Listener>()
let toastId = 1

/**
 * Global "how intense is the site" dial. Lower confetti, fewer flashes and softer shakes
 * keep it fun without feeling like a slot machine. Tweak here to taste.
 */
export const INTENSITY = {
  confetti: 0.4,
  flash: true,
  softShake: true,
}

export function onFx(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function emit(e: FxEvent) {
  listeners.forEach((l) => l(e))
}

export const fx = {
  toast(t: Omit<ToastMsg, 'id'>) {
    emit({ type: 'toast', toast: { ...t, id: toastId++ } })
  },
  confetti(amount = 120, origin?: { x: number; y: number }, style?: string) {
    // Calmer by default: smaller bursts, and tiny ones are skipped entirely.
    const n = Math.round(amount * INTENSITY.confetti)
    if (n < 15) return
    emit({ type: 'confetti', amount: n, origin, style })
  },
  flash(color = 'rgba(255,199,44,.35)') {
    if (!INTENSITY.flash) return
    emit({ type: 'flash', color })
  },
  shake(intensity: 'sm' | 'md' | 'lg' = 'md') {
    // Small shakes are dropped; big ones are softened.
    const map = { sm: null, md: 'sm', lg: 'md' } as const
    const level = INTENSITY.softShake ? map[intensity] : intensity
    if (level) emit({ type: 'shake', intensity: level })
  },
  levelUp(level: number, tokens: number, unlocks: string[]) {
    emit({ type: 'levelup', level, tokens, unlocks })
  },
  achievement(id: string) {
    emit({ type: 'achievement', id })
  },
}

/** True when the user (or OS) asked for reduced motion. Kept in sync by App. */
export const motion = { reduced: false }
