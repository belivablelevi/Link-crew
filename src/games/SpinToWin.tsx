import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { SPIN_COOLDOWN_MS, canSpin, consumeSpin, getState, grantSpinPrize, useStore } from '../state/store'
import { COSMETICS } from '../lib/cosmetics'
import { fx, motion } from '../lib/fx'
import { play } from '../lib/sound'
import { href } from '../lib/router'
import { useNow } from '../lib/useNow'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'

interface Segment {
  label: string
  sub: string
  color: string
  text: string
  weight: number
}

const SEGMENTS: Segment[] = [
  { label: '+10', sub: 'TOKENS', color: '#4fb3ff', text: '#071022', weight: 30 },
  { label: '+25', sub: 'TOKENS', color: '#3ddc84', text: '#071022', weight: 24 },
  { label: '2X', sub: 'XP', color: '#2f6bff', text: '#fff', weight: 9 },
  { label: '+50', sub: 'TOKENS', color: '#f2a900', text: '#071022', weight: 14 },
  { label: '???', sub: 'MYSTERY', color: '#8ec2ff', text: '#fff', weight: 9 },
  { label: '+100', sub: 'TOKENS', color: '#ffc72c', text: '#071022', weight: 7 },
  { label: 'RARE', sub: 'ITEM', color: '#13214a', text: '#ffc72c', weight: 5 },
  { label: 'JACK', sub: 'POT', color: '#ff4d5e', text: '#fff', weight: 2 },
]
const SEG = 360 / SEGMENTS.length

interface Prize {
  icon: string
  title: string
  body: string
  big?: boolean
}

function pickSegment(): number {
  const total = SEGMENTS.reduce((a, s) => a + s.weight, 0)
  let r = Math.random() * total
  for (let i = 0; i < SEGMENTS.length; i++) {
    r -= SEGMENTS[i].weight
    if (r < 0) return i
  }
  return 0
}

function award(i: number): Prize {
  const s = getState()
  switch (SEGMENTS[i].label) {
    case '+10':
    case '+25':
    case '+50':
    case '+100': {
      const n = Number(SEGMENTS[i].label.slice(1))
      grantSpinPrize({ tokens: n })
      return { icon: '🪙', title: `+${n} TOKENS`, body: n >= 100 ? 'Big money. (Fake money. But still.)' : 'Cha-ching.' }
    }
    case '2X':
      grantSpinPrize({ xpBoostMs: 10 * 60_000 })
      return { icon: '🔥', title: '2X XP FOR 10 MIN', body: 'Every game you play for the next 10 minutes earns double XP. Go!' }
    case '???': {
      const pool = COSMETICS.filter((c) => !c.special && !c.level && c.cost > 0 && c.cost <= 300 && !s.cosmetics.owned.includes(c.id))
      if (pool.length) {
        const c = pool[Math.floor(Math.random() * pool.length)]
        grantSpinPrize({ cosmetic: c.id })
        return { icon: c.kind === 'avatar' ? c.value : '🎁', title: `MYSTERY: ${c.name.toUpperCase()}`, body: 'Free cosmetic unlocked! Equip it in your profile locker.' }
      }
      grantSpinPrize({ tokens: 75, xp: 50 })
      return { icon: '🎁', title: 'MYSTERY: +75 TOKENS +50 XP', body: 'You already own everything in the mystery pool. Show-off.' }
    }
    case 'RARE': {
      const pool = COSMETICS.filter((c) => c.special === 'rare' && !s.cosmetics.owned.includes(c.id))
      if (pool.length) {
        const c = pool[Math.floor(Math.random() * pool.length)]
        grantSpinPrize({ cosmetic: c.id, tokens: 50 })
        return { icon: '💠', title: `RARE: ${c.name.toUpperCase()}`, body: 'Spin-exclusive cosmetic + 50 tokens. Very fancy.', big: true }
      }
      grantSpinPrize({ tokens: 200 })
      return { icon: '💠', title: 'RARE: +200 TOKENS', body: 'You own every rare already, so here’s a pile of tokens.', big: true }
    }
    default:
      grantSpinPrize({ tokens: 500, jackpot: true, xp: 100 })
      return { icon: '💰', title: 'JACKPOT!!!', body: '+500 TOKENS · +100 XP · JACKPOT ROYALTY title unlocked!', big: true }
  }
}

function fmt(ms: number) {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function SpinToWin() {
  const [angle, setAngle] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [prize, setPrize] = useState<Prize | null>(null)
  const [log, setLog] = useState<string[]>([])
  const lastSpin = useStore((s) => s.spin.lastSpinAt)
  const bonus = useStore((s) => s.spin.bonusSpins)
  const spins = useStore((s) => s.stats.spins)
  const now = useNow(1000)
  const angleRef = useRef(0)
  const raf = useRef(0)
  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const freeIn = Math.max(0, lastSpin + SPIN_COOLDOWN_MS - now)
  const available = canSpin()

  const spin = () => {
    if (spinning || !consumeSpin()) {
      play('error')
      return
    }
    const idx = pickSegment()
    setSpinning(true)
    play('whoosh')
    // Pointer is at the top (0°). Segment i spans [i*SEG, (i+1)*SEG] clockwise from the top.
    const jitter = (Math.random() - 0.5) * SEG * 0.7
    const targetMod = (360 - (idx * SEG + SEG / 2) + jitter + 360) % 360
    const start = angleRef.current
    const base = start - (start % 360)
    const end = base + 360 * (motion.reduced ? 2 : 6) + targetMod
    const dur = motion.reduced ? 1200 : 5200
    const t0 = performance.now()
    let lastTick = Math.floor(start / SEG)
    const ease = (t: number) => 1 - Math.pow(1 - t, 4)
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur)
      const a = start + (end - start) * ease(t)
      angleRef.current = a
      setAngle(a)
      const seg = Math.floor(a / SEG)
      if (seg !== lastTick) {
        lastTick = seg
        play('tick', 1 + (1 - t) * 0.5)
      }
      if (t < 1) raf.current = requestAnimationFrame(step)
      else {
        const p = award(idx)
        setSpinning(false)
        setPrize(p)
        setLog((l) => [`${p.icon} ${p.title}`, ...l].slice(0, 6))
        if (p.big) {
          play('jackpot')
          fx.confetti(260)
          fx.shake('lg')
          fx.flash('rgba(255,199,44,.45)')
        } else {
          play('coin')
          fx.confetti(90)
        }
      }
    }
    raf.current = requestAnimationFrame(step)
  }

  const R = 160
  const C = 170
  const polar = (deg: number, r: number) => {
    const rad = ((deg - 90) * Math.PI) / 180
    return [C + r * Math.cos(rad), C + r * Math.sin(rad)]
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-5 pt-3 pb-4">
      <div className="flex items-center gap-3 mb-3">
        <a href={href('/games')} className="sticker shrink-0 h-11 px-3 rounded-xl bg-panel2 font-display text-sm grid place-items-center hover:bg-purple" aria-label="Back to all games">
          ← <span className="hidden sm:inline ml-1">ARCADE</span>
        </a>
        <h1 className="font-display text-lg sm:text-2xl text-orange">🎡 SPIN TO WIN</h1>
        <span className="ml-auto tag" style={{ '--c': 'var(--color-lime)' } as CSSProperties}>
          100% FREE
        </span>
      </div>

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-5 items-start">
        <div className="panel p-4 sm:p-6 grid place-items-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-30 anim-spin-slow" style={{ background: 'repeating-conic-gradient(rgba(255,199,44,.25) 0 10deg, transparent 10deg 20deg)' }} aria-hidden />
          <div className="relative w-[min(86vw,420px)] aspect-square">
            {/* pointer */}
            <div className="absolute left-1/2 -top-1 -translate-x-1/2 z-10" aria-hidden>
              <svg width="44" height="54" viewBox="0 0 44 54">
                <path d="M4 4 H40 L22 50 Z" fill="#ffc72c" stroke="#071022" strokeWidth="5" strokeLinejoin="round" />
              </svg>
            </div>
            <svg viewBox="0 0 340 340" className="w-full h-full drop-shadow-[0_8px_0_#030814]" style={{ transform: `rotate(${angle}deg)` }} role="img" aria-label="Prize wheel">
              <circle cx={C} cy={C} r={R + 8} fill="#071022" />
              {SEGMENTS.map((s, i) => {
                const [x1, y1] = polar(i * SEG, R)
                const [x2, y2] = polar((i + 1) * SEG, R)
                const [tx, ty] = polar(i * SEG + SEG / 2, R * 0.66)
                return (
                  <g key={i}>
                    <path d={`M${C} ${C} L${x1} ${y1} A${R} ${R} 0 0 1 ${x2} ${y2} Z`} fill={s.color} stroke="#071022" strokeWidth="4" />
                    <g transform={`translate(${tx} ${ty}) rotate(${i * SEG + SEG / 2})`}>
                      <text textAnchor="middle" y="-2" fontFamily="Outfit, sans-serif" fontWeight="800" fontSize="22" fill={s.text} stroke="#071022" strokeWidth={s.text === '#fff' || s.text === '#ffc72c' ? 3 : 0} paintOrder="stroke">
                        {s.label}
                      </text>
                      <text textAnchor="middle" y="16" fontFamily="Inter, sans-serif" fontSize="8" fill={s.text}>
                        {s.sub}
                      </text>
                    </g>
                  </g>
                )
              })}
              {Array.from({ length: 16 }).map((_, i) => {
                const [x, y] = polar(i * 22.5, R + 1)
                return <circle key={i} cx={x} cy={y} r="4" fill={i % 2 ? '#ffc72c' : '#fff'} stroke="#071022" strokeWidth="1.5" />
              })}
              <circle cx={C} cy={C} r="34" fill="#ffc72c" stroke="#071022" strokeWidth="5" />
              <text x={C} y={C + 8} textAnchor="middle" fontFamily="Outfit, sans-serif" fontWeight="800" fontSize="22" fill="#071022">
                LC
              </text>
            </svg>
          </div>
          <div className="relative mt-6 text-center">
            <Button mega onClick={spin} disabled={spinning || !available} silent>
              {spinning ? 'SPINNING…' : available ? 'SPIN!' : `⏳ ${fmt(freeIn)}`}
            </Button>
            <div className="font-pixel text-[0.72rem] text-dim mt-4">
              {available ? (bonus > 0 && freeIn > 0 ? `USING 1 OF ${bonus} BONUS SPINS` : 'FREE SPIN READY') : 'NEXT FREE SPIN SOON · LEVEL UP FOR BONUS SPINS'}
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="panel p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-bg/60 p-2">
                <div className="font-pixel text-[0.65rem] text-dim">FREE SPIN</div>
                <div className="font-display text-base text-lime">{freeIn > 0 ? fmt(freeIn) : 'READY'}</div>
              </div>
              <div className="rounded-xl bg-bg/60 p-2">
                <div className="font-pixel text-[0.65rem] text-dim">BONUS</div>
                <div className="font-display text-base text-yellow">{bonus}</div>
              </div>
              <div className="rounded-xl bg-bg/60 p-2">
                <div className="font-pixel text-[0.65rem] text-dim">TOTAL SPINS</div>
                <div className="font-display text-base">{spins}</div>
              </div>
            </div>
          </div>
          <div className="panel p-4">
            <h2 className="font-display text-lg mb-2">PRIZES</h2>
            <ul className="grid grid-cols-2 gap-2 text-sm">
              {SEGMENTS.map((s) => (
                <li key={s.label} className="flex items-center gap-2 rounded-lg bg-bg/50 px-2 py-1.5">
                  <span className="w-3.5 h-3.5 rounded-sm border-2 border-bg shrink-0" style={{ background: s.color }} />
                  <span className="font-display text-xs">
                    {s.label === 'JACK' ? 'JACKPOT' : s.label === '???' ? 'MYSTERY' : s.label === 'RARE' ? 'RARE ITEM' : `${s.label} ${s.sub}`}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-dim mt-3">One free spin every 15 min. Every level-up gives a bonus spin. No purchases, ever.</p>
          </div>
          {log.length > 0 && (
            <div className="panel p-4">
              <h2 className="font-display text-lg mb-2">THIS SESSION</h2>
              <ul className="grid gap-1 text-sm">
                {log.map((l, i) => (
                  <li key={i} className="anim-up">
                    {l}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <Modal open={!!prize} onClose={() => setPrize(null)} title={prize?.big ? 'NO WAY!!' : 'YOU WON!'} color={prize?.big ? 'var(--color-yellow)' : 'var(--color-lime)'}>
        {prize && (
          <div className="text-center">
            <div className="text-7xl anim-pop">{prize.icon}</div>
            <div className={`font-display text-3xl mt-3 ${prize.big ? 'fx-gold' : 'text-lime'}`}>{prize.title}</div>
            <p className="text-dim mt-2">{prize.body}</p>
            <Button color="lime" size="lg" className="mt-5" onClick={() => setPrize(null)}>
              NICE
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
