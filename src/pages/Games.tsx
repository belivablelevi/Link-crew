import { useState } from 'react'
import { GAMES, type Difficulty } from '../games/meta'
import { GameCard } from '../components/GameCard'
import { useStore } from '../state/store'

const FILTERS: ('ALL' | Difficulty)[] = ['ALL', 'EASY', 'MEDIUM', 'HARD', 'CHAOS']

export default function Games() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL')
  const played = useStore((s) => Object.keys(s.playsByGame).length)
  const list = GAMES.filter((g) => filter === 'ALL' || g.difficulty === filter)
  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-5 pt-8">
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div>
          <div className="font-pixel text-[0.75rem] text-lime">PICK YOUR POISON</div>
          <h1 className="font-display title-outline text-[clamp(2.1rem,11vw,3.75rem)] break-words text-yellow mt-1">THE ARCADE</h1>
        </div>
        <div className="sticker rounded-xl bg-panel px-3 py-2 font-display text-sm">
          TRIED <span className="text-lime">{played}</span>/{GAMES.length}
        </div>
      </div>
      <div className="flex gap-2 mt-5 scroll-x pb-2" role="tablist" aria-label="Filter by difficulty">
        {FILTERS.map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`sticker shrink-0 rounded-xl px-4 h-11 font-display text-xs transition-transform ${filter === f ? 'bg-yellow text-bg -rotate-2' : 'bg-panel2 text-dim hover:text-ink'}`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
        {list.map((g, i) => (
          <GameCard key={g.id} game={g} index={i} />
        ))}
      </div>
      <p className="text-center font-pixel text-[0.72rem] text-dim mt-10">
        MORE GAMES DROP DURING FALL FEST. MAYBE.
      </p>
    </div>
  )
}
