import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import type { GameProps } from './types'
import { ScoreDisplay } from '../components/ScoreDisplay'
import { usePopups } from '../components/Popups'
import { fx } from '../lib/fx'
import { play } from '../lib/sound'

const BOSS_HP = 50000
const PLAYER_HP = 100
const DURATION = 75
const CRIT_CHANCE = 0.12

interface Attack {
  id: string
  name: string
  icon: string
  min: number
  max: number
  cooldown: number // ms
  color: string
  unlock: string
  isUnlocked: (bossPct: number, combo: number, t: number) => boolean
}

const ATTACKS: Attack[] = [
  { id: 'slap', name: 'SLAP', icon: '👋', min: 22, max: 34, cooldown: 0, color: '#ffc72c', unlock: '', isUnlocked: () => true },
  { id: 'pizza', name: 'COCOA SPLASH', icon: '☕', min: 450, max: 650, cooldown: 3000, color: '#f2a900', unlock: '10 COMBO', isUnlocked: (_p, c, t) => c >= 10 || t > 12 },
  { id: 'spirit', name: 'SPIRIT BLAST', icon: '🔥', min: 1500, max: 2100, cooldown: 7000, color: '#8ec2ff', unlock: 'BOSS < 70%', isUnlocked: (p) => p < 0.7 },
  { id: 'duck', name: 'DUCK STORM', icon: '🦆', min: 3500, max: 4600, cooldown: 14000, color: '#4fb3ff', unlock: 'BOSS < 35%', isUnlocked: (p) => p < 0.35 },
]

const BOSS_TAUNTS = ['YOU CALL THAT A SLAP?', 'I AM INEVITABLE (AND SEASONAL)', 'PREPARE FOR POP QUIZ DAMAGE', 'WINTER IS FOREVER', 'HOMEWORK INCOMING!']
const BOSS_MOVES = ['HOMEWORK AVALANCHE', 'POP QUIZ BLIZZARD', 'SNOWBALL SLAM', 'FROSTY BREATH', 'DETENTION BEAM']

function Frostzilla({ phase, hitKey, winding, dead }: { phase: number; hitKey: number; winding: boolean; dead: boolean }) {
  const body = phase === 1 ? '#f6faff' : phase === 2 ? '#bfe6ff' : '#ffc2ca'
  return (
    <div key={hitKey} className={hitKey ? 'anim-jiggle' : ''} style={{ filter: winding ? 'drop-shadow(0 0 30px #7fd4ff)' : undefined }}>
      <svg viewBox="0 -6 200 212" className="w-full h-full" aria-hidden style={{ transform: dead ? 'rotate(90deg) translateY(40px)' : phase === 3 ? 'scale(1.08)' : undefined, transition: 'transform .6s', opacity: dead ? 0.6 : 1 }}>
        {/* icicle horns (phase 3) */}
        {phase === 3 && (
          <>
            <path d="M62 40 L44 2 L78 30 Z" fill="#bff1ff" stroke="#071022" strokeWidth="4" />
            <path d="M138 40 L156 2 L122 30 Z" fill="#bff1ff" stroke="#071022" strokeWidth="4" />
          </>
        )}
        {/* body + head */}
        <circle cx="100" cy="148" r="50" fill={body} stroke="#071022" strokeWidth="6" />
        <circle cx="100" cy="72" r="46" fill={body} stroke="#071022" strokeWidth="6" />
        {/* coal buttons */}
        <circle cx="100" cy="138" r="5" fill="#071022" />
        <circle cx="100" cy="160" r="5" fill="#071022" />
        {/* scarf */}
        <path d="M58 106 Q100 124 142 106 L142 118 Q100 136 58 118 Z" fill="#e63946" stroke="#071022" strokeWidth="4" strokeLinejoin="round" />
        <path d="M120 120 L128 158 L114 156 L108 122 Z" fill="#e63946" stroke="#071022" strokeWidth="4" strokeLinejoin="round" />
        {/* top hat */}
        <rect x="62" y="28" width="76" height="9" rx="3" fill="#1b2240" stroke="#071022" strokeWidth="4" />
        <rect x="74" y="0" width="52" height="32" rx="3" fill="#1b2240" stroke="#071022" strokeWidth="4" />
        <rect x="74" y="20" width="52" height="7" fill="#e63946" />
        {/* angry coal eyes */}
        <path d={dead ? 'M66 58 l16 16 m0 -16 l-16 16' : 'M64 56 L92 68 L68 76 Z'} fill="#071022" stroke="#071022" strokeWidth="5" strokeLinejoin="round" />
        <path d={dead ? 'M118 58 l16 16 m0 -16 l-16 16' : 'M136 56 L108 68 L132 76 Z'} fill="#071022" stroke="#071022" strokeWidth="5" strokeLinejoin="round" />
        {/* carrot nose */}
        <path d="M100 80 L132 88 L100 92 Z" fill="#f28c1f" stroke="#071022" strokeWidth="3" strokeLinejoin="round" />
        {/* mouth */}
        <path
          d={winding ? 'M74 98 Q100 122 126 98 Q100 108 74 98Z' : 'M76 100 L86 96 L94 102 L102 96 L110 102 L118 96 L126 100'}
          fill={winding ? '#071022' : 'none'}
          stroke="#071022"
          strokeWidth="5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {phase >= 2 && <path d="M136 132 l10 14 l-12 -4 l6 14" stroke="#071022" strokeWidth="3" fill="none" />}
      </svg>
    </div>
  )
}

export default function WinterFestBoss({ onEnd }: GameProps) {
  const stage = useRef<HTMLDivElement>(null)
  const { spawn, layer } = usePopups()
  const g = useRef({ bossHp: BOSS_HP, hp: PLAYER_HP, dmg: 0, combo: 0, maxCombo: 0, lastHit: 0, crits: 0, start: performance.now(), over: false, cds: {} as Record<string, number>, windupUntil: 0, nextAttack: performance.now() + 7000, blocked: 0 })
  const [, force] = useState(0)
  const [hitKey, setHitKey] = useState(0)
  const [taunt, setTaunt] = useState<string>('I AM FROSTZILLA. FEEL THE CHILL.')
  const [banner, setBanner] = useState<string | null>(null)
  const [winding, setWinding] = useState<string | null>(null)
  const phaseRef = useRef(1)
  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd

  const st = g.current
  const bossPct = st.bossHp / BOSS_HP
  const phase = bossPct > 0.66 ? 1 : bossPct > 0.33 ? 2 : 3
  const elapsed = (performance.now() - st.start) / 1000
  const left = Math.max(0, DURATION - elapsed)

  const end = useCallback((won: boolean) => {
    const s = g.current
    if (s.over) return
    s.over = true
    setWinding(null)
    const tLeft = Math.max(0, DURATION - (performance.now() - s.start) / 1000)
    const bonus = won ? 5000 + Math.round(tLeft * 200) + s.hp * 20 : 0
    if (won) {
      play('victory')
      fx.confetti(260)
      fx.shake('lg')
      fx.flash('rgba(255,255,255,.6)')
      setBanner('BOSS DEFEATED!')
    } else {
      play('gameover')
      fx.shake('md')
      setBanner(s.hp <= 0 ? 'YOU GOT FROZEN' : 'TIME’S UP!')
    }
    force((n) => n + 1)
    setTimeout(
      () =>
        onEndRef.current({
          score: s.dmg + bonus,
          headline: won ? 'BOSS DEFEATED!' : s.hp <= 0 ? 'KNOCKED OUT!' : 'IT ESCAPED!',
          stats: { bossDefeated: won, bossDamage: s.dmg, maxCombo: s.maxCombo, criticalHits: s.crits },
          details: [
            { label: 'DAMAGE', value: s.dmg.toLocaleString() },
            { label: 'CRITS', value: `${s.crits}` },
            { label: 'MAX COMBO', value: `${s.maxCombo}x` },
            { label: 'BLOCKS', value: `${s.blocked}` },
            ...(won ? [{ label: 'VICTORY BONUS', value: `+${bonus.toLocaleString()}` }] : []),
          ],
        }),
      won ? 1800 : 1100,
    )
  }, [])

  // Main clock: boss attacks, phases, timer.
  useEffect(() => {
    const id = setInterval(() => {
      const s = g.current
      if (s.over) return
      const now = performance.now()
      if (now - s.lastHit > 900 && s.combo) s.combo = 0
      const t = (now - s.start) / 1000
      if (t >= DURATION) return end(false)

      const pct = s.bossHp / BOSS_HP
      const ph = pct > 0.66 ? 1 : pct > 0.33 ? 2 : 3
      if (ph !== phaseRef.current) {
        phaseRef.current = ph
        setBanner(ph === 2 ? 'PHASE 2: IT’S GETTING CHILLY' : 'FINAL FORM!!!')
        setTimeout(() => setBanner(null), 1800)
        play('levelup')
        fx.shake('lg')
        fx.flash('rgba(255,77,94,.35)')
      }

      if (!s.windupUntil && now >= s.nextAttack) {
        const move = BOSS_MOVES[Math.floor(Math.random() * BOSS_MOVES.length)]
        s.windupUntil = now + (ph === 3 ? 1100 : 1400)
        setWinding(move)
        play('error')
      } else if (s.windupUntil && now >= s.windupUntil) {
        // Not blocked, ouch.
        s.windupUntil = 0
        s.nextAttack = now + (ph === 1 ? 7000 : ph === 2 ? 5500 : 4200) + Math.random() * 2000
        setWinding(null)
        const dmg = ph === 3 ? 30 : 22
        s.hp = Math.max(0, s.hp - dmg)
        s.combo = 0
        play('hit', 0.6)
        fx.shake('lg')
        fx.flash('rgba(255,77,94,.45)')
        const r = stage.current?.getBoundingClientRect()
        spawn(`-${dmg} HP`, (r?.width ?? 300) / 2, (r?.height ?? 400) * 0.7, 'var(--color-red)', 36)
        setTaunt(BOSS_TAUNTS[Math.floor(Math.random() * BOSS_TAUNTS.length)])
        if (s.hp <= 0) return end(false)
      }
      force((n) => n + 1)
    }, 100)
    return () => clearInterval(id)
  }, [end, spawn])

  const block = useCallback(() => {
    const s = g.current
    if (s.over || !s.windupUntil) return false
    s.windupUntil = 0
    s.blocked++
    s.nextAttack = performance.now() + 5000 + Math.random() * 2500
    setWinding(null)
    const counter = 500
    s.bossHp = Math.max(0, s.bossHp - counter)
    s.dmg += counter
    play('combo')
    fx.flash('rgba(79,179,255,.35)')
    const r = stage.current?.getBoundingClientRect()
    spawn(`BLOCKED! COUNTER -${counter}`, (r?.width ?? 300) / 2, (r?.height ?? 400) * 0.45, 'var(--color-blue)', 28)
    setTaunt('HOW DARE YOU BLOCK ME')
    if (s.bossHp <= 0) end(true)
    force((n) => n + 1)
    return true
  }, [end, spawn])

  const attack = useCallback(
    (a: Attack) => {
      const s = g.current
      if (s.over) return
      const now = performance.now()
      const pct = s.bossHp / BOSS_HP
      const t = (now - s.start) / 1000
      if (!a.isUnlocked(pct, s.combo, t)) return
      if ((s.cds[a.id] ?? 0) > now) return
      if (a.cooldown) s.cds[a.id] = now + a.cooldown
      s.combo = now - s.lastHit < 900 ? s.combo + 1 : 1
      s.lastHit = now
      s.maxCombo = Math.max(s.maxCombo, s.combo)
      const mult = Math.min(3, 1 + s.combo * 0.02)
      const crit = Math.random() < CRIT_CHANCE
      if (crit) s.crits++
      const dmg = Math.round((a.min + Math.random() * (a.max - a.min)) * mult * (crit ? 3 : 1))
      s.bossHp = Math.max(0, s.bossHp - dmg)
      s.dmg += dmg
      setHitKey((k) => k + 1)

      const r = stage.current?.getBoundingClientRect()
      const x = (r?.width ?? 300) / 2 + (Math.random() - 0.5) * 160
      const y = (r?.height ?? 400) * 0.32 + (Math.random() - 0.5) * 80
      spawn(crit ? `CRITICAL HIT! ${dmg.toLocaleString()}` : dmg.toLocaleString(), x, y, crit ? 'var(--color-pink)' : a.color, crit ? 30 : a.id === 'slap' ? 22 : 34)
      if (a.id === 'slap') play('hit', 0.9 + Math.random() * 0.3)
      else {
        play(a.id === 'duck' ? 'quack' : 'whoosh')
        play('hit', 0.6)
        fx.shake(a.id === 'pizza' ? 'sm' : 'lg')
        fx.flash(`${a.color}55`)
        if (a.id === 'duck') fx.confetti(120, r ? { x: r.left + r.width / 2, y: r.top + r.height * 0.3 } : undefined, 'ducks')
      }
      if (crit) {
        play('combo', 1.4)
        fx.shake('md')
      }
      if (s.combo > 0 && s.combo % 25 === 0) spawn(`${s.combo} HIT COMBO!!`, (r?.width ?? 300) / 2, 60, 'var(--color-lime)', 30)
      if (s.bossHp <= 0) end(true)
    },
    [end, spawn],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (!block()) attack(ATTACKS[0])
        return
      }
      const n = Number(e.key)
      if (n >= 1 && n <= 4) attack(ATTACKS[n - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [attack, block])

  const now = performance.now()
  const blocks = 20
  const filled = Math.ceil(bossPct * blocks)
  const mult = Math.min(3, 1 + st.combo * 0.02)

  return (
    <div ref={stage} className="absolute inset-0 flex flex-col overflow-hidden" style={{ background: phase === 3 ? 'radial-gradient(circle at 50% 30%, rgba(127,212,255,.25), transparent 60%)' : undefined }}>
      {layer}
      {/* Boss HP */}
      <div className="px-3 pt-3 z-10">
        <div className="flex items-end justify-between gap-2">
          <div className="font-display text-sm sm:text-lg text-blue leading-tight">FROSTZILLA <span className="font-pixel text-[0.65rem] text-dim align-middle">THE ULTIMATE WINTER FEST BOSS</span></div>
          <div className="font-display text-sm tabular-nums">{st.bossHp.toLocaleString()}</div>
        </div>
        <div className="mt-1 flex gap-[3px] sticker rounded-lg bg-bg p-1" role="progressbar" aria-label="Boss HP" aria-valuenow={Math.round(bossPct * 100)} aria-valuemin={0} aria-valuemax={100}>
          {Array.from({ length: blocks }).map((_, i) => (
            <div key={i} className="h-4 flex-1 rounded-sm transition-colors" style={{ background: i < filled ? (phase === 3 ? '#ff4d5e' : phase === 2 ? '#ff6a1a' : '#f2a900') : '#1b2d5c' }} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <ScoreDisplay label="DAMAGE" value={st.dmg.toLocaleString()} bump={hitKey} />
          <ScoreDisplay label="COMBO" value={`${st.combo}x`} color="var(--color-pink)" />
          <ScoreDisplay label="MULT" value={`x${mult.toFixed(2)}`} color="var(--color-lime)" className="hidden sm:block" />
          <ScoreDisplay label="TIME" value={Math.ceil(left)} color={left < 15 ? 'var(--color-red)' : 'var(--color-blue)'} />
          <div className="sticker rounded-xl bg-panel px-3 py-1.5 min-w-[110px] flex-1 max-w-[220px]">
            <div className="font-pixel text-[0.7rem] text-dim">YOUR HP</div>
            <div className="h-3 mt-1.5 rounded-full bg-bg overflow-hidden">
              <div className="h-full transition-all" style={{ width: `${(st.hp / PLAYER_HP) * 100}%`, background: st.hp > 40 ? 'var(--color-lime)' : 'var(--color-red)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Boss */}
      <div className="flex-1 relative grid place-items-center min-h-0">
        <div className="absolute top-1 left-1/2 -translate-x-1/2 sticker rounded-2xl bg-ink text-bg px-3 py-1.5 font-display text-xs sm:text-sm whitespace-nowrap z-10" aria-live="polite">
          “{taunt}”
        </div>
        <button
          className="relative w-[min(56vw,250px,32dvh)] aspect-square anim-float"
          style={{ '--r': '0deg' } as CSSProperties}
          onPointerDown={(e) => {
            e.preventDefault()
            attack(ATTACKS[0])
          }}
          aria-label="Slap the boss"
        >
          <Frostzilla phase={phase} hitKey={hitKey} winding={!!winding} dead={st.bossHp <= 0} />
        </button>
        {winding && (
          <div className="absolute inset-0 grid place-items-center bg-red/15 z-20">
            <div className="text-center anim-pop">
              <div className="font-display text-xl sm:text-3xl text-red title-outline anim-blink">⚠ {winding}! ⚠</div>
              <button
                onPointerDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  block()
                }}
                className="btn mt-3 text-2xl sm:text-3xl"
                style={{ '--c': 'var(--color-blue)', '--ct': '#071022', padding: '.5em 1.4em' } as CSSProperties}
              >
                🛡 BLOCK!
              </button>
              <div className="font-pixel text-[0.7rem] text-ink mt-2">TAP OR PRESS SPACE</div>
            </div>
          </div>
        )}
        {banner && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none z-30">
            <div key={banner} className="anim-pop font-display title-outline text-4xl sm:text-6xl text-yellow text-center px-4">
              {banner}
            </div>
          </div>
        )}
      </div>

      {/* Attacks */}
      <div className="grid grid-cols-4 gap-2 p-3 pt-1">
        {ATTACKS.map((a, i) => {
          const unlocked = a.isUnlocked(bossPct, st.combo, elapsed)
          const cdLeft = Math.max(0, (st.cds[a.id] ?? 0) - now)
          const ready = unlocked && cdLeft === 0
          return (
            <button
              key={a.id}
              onPointerDown={(e) => {
                e.preventDefault()
                attack(a)
              }}
              disabled={!ready || st.over}
              aria-label={unlocked ? `${a.name}${cdLeft ? `, cooling down` : ''}` : `${a.name} locked: ${a.unlock}`}
              className="relative overflow-hidden rounded-2xl border-[3px] border-bg h-20 sm:h-24 flex flex-col items-center justify-center font-display text-[0.75rem] sm:text-xs text-bg active:translate-y-1 transition-transform"
              style={{ background: unlocked ? a.color : '#1b2d5c', boxShadow: '0 5px 0 #071022', color: unlocked ? '#071022' : '#a9b9de' }}
            >
              <span className="text-2xl sm:text-3xl" aria-hidden>
                {unlocked ? a.icon : '🔒'}
              </span>
              <span className="leading-tight text-center px-1">{unlocked ? a.name : a.unlock}</span>
              <span className="font-pixel text-[0.65rem] opacity-70 hidden sm:block">KEY {i + 1}</span>
              {unlocked && cdLeft > 0 && (
                <span className="absolute inset-x-0 bottom-0 bg-bg/70 grid place-items-center text-ink font-display text-lg" style={{ height: `${(cdLeft / a.cooldown) * 100}%` }}>
                  {Math.ceil(cdLeft / 1000)}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
