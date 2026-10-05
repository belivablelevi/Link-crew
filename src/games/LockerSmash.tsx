import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameProps } from './types'
import { ScoreDisplay } from '../components/ScoreDisplay'
import { ProgressBar } from '../components/ProgressBar'
import { usePopups } from '../components/Popups'
import { fx } from '../lib/fx'
import { play } from '../lib/sound'

const DURATION = 30

interface LockerType {
  id: string
  name: string
  hp: number
  reward: number
  door: string
  trim: string
  loot: string[]
}

const TYPES: LockerType[] = [
  { id: 'basic', name: 'BASIC LOCKER', hp: 8, reward: 100, door: 'linear-gradient(90deg,#1d8fbf,#38c6ff)', trim: '#0b3b55', loot: ['📚', '🧦', '🍎', '✏️', '🧃'] },
  { id: 'gym', name: 'GYM LOCKER', hp: 14, reward: 220, door: 'linear-gradient(90deg,#14a34a,#3cff6e)', trim: '#0b4d22', loot: ['🏀', '👟', '🏈', '🥤', '🏸'] },
  { id: 'rusty', name: 'RUSTY LOCKER', hp: 20, reward: 380, door: 'linear-gradient(90deg,#8a4b1c,#c9772f)', trim: '#4a2208', loot: ['🦴', '🧀', '📼', '🕸️', '🪙'] },
  { id: 'secret', name: 'SECRET LOCKER!', hp: 10, reward: 800, door: 'linear-gradient(90deg,#c99a00,#ffe83d,#fff4a8,#ffe83d)', trim: '#7a5a00', loot: ['💎', '🏆', '👑', '🎟️', '🦆'] },
]

function pickType(opened: number): LockerType {
  if (opened > 0 && Math.random() < 0.09) return TYPES[3]
  const r = Math.random()
  if (opened < 2) return TYPES[0]
  if (r < 0.45) return TYPES[0]
  if (r < 0.8) return TYPES[1]
  return TYPES[2]
}

export default function LockerSmash({ onEnd }: GameProps) {
  const stage = useRef<HTMLDivElement>(null)
  const { spawn, layer } = usePopups()
  const [locker, setLocker] = useState(() => ({ type: TYPES[0], hp: TYPES[0].hp, num: 101 }))
  const [opening, setOpening] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [combo, setCombo] = useState(0)
  const [hitKey, setHitKey] = useState(0)

  const s = useRef({ score: 0, opened: 0, secrets: 0, taps: 0, combo: 0, maxCombo: 0, lastTap: 0, end: performance.now() + DURATION * 1000, done: false })
  const lockerRef = useRef(locker)
  lockerRef.current = locker
  const openingRef = useRef(false)

  const finish = useCallback(() => {
    const st = s.current
    if (st.done) return
    st.done = true
    play('gameover')
    onEnd({
      score: st.score,
      headline: 'THE BELL RANG!',
      stats: { lockersOpened: st.opened, secretLockers: st.secrets, maxCombo: st.maxCombo, buttonsClicked: 0 },
      details: [
        { label: 'LOCKERS', value: `${st.opened}` },
        { label: 'SECRET', value: `${st.secrets}` },
        { label: 'TAPS', value: `${st.taps}` },
        { label: 'MAX COMBO', value: `${st.maxCombo}x` },
      ],
    })
  }, [onEnd])

  // Timer
  useEffect(() => {
    const id = setInterval(() => {
      const left = Math.max(0, (s.current.end - performance.now()) / 1000)
      setTimeLeft(left)
      if (left <= 0) {
        clearInterval(id)
        finish()
      }
      if (performance.now() - s.current.lastTap > 400 && s.current.combo) {
        s.current.combo = 0
        setCombo(0)
      }
    }, 100)
    return () => clearInterval(id)
  }, [finish])

  const tap = useCallback(
    (x?: number, y?: number) => {
      const st = s.current
      if (st.done || openingRef.current) return
      const now = performance.now()
      st.combo = now - st.lastTap < 400 ? st.combo + 1 : 1
      st.lastTap = now
      st.taps++
      st.maxCombo = Math.max(st.maxCombo, st.combo)
      const dmg = 1 + Math.floor(st.combo / 15)
      setCombo(st.combo)
      setHitKey((k) => k + 1)
      play('hit', 0.8 + Math.random() * 0.4)
      if (st.combo > 0 && st.combo % 15 === 0) {
        play('combo')
        const r = stage.current?.getBoundingClientRect()
        spawn(`POWER x${dmg}!`, (r?.width ?? 300) / 2, 90, 'var(--color-pink)', 26)
      }
      const rect = stage.current?.getBoundingClientRect()
      if (x !== undefined && y !== undefined && rect) spawn(dmg > 1 ? `-${dmg}` : '💥', x - rect.left, y - rect.top - 10, 'var(--color-yellow)', 22)

      const cur = lockerRef.current
      const hp = cur.hp - dmg
      if (hp > 0) {
        setLocker({ ...cur, hp })
        if (dmg > 1) fx.shake('sm')
        return
      }
      // Opened!
      openingRef.current = true
      const loot = cur.type.loot[Math.floor(Math.random() * cur.type.loot.length)]
      setLocker({ ...cur, hp: 0 })
      setOpening(loot)
      st.opened++
      const pts = cur.type.reward + Math.min(st.combo, 40) * 5
      st.score += pts
      setScore(st.score)
      const cx = (rect?.width ?? 300) / 2
      const cy = (rect?.height ?? 400) / 2
      spawn(`+${pts}`, cx, cy - 60, 'var(--color-lime)', 40)
      if (cur.type.id === 'secret') {
        st.secrets++
        st.end += 3000
        spawn('+3 SEC!', cx, cy - 110, 'var(--color-blue)', 28)
        play('jackpot')
        fx.confetti(140, rect ? { x: rect.left + cx, y: rect.top + cy } : undefined)
        fx.flash('rgba(255,232,61,.4)')
        fx.shake('lg')
      } else {
        play('coin')
        fx.shake('sm')
      }
      setTimeout(() => {
        const t = pickType(st.opened)
        setLocker({ type: t, hp: t.hp, num: 100 + Math.floor(Math.random() * 900) })
        setOpening(null)
        openingRef.current = false
        if (t.id === 'secret') {
          play('achievement')
          fx.flash('rgba(255,232,61,.25)')
        }
      }, 550)
    },
    [spawn],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || (e.key !== ' ' && e.key !== 'Enter')) return
      e.preventDefault()
      tap()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tap])

  const t = locker.type
  const dmgPct = 1 - locker.hp / t.hp
  const secret = t.id === 'secret'

  return (
    <div ref={stage} className="absolute inset-0 select-none" onPointerDown={(e) => tap(e.clientX, e.clientY)} role="button" aria-label="Tap to smash the locker" tabIndex={-1}>
      {layer}
      <div className="absolute top-3 inset-x-3 flex flex-wrap gap-2 z-20 pointer-events-none">
        <ScoreDisplay label="SCORE" value={score.toLocaleString()} bump={score} />
        <ScoreDisplay label="TIME" value={timeLeft.toFixed(1)} color={timeLeft < 5 ? 'var(--color-red)' : 'var(--color-blue)'} />
        <ScoreDisplay label="COMBO" value={`${combo}x`} color="var(--color-pink)" />
        <ScoreDisplay label="OPENED" value={s.current.opened} color="var(--color-lime)" />
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center pt-16 pb-6 gap-3 pointer-events-none">
        <div key={t.id + locker.num} className="anim-pop font-display text-xl sm:text-2xl" style={{ color: secret ? 'var(--color-yellow)' : 'var(--color-ink)' }}>
          {secret && '✨ '}
          {t.name}
          {secret && ' ✨'}
        </div>
        <div className="w-56 max-w-[70%]">
          <ProgressBar value={locker.hp / t.hp} color={secret ? 'var(--color-yellow)' : 'var(--color-red)'} height={18} label="Locker durability" />
        </div>

        <div className="relative" style={{ perspective: 600 }}>
          {/* inside of the locker */}
          <div className="sticker rounded-xl relative overflow-hidden grid place-items-center" style={{ width: 'min(46vw, 190px)', height: 'min(52dvh, 320px)', background: '#0b0614' }}>
            {opening && <div className="anim-pop text-7xl">{opening}</div>}
          </div>
          {/* door */}
          <div
            key={hitKey}
            className={`absolute inset-0 rounded-xl sticker ${opening ? '' : 'anim-jiggle'}`}
            style={{
              background: t.door,
              transformOrigin: 'left center',
              transform: opening ? 'rotateY(-105deg)' : undefined,
              transition: 'transform .35s cubic-bezier(.34,1.56,.64,1)',
              boxShadow: secret ? '0 0 50px rgba(255,232,61,.8), 4px 4px 0 #0b0614' : undefined,
            }}
          >
            <div className="absolute top-4 inset-x-4 grid gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-2 rounded" style={{ background: t.trim }} />
              ))}
            </div>
            <div className="absolute top-[38%] left-1/2 -translate-x-1/2 sticker rounded-md px-2 py-0.5 font-pixel text-[0.55rem] bg-ink text-bg">{locker.num}</div>
            <div className="absolute right-3 top-1/2 w-3.5 h-12 rounded-md bg-yellow border-2 border-bg" />
            <div className="absolute right-2 top-[60%] w-8 h-8 rounded-full border-4 border-bg bg-[#ccc] grid place-items-center font-pixel text-[0.4rem] text-bg">◉</div>
            {/* dents / cracks grow with damage */}
            {dmgPct > 0.25 && <div className="absolute left-5 top-[55%] text-3xl opacity-80">💢</div>}
            {dmgPct > 0.5 && <div className="absolute left-[40%] bottom-8 w-16 h-1 bg-bg rotate-[30deg] rounded" />}
            {dmgPct > 0.5 && <div className="absolute left-[30%] bottom-12 w-10 h-1 bg-bg -rotate-[20deg] rounded" />}
            {dmgPct > 0.75 && <div className="absolute left-4 top-6 text-2xl">⚠️</div>}
          </div>
        </div>
        <div className="font-display text-lg text-dim anim-blink">TAP! TAP! TAP!</div>
      </div>
    </div>
  )
}
