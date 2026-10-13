import { useEffect, useRef, useState } from 'react'
import type { GameProps } from './types'
import { ScoreDisplay } from '../components/ScoreDisplay'
import { fitCanvas } from './canvas'
import { fx } from '../lib/fx'
import { play } from '../lib/sound'

const GRAVITY = 1500
const FLAP = -440
const STACK_W = 74

interface Stack {
  x: number
  gapY: number // centre of the gap
  gap: number
  passed: boolean
  hasCorn: boolean
  cornTaken: boolean
}
interface FloatText {
  text: string
  x: number
  y: number
  color: string
  t: number
}

/** Hand-drawn Canada goose (canvas shapes, so it looks the same on every device). */
function drawGoose(ctx: CanvasRenderingContext2D, x: number, y: number, vy: number, wingUp: boolean, dead: boolean) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(dead ? 1.2 : Math.max(-0.5, Math.min(0.9, vy / 700)))
  ctx.lineWidth = 2.5
  ctx.strokeStyle = '#071022'
  // body
  ctx.fillStyle = '#8b6b4a'
  ctx.beginPath()
  ctx.ellipse(0, 0, 20, 13, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  // white belly
  ctx.fillStyle = '#efe6d6'
  ctx.beginPath()
  ctx.ellipse(-2, 6, 13, 6, 0, 0, Math.PI)
  ctx.fill()
  // tail
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.moveTo(-18, -4)
  ctx.lineTo(-28, -1)
  ctx.lineTo(-18, 5)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  // neck + head
  ctx.strokeStyle = '#111'
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(12, -4)
  ctx.quadraticCurveTo(22, -12, 24, -20)
  ctx.stroke()
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.ellipse(27, -22, 7, 5.5, 0.2, 0, Math.PI * 2)
  ctx.fill()
  // white chinstrap
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.ellipse(25, -19, 3.5, 2.5, 0.3, 0, Math.PI * 2)
  ctx.fill()
  // beak
  ctx.fillStyle = '#f2a900'
  ctx.strokeStyle = '#071022'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(33, -24)
  ctx.lineTo(41, -21)
  ctx.lineTo(33, -19)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  // eye
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(29, -24, 1.6, 0, Math.PI * 2)
  ctx.fill()
  // wing
  ctx.fillStyle = '#6b5136'
  ctx.strokeStyle = '#071022'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  if (wingUp) {
    ctx.moveTo(-6, -4)
    ctx.quadraticCurveTo(-4, -30, 10, -26)
    ctx.quadraticCurveTo(6, -10, 8, -2)
  } else {
    ctx.moveTo(-6, -2)
    ctx.quadraticCurveTo(-2, 18, 12, 16)
    ctx.quadraticCurveTo(8, 4, 8, -2)
  }
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

function drawLockerStack(ctx: CanvasRenderingContext2D, x: number, top: number, bottom: number, flip: boolean) {
  const h = bottom - top
  if (h <= 0) return
  ctx.fillStyle = '#2f6bff'
  ctx.strokeStyle = '#071022'
  ctx.lineWidth = 3
  ctx.fillRect(x, top, STACK_W, h)
  ctx.strokeRect(x, top, STACK_W, h)
  // individual lockers
  const lockerH = 64
  ctx.lineWidth = 2
  for (let y = flip ? bottom - lockerH : top; flip ? y > top - lockerH : y < bottom; y += flip ? -lockerH : lockerH) {
    const y0 = Math.max(top, y)
    const y1 = Math.min(bottom, y + lockerH)
    if (y1 - y0 < 4) continue
    ctx.strokeRect(x + 4, y0 + 3, STACK_W - 8, y1 - y0 - 6)
    ctx.fillStyle = '#1b3f9e'
    for (let v = 0; v < 3; v++) {
      const vy = y0 + 10 + v * 6
      if (vy < y1 - 8) ctx.fillRect(x + 14, vy, STACK_W - 28, 3)
    }
    ctx.fillStyle = '#ffc72c'
    const hy = y0 + (y1 - y0) / 2
    if (hy > y0 + 8 && hy < y1 - 8) ctx.fillRect(x + STACK_W - 16, hy - 6, 5, 12)
  }
  // cap
  ctx.fillStyle = '#4fb3ff'
  ctx.lineWidth = 3
  const capY = flip ? bottom - 12 : top
  ctx.fillRect(x - 6, capY, STACK_W + 12, 12)
  ctx.strokeRect(x - 6, capY, STACK_W + 12, 12)
}

function drawCandyCorn(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save()
  ctx.translate(x, y + Math.sin(t / 200) * 4)
  ctx.strokeStyle = '#071022'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, -13)
  ctx.lineTo(10, 11)
  ctx.lineTo(-10, 11)
  ctx.closePath()
  ctx.fillStyle = '#f28c1f'
  ctx.fill()
  ctx.save()
  ctx.clip()
  ctx.fillStyle = '#fff'
  ctx.fillRect(-12, -14, 24, 9)
  ctx.fillStyle = '#ffc72c'
  ctx.fillRect(-12, 5, 24, 8)
  ctx.restore()
  ctx.stroke()
  ctx.restore()
}

export default function GooseFlight({ onEnd }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const flapRef = useRef<() => void>(() => {})
  const [hud, setHud] = useState({ score: 0, gates: 0, started: false })
  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let W = 600
    let H = 500
    const stopFit = fitCanvas(canvas, (w, h) => {
      W = w
      H = h
    })

    const goose = { x: 0, y: 0, vy: 0, r: 15 }
    let stacks: Stack[] = []
    const texts: FloatText[] = []
    let started = false
    let over = false
    let gates = 0
    let corn = 0
    let score = 0
    let speed = 170
    let distSinceStack = 0
    let flapT = 0
    let groundX = 0
    let raf = 0
    let prev = performance.now()

    const reset = () => {
      goose.x = Math.max(90, Math.min(W * 0.3, 170))
      goose.y = H * 0.45
      goose.vy = 0
    }
    reset()

    const spacing = () => Math.max(230, Math.min(330, W * 0.55))
    const addStack = () => {
      const gap = Math.max(140, 200 - gates * 2.5) * Math.min(1, H / 520) + 20
      const margin = 50
      const gapY = margin + gap / 2 + Math.random() * Math.max(10, H - 30 - margin * 2 - gap)
      stacks.push({ x: W + 20, gapY, gap, passed: false, hasCorn: Math.random() < 0.35, cornTaken: false })
    }

    const float = (text: string, x: number, y: number, color: string) => texts.push({ text, x, y, color, t: 0 })

    const crash = () => {
      if (over) return
      over = true
      play('hit', 0.6)
      play('gameover')
      fx.shake('lg')
      fx.flash('rgba(255,77,94,.35)')
      setTimeout(
        () =>
          onEndRef.current({
            score,
            headline: gates >= 25 ? 'MIGRATION MASTER!' : 'HONK. CRASHED.',
            stats: { gatesPassed: gates },
            details: [
              { label: 'GAPS CLEARED', value: `${gates}` },
              { label: 'CANDY CORN', value: `${corn}` },
            ],
          }),
        800,
      )
    }

    const flap = () => {
      if (over) return
      if (!started) {
        started = true
        setHud((h) => ({ ...h, started: true }))
      }
      goose.vy = FLAP
      flapT = 0.15
      play('whoosh')
    }
    flapRef.current = flap

    const step = (now: number) => {
      raf = requestAnimationFrame(step)
      const dt = Math.min(0.033, (now - prev) / 1000)
      prev = now
      flapT = Math.max(0, flapT - dt)

      if (started) {
        goose.vy += GRAVITY * dt
        goose.y += goose.vy * dt
        if (!over) {
          groundX = (groundX + speed * dt) % 40
          distSinceStack += speed * dt
          if (distSinceStack >= spacing() || stacks.length === 0) {
            distSinceStack = 0
            addStack()
          }
          for (const s of stacks) {
            s.x -= speed * dt
            if (!s.passed && s.x + STACK_W < goose.x - goose.r) {
              s.passed = true
              gates++
              score += 10
              play('coin', 1 + Math.min(gates, 30) * 0.015)
              if (gates % 10 === 0) {
                play('combo')
                float(`${gates} GAPS!`, W / 2, H * 0.3, '#8ec2ff')
                speed += 15
              }
              setHud({ score, gates, started: true })
            }
            // candy corn in the middle of the gap
            if (s.hasCorn && !s.cornTaken) {
              const cx = s.x + STACK_W / 2
              if (Math.hypot(goose.x - cx, goose.y - s.gapY) < goose.r + 14) {
                s.cornTaken = true
                corn++
                score += 5
                play('pop', 1.3)
                float('+5', cx, s.gapY - 20, '#ffc72c')
                setHud({ score, gates, started: true })
              }
            }
            // collision with the locker stacks (a few pixels of forgiveness)
            const hit = goose.r - 4
            const overlapsX = goose.x + hit > s.x - 6 && goose.x - hit < s.x + STACK_W + 6
            const outsideGap = goose.y - hit < s.gapY - s.gap / 2 || goose.y + hit > s.gapY + s.gap / 2
            if (overlapsX && outsideGap) crash()
          }
          stacks = stacks.filter((s) => s.x > -STACK_W - 20)
          if (goose.y - goose.r < 0) {
            goose.y = goose.r
            goose.vy = 0
          }
          if (goose.y + goose.r > H - 30) crash()
        } else if (goose.y > H + 60) {
          goose.y = H + 60
          goose.vy = 0
        }
      } else {
        // idle bobbing before the first tap
        goose.y = H * 0.45 + Math.sin(now / 250) * 8
      }

      for (const t of texts) t.t += dt
      while (texts.length && texts[0].t > 1) texts.shift()
      draw(now)
    }

    const draw = (now: number) => {
      const g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, '#0d1d45')
      g.addColorStop(0.7, '#1a3570')
      g.addColorStop(1, '#f2a900')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
      // setting sun + distant geese V
      ctx.fillStyle = 'rgba(255,199,44,.25)'
      ctx.beginPath()
      ctx.arc(W * 0.78, H - 40, 70, Math.PI, 0)
      ctx.fill()
      ctx.strokeStyle = 'rgba(244,247,255,.25)'
      ctx.lineWidth = 2
      const vx = (W + 100 - ((now / 30) % (W + 200)))
      for (let i = 0; i < 4; i++) {
        const px = vx + i * 14
        const py = 60 + i * 7
        ctx.beginPath()
        ctx.moveTo(px - 5, py - 3)
        ctx.lineTo(px, py)
        ctx.lineTo(px + 5, py - 3)
        ctx.stroke()
      }

      for (const s of stacks) {
        drawLockerStack(ctx, s.x, -10, s.gapY - s.gap / 2, true)
        drawLockerStack(ctx, s.x, s.gapY + s.gap / 2, H - 30, false)
        if (s.hasCorn && !s.cornTaken) drawCandyCorn(ctx, s.x + STACK_W / 2, s.gapY, now)
      }

      // ground (field)
      ctx.fillStyle = '#1f5a2e'
      ctx.fillRect(0, H - 30, W, 30)
      ctx.fillStyle = '#3ddc84'
      ctx.fillRect(0, H - 30, W, 3)
      ctx.fillStyle = '#2a7d3e'
      for (let x = -groundX; x < W; x += 40) ctx.fillRect(x, H - 22, 18, 4)

      drawGoose(ctx, goose.x, goose.y, goose.vy, flapT > 0 || (!started && Math.floor(now / 200) % 2 === 0), over)

      for (const t of texts) {
        ctx.globalAlpha = 1 - t.t
        ctx.font = '800 22px Outfit, sans-serif'
        ctx.textAlign = 'center'
        ctx.lineWidth = 4
        ctx.strokeStyle = '#071022'
        ctx.strokeText(t.text, t.x, t.y - t.t * 40)
        ctx.fillStyle = t.color
        ctx.fillText(t.text, t.x, t.y - t.t * 40)
        ctx.globalAlpha = 1
      }
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === 'Enter') {
        e.preventDefault()
        flap()
      }
    }
    window.addEventListener('keydown', onKey)
    raf = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(raf)
      stopFit()
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div
      className="absolute inset-0"
      onPointerDown={(e) => {
        e.preventDefault()
        flapRef.current()
      }}
      role="button"
      tabIndex={-1}
      aria-label="Tap to flap"
    >
      <canvas ref={canvasRef} className="block touch-none" aria-label="Goose Flight play area. Tap, click, or press space to flap." />
      <div className="absolute top-3 right-3 flex flex-wrap justify-end gap-2 pointer-events-none">
        <ScoreDisplay label="SCORE" value={hud.score} bump={hud.score} />
        <ScoreDisplay label="GAPS" value={hud.gates} color="var(--color-blue)" bump={hud.gates} />
      </div>
      {!hud.started && (
        <div className="absolute inset-x-0 top-[58%] text-center pointer-events-none">
          <div className="font-display text-3xl sm:text-4xl text-yellow title-outline anim-blink">TAP TO FLAP</div>
          <div className="font-pixel text-[0.7rem] text-ink/80 mt-2">OR PRESS SPACE</div>
        </div>
      )}
    </div>
  )
}
