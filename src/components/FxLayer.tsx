import { useEffect, useState } from 'react'
import { fx, motion, onFx } from '../lib/fx'
import { play } from '../lib/sound'
import { getAchievement } from '../lib/achievements'
import { Button } from './Button'

interface LevelUp {
  level: number
  tokens: number
  unlocks: string[]
}

/**
 * Global overlays driven by the fx bus: screen flash, screen shake,
 * the LEVEL UP takeover and achievement-unlocked banners.
 */
export function FxLayer() {
  const [flash, setFlash] = useState<{ id: number; color: string } | null>(null)
  const [levelQueue, setLevelQueue] = useState<LevelUp[]>([])
  const [achQueue, setAchQueue] = useState<string[]>([])

  useEffect(
    () =>
      onFx((e) => {
        if (e.type === 'flash') {
          setFlash({ id: Date.now(), color: e.color ?? 'rgba(255,255,255,.3)' })
          setTimeout(() => setFlash(null), 180)
        } else if (e.type === 'shake') {
          if (motion.reduced) return
          const el = document.getElementById('app-shell')
          if (!el) return
          const cls = `shake-${e.intensity ?? 'md'}`
          el.classList.remove('shake-sm', 'shake-md', 'shake-lg')
          void el.offsetWidth // restart animation
          el.classList.add(cls)
          setTimeout(() => el.classList.remove(cls), 600)
        } else if (e.type === 'levelup') {
          // Several level-ups from one game collapse into a single celebration.
          setLevelQueue((q) => (q.length ? [{ level: Math.max(q[0].level, e.level), tokens: q[0].tokens + e.tokens, unlocks: [...q[0].unlocks, ...e.unlocks] }] : [{ level: e.level, tokens: e.tokens, unlocks: e.unlocks }]))
        } else if (e.type === 'achievement') {
          setAchQueue((q) => [...q, e.id])
        }
      }),
    [],
  )

  const lvl = levelQueue[0]
  const lvlNum = lvl?.level
  useEffect(() => {
    if (!lvlNum) return
    play('levelup')
    fx.confetti(200)
  }, [lvlNum])

  const ach = achQueue[0]
  useEffect(() => {
    if (!ach) return
    play('achievement')
    fx.confetti(60, { x: window.innerWidth / 2, y: 90 })
    const t = setTimeout(() => setAchQueue((q) => q.slice(1)), 3200)
    return () => clearTimeout(t)
  }, [ach])
  const achDef = ach ? getAchievement(ach) : undefined

  return (
    <>
      {flash && <div key={flash.id} className="fixed inset-0 z-[95] pointer-events-none" style={{ background: flash.color, transition: 'opacity .18s' }} aria-hidden />}

      {achDef && (
        <div className="fixed z-[96] top-3 left-1/2 -translate-x-1/2 w-[min(94vw,440px)] pointer-events-none" role="status" aria-live="assertive">
          <div key={ach} className="anim-pop sticker rounded-3xl px-4 py-3 flex items-center gap-4" style={{ background: 'linear-gradient(135deg,#ffe83d,#ff9f1a)', color: '#160b26' }}>
            <div className="text-5xl anim-wobble shrink-0" aria-hidden>
              {achDef.icon}
            </div>
            <div className="min-w-0">
              <div className="font-pixel text-[0.55rem]">ACHIEVEMENT UNLOCKED</div>
              <div className="font-display text-xl leading-tight">{achDef.name}</div>
              <div className="text-sm font-bold opacity-80">
                {achDef.desc} {achDef.tokens > 0 && `· +${achDef.tokens} 🪙`}
              </div>
            </div>
          </div>
        </div>
      )}

      {lvl && (
        <div className="fixed inset-0 z-[97] grid place-items-center p-4 bg-black/75" role="dialog" aria-modal="true" aria-label={`Level up! You are now level ${lvl.level}`}>
          <div className="relative text-center anim-pop">
            <div className="absolute inset-0 -z-10 anim-spin-slow opacity-60" aria-hidden style={{ background: 'repeating-conic-gradient(from 0deg, rgba(255,232,61,.35) 0 10deg, transparent 10deg 20deg)', borderRadius: '50%', transform: 'scale(1.6)' }} />
            <div className="font-pixel text-sm text-lime mb-2 anim-blink">★ ★ ★</div>
            <h2 className="font-display title-outline text-6xl sm:text-8xl text-yellow leading-none">LEVEL UP!</h2>
            <p className="font-display text-2xl sm:text-3xl mt-3">
              YOU ARE NOW <span className="text-pink">LEVEL {lvl.level}</span>
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-5">
              <span className="tag" style={{ ['--c' as string]: 'var(--color-yellow)' }}>+{lvl.tokens} TOKENS</span>
              <span className="tag" style={{ ['--c' as string]: 'var(--color-blue)' }}>BONUS SPIN</span>
              {lvl.unlocks.map((u) => (
                <span key={u} className="tag" style={{ ['--c' as string]: 'var(--color-pink)' }}>UNLOCKED: {u}</span>
              ))}
            </div>
            <Button className="mt-7" color="lime" size="lg" autoFocus onClick={() => setLevelQueue((q) => q.slice(1))}>
              LET&apos;S GO
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
