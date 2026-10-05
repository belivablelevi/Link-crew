import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react'
import { useRoute } from '../lib/router'
import { fx, motion } from '../lib/fx'
import { play } from '../lib/sound'
import { addTokens, registerEventCaught, setBoost } from '../state/store'

type EventKind = 'confetti' | 'secret' | 'xp2x' | 'ducks' | 'speed' | 'golden'

interface Banner {
  id: number
  icon: string
  title: string
  body: string
  color: string
}
interface Duck {
  id: number
  y: number
  dur: number
  delay: number
  dir: 1 | -1
  caught?: boolean
}

const FIRST_DELAY = [20_000, 35_000]
const NEXT_DELAY = [55_000, 110_000]
const rand = ([a, b]: number[]) => a + Math.random() * (b - a)

/**
 * Surprise events while browsing (never during a game):
 * confetti drops, hidden gifts, 2X XP, duck invasions, speed rounds, golden minutes.
 */
export function RandomEvents() {
  const route = useRoute()
  const inGame = route.startsWith('/games/')
  const inGameRef = useRef(inGame)
  inGameRef.current = inGame

  const [banner, setBanner] = useState<Banner | null>(null)
  const [gift, setGift] = useState<{ x: number; y: number; id: number } | null>(null)
  const [ducks, setDucks] = useState<Duck[]>([])

  const show = useCallback((b: Omit<Banner, 'id'>) => {
    const id = Date.now()
    setBanner({ ...b, id })
    setTimeout(() => setBanner((cur) => (cur?.id === id ? null : cur)), 4200)
  }, [])

  const fire = useCallback(
    (kind: EventKind) => {
      play('achievement')
      switch (kind) {
        case 'confetti':
          fx.confetti(220)
          registerEventCaught(15)
          show({ icon: '🎉', title: 'CONFETTI DROP!', body: '+15 tokens just for being here.', color: 'var(--color-pink)' })
          break
        case 'secret': {
          const g = { x: 10 + Math.random() * 75, y: 25 + Math.random() * 50, id: Date.now() }
          setGift(g)
          setTimeout(() => setGift((cur) => (cur?.id === g.id ? null : cur)), 7000)
          show({ icon: '🎁', title: 'SOMETHING APPEARED…', body: 'A mystery gift is hiding on screen. Quick — tap it!', color: 'var(--color-yellow)' })
          break
        }
        case 'xp2x':
          setBoost('xp', 3 * 60_000)
          registerEventCaught(0)
          show({ icon: '🔥', title: '2X XP ACTIVE!', body: 'Double XP for the next 3 minutes. GO GO GO.', color: 'var(--color-lime)' })
          break
        case 'ducks': {
          const n = 7
          const list: Duck[] = Array.from({ length: n }, (_, i) => ({ id: Date.now() + i, y: 15 + Math.random() * 70, dur: 5 + Math.random() * 3, delay: i * 0.45, dir: Math.random() < 0.5 ? 1 : -1 }))
          setDucks(list)
          setTimeout(() => setDucks([]), 11_000)
          show({ icon: '🦆', title: 'DUCK INVASION!', body: 'Tap the ducks before they escape. +5 tokens each!', color: 'var(--color-yellow)' })
          break
        }
        case 'speed':
          setBoost('tokens', 2 * 60_000)
          registerEventCaught(0)
          show({ icon: '⚡', title: 'SPEED ROUND!', body: '2X tokens from games for 2 minutes. Pick something fast!', color: 'var(--color-blue)' })
          break
        case 'golden':
          setBoost('xp', 60_000)
          setBoost('tokens', 60_000)
          registerEventCaught(0)
          fx.flash('rgba(255,232,61,.35)')
          show({ icon: '👑', title: 'GOLDEN MINUTE!', body: '2X XP + 2X TOKENS for 60 seconds!', color: 'var(--color-orange)' })
          break
      }
    },
    [show],
  )

  // Scheduler — only runs while browsing and the tab is visible.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const schedule = (delay: number) => {
      t = setTimeout(() => {
        if (inGameRef.current || document.hidden) {
          schedule(8000) // try again shortly
          return
        }
        const kinds: EventKind[] = ['confetti', 'secret', 'xp2x', 'ducks', 'speed', 'golden', 'secret', 'ducks']
        let k = kinds[Math.floor(Math.random() * kinds.length)]
        if (k === 'ducks' && motion.reduced) k = 'secret'
        fire(k)
        schedule(rand(NEXT_DELAY))
      }, delay)
    }
    schedule(rand(FIRST_DELAY))
    return () => clearTimeout(t)
  }, [fire])

  // Leaving to a game clears any interactive event on screen.
  useEffect(() => {
    if (inGame) {
      setGift(null)
      setDucks([])
    }
  }, [inGame])

  const catchDuck = (d: Duck, e: RPointerEvent) => {
    if (d.caught) return
    setDucks((ds) => ds.map((x) => (x.id === d.id ? { ...x, caught: true } : x)))
    play('quack', 0.9 + Math.random() * 0.3)
    fx.confetti(25, { x: e.clientX, y: e.clientY }, 'ducks')
    addTokens(5)
    registerEventCaught(0)
  }

  return (
    <>
      {banner && (
        <div className="fixed z-[86] left-1/2 -translate-x-1/2 top-20 w-[min(94vw,520px)] pointer-events-none" role="status" aria-live="polite">
          <div key={banner.id} className="anim-pop sticker rounded-3xl bg-panel px-5 py-4 flex items-center gap-4" style={{ boxShadow: `5px 5px 0 #0b0614, 0 0 50px color-mix(in srgb, ${banner.color} 50%, transparent)`, borderColor: banner.color }}>
            <div className="text-5xl anim-wobble shrink-0" aria-hidden>
              {banner.icon}
            </div>
            <div>
              <div className="font-pixel text-[0.5rem] text-dim">RANDOM EVENT</div>
              <div className="font-display text-2xl leading-tight" style={{ color: banner.color }}>
                {banner.title}
              </div>
              <div className="text-sm text-ink/90">{banner.body}</div>
            </div>
          </div>
        </div>
      )}

      {gift && (
        <button
          key={gift.id}
          className="fixed z-[84] text-6xl anim-pop"
          style={{ left: `${gift.x}%`, top: `${gift.y}%`, filter: 'drop-shadow(0 0 18px #ffe83d)' }}
          aria-label="Mystery gift! Tap to open."
          onClick={(e) => {
            const amount = 25 + Math.floor(Math.random() * 51)
            setGift(null)
            play('jackpot')
            fx.confetti(120, { x: e.clientX, y: e.clientY })
            registerEventCaught(amount)
            fx.toast({ title: 'YOU FOUND A SECRET!', body: `Mystery gift: +${amount} tokens`, icon: '🎁', tone: 'token' })
          }}
        >
          <span className="block anim-wobble">🎁</span>
        </button>
      )}

      {ducks.length > 0 && (
        <div className="fixed inset-0 z-[83] pointer-events-none overflow-hidden" aria-label="Duck invasion">
          {ducks.map((d) => (
            <button
              key={d.id}
              className="absolute text-5xl pointer-events-auto"
              aria-label="Catch duck"
              onPointerDown={(e) => catchDuck(d, e)}
              style={
                {
                  top: `${d.y}%`,
                  left: 0,
                  opacity: d.caught ? 0 : 1,
                  transition: 'opacity .2s',
                  animation: `${d.dir === 1 ? 'duck-ltr' : 'duck-rtl'} ${d.dur}s linear ${d.delay}s both`,
                } as CSSProperties
              }
            >
              <span className="block" style={{ transform: d.dir === 1 ? 'scaleX(-1)' : undefined }}>
                🦆
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}
