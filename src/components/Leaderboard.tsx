import { useEffect, useState, type CSSProperties } from 'react'
import { BOARD_CATEGORIES, leaderboard, type BoardCategory, type BoardEntry } from '../lib/leaderboard'
import { useStore } from '../state/store'

const MEDAL = ['🥇', '🥈', '🥉']
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

      {rows && !compact && (
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
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 border-[3px] ${r.isYou ? 'bg-lime/15 border-lime' : 'bg-panel border-[#3a2766]'}`}
            >
              <span className="w-9 text-center font-display text-lg shrink-0">{r.rank <= 3 ? MEDAL[r.rank - 1] : r.rank}</span>
              <span className="text-2xl shrink-0" aria-hidden>
                {r.avatar}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block font-display text-sm truncate ${r.isYou ? 'text-lime' : ''}`}>
                  {r.name} {r.isYou && <span className="font-pixel text-[0.5rem] align-middle">(YOU)</span>}
                </span>
                <span className="block font-pixel text-[0.45rem] text-dim mt-0.5">
                  LVL {r.level}
                  {r.isDemo ? ' · DEMO RIVAL' : ''}
                </span>
              </span>
              <span className="font-display text-sm sm:text-base tabular-nums text-yellow shrink-0">{fmt(r.value)}</span>
            </li>
          ))}
        </ol>
      )}
      {rows && !rows.some((r) => r.isYou) && <p className="text-sm text-dim mt-3 text-center">You&apos;re not on this board yet. Play to get ranked!</p>}
      <p className="font-pixel text-[0.5rem] leading-relaxed text-dim mt-4 text-center">ⓘ {leaderboard.syncNote}</p>
    </div>
  )
}
