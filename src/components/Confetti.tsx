import { useEffect, useRef } from 'react'
import { motion, onFx } from '../lib/fx'
import { useStore } from '../state/store'
import { cosmeticValue } from '../lib/cosmetics'

interface P {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  vr: number
  size: number
  color: string
  glyph?: string
  life: number
}

const COLORS = ['#ff2bd6', '#ffe83d', '#3cff6e', '#00e1ff', '#ff9f1a', '#8b5cff', '#ff3b5c']
const GLYPHS: Record<string, string[]> = {
  leaves: ['🍁', '🍂', '🍃', '🎃'],
  ducks: ['🦆', '🐥', '🦆'],
  candy: ['🍬', '🍭', '🍫', '🍩'],
}

/** Full-screen canvas confetti. Style comes from the player's equipped confetti cosmetic. */
export function Confetti() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const equipped = useStore((s) => s.cosmetics.equipped.confetti)
  const styleRef = useRef('classic')
  styleRef.current = cosmeticValue(equipped, 'confetti')

  useEffect(() => {
    const cv = canvas.current!
    const ctx = cv.getContext('2d')!
    let parts: P[] = []
    let raf = 0
    let running = false

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      cv.width = window.innerWidth * dpr
      cv.height = window.innerHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const loop = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      for (const p of parts) {
        p.vy += 0.25
        p.vx *= 0.99
        p.vy *= 0.99
        p.x += p.vx
        p.y += p.vy
        p.r += p.vr
        p.life -= 1
        ctx.save()
        ctx.globalAlpha = Math.min(1, p.life / 40)
        ctx.translate(p.x, p.y)
        ctx.rotate(p.r)
        if (p.glyph) {
          ctx.font = `${p.size * 2}px serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(p.glyph, 0, 0)
        } else {
          ctx.fillStyle = p.color
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        }
        ctx.restore()
      }
      parts = parts.filter((p) => p.life > 0 && p.y < window.innerHeight + 60)
      if (parts.length) raf = requestAnimationFrame(loop)
      else {
        running = false
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      }
    }

    const off = onFx((e) => {
      if (e.type !== 'confetti' || motion.reduced) return
      const style = e.style ?? styleRef.current
      const n = Math.min(260, e.amount ?? 120)
      const ox = e.origin?.x ?? window.innerWidth / 2
      const oy = e.origin?.y ?? window.innerHeight * 0.35
      const fromTop = !e.origin
      for (let i = 0; i < n; i++) {
        const glyphs = GLYPHS[style]
        const pixel = style === 'pixel'
        parts.push({
          x: fromTop ? Math.random() * window.innerWidth : ox,
          y: fromTop ? -20 - Math.random() * window.innerHeight * 0.3 : oy,
          vx: fromTop ? (Math.random() - 0.5) * 4 : (Math.random() - 0.5) * 16,
          vy: fromTop ? Math.random() * 3 : -Math.random() * 14 - 4,
          r: Math.random() * Math.PI,
          vr: pixel ? 0 : (Math.random() - 0.5) * 0.3,
          size: pixel ? 8 + Math.random() * 6 : glyphs ? 9 + Math.random() * 6 : 8 + Math.random() * 8,
          color: COLORS[i % COLORS.length],
          glyph: glyphs ? glyphs[i % glyphs.length] : undefined,
          life: 160 + Math.random() * 80,
        })
      }
      if (parts.length > 500) parts = parts.slice(-500)
      if (!running) {
        running = true
        raf = requestAnimationFrame(loop)
      }
    })
    return () => {
      off()
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvas} className="fixed inset-0 z-[90] pointer-events-none w-full h-full" aria-hidden />
}
