import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { leaderboard, type BoardRow } from '../lib/leaderboard'
import { GAMES } from '../games/meta'
import type { GameId } from '../lib/types'
import { useStore } from '../state/store'
import { navigate } from '../lib/router'
import { displayName } from '../lib/names'

export const RANKED_GAMES = GAMES.filter((g) => !g.custom)
export type BoardId = GameId | 'all-time'
const PODIUM_COLOR = ['var(--color-yellow)', '#d6dbe8', 'var(--color-orange)']

export function Leaderboard({ board }: { board: BoardId }) {
  const [rows, setRows] = useState<BoardRow[] | null>(null)
  const [error, setError] = useState(false)
  const name = useStore((s) => s.username)
  const allTime = board === 'all-time'
  const meta = allTime ? { name: 'ALL-TIME POINTS', color: 'var(--color-yellow)' } : GAMES.find((g) => g.id === board)!
  const activeTab = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    activeTab.current?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [board])

  useEffect(() => {
    let alive = true
    const load = () =>
      (allTime ? leaderboard.allTime(name, 10) : leaderboard.top(board as GameId, name, 10))
        .then((r) => {
          if (!alive) return
          setRows(r)
          setError(false)
        })
        .catch(() => alive && setError(true))
    setRows(null)
    void load()
    const id = setInterval(load, 30_000) // keep it fresh during the event
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [board, allTime, name])

  const top3 = rows?.filter((r) => r.rank <= 3) ?? []

  return (
    <div>
      <div className="flex gap-2 scroll-x pb-2 -mx-1 px-1" role="tablist" aria-label="Choose a game">
        <button
          ref={allTime ? activeTab : undefined}
          role="tab"
          aria-selected={allTime}
          onClick={() => navigate('/leaderboard/all-time')}
          className={`sticker shrink-0 rounded-xl px-3 h-11 font-display text-xs transition-transform ${allTime ? 'bg-yellow text-bg -rotate-2' : 'bg-panel2 text-dim hover:text-ink'}`}
        >
          ALL-TIME
        </button>
        {RANKED_GAMES.map((g) => (
          <button
            key={g.id}
            ref={g.id === board ? activeTab : undefined}
            role="tab"
            aria-selected={g.id === board}
            onClick={() => navigate(`/leaderboard/${g.id}`)}
            className={`sticker shrink-0 rounded-xl px-3 h-11 font-display text-xs transition-transform ${g.id === board ? 'bg-yellow text-bg -rotate-2' : 'bg-panel2 text-dim hover:text-ink'}`}
          >
            {g.name}
          </button>
        ))}
      </div>

      <h2 className="font-display text-2xl mt-5" style={{ color: meta.color }}>
        {meta.name}
      </h2>
      {allTime && <p className="text-sm text-dim mt-1">Every game you finish adds points (10 to 260 per game, based on how well you did), so every game counts the same.</p>}

      {error && (
        <div className="text-center py-10">
          <p className="font-display text-lg">COULDN&apos;T LOAD THE LEADERBOARD</p>
          <p className="text-dim text-sm mt-1">Check your connection. It will try again automatically.</p>
        </div>
      )}

      {!error && !rows && <div className="font-pixel text-xs text-dim p-8 text-center anim-blink">LOADING...</div>}

      {!error && rows && rows.length === 0 && (
        <div className="text-center py-10">
          <p className="font-display text-lg">NO SCORES YET</p>
          <p className="text-dim text-sm mt-1">{allTime ? 'Play any game and your points show up here.' : `Be the first. Play ${meta.name} and your score shows up here.`}</p>
        </div>
      )}

      {!error && rows && rows.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end mt-6 mb-6 max-w-xl mx-auto" aria-hidden>
            {[1, 0, 2].map((i) => {
              const r = top3[i]
              if (!r) return <div key={i} />
              const h = [140, 105, 85][i]
              return (
                <div key={i} className="text-center anim-up" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className={`font-display text-xs sm:text-sm truncate ${r.isYou ? 'text-lime' : ''}`}>{r.isYou ? 'YOU' : displayName(r.name)}</div>
                  <div className="font-display text-sm text-dim tabular-nums">{r.score.toLocaleString()}</div>
                  <div className="sticker rounded-t-2xl mt-2 grid place-items-center font-display text-3xl text-bg" style={{ height: h, background: PODIUM_COLOR[i] } as CSSProperties}>
                    {i + 1}
                  </div>
                </div>
              )
            })}
          </div>
          <ol className="grid gap-2">
            {rows.map((r) => (
              <li key={`${r.rank}-${r.name}`} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 border-[3px] ${r.isYou ? 'bg-lime/15 border-lime' : 'bg-panel border-[#2a4180]'}`}>
                <span
                  className="w-8 h-8 grid place-items-center rounded-full font-display text-sm shrink-0"
                  style={r.rank <= 3 ? { background: PODIUM_COLOR[r.rank - 1], color: '#071022' } : { color: 'var(--color-dim)' }}
                >
                  {r.rank}
                </span>
                <span className={`flex-1 min-w-0 font-display text-sm truncate ${r.isYou ? 'text-lime' : ''}`}>
                  {displayName(r.name)} {r.isYou && <span className="font-pixel text-[0.7rem] align-middle">(YOU)</span>}
                  {r.games !== undefined && <span className="block font-pixel text-[0.65rem] text-dim mt-0.5">{r.games} {r.games === 1 ? 'GAME' : 'GAMES'}</span>}
                </span>
                <span className="font-display text-base tabular-nums text-yellow shrink-0">
                  {r.score.toLocaleString()}
                  {allTime && <span className="text-xs text-dim ml-1">PTS</span>}
                </span>
              </li>
            ))}
          </ol>
          {!rows.some((r) => r.isYou) && <p className="text-sm text-dim mt-3 text-center">You&apos;re not on this board yet. Play to get ranked!</p>}
        </>
      )}

      <p className="font-pixel text-[0.7rem] leading-relaxed text-dim mt-5 text-center">
        {leaderboard.mode === 'online'
          ? allTime
            ? 'SCHOOL-WIDE LEADERBOARD. EVERY GAME YOU FINISH ADDS UP. UPDATES EVERY 30 SECONDS.'
            : 'SCHOOL-WIDE LEADERBOARD. YOUR BEST SCORE IN EACH GAME COUNTS. UPDATES EVERY 30 SECONDS.'
          : 'SHOWING SCORES FROM THIS DEVICE ONLY. THE SCHOOL-WIDE BOARD TURNS ON ONCE THE DATABASE IS CONNECTED.'}
      </p>
    </div>
  )
}
