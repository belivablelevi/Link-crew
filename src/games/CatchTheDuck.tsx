import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameProps } from './types'
import { ScoreDisplay } from '../components/ScoreDisplay'
import { ProgressBar } from '../components/ProgressBar'
import { usePopups } from '../components/Popups'
import { fx } from '../lib/fx'
import { play } from '../lib/sound'

const DURATION = 30

type DuckKind = 'normal' | 'golden' | 'diamond' | 'fake'
const VALUE: Record<DuckKind, number> = { normal: 1, golden: 10, diamond: 50, fake: -10 }
const LINES: Record<DuckKind, string[]> = {
  normal: ['QUACK!', 'GOT IT!', 'DUCKED!', 'NICE!'],
  golden: ['GOLDEN!!', 'SHINY QUACK!', '24 KARAT!'],
  diamond: ['DIAMOND DUCK?!', 'LEGENDARY!!!', 'BLING QUACK!'],
  fake: ['DECOY! 🤡', 'FAKE DUCK!', 'BAMBOOZLED!'],
}

interface Duck {
  id: number
  kind: DuckKind
  x: number
  y: number
  flip: boolean
  born: number
}

function rollKind(t: number): DuckKind {
  const r = Math.random()
  if (r < 0.03 + t * 0.001) return 'diamond'
  if (r < 0.16) return 'golden'
  if (r < 0.32) return 'fake'
  return 'normal'
}

/** Hand-drawn SVG duck so every type looks distinct (not just a colour swap). */
function DuckSprite({ kind }: { kind: DuckKind }) {
  const body = { normal: '#ffd23d', golden: '#ffb800', diamond: '#7ff6ff', fake: '#b48cff' }[kind]
  const shade = { normal: '#e0a800', golden: '#c27c00', diamond: '#22b8d6', fake: '#7a4fd6' }[kind]
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[3px_4px_0_#071022]" aria-hidden>
      {kind === 'golden' && <circle cx="50" cy="55" r="46" fill="#ffc72c" opacity=".35" />}
      {kind === 'diamond' && <polygon points="50,2 98,50 50,98 2,50" fill="#4fb3ff" opacity=".25" />}
      <ellipse cx="52" cy="66" rx="36" ry="24" fill={body} stroke="#071022" strokeWidth="4" />
      <path d="M30 62 Q48 50 62 66 Q46 74 30 62Z" fill={shade} stroke="#071022" strokeWidth="3" />
      <circle cx="30" cy="36" r="20" fill={body} stroke="#071022" strokeWidth="4" />
      <path d="M8 36 L-4 41 L8 46 Z" fill="#f2a900" stroke="#071022" strokeWidth="3" transform="translate(4 0)" />
      <circle cx="26" cy="32" r="4.5" fill="#071022" />
      <circle cx="27.5" cy="30.5" r="1.5" fill="#fff" />
      {kind === 'fake' && (
        <>
          <path d="M17 22 L33 27" stroke="#071022" strokeWidth="4" strokeLinecap="round" />
          <rect x="44" y="76" width="44" height="16" rx="4" fill="#ff4d5e" stroke="#071022" strokeWidth="3" />
          <text x="66" y="88" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff" fontFamily="Inter, sans-serif">
            DECOY
          </text>
        </>
      )}
      {kind === 'golden' && <text x="78" y="30" fontSize="22">✨</text>}
      {kind === 'diamond' && (
        <>
          <path d="M40 66 L52 50 L64 66 L52 82 Z" fill="#fff" opacity=".7" />
          <text x="76" y="28" fontSize="22">💎</text>
        </>
      )}
    </svg>
  )
}

export default function CatchTheDuck({ onEnd }: GameProps) {
  const stage = useRef<HTMLDivElement>(null)
  const { spawn, layer } = usePopups()
  const [ducks, setDucks] = useState<Duck[]>([])
  const [hud, setHud] = useState({ score: 0, caught: 0, combo: 0, left: DURATION })
  const g = useRef({ score: 0, caught: 0, combo: 0, maxCombo: 0, id: 0, start: performance.now(), over: false, ducks: [] as Duck[] })

  const newDuck = useCallback((t: number): Duck => ({ id: g.current.id++, kind: rollKind(t), x: 10 + Math.random() * 80, y: 25 + Math.random() * 62, flip: Math.random() < 0.5, born: performance.now() }), [])

  const sync = () => setDucks([...g.current.ducks])

  const finish = useCallback(() => {
    const st = g.current
    if (st.over) return
    st.over = true
    play('victory')
    onEnd({
      score: st.score,
      headline: st.caught >= 40 ? 'DUCK LORD!' : 'TIME’S UP!',
      stats: { ducksCaught: st.caught, maxCombo: st.maxCombo },
      details: [
        { label: 'DUCKS', value: `${st.caught}` },
        { label: 'MAX COMBO', value: `${st.maxCombo}x` },
      ],
    })
  }, [onEnd])

  // Game clock: spawns, hops and despawns.
  useEffect(() => {
    const st = g.current
    st.ducks = [newDuck(0)]
    st.ducks[0].kind = 'normal'
    sync()
    let lastHop = performance.now()
    const id = setInterval(() => {
      if (st.over) return
      const now = performance.now()
      const t = (now - st.start) / 1000
      const left = Math.max(0, DURATION - t)
      const want = t < 10 ? 1 : t < 20 ? 2 : 3
      while (st.ducks.length < want) st.ducks.push(newDuck(t))
      const hopMs = Math.max(480, 950 - t * 16)
      if (now - lastHop > hopMs) {
        lastHop = now
        st.ducks = st.ducks.map((d) => {
          // decoys and diamonds don't stick around
          if ((d.kind === 'fake' && now - d.born > 2600) || (d.kind === 'diamond' && now - d.born > 1800)) return newDuck(t)
          const nx = 10 + Math.random() * 80
          return { ...d, x: nx, y: 25 + Math.random() * 62, flip: nx > d.x }
        })
        play('whoosh')
      }
      sync()
      setHud((h) => ({ ...h, left }))
      if (left <= 0) {
        clearInterval(id)
        finish()
      }
    }, 100)
    return () => clearInterval(id)
  }, [finish, newDuck])

  const grab = (d: Duck, cx: number, cy: number) => {
    const st = g.current
    if (st.over || !st.ducks.find((x) => x.id === d.id)) return
    const t = (performance.now() - st.start) / 1000
    const r = stage.current!.getBoundingClientRect()
    const px = cx - r.left
    const py = cy - r.top
    st.ducks = st.ducks.map((x) => (x.id === d.id ? newDuck(t) : x))
    sync()
    const line = LINES[d.kind][Math.floor(Math.random() * LINES[d.kind].length)]
    if (d.kind === 'fake') {
      st.score = Math.max(0, st.score - 10)
      st.combo = 0
      play('error')
      fx.shake('md')
      fx.flash('rgba(120,160,255,.35)')
      spawn(`-10 ${line}`, px, py - 20, 'var(--color-red)', 26)
    } else {
      st.caught++
      st.combo++
      st.maxCombo = Math.max(st.maxCombo, st.combo)
      const comboBonus = st.combo % 10 === 0 ? 5 : 0
      const pts = VALUE[d.kind] + comboBonus
      st.score += pts
      play('quack', d.kind === 'normal' ? 1 : d.kind === 'golden' ? 1.3 : 1.6)
      spawn(`+${pts} ${line}`, px, py - 20, d.kind === 'normal' ? 'var(--color-yellow)' : d.kind === 'golden' ? 'var(--color-orange)' : 'var(--color-blue)', d.kind === 'normal' ? 22 : 32)
      if (d.kind !== 'normal') {
        play(d.kind === 'diamond' ? 'jackpot' : 'coin')
        fx.confetti(d.kind === 'diamond' ? 160 : 60, { x: cx, y: cy }, 'ducks')
        fx.shake(d.kind === 'diamond' ? 'lg' : 'sm')
        fx.flash(d.kind === 'diamond' ? 'rgba(79,179,255,.35)' : 'rgba(255,199,44,.3)')
      }
      if (comboBonus) {
        play('combo')
        spawn(`${st.combo} COMBO +5`, r.width / 2, 80, 'var(--color-pink)', 26)
      }
    }
    setHud((h) => ({ ...h, score: st.score, caught: st.caught, combo: st.combo }))
  }

  return (
    <div
      ref={stage}
      className="absolute inset-0 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, transparent 60%, rgba(79,179,255,.12) 60%, rgba(0,120,200,.25))' }}
      onPointerDown={(e) => {
        if (e.target !== e.currentTarget) return
        const st = g.current
        if (st.combo) {
          st.combo = 0
          setHud((h) => ({ ...h, combo: 0 }))
        }
        const r = stage.current!.getBoundingClientRect()
        spawn('MISS', e.clientX - r.left, e.clientY - r.top, 'var(--color-dim)', 16)
      }}
    >
      {layer}
      <div className="absolute top-3 inset-x-3 z-20 pointer-events-none grid gap-2">
        <div className="flex flex-wrap gap-2">
          <ScoreDisplay label="SCORE" value={hud.score} bump={hud.score} />
          <ScoreDisplay label="DUCKS" value={hud.caught} color="var(--color-lime)" />
          <ScoreDisplay label="COMBO" value={`${hud.combo}x`} color="var(--color-pink)" />
          <ScoreDisplay label="TIME" value={Math.ceil(hud.left)} color={hud.left < 6 ? 'var(--color-red)' : 'var(--color-blue)'} />
        </div>
        <ProgressBar value={hud.left / DURATION} height={12} color="var(--color-yellow)" label="Time left" />
      </div>
      {/* pond reeds */}
      <div className="absolute bottom-0 inset-x-0 h-10 pointer-events-none opacity-70 text-3xl flex justify-around" aria-hidden>
        <span>🌾</span>
        <span>🍂</span>
        <span>🌾</span>
        <span>🍁</span>
        <span>🌾</span>
      </div>
      {ducks.map((d) => (
        <button
          key={d.id}
          onPointerDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            grab(d, e.clientX, e.clientY)
          }}
          aria-label={d.kind === 'fake' ? 'Decoy duck: minus 10' : `${d.kind} duck`}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: d.kind === 'diamond' ? 78 : 92,
            height: d.kind === 'diamond' ? 78 : 92,
            transition: 'left .22s cubic-bezier(.34,1.56,.64,1), top .22s cubic-bezier(.34,1.56,.64,1)',
          }}
        >
          <span className="block w-full h-full" style={{ transform: d.flip && d.kind !== 'fake' ? 'scaleX(-1)' : undefined }}>
            <span className="block w-full h-full anim-pop">
              <DuckSprite kind={d.kind} />
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}
