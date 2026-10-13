/** Shared helpers for canvas games. */

const spriteCache = new Map<string, HTMLCanvasElement>()

/** Pre-renders an emoji to an offscreen canvas so drawing it every frame is cheap. */
export function emojiSprite(emoji: string, size: number): HTMLCanvasElement {
  const key = `${emoji}@${size}`
  const hit = spriteCache.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  const pad = Math.ceil(size * 0.25)
  c.width = c.height = size + pad * 2
  const ctx = c.getContext('2d')!
  ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji, c.width / 2, c.height / 2 + size * 0.06)
  spriteCache.set(key, c)
  return c
}

export function drawSprite(ctx: CanvasRenderingContext2D, emoji: string, x: number, y: number, size: number, rot = 0, flip = false) {
  const s = emojiSprite(emoji, Math.round(size))
  ctx.save()
  ctx.translate(x, y)
  if (rot) ctx.rotate(rot)
  if (flip) ctx.scale(-1, 1)
  ctx.drawImage(s, -s.width / 2, -s.height / 2)
  ctx.restore()
}

/** Keeps a canvas sized to its parent at device-pixel resolution. Returns cleanup. */
export function fitCanvas(canvas: HTMLCanvasElement, onResize: (w: number, h: number) => void): () => void {
  const ctx = canvas.getContext('2d')!
  const parent = canvas.parentElement!
  const apply = () => {
    // 1.5x is visually identical at game speed but draws up to 44% fewer pixels than 2x
    const dpr = Math.min(1.5, window.devicePixelRatio || 1)
    const w = parent.clientWidth
    const h = parent.clientHeight
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    onResize(w, h)
  }
  apply()
  const ro = new ResizeObserver(apply)
  ro.observe(parent)
  return () => ro.disconnect()
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/**
 * Draws a static background once into an off-screen canvas so each frame can copy it with a
 * single drawImage instead of repainting gradients, grids and shapes 60 times a second.
 */
export function makeLayer(w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const dpr = Math.min(1.5, window.devicePixelRatio || 1)
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w * dpr))
  c.height = Math.max(1, Math.round(h * dpr))
  const ctx = c.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  paint(ctx)
  return c
}
