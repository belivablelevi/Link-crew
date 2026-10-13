import { useMemo, type CSSProperties } from 'react'

const GLYPHS = ['✦', '✦', '★', '•', '•', '•']
const COLORS = ['#8ec2ff', '#ffc72c', '#3ddc84', '#4fb3ff', '#f2a900', '#2f6bff']

/**
 * Drifting background sparkles. Pure CSS transforms (moved by the GPU compositor), so they cost
 * almost nothing, unlike redrawing a full-screen canvas every frame. Hidden with reduced motion.
 */
export function Particles() {
  const items = useMemo(() => {
    const count = typeof window !== 'undefined' && window.innerWidth < 640 ? 7 : 12
    return Array.from({ length: count }, (_, i) => ({
      left: Math.random() * 100,
      size: 8 + Math.random() * 14,
      dur: 22 + Math.random() * 26,
      delay: -Math.random() * 40,
      sway: 10 + Math.random() * 20,
      glyph: GLYPHS[i % GLYPHS.length],
      color: COLORS[i % COLORS.length],
      alpha: 0.15 + Math.random() * 0.25,
    }))
  }, [])
  return (
    <div className="particles fixed inset-0 z-[1] pointer-events-none overflow-hidden" aria-hidden>
      {items.map((p, i) => (
        <span
          key={i}
          className="particle"
          style={
            {
              left: `${p.left}%`,
              fontSize: p.size,
              color: p.color,
              opacity: p.alpha,
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
              '--sway': `${p.sway}px`,
            } as CSSProperties
          }
        >
          {p.glyph}
        </span>
      ))}
    </div>
  )
}
