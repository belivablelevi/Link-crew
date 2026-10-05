import { useState } from 'react'
import { ACHIEVEMENTS } from '../lib/achievements'
import { AchievementCard } from '../components/Achievement'
import { ProgressBar } from '../components/ProgressBar'
import { useStore } from '../state/store'

type Filter = 'ALL' | 'UNLOCKED' | 'LOCKED'

export default function AchievementsPage() {
  const state = useStore((s) => s)
  const [filter, setFilter] = useState<Filter>('ALL')
  const unlocked = ACHIEVEMENTS.filter((a) => state.achievements[a.id]).length
  const list = ACHIEVEMENTS.filter((a) => (filter === 'ALL' ? true : filter === 'UNLOCKED' ? !!state.achievements[a.id] : !state.achievements[a.id])).sort(
    (a, b) => Number(!!state.achievements[b.id]) - Number(!!state.achievements[a.id]) || Number(!!a.secret) - Number(!!b.secret),
  )
  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-5 pt-8">
      <div className="font-pixel text-[0.75rem] text-lime">GOTTA CATCH &apos;EM ALL</div>
      <h1 className="font-display title-outline text-[clamp(2.1rem,11vw,3.75rem)] break-words text-yellow mt-1">ACHIEVEMENTS</h1>
      <div className="panel p-4 mt-6 flex flex-wrap items-center gap-4">
        <div className="font-display text-4xl">
          <span className="text-yellow">{unlocked}</span>
          <span className="text-dim text-2xl">/{ACHIEVEMENTS.length}</span>
        </div>
        <div className="flex-1 min-w-[160px]">
          <ProgressBar value={unlocked / ACHIEVEMENTS.length} color="var(--color-yellow)" label="Achievements unlocked" />
        </div>
        <div className="flex gap-2" role="tablist" aria-label="Filter achievements">
          {(['ALL', 'UNLOCKED', 'LOCKED'] as Filter[]).map((f) => (
            <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={`sticker rounded-xl px-3 h-10 font-display text-xs ${filter === f ? 'bg-yellow text-bg' : 'bg-panel2 text-dim'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
        {list.map((a) => (
          <AchievementCard key={a.id} a={a} state={state} />
        ))}
      </div>
    </div>
  )
}
