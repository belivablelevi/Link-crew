import { useEffect, useState, type CSSProperties } from 'react'
import { BOARD_CATEGORIES, leaderboard, type BoardCategory, type BoardEntry } from '../lib/leaderboard'
import { useStore } from '../state/store'

const PODIUM_COLOR = ['var(--color-yellow)', '#d6dbe8', 'var(--color-orange)']

export function Leaderboard({ initial = 'overall', compact }: { initial?: BoardCategory; compact?: boolean }) {
  const [cat, setCat] = useState<BoardCategory>(initial)
  const [rows, setRows] = useState<BoardEntry[] | null>(null)
  const player = useStore((s) => s)
  const def = BOARD_CATEGORIES.find((c) => c.id === cat)!

  useEffect(() => {
    let alive = true
    leaderboard.getTop(cat, player, compact ? 5 : 10).then((r) => alive && setRows(r))
    return () => {
      alive = false
    }
  }, [cat, player, compact])

  const fmt = (v: number) => `${v.toLocaleString()} ${def.unit}`
  const top3 = rows?.slice(0, 3) ?? []

  return (
    <div>
      <div className="flex gap-2 scroll-x pb-2 -mx-1 px-1" role="tablist" aria-label="Leaderboard category">
        {BOARD_CATEGORIES.map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={cat === c.id}
            onClick={() => setCat(c.id)}
            className={`sticker shrink-0 rounded-xl px-3 h-11 font-display text-xs flex items-center gap-1.5 transition-transform ${cat === c.id ? 'bg-yellow text-bg -rotate-2' : 'bg-panel2 text-dim hover:text-ink'}`}
          >
            <span aria-hidden>{c.icon}</span> {c.label}
          </button>
        ))}
      </div>

      {!rows && <div className="font-pixel text-xs text-dim p-8 text-center anim-blink">LOADING…</div>}

      {rows && rows.length === 0 && (
        <div className="text-center py-10">
          <div className="text-5xl" aria-hidden>
            {def.icon}
          </div>
          <p className="font-display text-lg mt-3">NO SCORES YET</p>
          <p className="text-dim text-sm mt-1">Play a game and your score shows up here.</p>
        </div>
      )}

      {rows && rows.length > 0 && !compact && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end mt-6 mb-6 max-w-xl mx-auto" aria-hidden>
          {[1, 0, 2].map((i) => {
            const r = top3[i]
            if (!r) return <div key={i} />
            const h = [150, 115, 95][i]
            return (
              <div key={i} className="text-center anim-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="text-4xl sm:text-5xl anim-float" style={{ '--r': '0deg', animationDelay: `${i * 0.3}s` } as CSSProperties}>
                  {r.avatar}
                </div>
                <div className={`font-display text-xs sm:text-sm truncate mt-1 ${r.isYou ? 'text-lime' : ''}`}>{r.isYou ? 'YOU' : r.name}</div>
                <div className="sticker rounded-t-2xl mt-2 grid place-items-center font-display text-3xl text-bg" style={{ height: h, background: PODIUM_COLOR[i] }}>
                  {i + 1}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {rows && (
        <ol className="grid gap-2 mt-3">
          {rows.map((r) => (
            <li
              key={`${r.rank}-${r.name}`}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 border-[3px] ${r.isYou ? 'bg-lime/15 border-lime' : 'bg-panel border-[#2a4180]'}`}
            >
              <span
                className="w-8 h-8 grid place-items-center rounded-full font-display text-sm shrink-0"
                style={r.rank <= 3 ? { background: PODIUM_COLOR[r.rank - 1], color: '#071022' } : { color: 'var(--color-dim)' }}
              >
                {r.rank}
              </span>
              <span className="text-2xl shrink-0" aria-hidden>
                {r.avatar}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block font-display text-sm truncate ${r.isYou ? 'text-lime' : ''}`}>
                  {r.name} {r.isYou && <span className="font-pixel text-[0.7rem] align-middle">(YOU)</span>}
                </span>
                <span className="block font-pixel text-[0.65rem] text-dim mt-0.5">
                  LVL {r.level}
                </span>
              </span>
              <span className="font-display text-sm sm:text-base tabular-nums text-yellow shrink-0">{fmt(r.value)}</span>
            </li>
          ))}
        </ol>
      )}
      {rows && rows.length > 0 && !rows.some((r) => r.isYou) && <p className="text-sm text-dim mt-3 text-center">You&apos;re not on this board yet. Play to get ranked!</p>}
      <p className="font-pixel text-[0.7rem] leading-relaxed text-dim mt-4 text-center">ⓘ {leaderboard.syncNote}</p>
    </div>
  )
}
