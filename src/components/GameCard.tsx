import type { CSSProperties } from 'react'
import type { GameMeta } from '../games/meta'
import { href } from '../lib/router'
import { useStore } from '../state/store'
import { GameArt } from './GameArt'
import { play } from '../lib/sound'

const DIFF_COLOR: Record<string, string> = {
  EASY: 'var(--color-lime)',
  MEDIUM: 'var(--color-yellow)',
  HARD: 'var(--color-orange)',
  CHAOS: 'var(--color-red)',
}

/** Big arcade cabinet-style card for the games grid. The whole card is one link. */
export function GameCard({ game, index = 0 }: { game: GameMeta; index?: number }) {
  const best = useStore((s) => s.highScores[game.id] ?? 0)
  const plays = useStore((s) => s.playsByGame[game.id] ?? 0)
  return (
    <a
      href={href(`/games/${game.id}`)}
      onClick={() => play('whoosh')}
      className="card-game anim-up block group"
      style={{ '--c': game.color, '--c2': game.color2, animationDelay: `${index * 50}ms` } as CSSProperties}
      aria-label={`Play ${game.name}. Difficulty ${game.difficulty}. Your best ${best}.`}
    >
      <div className="relative h-36 border-b-[3px] border-bg" style={{ background: `radial-gradient(circle at 30% 20%, ${game.color}55, transparent 60%), linear-gradient(135deg, ${game.color2}33, #0d1a3a)` }}>
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
        <GameArt id={game.id} />
        <span className="tag absolute top-3 left-3" style={{ '--c': DIFF_COLOR[game.difficulty] } as CSSProperties}>
          {game.difficulty}
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-3">
          <h3 className="font-display text-lg leading-tight">{game.name}</h3>
        </div>
        <p className="text-dim text-sm mt-2 leading-snug min-h-[2.5em]">{game.tagline}</p>
        <div className="grid grid-cols-2 gap-2 mt-3 text-center">
          <Stat label="YOUR BEST" value={best ? best.toLocaleString() : '-'} color={game.color} />
          <Stat label="TIMES PLAYED" value={plays.toString()} />
        </div>
        <div className="btn w-full mt-4 text-base" style={{ '--c': game.color, '--ct': '#071022' } as CSSProperties} aria-hidden>
          ▶ {game.custom ? 'SPIN' : best ? 'BEAT IT' : 'PLAY'}
        </div>
      </div>
    </a>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl bg-bg/60 py-1.5 px-1">
      <div className="font-pixel text-[0.65rem] text-dim">{label}</div>
      <div className="font-display text-sm mt-0.5 truncate" style={{ color: color ?? 'var(--color-ink)' }}>
        {value}
      </div>
    </div>
  )
}
