import { useEffect, useRef } from 'react'
import { motion } from '../lib/fx'

const GLYPHS = ['✦', '✦', '★', '•', '•', '•']
const COLORS = ['#8ec2ff', '#ffc72c', '#3ddc84', '#4fb3ff', '#f2a900', '#2f6bff']

/** Lightweight drifting background particles. Pauses when hidden or with reduced motion. */
export function Particles() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current!
    const ctx = cv.getContext('2d')!
    let w = 0
    let h = 0
    const resize = () => {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1)
      w = window.innerWidth
      h = window.innerHeight
      cv.width = w * dpr
      cv.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)
    const count = window.innerWidth < 640 ? 8 : 14
    const ps = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * w,
      y: Math.random() * h,
      s: 8 + Math.random() * 14,
      vy: 0.1 + Math.random() * 0.25,
      ph: Math.random() * Math.PI * 2,
      g: GLYPHS[i % GLYPHS.length],
      c: COLORS[i % COLORS.length],
      a: 0.15 + Math.random() * 0.25,
    }))
    let raf = 0
    let t = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      if (document.hidden || motion.reduced) {
        ctx.clearRect(0, 0, w, h)
        return
      }
      t += 0.01
      ctx.clearRect(0, 0, w, h)
      ctx.textAlign = 'center'
      for (const p of ps) {
        p.y += p.vy
        const x = p.x + Math.sin(t * 2 + p.ph) * 18
        if (p.y > h + 20) {
          p.y = -20
          p.x = Math.random() * w
        }
        ctx.globalAlpha = p.a
        ctx.fillStyle = p.c
        ctx.font = `${p.s}px sans-serif`
        ctx.fillText(p.g, x, p.y)
      }
      ctx.globalAlpha = 1
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])
  return <canvas ref={ref} className="fixed inset-0 z-[1] pointer-events-none w-full h-full" aria-hidden />
}
