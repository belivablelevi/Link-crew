import { levelProgress } from '../lib/progression'
import { ProgressBar } from './ProgressBar'

/** Level badge + XP progress toward the next level. */
export function XPBar({ xp, compact }: { xp: number; compact?: boolean }) {
  const p = levelProgress(xp)
  return (
    <div className="flex items-center gap-3 w-full">
      <div
        className="sticker shrink-0 grid place-items-center rounded-2xl bg-purple text-white font-display"
        style={{ width: compact ? 44 : 60, height: compact ? 44 : 60 }}
        aria-label={`Level ${p.level}`}
      >
        <div className="leading-none text-center">
          <div className="font-pixel text-[0.65rem] opacity-80">LVL</div>
          <div className={compact ? 'text-lg' : 'text-2xl'}>{p.level}</div>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        {!compact && (
          <div className="flex justify-between font-pixel text-[0.72rem] text-dim mb-1.5">
            <span>XP</span>
            <span>
              {p.intoLevel.toLocaleString()} / {p.needed.toLocaleString()}
            </span>
          </div>
        )}
        <ProgressBar value={p.pct} label={`${Math.round(p.pct * 100)}% to level ${p.level + 1}`} height={compact ? 16 : 22} />
      </div>
    </div>
  )
}
