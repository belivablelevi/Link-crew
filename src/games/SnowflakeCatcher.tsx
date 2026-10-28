import { useEffect, useRef, useState } from 'react'
import type { GameProps } from './types'
import { ScoreDisplay } from '../components/ScoreDisplay'
import { ProgressBar } from '../components/ProgressBar'
import { fitCanvas, makeLayer } from './canvas'
import { fx } from '../lib/fx'
import { play } from '../lib/sound'

const DURATION = 45
const LIVES = 3

type Kind = 'white' | 'ice' | 'blue' | 'golden' | 'coal'
interface Item {
  kind: Kind
  x: number
  y: number
  vy: number
  sway: number
  phase: number
  rot: number
  vr: number
  size: number
}
interface FloatText {
  text: string
  x: number
  y: number
  color: string
  t: number
}

const FLAKE_COLOR: Record<Exclude<Kind, 'coal'>, string> = {
  white: '#ffffff',
  ice: '#bff1ff',
  blue: '#7fd4ff',
  golden: '#ffd75e',
}
const POINTS: Record<Kind, number> = { white: 10, ice: 10, blue: 10, golden: 50, coal: 0 }

const FLAKE_SPRITE = 96 // px; drawn once per colour, then scaled with drawImage
const flakeCache = new Map<string, HTMLCanvasElement>()

/** A six-armed snowflake, pre-rendered once per colour so each frame is a single drawImage. */
function flakeSprite(kind: Exclude<Kind, 'coal'>): HTMLCanvasElement {
  const hit = flakeCache.get(kind)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = c.height = FLAKE_SPRITE
  const ctx = c.getContext('2d')!
  const s = FLAKE_SPRITE / 2 - 5
  ctx.translate(FLAKE_SPRITE / 2, FLAKE_SPRITE / 2)
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3
    const cx = Math.cos(a)
    const sy = Math.sin(a)
    ctx.moveTo(0, 0)
    ctx.lineTo(cx * s, sy * s)
    // two little branches on each arm
    for (const [d, l] of [
      [0.5, 0.32],
      [0.75, 0.22],
    ]) {
      for (const side of [-1, 1]) {
        const b = a + side * 0.8
        ctx.moveTo(cx * s * d, sy * s * d)
        ctx.lineTo(cx * s * d + Math.cos(b) * s * l, sy * s * d + Math.sin(b) * s * l)
      }
    }
  }
  // dark outline first, then the coloured flake on top
  ctx.strokeStyle = '#071022'
  ctx.lineWidth = 9
  ctx.stroke()
  ctx.strokeStyle = FLAKE_COLOR[kind]
  ctx.lineWidth = 4
  ctx.stroke()
  flakeCache.set(kind, c)
  return c
}

function drawFlake(ctx: CanvasRenderingContext2D, kind: Exclude<Kind, 'coal'>, size: number, now: number) {
  const s = size / 2
  if (kind === 'golden') {
    // cheap pulsing halo (canvas shadowBlur is very slow on Chromebooks)
    ctx.fillStyle = 'rgba(255,224,138,.28)'
    ctx.beginPath()
    ctx.arc(0, 0, s * (1.2 + Math.sin(now / 120) * 0.12), 0, Math.PI * 2)
    ctx.fill()
  }
  const d = size * 1.15
  ctx.drawImage(flakeSprite(kind), -d / 2, -d / 2, d, d)
}

function drawCoal(ctx: CanvasRenderingContext2D, size: number) {
  const s = size / 2
  ctx.strokeStyle = '#071022'
  ctx.lineWidth = 2
  ctx.fillStyle = '#2b2f3a'
  ctx.beginPath()
  ctx.moveTo(-s * 0.7, -s * 0.3)
  ctx.lineTo(-s * 0.2, -s * 0.75)
  ctx.lineTo(s * 0.5, -s * 0.6)
  ctx.lineTo(s * 0.8, -s * 0.05)
  ctx.lineTo(s * 0.55, s * 0.6)
  ctx.lineTo(-s * 0.15, s * 0.75)
  ctx.lineTo(-s * 0.75, s * 0.3)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#5a6172'
  ctx.beginPath()
  ctx.moveTo(-s * 0.35, -s * 0.4)
  ctx.lineTo(s * 0.1, -s * 0.5)
  ctx.lineTo(-s * 0.05, -s * 0.15)
  ctx.closePath()
  ctx.fill()
}

export default function SnowflakeCatcher({ onEnd }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hud, setHud] = useState({ score: 0, combo: 0, lives: LIVES, left: DURATION })
  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let W = 600
    let H = 500
    // static background, painted once per resize (see makeLayer)
    let bg: HTMLCanvasElement | null = null
    const stopFit = fitCanvas(canvas, (w, h) => {
      W = w
      H = h
      bg = makeLayer(w, h, (c) => {
        const g = c.createLinearGradient(0, 0, 0, h)
        g.addColorStop(0, '#0b1a3d')
        g.addColorStop(1, '#1d3f7a')
        c.fillStyle = g
        c.fillRect(0, 0, w, h)
        // pine tree silhouettes with snowy tips
        for (let x = -10, i = 0; x < w + 60; x += 70, i++) {
          const th = 90 + ((i * 37) % 50)
          c.fillStyle = '#0a1733'
          c.beginPath()
          c.moveTo(x, h - 30 - th)
          c.lineTo(x + 34, h - 30)
          c.lineTo(x - 34, h - 30)
          c.closePath()
          c.fill()
          c.fillStyle = 'rgba(230,245,255,.55)'
          c.beginPath()
          c.moveTo(x, h - 30 - th)
          c.lineTo(x + 9, h - 30 - th + 26)
          c.lineTo(x - 9, h - 30 - th + 26)
          c.closePath()
          c.fill()
        }
        // snowy ground
        c.fillStyle = '#dbeeff'
        c.fillRect(0, h - 30, w, 30)
        c.fillStyle = '#ffffff'
        c.fillRect(0, h - 30, w, 4)
      })
    })

    const basket = { x: W / 2, w: 96, h: 46, target: W / 2 }
    const items: Item[] = []
    const texts: FloatText[] = []
    const keys = new Set<string>()
    let score = 0
    let combo = 0
    let maxCombo = 0
    let caught = 0
    let golden = 0
    let lives = LIVES
    let time = 0
    let nextSpawn = 0.4
    let over = false
    let hurtT = 0
    let raf = 0
    let prev = performance.now()
    let hudTick = 0

    const mult = () => 1 + Math.floor(combo / 10) * 0.5

    const finish = (reason: 'time' | 'lives') => {
      if (over) return
      over = true
      play(reason === 'time' ? 'victory' : 'gameover')
      setTimeout(
        () =>
          onEndRef.current({
            score,
            headline: reason === 'time' ? 'MUG FULL OF SNOW!' : 'COALED OUT!',
            stats: { leavesCaught: caught, maxCombo },
            details: [
              { label: 'FLAKES', value: `${caught}` },
              { label: 'GOLDEN', value: `${golden}` },
              { label: 'MAX COMBO', value: `${maxCombo}x` },
            ],
          }),
        600,
      )
    }

    const spawn = () => {
      const r = Math.random()
      const coalChance = Math.min(0.3, 0.12 + time * 0.004)
      const kind: Kind = r < coalChance ? 'coal' : r < coalChance + 0.06 ? 'golden' : (['white', 'ice', 'blue'] as const)[Math.floor(Math.random() * 3)]
      const speed = 110 + time * 4 + Math.random() * 60
      items.push({
        kind,
        x: 30 + Math.random() * (W - 60),
        y: -30,
        vy: kind === 'coal' ? speed * 1.35 : kind === 'golden' ? speed * 1.2 : speed,
        sway: kind === 'coal' ? 0 : 25 + Math.random() * 45,
        phase: Math.random() * Math.PI * 2,
        rot: Math.random() * Math.PI,
        vr: kind === 'coal' ? 2 : (Math.random() - 0.5) * 1.5,
        size: kind === 'coal' ? 30 : 34 + Math.random() * 10,
      })
    }

    const float = (text: string, x: number, y: number, color: string) => texts.push({ text, x, y, color, t: 0 })

    const step = (now: number) => {
      raf = requestAnimationFrame(step)
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      if (!over) {
        time += dt
        if (time >= DURATION) finish('time')

        // basket: keyboard nudges the target, pointer sets it directly
        const kdir = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0)
        if (kdir) basket.target += kdir * 520 * dt
        basket.target = Math.max(basket.w / 2, Math.min(W - basket.w / 2, basket.target))
        basket.x += (basket.target - basket.x) * Math.min(1, dt * 18)

        nextSpawn -= dt
        if (nextSpawn <= 0) {
          spawn()
          nextSpawn = Math.max(0.28, 0.75 - time * 0.011) * (0.7 + Math.random() * 0.6)
        }

        const by = H - 30 - basket.h
        for (let i = items.length - 1; i >= 0; i--) {
          const it = items[i]
          it.y += it.vy * dt
          it.rot += it.vr * dt
          const x = it.x + Math.sin(time * 2 + it.phase) * it.sway
          // caught?
          if (it.y > by - 8 && it.y < by + 24 && Math.abs(x - basket.x) < basket.w / 2 + 6) {
            items.splice(i, 1)
            if (it.kind === 'coal') {
              lives--
              combo = 0
              hurtT = 0.4
              play('hit', 0.6)
              fx.shake('lg')
              fx.flash('rgba(255,77,94,.35)')
              float('BONK!', x, by - 20, '#ff4d5e')
              if (lives <= 0) finish('lives')
            } else {
              combo++
              caught++
              maxCombo = Math.max(maxCombo, combo)
              const pts = Math.round(POINTS[it.kind] * mult())
              score += pts
              if (it.kind === 'golden') {
                golden++
                play('coin', 1.3)
                fx.confetti(40, { x: canvas.getBoundingClientRect().left + x, y: canvas.getBoundingClientRect().top + by }, 'snow')
                float(`GOLDEN +${pts}`, x, by - 20, '#ffe08a')
              } else {
                play('pop', 0.9 + Math.min(combo, 30) * 0.02)
                float(`+${pts}`, x, by - 20, '#bff1ff')
              }
              if (combo > 0 && combo % 10 === 0) {
                play('combo')
                float(`${combo} COMBO! x${mult()}`, W / 2, H * 0.35, '#8ec2ff')
              }
            }
            continue
          }
          if (it.y > H + 40) {
            items.splice(i, 1)
            if (it.kind !== 'coal' && combo > 0) {
              combo = 0
              float('MISSED', x, H - 60, '#a9b9de')
            }
          }
        }
      }
      hurtT = Math.max(0, hurtT - dt)
      for (const t of texts) t.t += dt
      while (texts.length && texts[0].t > 1) texts.shift()

      hudTick += dt
      if (hudTick > 0.1) {
        hudTick = 0
        setHud({ score, combo, lives, left: Math.max(0, DURATION - time) })
      }
      draw(now)
    }

    const draw = (now: number) => {
      if (bg) ctx.drawImage(bg, 0, 0, W, H)
      

      for (const it of items) {
        const x = it.x + Math.sin(time * 2 + it.phase) * it.sway
        ctx.save()
        ctx.translate(x, it.y)
        ctx.rotate(it.rot)
        if (it.kind === 'coal') drawCoal(ctx, it.size)
        else drawFlake(ctx, it.kind, it.size, now)
        ctx.restore()
      }

      // hot cocoa mug
      const bx = basket.x - basket.w / 2
      const by = H - 30 - basket.h
      ctx.save()
      if (hurtT > 0) ctx.translate(Math.sin(now / 20) * 4, 0)
      ctx.strokeStyle = '#071022'
      // handle
      ctx.beginPath()
      ctx.arc(bx + basket.w - 4, by + basket.h / 2, 13, -Math.PI / 2, Math.PI / 2)
      ctx.lineWidth = 9
      ctx.stroke()
      ctx.strokeStyle = '#d62839'
      ctx.lineWidth = 4
      ctx.stroke()
      // body
      ctx.fillStyle = '#d62839'
      ctx.strokeStyle = '#071022'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(bx, by)
      ctx.lineTo(bx + basket.w, by)
      ctx.lineTo(bx + basket.w - 6, by + basket.h)
      ctx.lineTo(bx + 6, by + basket.h)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      // white stripe
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(bx + 4, by + basket.h * 0.45, basket.w - 8, 7)
      // cocoa + rim
      ctx.fillStyle = '#6b3d1f'
      ctx.fillRect(bx - 3, by - 6, basket.w + 6, 9)
      ctx.strokeRect(bx - 3, by - 6, basket.w + 6, 9)
      ctx.restore()

      for (const t of texts) {
        ctx.globalAlpha = 1 - t.t
        ctx.font = '800 20px Outfit, sans-serif'
        ctx.textAlign = 'center'
        ctx.lineWidth = 4
        ctx.strokeStyle = '#071022'
        ctx.strokeText(t.text, t.x, t.y - t.t * 40)
        ctx.fillStyle = t.color
        ctx.fillText(t.text, t.x, t.y - t.t * 40)
        ctx.globalAlpha = 1
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (['arrowleft', 'arrowright', 'a', 'd'].includes(k)) {
        e.preventDefault()
        keys.add(k)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase())
    const onPointer = (e: PointerEvent) => {
      if (e.type === 'pointermove' && e.pointerType === 'touch' && e.buttons === 0) return
      const r = canvas.getBoundingClientRect()
      basket.target = e.clientX - r.left
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    canvas.addEventListener('pointerdown', onPointer)
    canvas.addEventListener('pointermove', onPointer)
    basket.x = basket.target = W / 2
    raf = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(raf)
      stopFit()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      canvas.removeEventListener('pointerdown', onPointer)
      canvas.removeEventListener('pointermove', onPointer)
    }
  }, [])

  const hearts = Array.from({ length: LIVES }, (_, i) => (i < hud.lives ? '●' : '○')).join(' ')

  return (
    <div className="absolute inset-0">
      <canvas ref={canvasRef} className="block touch-none" aria-label="Snowflake Catcher play area. Move with arrow keys, or drag and tap to move the mug." />
      <div className="absolute top-3 inset-x-3 grid gap-2 pointer-events-none">
        <div className="flex flex-wrap gap-2">
          <ScoreDisplay label="SCORE" value={hud.score.toLocaleString()} bump={hud.score} />
          <ScoreDisplay label="COMBO" value={`${hud.combo}x`} color="var(--color-pink)" bump={hud.combo} />
          <ScoreDisplay label="LIVES" value={hearts} color="var(--color-red)" />
          <ScoreDisplay label="TIME" value={Math.ceil(hud.left)} color={hud.left < 10 ? 'var(--color-red)' : 'var(--color-blue)'} />
        </div>
        <ProgressBar value={hud.left / DURATION} height={12} color="var(--color-blue)" label="Time left" />
      </div>
      <div className="absolute bottom-9 inset-x-0 text-center font-pixel text-[0.7rem] text-ink/70 pointer-events-none">DRAG OR TAP TO MOVE · ARROW KEYS WORK TOO</div>
    </div>
  )
}
