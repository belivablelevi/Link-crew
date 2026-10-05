import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameProps } from './types'
import { ScoreDisplay } from '../components/ScoreDisplay'
import { ProgressBar } from '../components/ProgressBar'
import { usePopups } from '../components/Popups'
import { fx } from '../lib/fx'
import { play } from '../lib/sound'

const DURATION = 45
const EASY = ['DUCK', 'PIZZA', 'CANDY', 'LOCKER', 'ORANGE', 'SPIRIT', 'LISGAR', 'BELL', 'MAPLE', 'CIDER', 'TOKEN', 'COMBO', 'LEAF', 'HOODIE', 'GOOSE']
const MID = ['PUMPKIN', 'FALL FEST', 'LINK CREW', 'HALLWAY', 'HAYRIDE', 'ARCADE', 'SPOOKY', 'TEAMWORK', 'SCARECROW', 'HIGH SCORE', 'LEAF PILE', 'HOMEWORK']
const HARD = ['FRIENDSHIP', 'CAFETERIA', 'PUMPKIN SPICE', 'GRADE NINE', 'SCHOOL SPIRIT', 'LISGAR LEGEND', 'DUCK INVASION', 'COMBO KING']

function pickWord(n: number, prev?: string): string {
  const pool = n < 6 ? EASY : n < 14 ? [...EASY, ...MID] : [...MID, ...HARD]
  let w = pool[Math.floor(Math.random() * pool.length)]
  while (w === prev) w = pool[Math.floor(Math.random() * pool.length)]
  return w
}

export default function FallFestTyper({ onEnd }: GameProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const { spawn, layer } = usePopups()
  const [queue, setQueue] = useState<string[]>(() => {
    const q: string[] = []
    for (let i = 0; i < 4; i++) q.push(pickWord(i, q[i - 1]))
    return q
  })
  const [typed, setTyped] = useState('')
  const [shakeKey, setShakeKey] = useState(0)
  const [hud, setHud] = useState({ score: 0, combo: 0, wpm: 0, acc: 100, left: DURATION })
  const s = useRef({ score: 0, combo: 0, maxCombo: 0, correct: 0, errors: 0, words: 0, start: performance.now(), over: false })
  const queueRef = useRef(queue)
  queueRef.current = queue
  const typedRef = useRef('')

  const stats = () => {
    const st = s.current
    const mins = Math.max(1 / 60, (performance.now() - st.start) / 60000)
    const wpm = Math.round(st.correct / 5 / mins)
    const acc = st.correct + st.errors ? Math.round((st.correct / (st.correct + st.errors)) * 100) : 100
    return { wpm, acc }
  }

  const finish = useCallback(() => {
    const st = s.current
    if (st.over) return
    st.over = true
    const mins = DURATION / 60
    const wpm = Math.round(st.correct / 5 / mins)
    const acc = st.correct + st.errors ? Math.round((st.correct / (st.correct + st.errors)) * 100) : 100
    onEnd({
      score: st.score,
      headline: wpm >= 60 ? 'KEYBOARD WARRIOR!' : 'PENS DOWN!',
      stats: { wpm, accuracy: acc, maxCombo: st.maxCombo },
      details: [
        { label: 'WPM', value: `${wpm}` },
        { label: 'ACCURACY', value: `${acc}%` },
        { label: 'WORDS', value: `${st.words}` },
        { label: 'BEST STREAK', value: `${st.maxCombo}` },
      ],
    })
  }, [onEnd])

  useEffect(() => {
    inputRef.current?.focus()
    const id = setInterval(() => {
      const left = Math.max(0, DURATION - (performance.now() - s.current.start) / 1000)
      setHud((h) => ({ ...h, left, ...stats() }))
      if (left <= 0) {
        clearInterval(id)
        finish()
      }
    }, 200)
    return () => clearInterval(id)
  }, [finish])

  const typeChar = (ch: string) => {
    const st = s.current
    if (st.over) return
    const word = queueRef.current[0]
    const t = typedRef.current
    const expected = word[t.length]
    if (ch.toUpperCase() === expected) {
      st.correct++
      const nt = t + expected
      typedRef.current = nt
      play('tick', 1 + nt.length * 0.03)
      if (nt === word) {
        st.words++
        st.combo++
        st.maxCombo = Math.max(st.maxCombo, st.combo)
        const mult = 1 + st.combo * 0.1
        const pts = Math.round(word.replace(/ /g, '').length * 10 * mult)
        st.score += pts
        const r = stage.current?.getBoundingClientRect()
        spawn(`+${pts}`, (r?.width ?? 300) / 2, (r?.height ?? 400) * 0.35, 'var(--color-lime)', 32)
        if (st.combo % 5 === 0) {
          play('combo')
          spawn(`${st.combo} CLEAN WORDS!`, (r?.width ?? 300) / 2, (r?.height ?? 400) * 0.22, 'var(--color-pink)', 26)
          fx.flash('rgba(139,92,255,.2)')
        } else play('coin', 1.2)
        typedRef.current = ''
        setTyped('')
        setQueue((q) => [...q.slice(1), pickWord(st.words + 3, q[q.length - 1])])
      } else setTyped(nt)
    } else if (ch.trim() || expected === ' ') {
      st.errors++
      if (st.combo > 0) play('miss')
      else play('error')
      st.combo = 0
      setShakeKey((k) => k + 1)
    }
    setHud((h) => ({ ...h, score: st.score, combo: st.combo, ...stats() }))
  }

  const word = queue[0]

  return (
    <div ref={stage} className="absolute inset-0 flex flex-col" onPointerDown={() => setTimeout(() => inputRef.current?.focus(), 0)}>
      {layer}
      <div className="flex flex-wrap gap-2 p-3">
        <ScoreDisplay label="SCORE" value={hud.score.toLocaleString()} bump={hud.score} />
        <ScoreDisplay label="WPM" value={hud.wpm} color="var(--color-blue)" />
        <ScoreDisplay label="ACCURACY" value={`${hud.acc}%`} color="var(--color-lime)" />
        <ScoreDisplay label="STREAK" value={hud.combo} color="var(--color-pink)" bump={hud.combo} />
      </div>
      <div className="px-3">
        <ProgressBar value={hud.left / DURATION} color={hud.left < 10 ? 'var(--color-red)' : 'var(--color-purple)'} height={14} label="Time left" />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-3 text-center">
        <div key={`${word}-${shakeKey}`} className={`font-display leading-none ${shakeKey ? 'anim-jiggle' : ''}`} style={{ fontSize: 'clamp(2.2rem, 10vw, 5.5rem)' }} aria-live="polite" aria-label={`Type: ${word}`}>
          {word.split('').map((c, i) => (
            <span
              key={i}
              className={i < typed.length ? 'text-lime' : i === typed.length ? 'text-yellow underline decoration-4 underline-offset-8' : 'text-ink/50'}
              style={i < typed.length ? { textShadow: '0 0 20px rgba(60,255,110,.6)' } : undefined}
            >
              {c === ' ' ? ' ' : c}
            </span>
          ))}
        </div>
        <div className="flex gap-3 flex-wrap justify-center" aria-hidden>
          {queue.slice(1).map((w, i) => (
            <span key={`${w}-${i}`} className="font-display text-lg sm:text-xl text-dim bg-panel2 rounded-xl px-3 py-1" style={{ opacity: 1 - i * 0.25 }}>
              {w}
            </span>
          ))}
        </div>
        <label className="sr-only" htmlFor="typer-input">
          Type the word
        </label>
        <input
          id="typer-input"
          ref={inputRef}
          value=""
          onChange={(e) => {
            for (const ch of e.target.value) typeChar(ch)
          }}
          onBlur={() => !s.current.over && setTimeout(() => inputRef.current?.focus(), 50)}
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          inputMode="text"
          enterKeyHint="next"
          className="sticker rounded-2xl bg-bg/80 h-14 w-full max-w-sm text-center font-display text-xl text-yellow caret-yellow placeholder:text-dim/60"
          placeholder="TYPE HERE…"
        />
        <div className="font-pixel text-[0.5rem] text-dim">{Math.ceil(hud.left)}s LEFT · CASE DOESN&apos;T MATTER</div>
      </div>
    </div>
  )
}
