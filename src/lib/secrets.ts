import { fx } from './fx'
import { play } from './sound'
import { registerSecret } from '../state/store'

const SECRET_MS = 30_000
let timer: ReturnType<typeof setTimeout> | undefined

const NAMES: Record<string, string> = {
  logo: 'LOGO MASHER',
  konami: 'THE ANCIENT CODE',
  duck: 'THE CHOSEN DUCK',
  button: 'THE FORBIDDEN BUTTON',
}

/** Activates SECRET MODE (rainbow hue-cycling, pixel fonts, tilted cards) for 30s. */
export function triggerSecret(key: string) {
  const first = registerSecret(key)
  document.documentElement.classList.add('secret-mode')
  clearTimeout(timer)
  timer = setTimeout(() => document.documentElement.classList.remove('secret-mode'), SECRET_MS)
  play('jackpot')
  fx.flash('rgba(255,43,214,.45)')
  fx.shake('lg')
  fx.confetti(220)
  fx.toast({
    title: 'YOU FOUND A SECRET!',
    body: `${NAMES[key] ?? 'SECRET'} — SECRET MODE ON for 30s${first ? '' : ' (already found)'}`,
    icon: '🕵️',
    tone: 'event',
  })
}

export const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
