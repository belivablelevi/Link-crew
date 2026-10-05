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
    emit({ type: 'confetti', amount, origin, style })
  },
  flash(color = 'rgba(255,232,61,.35)') {
    emit({ type: 'flash', color })
  },
  shake(intensity: 'sm' | 'md' | 'lg' = 'md') {
    emit({ type: 'shake', intensity })
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
