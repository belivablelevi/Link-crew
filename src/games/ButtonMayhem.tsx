import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { GameProps } from './types'
import { ScoreDisplay } from '../components/ScoreDisplay'
import { usePopups } from '../components/Popups'
import { fx } from '../lib/fx'
import { play } from '../lib/sound'

type Kind = 'normal' | 'tiny' | 'moving' | 'fake' | 'bonus'

interface Btn {
  id: number
  kind: Kind
  x: number // %
  y: number // %
  vx: number
  vy: number
  size: number
  born: number
  life: number
  label: string
  color: string
}

const LIVES = 3
const LABELS = ['PRESS', 'CLICK', 'TAP', 'HIT', 'BOOP', 'YES', 'GO', 'NOW']
const COLORS = ['#3ddc84', '#4fb3ff', '#8ec2ff', '#2f6bff', '#f2a900']

export default function ButtonMayhem({ onEnd }: GameProps) {
  const stage = useRef<HTMLDivElement>(null)
  const { spawn, layer } = usePopups()
  const [btns, setBtns] = useState<Btn[]>([])
  const [hud, setHud] = useState({ score: 0, combo: 0, lives: LIVES, time: 0 })
  const g = useRef({ btns: [] as Btn[], score: 0, combo: 0, maxCombo: 0, lives: LIVES, clicks: 0, start: performance.now(), nextSpawn: 600, id: 0, over: false })
  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd

  const pop = (text: string, xPct: number, yPct: number, color: string, size = 26) => {
    const r = stage.current?.getBoundingClientRect()
    if (r) spawn(text, (xPct / 100) * r.width, (yPct / 100) * r.height - 30, color, size)
  }

  const loseLife = (reason: string, x: number, y: number) => {
    const s = g.current
    if (s.over) return
    s.lives--
    s.combo = 0
    play('error')
    fx.shake('md')
    fx.flash('rgba(255,77,94,.3)')
    pop(reason, x, y, 'var(--color-red)', 24)
    if (s.lives <= 0) {
      s.over = true
      const sec = Math.floor((performance.now() - s.start) / 1000)
      setTimeout(
        () =>
          onEndRef.current({
            score: s.score,
            headline: 'BUTTONED OUT!',
            stats: { buttonsClicked: s.clicks, maxCombo: s.maxCombo },
            details: [
              { label: 'BUTTONS', value: `${s.clicks}` },
              { label: 'MAX COMBO', value: `${s.maxCombo}x` },
              { label: 'SURVIVED', value: `${sec}s` },
            ],
          }),
        600,
      )
    }
  }

  useEffect(() => {
    let raf = 0
    let prev = performance.now()
    const s = g.current
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (s.over) return
      const dt = Math.min(50, now - prev)
      prev = now
      const t = (now - s.start) / 1000

      // Spawning ramps up over time.
      s.nextSpawn -= dt
      const maxOnScreen = Math.min(6, 1 + Math.floor(t / 7))
      if (s.nextSpawn <= 0 && s.btns.length < maxOnScreen) {
        s.nextSpawn = Math.max(320, 950 - t * 18)
        const r = Math.random()
        let kind: Kind = 'normal'
        if (t > 6 && r < 0.18) kind = 'fake'
        else if (t > 10 && r < 0.32) kind = 'tiny'
        else if (t > 14 && r < 0.5) kind = 'moving'
        else if (r > 0.94) kind = 'bonus'
        const lifeBase = Math.max(900, 1900 - t * 22)
        const size = kind === 'tiny' ? 46 : kind === 'bonus' ? 64 : kind === 'moving' ? 72 : kind === 'fake' ? 82 : Math.max(64, 96 - t)
        const sp = kind === 'moving' ? 0.018 + Math.random() * 0.02 : 0
        const ang = Math.random() * Math.PI * 2
        s.btns.push({
          id: s.id++,
          kind,
          x: 10 + Math.random() * 80,
          y: 22 + Math.random() * 66,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp,
          size,
          born: now,
          life: kind === 'bonus' ? 1100 : kind === 'fake' ? lifeBase * 1.3 : kind === 'moving' ? lifeBase * 1.3 : lifeBase,
          label: kind === 'fake' ? '☠ NOPE' : kind === 'bonus' ? '★' : LABELS[Math.floor(Math.random() * LABELS.length)],
          color: kind === 'fake' ? '#ff4d5e' : kind === 'bonus' ? '#ffc72c' : COLORS[Math.floor(Math.random() * COLORS.length)],
        })
        play('tick', 0.8 + Math.random() * 0.5)
      }

      for (const b of s.btns) {
        b.x += b.vx * dt
        b.y += b.vy * dt
        if (b.x < 8 || b.x > 92) b.vx *= -1
        if (b.y < 20 || b.y > 90) b.vy *= -1
      }
      const expired = s.btns.filter((b) => now - b.born > b.life)
      s.btns = s.btns.filter((b) => now - b.born <= b.life)
      for (const b of expired) {
        if (b.kind !== 'fake' && b.kind !== 'bonus') loseLife('MISSED!', b.x, b.y)
      }
      setBtns([...s.btns])
      setHud({ score: s.score, combo: s.combo, lives: s.lives, time: Math.floor(t) })
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const hit = (b: Btn) => {
    const s = g.current
    if (s.over || !s.btns.find((x) => x.id === b.id)) return
    s.btns = s.btns.filter((x) => x.id !== b.id)
    if (b.kind === 'fake') {
      loseLife('THAT WAS FAKE!', b.x, b.y)
      return
    }
    s.clicks++
    s.combo++
    s.maxCombo = Math.max(s.maxCombo, s.combo)
    const mult = 1 + Math.floor(s.combo / 10)
    const base = b.kind === 'bonus' ? 100 : b.kind === 'tiny' ? 25 : b.kind === 'moving' ? 20 : 10
    const pts = base * mult
    s.score += pts
    pop(`+${pts}`, b.x, b.y, b.kind === 'bonus' ? 'var(--color-yellow)' : 'var(--color-lime)', b.kind === 'bonus' ? 34 : 24)
    if (b.kind === 'bonus') {
      play('jackpot')
      fx.flash('rgba(255,199,44,.3)')
      const r = stage.current?.getBoundingClientRect()
      if (r) fx.confetti(60, { x: r.left + (b.x / 100) * r.width, y: r.top + (b.y / 100) * r.height })
    } else play('pop', 1 + Math.min(s.combo, 30) * 0.02)
    if (s.combo % 10 === 0) {
      play('combo')
      pop(`${s.combo} COMBO! x${mult}`, 50, 18, 'var(--color-pink)', 30)
      fx.shake('sm')
    }
  }

  const hearts = Array.from({ length: LIVES }, (_, i) => (i < hud.lives ? '❤️' : '🖤')).join('')

  return (
    <div
      ref={stage}
      className="absolute inset-0 overflow-hidden"
      onPointerDown={(e) => {
        if (e.target !== e.currentTarget) return
        const s = g.current
        if (s.combo > 0) {
          s.combo = 0
          const r = stage.current!.getBoundingClientRect()
          spawn('COMBO LOST', e.clientX - r.left, e.clientY - r.top, 'var(--color-dim)', 18)
          play('miss')
        }
      }}
    >
      {layer}
      <div className="absolute top-3 inset-x-3 flex flex-wrap gap-2 z-20 pointer-events-none">
        <ScoreDisplay label="SCORE" value={hud.score.toLocaleString()} bump={hud.score} />
        <ScoreDisplay label="COMBO" value={`${hud.combo}x`} color="var(--color-pink)" />
        <ScoreDisplay label="LIVES" value={hearts} color="var(--color-red)" />
        <ScoreDisplay label="TIME" value={`${hud.time}s`} color="var(--color-blue)" className="hidden sm:block" />
      </div>
      {btns.map((b) => {
        const age = Math.min(1, (performance.now() - b.born) / b.life)
        return (
          <button
            key={b.id}
            onPointerDown={(e) => {
              e.stopPropagation()
              e.preventDefault()
              hit(b)
            }}
            aria-label={b.kind === 'fake' ? 'Fake button, do not press' : b.kind === 'bonus' ? 'Bonus button' : 'Button'}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full sticker font-display grid place-items-center anim-pop"
            style={
              {
                left: `${b.x}%`,
                top: `${b.y}%`,
                width: b.size,
                height: b.size,
                background: b.kind === 'bonus' ? 'radial-gradient(circle at 35% 30%,#fff7c2,#ffc72c 50%,#f2a900)' : b.color,
                color: '#071022',
                fontSize: b.kind === 'bonus' ? 30 : b.kind === 'tiny' ? 9 : b.kind === 'fake' ? 13 : 14,
                boxShadow: `0 5px 0 #071022, 0 0 ${b.kind === 'bonus' ? 40 : 16}px ${b.color}`,
                opacity: 1 - Math.max(0, age - 0.75) * 2.5,
                outline: b.kind === 'fake' ? '3px dashed #071022' : undefined,
                outlineOffset: -9,
              } as CSSProperties
            }
          >
            {b.label}
            {/* countdown ring */}
            <svg className="absolute inset-[-6px] pointer-events-none" viewBox="0 0 100 100" aria-hidden>
              <circle cx="50" cy="50" r="47" fill="none" stroke={b.kind === 'fake' ? 'transparent' : '#fff'} strokeOpacity=".6" strokeWidth="4" strokeDasharray={`${(1 - age) * 295} 295`} transform="rotate(-90 50 50)" />
            </svg>
          </button>
        )
      })}
    </div>
  )
}
