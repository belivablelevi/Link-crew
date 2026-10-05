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
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const AchievementsPage = lazy(() => import('./pages/AchievementsPage'))
const NotFound = lazy(() => import('./pages/NotFound'))

function Page({ route }: { route: string }) {
  if (route === '/') return <Home />
  if (route === '/games') return <Games />
  if (route.startsWith('/games/')) return <GamePage id={route.slice('/games/'.length)} />
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

/** ↑↑↓↓←→←→BA anywhere outside a text field. */
function useKonami() {
  const pos = useRef(0)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      pos.current = k === KONAMI[pos.current] ? pos.current + 1 : k === KONAMI[0] ? 1 : 0
      if (pos.current === KONAMI.length) {
        pos.current = 0
        triggerSecret('konami')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

export default function App() {
  const route = useRoute()
  useMotionPreference()
  useKonami()
  useEffect(() => startSession(), [])
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [route])

  const inGame = route.startsWith('/games/')
  return (
    <>
      <div className="bg-stage" aria-hidden />
      <div className="bg-noise" aria-hidden />
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
        LINK CREW FALL FEST ARCADE · PROGRESS SAVES ON THIS DEVICE · NO REAL MONEY, EVER
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
