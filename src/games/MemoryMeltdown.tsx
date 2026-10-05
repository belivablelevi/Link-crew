import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import type { GameProps } from './types'
import { ScoreDisplay } from '../components/ScoreDisplay'
import { usePopups } from '../components/Popups'
import { fx } from '../lib/fx'
import { play } from '../lib/sound'

const PADS = [
  { color: '#ff2bd6', symbol: '★', pitch: 1 },
  { color: '#00e1ff', symbol: '●', pitch: 1.26 },
  { color: '#3cff6e', symbol: '▲', pitch: 1.5 },
  { color: '#ffe83d', symbol: '◆', pitch: 1.68 },
  { color: '#ff9f1a', symbol: '✚', pitch: 2 },
  { color: '#8b5cff', symbol: '■', pitch: 2.25 },
]
const SIX_PADS_FROM = 7

type Phase = 'show' | 'input' | 'between' | 'dead'

export default function MemoryMeltdown({ onEnd }: GameProps) {
  const { spawn, layer } = usePopups()
  const stage = useRef<HTMLDivElement>(null)
  const [seq, setSeq] = useState<number[]>(() => [Math.floor(Math.random() * 4)])
  const [phase, setPhase] = useState<Phase>('between')
  const [lit, setLit] = useState<number | null>(null)
  const [inputIdx, setInputIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [wrong, setWrong] = useState<number | null>(null)
  const st = useRef({ score: 0, combo: 0, maxCombo: 0 })
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms))
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const round = seq.length
  const padCount = round >= SIX_PADS_FROM ? 6 : 4
  const mult = 1 + Math.floor(combo / 5) * 0.5

  // Play back the sequence
  const playback = useCallback((s: number[]) => {
    setPhase('show')
    const on = Math.max(200, 560 - s.length * 28)
    const gap = Math.max(90, 220 - s.length * 10)
    s.forEach((p, i) => {
      later(() => {
        setLit(p)
        play('tick', PADS[p].pitch)
        play('pop', PADS[p].pitch)
      }, i * (on + gap))
      later(() => setLit(null), i * (on + gap) + on)
    })
    later(() => {
      setPhase('input')
      setInputIdx(0)
    }, s.length * (on + gap))
  }, [])

  useEffect(() => {
    later(() => playback(seq), 700)
    // only on mount
  }, [])

  const press = useCallback(
    (p: number) => {
      if (phase !== 'input' || p >= padCount) return
      setLit(p)
      later(() => setLit((l) => (l === p ? null : l)), 160)
      const rect = stage.current?.getBoundingClientRect()
      if (seq[inputIdx] !== p) {
        // MELTDOWN
        setWrong(p)
        setPhase('dead')
        play('error')
        fx.shake('lg')
        fx.flash('rgba(255,59,92,.4)')
        later(() => {
          const reached = seq.length
          onEnd({
            score: st.current.score,
            headline: 'MELTDOWN!',
            stats: { memoryRound: reached, maxCombo: st.current.maxCombo },
            details: [
              { label: 'ROUND REACHED', value: `${reached}` },
              { label: 'MAX COMBO', value: `${st.current.maxCombo}x` },
            ],
          })
        }, 1100)
        return
      }
      play('pop', PADS[p].pitch)
      st.current.combo++
      st.current.maxCombo = Math.max(st.current.maxCombo, st.current.combo)
      const m = 1 + Math.floor(st.current.combo / 5) * 0.5
      const pts = Math.round(10 * m)
      st.current.score += pts
      setScore(st.current.score)
      setCombo(st.current.combo)
      if (st.current.combo % 5 === 0) {
        play('combo')
        spawn(`MULTIPLIER x${m}!`, (rect?.width ?? 300) / 2, 70, 'var(--color-pink)', 24)
      }
      const next = inputIdx + 1
      if (next < seq.length) {
        setInputIdx(next)
        return
      }
      // Round cleared!
      const bonus = seq.length * 20
      st.current.score += bonus
      setScore(st.current.score)
      setPhase('between')
      spawn(`ROUND ${seq.length} CLEAR +${bonus}`, (rect?.width ?? 300) / 2, (rect?.height ?? 400) / 2, 'var(--color-lime)', 26)
      play('coin')
      if (seq.length % 5 === 0) fx.confetti(70)
      const nextCount = seq.length + 1 >= SIX_PADS_FROM ? 6 : 4
      const ns = [...seq, Math.floor(Math.random() * nextCount)]
      if (seq.length + 1 === SIX_PADS_FROM) {
        later(() => {
          spawn('+2 PADS! 😱', (rect?.width ?? 300) / 2, 110, 'var(--color-orange)', 30)
          fx.shake('sm')
        }, 300)
      }
      setSeq(ns)
      later(() => playback(ns), 1000)
    },
    [phase, padCount, seq, inputIdx, onEnd, spawn, playback],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      const n = Number(e.key)
      if (n >= 1 && n <= 6) press(n - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [press])

  const status = phase === 'show' ? 'WATCH…' : phase === 'input' ? 'YOUR TURN!' : phase === 'dead' ? 'MELTDOWN!' : 'GET READY'

  return (
    <div ref={stage} className="absolute inset-0 flex flex-col">
      {layer}
      <div className="flex flex-wrap gap-2 p-3 z-10">
        <ScoreDisplay label="SCORE" value={score.toLocaleString()} bump={score} />
        <ScoreDisplay label="ROUND" value={round} color="var(--color-blue)" />
        <ScoreDisplay label="COMBO" value={`${combo}x`} color="var(--color-pink)" bump={combo} />
        <ScoreDisplay label="MULT" value={`x${mult}`} color="var(--color-lime)" bump={mult} />
      </div>
      <div className="text-center">
        <div key={status} className={`font-display text-3xl sm:text-4xl anim-pop ${phase === 'input' ? 'text-lime' : phase === 'dead' ? 'text-red' : 'text-yellow'}`}>
          {status}
        </div>
        {phase === 'input' && (
          <div className="flex justify-center gap-1.5 mt-2" aria-label={`${inputIdx} of ${seq.length} entered`}>
            {seq.map((_, i) => (
              <span key={i} className={`w-2.5 h-2.5 rounded-full border-2 border-bg ${i < inputIdx ? 'bg-lime' : 'bg-panel2'}`} />
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 grid place-items-center p-4">
        <div className={`grid gap-3 sm:gap-4 ${padCount === 6 ? 'grid-cols-3' : 'grid-cols-2'}`} style={{ width: padCount === 6 ? 'min(92vw, 470px, 62dvh)' : 'min(80vw, 380px, 52dvh)' }}>
          {PADS.slice(0, padCount).map((p, i) => {
            const on = lit === i
            const bad = wrong === i
            return (
              <button
                key={i}
                onPointerDown={(e) => {
                  e.preventDefault()
                  press(i)
                }}
                disabled={phase !== 'input'}
                aria-label={`Pad ${i + 1} ${p.symbol}`}
                className={`relative aspect-square rounded-3xl sticker grid place-items-center font-display text-bg transition-all duration-100 ${bad ? 'anim-jiggle' : ''}`}
                style={
                  {
                    background: bad ? '#ff3b5c' : p.color,
                    filter: on ? 'brightness(1.35) saturate(1.2)' : phase === 'input' ? 'brightness(.8)' : 'brightness(.5)',
                    transform: on ? 'scale(1.07)' : 'scale(1)',
                    boxShadow: on ? `0 0 50px ${p.color}, 4px 4px 0 #0b0614` : '4px 4px 0 #0b0614',
                    fontSize: 'clamp(2rem, 9vw, 3.5rem)',
                    cursor: phase === 'input' ? 'pointer' : 'default',
                  } as CSSProperties
                }
              >
                <span aria-hidden>{p.symbol}</span>
                <span className="absolute bottom-2 right-3 font-pixel text-[0.5rem] opacity-60 hidden sm:block">{i + 1}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
