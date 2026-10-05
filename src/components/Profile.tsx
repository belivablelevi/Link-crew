import type { CSSProperties } from 'react'
import { useStore, isBoostActive } from '../state/store'
import { cosmeticValue } from '../lib/cosmetics'
import { XPBar } from './XPBar'
import { useNow } from '../lib/useNow'
import { Icon } from './Icon'

/** Avatar + name (with equipped name effect) + title. */
export function PlayerBadge({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const s = useStore((st) => st)
  const avatar = cosmeticValue(s.cosmetics.equipped.avatar, 'avatar')
  const title = cosmeticValue(s.cosmetics.equipped.title, 'title')
  const effect = cosmeticValue(s.cosmetics.equipped.nameEffect, 'nameEffect')
  const bg = cosmeticValue(s.cosmetics.equipped.background, 'background')
  const big = size === 'lg'
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className={`sticker rounded-2xl grid place-items-center shrink-0 anim-float ${big ? 'w-24 h-24 text-6xl' : 'w-16 h-16 text-4xl'}`} style={{ background: bg, '--r': '-3deg' } as CSSProperties} aria-hidden>
        {avatar}
      </div>
      <div className="min-w-0">
        <div className={`font-display leading-tight truncate ${big ? 'text-3xl' : 'text-xl'} ${effect}`}>{s.username}</div>
        <div className="font-pixel text-[0.7rem] text-pink mt-1 truncate">{title}</div>
      </div>
    </div>
  )
}

function fmtLeft(ms: number) {
  const m = Math.floor(ms / 60000)
  const sec = Math.floor((ms % 60000) / 1000)
  return `${m}:${String(sec).padStart(2, '0')}`
}

/** The "YOUR PROFILE" block on the home screen. */
export function ProfileCard() {
  const xp = useStore((s) => s.xp)
  const tokens = useStore((s) => s.tokens)
  const streak = useStore((s) => s.streak.count)
  const xpUntil = useStore((s) => s.boosts.xp2xUntil)
  const tkUntil = useStore((s) => s.boosts.tokens2xUntil)
  const now = useNow(1000)
  return (
    <section className="panel p-4 sm:p-5" aria-label="Your profile">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-pixel text-[0.75rem] text-dim">YOUR PROFILE</h2>
        <a href="#/profile" className="font-pixel text-[0.72rem] text-blue hover:underline">
          CUSTOMIZE →
        </a>
      </div>
      <PlayerBadge />
      <div className="mt-4">
        <XPBar xp={xp} />
      </div>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="rounded-2xl bg-bg/60 border-2 border-[#2a4180] p-3">
          <div className="font-display text-2xl text-orange flex items-center gap-1.5"><Icon name="flame" size={22} /> {streak}</div>
          <div className="font-pixel text-[0.7rem] text-dim mt-1">DAY STREAK</div>
        </div>
        <div className="rounded-2xl bg-bg/60 border-2 border-[#2a4180] p-3">
          <div className="font-display text-2xl text-yellow tabular-nums flex items-center gap-1.5"><Icon name="coin" size={22} /> {tokens.toLocaleString()}</div>
          <div className="font-pixel text-[0.7rem] text-dim mt-1">FEST TOKENS</div>
        </div>
      </div>
      {(isBoostActive(xpUntil) || isBoostActive(tkUntil)) && (
        <div className="flex flex-wrap gap-2 mt-3">
          {xpUntil > now && (
            <span className="tag anim-blink" style={{ '--c': 'var(--color-lime)' } as CSSProperties}>
              2X XP · {fmtLeft(xpUntil - now)}
            </span>
          )}
          {tkUntil > now && (
            <span className="tag anim-blink" style={{ '--c': 'var(--color-yellow)' } as CSSProperties}>
              2X TOKENS · {fmtLeft(tkUntil - now)}
            </span>
          )}
        </div>
      )}
    </section>
  )
}
