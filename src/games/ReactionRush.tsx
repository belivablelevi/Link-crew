import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameProps } from './types'
import { ScoreDisplay } from '../components/ScoreDisplay'
import { usePopups } from '../components/Popups'
import { fx } from '../lib/fx'
import { play } from '../lib/sound'

const ROUNDS = 12
const GO_TIMEOUT = 1500

type Phase = 'waiting' | 'go' | 'feedback'

function verdict(ms: number): { text: string; color: string; big?: boolean } {
  if (ms < 180) return { text: 'ARE YOU EVEN HUMAN?', color: 'var(--color-pink)', big: true }
  if (ms < 230) return { text: 'INSANE!', color: 'var(--color-lime)', big: true }
  if (ms < 280) return { text: 'LIGHTNING!', color: 'var(--color-yellow)', big: true }
  if (ms < 350) return { text: 'FAST!', color: 'var(--color-blue)' }
  if (ms < 450) return { text: 'NICE', color: 'var(--color-ink)' }
  return { text: 'SLEEPY…', color: 'var(--color-dim)' }
}

export default function ReactionRush({ onEnd }: GameProps) {
  const stage = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const { spawn, layer } = usePopups()

  const [round, setRound] = useState(1)
  const [phase, setPhase] = useState<Phase>('waiting')
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [last, setLast] = useState<{ text: string; color: string; ms?: number } | null>(null)
  const [times, setTimes] = useState<number[]>([])
  const [pos, setPos] = useState({ x: 50, y: 50 })

  const goAt = useRef(0)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const maxCombo = useRef(0)
  const moveRaf = useRef(0)
  const scoreRef = useRef(0)
  const timesRef = useRef<number[]>([])

  const size = round <= 3 ? 220 : round <= 6 ? 160 : round <= 9 ? 130 : 105
  const moving = round >= 7
  const randomPos = round >= 4

  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms))
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const finish = useCallback(() => {
    const t = timesRef.current
    const best = t.length ? Math.min(...t) : undefined
    const avg = t.length ? Math.round(t.reduce((a, b) => a + b, 0) / t.length) : undefined
    onEnd({
      score: scoreRef.current,
      headline: best && best < 230 ? 'LIGHTNING HANDS!' : 'TIME’S UP!',
      stats: { bestReactionMs: best, avgReactionMs: avg, maxCombo: maxCombo.current },
      details: [
        { label: 'BEST', value: best ? `${Math.round(best)}ms` : '—' },
        { label: 'AVERAGE', value: avg ? `${avg}ms` : '—' },
        { label: 'HITS', value: `${t.length}/${ROUNDS}` },
        { label: 'MAX COMBO', value: `${maxCombo.current}x` },
      ],
    })
  }, [onEnd])

  const roundRef = useRef(1)
  const nextRound = useCallback(() => {
    if (roundRef.current >= ROUNDS) {
      finish()
      return
    }
    roundRef.current += 1
    setRound(roundRef.current)
    setPhase('waiting')
  }, [finish])

  // Waiting → Go after a random delay.
  useEffect(() => {
    if (phase !== 'waiting') return
    const delay = 900 + Math.random() * (round > 6 ? 1600 : 2200)
    const t = setTimeout(() => {
      if (randomPos) setPos({ x: 15 + Math.random() * 70, y: 22 + Math.random() * 60 })
      else setPos({ x: 50, y: 52 })
      setPhase('go')
    }, delay)
    return () => clearTimeout(t)
  }, [phase, round, randomPos])

  // When the button shows: start the clock on the next frame and arm the timeout.
  useEffect(() => {
    if (phase !== 'go') return
    let raf = requestAnimationFrame((ts) => {
      goAt.current = ts
    })
    const timeout = setTimeout(() => {
      play('miss')
      setCombo(0)
      setLast({ text: 'TOO SLOW!', color: 'var(--color-red)' })
      setPhase('feedback')
      later(nextRound, 800)
    }, GO_TIMEOUT)

    // Moving buttons drift around the stage.
    if (moving && stage.current && btn.current) {
      const speed = round >= 10 ? 0.06 : 0.035
      let x = pos.x
      let y = pos.y
      let vx = (Math.random() < 0.5 ? -1 : 1) * speed
      let vy = (Math.random() < 0.5 ? -1 : 1) * speed * 0.8
      let prev = performance.now()
      const step = (now: number) => {
        const dt = Math.min(40, now - prev)
        prev = now
        x += vx * dt
        y += vy * dt
        if (x < 12 || x > 88) vx *= -1
        if (y < 20 || y > 82) vy *= -1
        if (btn.current) {
          btn.current.style.left = `${x}%`
          btn.current.style.top = `${y}%`
        }
        moveRaf.current = requestAnimationFrame(step)
      }
      moveRaf.current = requestAnimationFrame(step)
    }
    return () => {
      cancelAnimationFrame(raf)
      cancelAnimationFrame(moveRaf.current)
      clearTimeout(timeout)
      raf = 0
    }
  }, [phase])

  const hit = useCallback(
    (clientX?: number, clientY?: number) => {
      if (phase !== 'go') return
      const ms = Math.max(80, performance.now() - goAt.current)
      const v = verdict(ms)
      const newCombo = ms < 400 ? combo + 1 : 0
      maxCombo.current = Math.max(maxCombo.current, newCombo)
      const pts = Math.round((Math.max(20, 1100 - 2 * ms) + round * 10) * (1 + newCombo * 0.1))
      scoreRef.current += pts
      timesRef.current = [...timesRef.current, ms]
      setTimes(timesRef.current)
      setScore(scoreRef.current)
      setCombo(newCombo)
      setLast({ ...v, ms })
      setPhase('feedback')

      const rect = stage.current?.getBoundingClientRect()
      const px = rect && clientX !== undefined ? clientX - rect.left : (rect?.width ?? 300) / 2
      const py = rect && clientY !== undefined ? clientY - rect.top : (rect?.height ?? 300) / 2
      spawn(`+${pts}`, px, py - 30, v.color, 30)
      if (v.big) {
        play('combo', 1 + Math.min(newCombo, 8) * 0.06)
        fx.flash('rgba(61,220,132,.25)')
        fx.shake(ms < 200 ? 'lg' : 'sm')
        if (ms < 230) fx.confetti(50, { x: (rect?.left ?? 0) + px, y: (rect?.top ?? 0) + py })
      } else play('hit')
      later(nextRound, 750)
    },
    [phase, combo, round, spawn, nextRound],
  )

  const tooSoon = useCallback(() => {
    if (phase !== 'waiting') return
    play('error')
    fx.shake('sm')
    scoreRef.current = Math.max(0, scoreRef.current - 100)
    setScore(scoreRef.current)
    setCombo(0)
    setLast({ text: 'TOO SOON!', color: 'var(--color-red)' })
    setPhase('feedback')
    later(nextRound, 900)
  }, [phase, nextRound])

  // Keyboard: SPACE / ENTER taps.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || (e.key !== ' ' && e.key !== 'Enter')) return
      e.preventDefault()
      if (phase === 'go') hit()
      else tooSoon()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, hit, tooSoon])

  const best = times.length ? Math.round(Math.min(...times)) : null
  const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null

  return (
    <div
      ref={stage}
      className="absolute inset-0"
      onPointerDown={(e) => {
        if (e.target === btn.current || btn.current?.contains(e.target as Node)) return
        if (phase === 'waiting') tooSoon()
        else if (phase === 'go') {
          const r = stage.current!.getBoundingClientRect()
          spawn('WHIFF', e.clientX - r.left, e.clientY - r.top, 'var(--color-dim)', 18)
        }
      }}
      style={{ background: phase === 'waiting' ? 'radial-gradient(circle at 50% 50%, rgba(255,77,94,.15), transparent 70%)' : undefined }}
    >
      {layer}
      <div className="absolute top-3 inset-x-3 flex flex-wrap gap-2 z-20 pointer-events-none">
        <ScoreDisplay label="SCORE" value={score.toLocaleString()} bump={score} />
        <ScoreDisplay label="ROUND" value={`${round}/${ROUNDS}`} color="var(--color-blue)" />
        <ScoreDisplay label="COMBO" value={`${combo}x`} color="var(--color-pink)" bump={combo} />
        <ScoreDisplay label="BEST" value={best ? `${best}ms` : '—'} color="var(--color-lime)" className="hidden sm:block" />
        <ScoreDisplay label="AVG" value={avg ? `${avg}ms` : '—'} color="var(--color-orange)" className="hidden sm:block" />
      </div>

      {phase === 'waiting' && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none text-center">
          <div>
            <div className="font-display text-4xl sm:text-6xl text-red anim-blink">WAIT FOR IT…</div>
            <div className="font-pixel text-[0.75rem] text-dim mt-3">{round >= 7 ? 'IT WILL MOVE.' : round >= 4 ? 'IT COULD BE ANYWHERE.' : 'DON’T TAP YET'}</div>
          </div>
        </div>
      )}

      {phase === 'go' && (
        <button
          ref={btn}
          onPointerDown={(e) => {
            e.preventDefault()
            hit(e.clientX, e.clientY)
          }}
          aria-label="TAP NOW"
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full sticker grid place-items-center font-display text-white anim-pop z-10"
          style={{
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            width: size,
            height: size,
            fontSize: size / 5,
            background: 'radial-gradient(circle at 35% 30%, #a6ffbf, #3ddc84 45%, #0f9e3a)',
            boxShadow: '0 8px 0 #071022, 0 0 60px rgba(61,220,132,.7)',
            textShadow: '2px 2px 0 #071022',
          }}
        >
          TAP!
        </button>
      )}

      {phase === 'feedback' && last && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none text-center px-4">
          <div className="anim-pop">
            <div className="font-display title-outline text-4xl sm:text-7xl leading-none" style={{ color: last.color }}>
              {last.text}
            </div>
            {last.ms && <div className="font-display text-3xl mt-3 tabular-nums">{Math.round(last.ms)}ms</div>}
          </div>
        </div>
      )}
    </div>
  )
}
