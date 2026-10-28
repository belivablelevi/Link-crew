import { Suspense, lazy, useEffect, useRef } from 'react'
import { useRoute } from './lib/router'
import { Navigation } from './components/Navigation'
import { Confetti } from './components/Confetti'
import { ToastHost } from './components/Toast'
import { FxLayer } from './components/FxLayer'
import { Particles } from './components/Particles'
import { Onboarding } from './components/Onboarding'
import { startSession, useStore } from './state/store'
import { motion } from './lib/fx'
import { KONAMI, triggerSecret } from './lib/secrets'
import Home from './pages/Home'

const Games = lazy(() => import('./pages/Games'))
const GamePage = lazy(() => import('./pages/GamePage'))
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const AchievementsPage = lazy(() => import('./pages/AchievementsPage'))
const NotFound = lazy(() => import('./pages/NotFound'))

function Page({ route }: { route: string }) {
  if (route === '/') return <Home />
  if (route === '/games') return <Games />
  if (route.startsWith('/games/')) return <GamePage id={route.slice('/games/'.length)} />
  if (route === '/leaderboard') return <LeaderboardPage />
  if (route.startsWith('/leaderboard/')) return <LeaderboardPage game={route.slice('/leaderboard/'.length)} />
  if (route === '/profile') return <ProfilePage />
  if (route === '/achievements') return <AchievementsPage />
  return <NotFound />
}

/** Applies the motion setting (AUTO follows prefers-reduced-motion). */
function useMotionPreference() {
  const pref = useStore((s) => s.settings.motion)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => {
      const reduced = pref === 'reduced' || (pref === 'system' && mq.matches)
      motion.reduced = reduced
      document.documentElement.classList.toggle('reduce-motion', reduced)
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [pref])
}

/**
 * Secret code ↑↑↓↓←→←→BA.
 * Keyboard: type it anywhere outside a text field.
 * Phone/tablet: swipe up, up, down, down, left, right, left, right, then tap twice (B, A).
 * Swipes are ignored inside games so normal play never triggers it.
 */
function useKonami(inGame: boolean) {
  const pos = useRef(0)
  const inGameRef = useRef(inGame)
  inGameRef.current = inGame
  useEffect(() => {
    const feed = (k: string) => {
      pos.current = k === KONAMI[pos.current] ? pos.current + 1 : k === KONAMI[0] ? 1 : 0
      if (pos.current === KONAMI.length) {
        pos.current = 0
        triggerSecret('konami')
      }
    }
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      feed(e.key.length === 1 ? e.key.toLowerCase() : e.key)
    }

    let start: { x: number; y: number; t: number } | null = null
    const onTouchStart = (e: TouchEvent) => {
      if (inGameRef.current || e.touches.length !== 1) return (start = null)
      const t = e.touches[0]
      start = { x: t.clientX, y: t.clientY, t: performance.now() }
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (!start || inGameRef.current) return
      const t = e.changedTouches[0]
      const dx = t.clientX - start.x
      const dy = t.clientY - start.y
      const dist = Math.hypot(dx, dy)
      const quick = performance.now() - start.t < 600
      start = null
      if (dist >= 40 && quick) {
        // a swipe: the finger's direction (swiping up = "up")
        if (Math.abs(dy) > Math.abs(dx)) feed(dy < 0 ? 'ArrowUp' : 'ArrowDown')
        else feed(dx < 0 ? 'ArrowLeft' : 'ArrowRight')
      } else if (dist < 12 && quick) {
        // a tap stands in for B then A at the end of the code
        const expected = KONAMI[pos.current]
        feed(expected === 'b' || expected === 'a' ? expected : 'tap')
      }
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [])
}

export default function App() {
  const route = useRoute()
  useMotionPreference()
  useKonami(route.startsWith('/games/'))
  useEffect(() => startSession(), [])
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [route])

  const inGame = route.startsWith('/games/')
  return (
    <>
      <div className="bg-stage" aria-hidden />
      {!inGame && <Particles />}
      <div id="app-shell" className="relative z-10 min-h-dvh flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] btn">
          Skip to content
        </a>
        <Navigation />
        <main id="main" className={`flex-1 ${inGame ? "pb-20 md:pb-6" : "pb-6"}`}>
          <Suspense fallback={<div className="p-16 text-center font-pixel text-xs text-dim anim-blink">LOADING…</div>}>
            <Page route={route} />
          </Suspense>
        </main>
        {!inGame && <Footer />}
      </div>
      <Onboarding />
      <ToastHost />
      <FxLayer />
      <Confetti />
    </>
  )
}

function Footer() {
  return (
    <footer className="relative max-w-6xl w-full mx-auto px-5 pb-28 md:pb-10 pt-4 text-center">
      <div className="font-pixel text-[0.7rem] text-dim leading-relaxed">
        LINK CREW WINTER FEST ARCADE · PROGRESS SAVES ON THIS DEVICE · NO REAL MONEY, EVER
      </div>
      {/* Easter egg: the forbidden button. Nearly invisible. */}
      <button
        onClick={() => triggerSecret('button')}
        className="mt-3 w-3 h-3 rounded-full bg-red/20 hover:bg-red focus:bg-red transition-colors"
        aria-label="Do not press"
        title="Do not press."
      />
    </footer>
  )
}
