import { useRef } from 'react'
import { href, useRoute } from '../lib/router'
import { useStore } from '../state/store'
import { levelFromXp } from '../lib/progression'
import { cosmeticValue } from '../lib/cosmetics'
import { SoundToggle } from './SoundToggle'
import { triggerSecret } from '../lib/secrets'
import { play } from '../lib/sound'
import { SchoolLogo } from './SchoolLogo'

export const NAV = [
  { path: '/', label: 'HOME', icon: '🏠' },
  { path: '/games', label: 'GAMES', icon: '🎮' },
  { path: '/leaderboard', label: 'RANKS', icon: '🏆' },
  { path: '/profile', label: 'PROFILE', icon: '👤' },
  { path: '/achievements', label: 'BADGES', icon: '🏅' },
]

function isActive(route: string, path: string) {
  return path === '/' ? route === '/' : route === path || route.startsWith(path + '/')
}

function Logo() {
  const clicks = useRef<number[]>([])
  return (
    <a
      href={href('/')}
      className="flex items-center gap-2 select-none shrink-0"
      aria-label="Link Crew Fall Fest home"
      onClick={() => {
        const now = Date.now()
        clicks.current = [...clicks.current.filter((t) => now - t < 2000), now]
        play('pop', 1 + clicks.current.length * 0.15)
        if (clicks.current.length >= 5) {
          clicks.current = []
          triggerSecret('logo')
        }
      }}
    >
      <SchoolLogo size={40} />
      <span className="leading-none hidden min-[380px]:block">
        <span className="block font-display text-sm text-yellow">LINK CREW</span>
        <span className="block font-pixel text-[0.7rem] text-pink mt-1">FALL FEST</span>
      </span>
    </a>
  )
}

/** Top bar (all sizes) + fixed bottom tab bar on mobile. */
export function Navigation() {
  const route = useRoute()
  const tokens = useStore((s) => s.tokens)
  const xp = useStore((s) => s.xp)
  const avatar = useStore((s) => cosmeticValue(s.cosmetics.equipped.avatar, 'avatar'))
  const level = levelFromXp(xp)

  return (
    <>
      <header className="sticky top-0 z-50 bg-bg/85 backdrop-blur-md border-b-[3px] border-[#1b2d5c]">
        <div className="max-w-6xl mx-auto px-3 sm:px-5 h-16 flex items-center gap-3">
          <Logo />
          <nav className="hidden md:flex items-center gap-1 ml-4" aria-label="Main">
            {NAV.map((n) => {
              const active = isActive(route, n.path)
              return (
                <a
                  key={n.path}
                  href={href(n.path)}
                  aria-current={active ? 'page' : undefined}
                  className={`font-display text-xs px-3 py-2 rounded-xl border-[3px] transition-all ${active ? 'bg-yellow text-bg border-bg shadow-[3px_3px_0_#000]' : 'border-transparent text-dim hover:text-ink hover:bg-panel2'}`}
                >
                  <span aria-hidden className="mr-1">{n.icon}</span>
                  {n.label}
                </a>
              )
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <a href={href('/profile')} className="sticker h-11 rounded-xl bg-panel flex items-center gap-2 px-2.5" aria-label={`Level ${level}, ${tokens} tokens. Open profile.`}>
              <span className="text-xl" aria-hidden>{avatar}</span>
              <span className="font-display text-xs text-lime">L{level}</span>
              <span className="w-px h-5 bg-[#2a4180]" />
              <span className="font-display text-sm text-yellow tabular-nums">🪙 {tokens.toLocaleString()}</span>
            </a>
            <SoundToggle />
          </div>
        </div>
      </header>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-panel border-t-[3px] border-bg shadow-[0_-6px_0_rgba(0,0,0,.35)] pb-[env(safe-area-inset-bottom)]" aria-label="Main">
        <div className="grid grid-cols-5">
          {NAV.map((n) => {
            const active = isActive(route, n.path)
            return (
              <a key={n.path} href={href(n.path)} aria-current={active ? 'page' : undefined} className="flex flex-col items-center justify-center gap-0.5 h-16 relative">
                <span className={`text-2xl transition-transform ${active ? '-translate-y-1 scale-125' : 'opacity-70'}`} aria-hidden>
                  {n.icon}
                </span>
                <span className={`font-pixel text-[0.65rem] ${active ? 'text-yellow' : 'text-dim'}`}>{n.label}</span>
                {active && <span className="absolute top-0 inset-x-4 h-1 rounded-b bg-yellow" />}
              </a>
            )
          })}
        </div>
      </nav>
    </>
  )
}
