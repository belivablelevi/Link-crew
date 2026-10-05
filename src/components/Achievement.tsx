import type { AchievementDef } from '../lib/achievements'
import type { PlayerState } from '../lib/types'
import { ProgressBar } from './ProgressBar'

export function AchievementCard({ a, state }: { a: AchievementDef; state: PlayerState }) {
  const at = state.achievements[a.id]
  const unlocked = !!at
  const hidden = a.secret && !unlocked
  const prog = !unlocked && a.progress ? a.progress(state) : null
  return (
    <div
      className={`relative rounded-2xl border-[3px] p-4 flex gap-3 items-start transition-transform hover:-translate-y-1 ${unlocked ? 'bg-panel border-yellow shadow-[0_5px_0_#05020a,0_0_24px_rgba(255,232,61,.18)]' : 'bg-panel/60 border-[#3a2766] shadow-[0_5px_0_#05020a]'}`}
      aria-label={`${hidden ? 'Secret achievement' : a.name}: ${unlocked ? 'unlocked' : 'locked'}`}
    >
      <div className={`sticker rounded-xl w-14 h-14 grid place-items-center text-3xl shrink-0 ${unlocked ? 'bg-yellow' : 'bg-bg grayscale opacity-60'}`} aria-hidden>
        {hidden ? '❓' : a.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className={`font-display text-sm leading-tight ${unlocked ? 'text-yellow' : ''}`}>{hidden ? '???' : a.name}</div>
        <div className="text-sm text-dim leading-snug mt-1">{hidden ? 'Secret. Keep poking around…' : a.desc}</div>
        {prog && (
          <div className="mt-2">
            <ProgressBar value={prog[0] / prog[1]} height={12} color="var(--color-blue)" label={`${a.name} progress`} />
            <div className="font-pixel text-[0.45rem] text-dim mt-1">
              {Math.min(prog[0], prog[1]).toLocaleString()} / {prog[1].toLocaleString()}
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 mt-2">
          {a.tokens > 0 && <span className="font-pixel text-[0.45rem] text-yellow">+{a.tokens} 🪙</span>}
          {unlocked && <span className="font-pixel text-[0.45rem] text-lime ml-auto">✓ {new Date(at).toLocaleDateString()}</span>}
          {!unlocked && <span className="font-pixel text-[0.45rem] text-dim ml-auto">🔒 LOCKED</span>}
        </div>
      </div>
    </div>
  )
}
