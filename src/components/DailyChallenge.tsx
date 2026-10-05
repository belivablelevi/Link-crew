import type { CSSProperties } from 'react'
import { useStore } from '../state/store'
import { getChallenge } from '../lib/daily'
import { getGame } from '../games/meta'
import { ProgressBar } from './ProgressBar'
import { LinkButton } from './Button'
import { href } from '../lib/router'
import { useNow } from '../lib/useNow'

function untilMidnight(now: number) {
  const d = new Date(now)
  d.setHours(24, 0, 0, 0)
  const ms = d.getTime() - now
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return `${h}h ${m}m`
}

export function DailyChallenge() {
  const daily = useStore((s) => s.daily)
  const now = useNow(30000)
  const ch = getChallenge(daily.challengeId)
  if (!ch) return null
  const game = ch.game ? getGame(ch.game) : undefined
  const pct = daily.progress / ch.goal
  return (
    <section
      className="relative panel p-4 sm:p-5 overflow-hidden"
      style={{ borderColor: daily.completed ? 'var(--color-lime)' : 'var(--color-orange)' }}
      aria-label="Daily challenge"
    >
      <div className="absolute -right-6 -top-6 text-[7rem] opacity-15 rotate-12 select-none" aria-hidden>
        🎯
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="tag" style={{ '--c': daily.completed ? 'var(--color-lime)' : 'var(--color-orange)' } as CSSProperties}>
          {daily.completed ? '✓ CLEARED' : 'TODAY’S CHALLENGE'}
        </span>
        <span className="font-pixel text-[0.5rem] text-dim ml-auto">NEW IN {untilMidnight(now)}</span>
      </div>
      <p className="font-display text-xl sm:text-2xl leading-tight my-3">{ch.text}</p>
      <ProgressBar value={pct} color={daily.completed ? 'var(--color-lime)' : 'var(--color-orange)'} label="Daily challenge progress" />
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <span className="font-display text-sm tabular-nums">
          {Math.min(daily.progress, ch.goal).toLocaleString()} / {ch.goal.toLocaleString()} {ch.unit ?? ''}
        </span>
        <span className="ml-auto flex gap-2">
          <span className="tag" style={{ '--c': 'var(--color-lime)' } as CSSProperties}>+{ch.xp} XP</span>
          <span className="tag" style={{ '--c': 'var(--color-yellow)' } as CSSProperties}>+{ch.tokens} 🪙</span>
        </span>
      </div>
      {!daily.completed && (
        <LinkButton href={href(game ? `/games/${game.id}` : '/games')} color="orange" className="w-full mt-4">
          {game ? `GO: ${game.name}` : 'PICK A GAME'}
        </LinkButton>
      )}
      {daily.completed && <div className="mt-4 font-display text-lime text-center">DONE. COME BACK TOMORROW. 😎</div>}
    </section>
  )
}
