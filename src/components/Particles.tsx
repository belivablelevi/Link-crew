import { useMemo, type CSSProperties } from 'react'

// \uFE0E keeps the snowflakes as plain text glyphs instead of colour emoji
const GLYPHS = ['\u2744\uFE0E', '\u2745\uFE0E', '•', '•', '•', '\u2746\uFE0E']
const COLORS = ['#ffffff', '#e6f6ff', '#bfe6ff', '#ffffff', '#d6efff', '#ffffff']

/**
 * Gently falling background snow. Pure CSS transforms (moved by the GPU compositor), so they cost
 * almost nothing, unlike redrawing a full-screen canvas every frame. Hidden with reduced motion.
 */
export function Particles() {
  const items = useMemo(() => {
    const count = typeof window !== 'undefined' && window.innerWidth < 640 ? 12 : 22
    return Array.from({ length: count }, (_, i) => ({
      left: Math.random() * 100,
      size: 6 + Math.random() * 14,
      dur: 16 + Math.random() * 20,
      delay: -Math.random() * 40,
      sway: 10 + Math.random() * 20,
      glyph: GLYPHS[i % GLYPHS.length],
      color: COLORS[i % COLORS.length],
      alpha: 0.25 + Math.random() * 0.35,
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
