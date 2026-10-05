import { Suspense, useCallback, useEffect, useRef, useState, type ComponentType, type CSSProperties } from 'react'
import type { GameMeta } from '../games/meta'
import { GAMES } from '../games/meta'
import type { GameProps } from '../games/types'
import type { GameResult } from '../lib/types'
import { recordGame, type GameSummary, useStore, isBoostActive } from '../state/store'
import { fx } from '../lib/fx'
import { play } from '../lib/sound'
import { href, navigate } from '../lib/router'
import { Button, LinkButton } from './Button'
import { GameArt } from './GameArt'

type Phase = 'intro' | 'countdown' | 'playing' | 'over'

const HYPE = ['ONE MORE GAME.', 'RUN IT BACK.', 'BEAT THE HIGH SCORE.', 'AGAIN. BUT BETTER.', 'YOU WERE SO CLOSE.']

/**
 * Wraps a game with the standard arcade loop:
 * READY? intro → 3-2-1 countdown → play → GAME OVER (score, rewards, play again).
 */
export function GameShell({ meta, Game }: { meta: GameMeta; Game: ComponentType<GameProps> }) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [run, setRun] = useState(0)
  const [count, setCount] = useState(3)
  const [result, setResult] = useState<GameResult | null>(null)
  const [summary, setSummary] = useState<GameSummary | null>(null)
  const best = useStore((s) => s.highScores[meta.id] ?? 0)
  const xpBoost = useStore((s) => isBoostActive(s.boosts.xp2xUntil))
  const ended = useRef(false)

  const start = useCallback(() => {
    ended.current = false
    setResult(null)
    setSummary(null)
    setCount(3)
    setPhase('countdown')
  }, [])

  useEffect(() => {
    if (phase !== 'countdown') return
    if (count === 0) {
      play('go')
      setRun((r) => r + 1)
      setPhase('playing')
      return
    }
    play('countdown')
    const t = setTimeout(() => setCount((c) => c - 1), 650)
    return () => clearTimeout(t)
  }, [phase, count])

  const onEnd = useCallback(
    (r: GameResult) => {
      if (ended.current) return
      ended.current = true
      const sum = recordGame(meta.id, r)
      setResult(r)
      setSummary(sum)
      setPhase('over')
      if (sum.newHigh) {
        play('victory')
        fx.confetti(180)
        fx.flash('rgba(255,199,44,.35)')
      } else {
        play('gameover')
      }
    },
    [meta.id],
  )

  // Keyboard: Enter/Space starts from intro or game-over screens.
  useEffect(() => {
    if (phase !== 'intro' && phase !== 'over') return
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT') return
      if (e.key === 'Enter' || e.key === ' ' || e.key.toLowerCase() === 'r') {
        e.preventDefault()
        start()
      }
    }
    const t = setTimeout(() => window.addEventListener('keydown', onKey), phase === 'over' ? 700 : 0)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [phase, start])

  const others = GAMES.filter((g) => g.id !== meta.id && !g.custom)
  const suggestion = others[(run + meta.name.length) % others.length]

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-5 pt-3 pb-4">
      <div className="flex items-center gap-3 mb-3">
        <a href={href('/games')} className="sticker shrink-0 h-11 px-3 rounded-xl bg-panel2 font-display text-sm grid place-items-center hover:bg-purple" aria-label="Back to all games">
          ← <span className="hidden sm:inline ml-1">ARCADE</span>
        </a>
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="font-display text-lg sm:text-2xl truncate" style={{ color: meta.color }}>
            {meta.name}
          </h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {xpBoost && <span className="tag anim-blink" style={{ '--c': 'var(--color-lime)' } as CSSProperties}>2X XP</span>}
          <div className="sticker rounded-xl bg-panel px-3 h-11 grid content-center text-right">
            <div className="font-pixel text-[0.65rem] text-dim">BEST</div>
            <div className="font-display text-sm tabular-nums" style={{ color: meta.color }}>
              {best.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div
        className="relative rounded-[26px] border-[3px] border-bg overflow-hidden game-stage"
        style={{
          height: 'max(440px, calc(100dvh - 64px - 64px - 80px - env(safe-area-inset-bottom)))',
          maxHeight: 820,
          background: `radial-gradient(circle at 50% 0%, ${meta.color}22, transparent 55%), linear-gradient(180deg,#0e1c3d,#081329)`,
          boxShadow: `0 8px 0 #030814, 0 0 0 3px ${meta.color}66`,
        }}
      >
        {phase === 'playing' && (
          <Suspense fallback={<Loading />}>
            <Game key={run} onEnd={onEnd} />
          </Suspense>
        )}

        {phase === 'intro' && (
          <div className="absolute inset-0 overflow-y-auto">
            <div className="min-h-full flex flex-col items-center justify-center text-center p-5 gap-4">
              <div className="relative w-40 h-28">
                <GameArt id={meta.id} />
              </div>
              <div className="font-pixel text-xs text-lime anim-blink">READY?</div>
              <h2 className="font-display title-outline text-4xl sm:text-6xl leading-none" style={{ color: meta.color }}>
                {meta.name}
              </h2>
              <ul className="text-left grid gap-1.5 max-w-sm w-full">
                {meta.howTo.map((h, i) => (
                  <li key={h} className="flex gap-2 items-start bg-bg/50 rounded-xl px-3 py-2 text-sm">
                    <span className="font-display" style={{ color: meta.color }}>
                      {i + 1}
                    </span>
                    {h}
                  </li>
                ))}
              </ul>
              <div className="font-pixel text-[0.72rem] text-dim">CONTROLS: {meta.controls}</div>
              <Button mega onClick={start} autoFocus>
                PLAY
              </Button>
              <div className="font-pixel text-[0.7rem] text-dim hidden sm:block">or press ENTER</div>
            </div>
          </div>
        )}

        {phase === 'countdown' && (
          <div className="absolute inset-0 grid place-items-center bg-bg/60" aria-live="assertive">
            <div key={count} className="anim-pop font-display title-outline text-[9rem] leading-none" style={{ color: count === 0 ? 'var(--color-lime)' : meta.color }}>
              {count === 0 ? 'GO!' : count}
            </div>
          </div>
        )}

        {phase === 'over' && result && summary && (
          <div className="absolute inset-0 overflow-y-auto bg-bg/80 backdrop-blur-[2px]">
            <div className="min-h-full flex flex-col items-center justify-center text-center p-5 gap-3">
              <div className="font-pixel text-xs text-red">{result.headline ? '' : 'GAME OVER'}</div>
              <h2 className="font-display title-outline text-4xl sm:text-6xl leading-none anim-pop" style={{ color: meta.color }}>
                {result.headline ?? 'NICE RUN!'}
              </h2>
              {summary.newHigh && (
                <div className="anim-pop sticker rounded-2xl px-4 py-2 font-display text-lg text-bg" style={{ background: 'linear-gradient(90deg,#ffc72c,#f2a900)', animationDelay: '.2s' }}>
                  NEW HIGH SCORE!
                </div>
              )}
              <div className="mt-1">
                <div className="font-pixel text-[0.72rem] text-dim">{meta.scoreLabel}</div>
                <div className="font-display text-6xl sm:text-7xl text-ink tabular-nums anim-pop">{Math.round(result.score).toLocaleString()}</div>
                {!summary.newHigh && summary.prevHigh > 0 && <div className="text-sm text-dim">Best: {summary.prevHigh.toLocaleString()} · {Math.max(0, summary.prevHigh - Math.round(result.score)).toLocaleString()} to beat it</div>}
              </div>
              {result.details && (
                <div className="flex flex-wrap justify-center gap-2 max-w-md">
                  {result.details.map((d) => (
                    <div key={d.label} className="rounded-xl bg-panel border-2 border-[#2a4180] px-3 py-1.5">
                      <div className="font-pixel text-[0.65rem] text-dim">{d.label}</div>
                      <div className="font-display text-base">{d.value}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mt-1">
                <span className="tag text-xs" style={{ '--c': 'var(--color-lime)' } as CSSProperties}>
                  +{summary.rewards.xp} XP{summary.boosted.xp && ' (2X!)'}
                </span>
                <span className="tag text-xs" style={{ '--c': 'var(--color-yellow)' } as CSSProperties}>
                  +{summary.rewards.tokens} TOKENS{summary.boosted.tokens && ' (2X!)'}
                </span>
              </div>
              <div className="font-display text-xl text-pink mt-2">{HYPE[(run + Math.round(result.score)) % HYPE.length]}</div>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button color="lime" size="lg" onClick={start} autoFocus>
                  ↻ PLAY AGAIN
                </Button>
                <LinkButton href={href('/games')} color="ghost" size="lg">
                  ARCADE
                </LinkButton>
              </div>
              <button className="text-sm text-dim underline underline-offset-4 hover:text-ink mt-1" onClick={() => navigate(`/games/${suggestion.id}`)}>
                or try {suggestion.name} →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Loading() {
  return <div className="absolute inset-0 grid place-items-center font-pixel text-xs text-dim anim-blink">LOADING…</div>
}
