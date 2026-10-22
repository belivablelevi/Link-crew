import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import type { GameProps } from './types'
import { ScoreDisplay } from '../components/ScoreDisplay'
import { fitCanvas, makeLayer } from './canvas'
import { fx } from '../lib/fx'
import { play } from '../lib/sound'

const BALLS = 10
const SLOT_VALUES = [100, 40, 20, 10, 5, 10, 20, 40, 100]
const GRAVITY = 900
const BOUNCE = 0.55
const BALL_R = 9
const PEG_R = 4.5
const TOP = 96 // below the score boxes
const SLOT_H = 64

interface Ball {
  x: number
  y: number
  vx: number
  vy: number
  golden: boolean
  slot: number | null
  done: boolean
  spin: number
}
interface FloatText {
  text: string
  x: number
  y: number
  color: string
  t: number
}

const slotColor = (v: number) => (v >= 100 ? '#ffc72c' : v >= 40 ? '#f2a900' : v >= 20 ? '#4fb3ff' : v >= 10 ? '#2f6bff' : '#1b2d5c')

export default function Plinko({ onEnd }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dropRef = useRef<(x?: number) => void>(() => {})
  const aimRef = useRef<(x: number) => void>(() => {})
  const [hud, setHud] = useState({ score: 0, left: BALLS, lastSlot: '' })
  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let W = 400
    let H = 600
    let pegs: { x: number; y: number }[] = []
    let slotW = 40
    let slotTop = 500
    let bg: HTMLCanvasElement | null = null

    const layout = () => {
      pegs = []
      slotW = W / SLOT_VALUES.length
      slotTop = H - SLOT_H
      const rows = Math.max(7, Math.min(12, Math.floor((slotTop - TOP - 40) / 42)))
      const gapY = (slotTop - TOP - 40) / rows
      for (let r = 0; r < rows; r++) {
        const offset = r % 2 ? slotW / 2 : 0
        for (let x = offset + slotW / 2; x < W - 4; x += slotW) pegs.push({ x, y: TOP + 30 + r * gapY })
      }
      bg = makeLayer(W, H, (c) => {
        const g = c.createLinearGradient(0, 0, 0, H)
        g.addColorStop(0, '#0d1d45')
        g.addColorStop(1, '#13214a')
        c.fillStyle = g
        c.fillRect(0, 0, W, H)
        // pegs
        for (const p of pegs) {
          c.fillStyle = '#071022'
          c.beginPath()
          c.arc(p.x + 1, p.y + 2, PEG_R, 0, Math.PI * 2)
          c.fill()
          c.fillStyle = '#8ec2ff'
          c.beginPath()
          c.arc(p.x, p.y, PEG_R, 0, Math.PI * 2)
          c.fill()
        }
        // slots
        SLOT_VALUES.forEach((v, i) => {
          const x = i * slotW
          c.fillStyle = slotColor(v)
          c.globalAlpha = 0.9
          c.fillRect(x + 2, slotTop + 8, slotW - 4, SLOT_H - 10)
          c.globalAlpha = 1
          c.strokeStyle = '#071022'
          c.lineWidth = 3
          c.strokeRect(x + 2, slotTop + 8, slotW - 4, SLOT_H - 10)
          c.fillStyle = v >= 40 ? '#071022' : '#f4f7ff'
          c.font = `800 ${Math.min(18, slotW * 0.42)}px Outfit, sans-serif`
          c.textAlign = 'center'
          c.textBaseline = 'middle'
          c.fillText(String(v), x + slotW / 2, slotTop + 8 + (SLOT_H - 10) / 2)
        })
        // dividers
        c.fillStyle = '#4fb3ff'
        for (let i = 0; i <= SLOT_VALUES.length; i++) c.fillRect(i * slotW - 2, slotTop - 14, 4, SLOT_H + 14)
      })
    }
    const stopFit = fitCanvas(canvas, (w, h) => {
      W = w
      H = h
      layout()
    })

    const balls: Ball[] = []
    const texts: FloatText[] = []
    let aimX = W / 2
    let dropped = 0
    let landed = 0
    let score = 0
    let bigSlots = 0
    let cooldown = 0
    let over = false
    let raf = 0
    let prev = performance.now()
    const keys = new Set<string>()

    const drop = (x?: number) => {
      if (over || dropped >= BALLS || cooldown > 0) return
      if (x !== undefined) aimX = x
      aimX = Math.max(BALL_R + 4, Math.min(W - BALL_R - 4, aimX))
      const golden = dropped === BALLS - 1
      dropped++
      cooldown = 0.45
      // tiny random nudge so the same spot doesn't always land the same way
      balls.push({ x: aimX + (Math.random() - 0.5) * 2, y: TOP - 6, vx: (Math.random() - 0.5) * 20, vy: 0, golden, slot: null, done: false, spin: 0 })
      play('pop', golden ? 1.4 : 1)
      setHud((h) => ({ ...h, left: BALLS - dropped }))
    }
    dropRef.current = drop
    aimRef.current = (x) => {
      aimX = x
    }

    const land = (b: Ball) => {
      b.done = true
      landed++
      const value = SLOT_VALUES[b.slot!] * (b.golden ? 3 : 1)
      score += value
      if (SLOT_VALUES[b.slot!] >= 100) bigSlots++
      const color = value >= 100 ? '#ffc72c' : '#3ddc84'
      texts.push({ text: `+${value}${b.golden ? ' GOLDEN x3' : ''}`, x: b.x, y: slotTop - 20, color, t: 0 })
      if (SLOT_VALUES[b.slot!] >= 100) {
        play('jackpot')
        fx.flash('rgba(255,199,44,.3)')
        const r = canvas.getBoundingClientRect()
        fx.confetti(70, { x: r.left + b.x, y: r.top + slotTop })
      } else if (SLOT_VALUES[b.slot!] >= 40) play('coin', 1.2)
      else play('coin', 0.9)
      setHud({ score, left: BALLS - dropped, lastSlot: `+${value}` })
      if (landed >= BALLS) {
        over = true
        setTimeout(() => {
          play('victory')
          onEndRef.current({
            score,
            headline: score >= 600 ? 'PLINKO PRO!' : 'ALL PUMPKINS DROPPED!',
            stats: { bigSlots },
            details: [
              { label: '100 SLOTS', value: `${bigSlots}` },
              { label: 'PUMPKINS', value: `${BALLS}` },
            ],
          })
        }, 700)
      }
    }

    const physics = (b: Ball, dt: number) => {
      b.vy += GRAVITY * dt
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.spin += b.vx * dt * 0.05
      // side walls
      if (b.x < BALL_R) {
        b.x = BALL_R
        b.vx = Math.abs(b.vx) * BOUNCE
      } else if (b.x > W - BALL_R) {
        b.x = W - BALL_R
        b.vx = -Math.abs(b.vx) * BOUNCE
      }
      // pegs
      for (const p of pegs) {
        const dx = b.x - p.x
        const dy = b.y - p.y
        const d = Math.hypot(dx, dy)
        const min = BALL_R + PEG_R
        if (d < min && d > 0) {
          const nx = dx / d
          const ny = dy / d
          b.x = p.x + nx * min
          b.y = p.y + ny * min
          const vn = b.vx * nx + b.vy * ny
          if (vn < 0) {
            b.vx -= (1 + BOUNCE) * vn * nx
            b.vy -= (1 + BOUNCE) * vn * ny
            // keep it moving sideways a little so it never balances on a peg
            if (Math.abs(b.vx) < 25) b.vx += (Math.random() < 0.5 ? -1 : 1) * 40
            play('tick', 1.4 + Math.random() * 0.4)
          }
        }
      }
      // slots: once inside, stay between that slot's dividers
      if (b.y > slotTop - 14) {
        if (b.slot === null) b.slot = Math.max(0, Math.min(SLOT_VALUES.length - 1, Math.floor(b.x / slotW)))
        const l = b.slot * slotW + 2 + BALL_R
        const r = (b.slot + 1) * slotW - 2 - BALL_R
        if (b.x < l) {
          b.x = l
          b.vx = Math.abs(b.vx) * BOUNCE
        } else if (b.x > r) {
          b.x = r
          b.vx = -Math.abs(b.vx) * BOUNCE
        }
      }
      if (b.y > H - BALL_R - 6) {
        b.y = H - BALL_R - 6
        land(b)
      }
    }

    const step = (now: number) => {
      raf = requestAnimationFrame(step)
      const dt = Math.min(0.033, (now - prev) / 1000)
      prev = now
      cooldown = Math.max(0, cooldown - dt)
      const kdir = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0)
      if (kdir) aimX = Math.max(BALL_R + 4, Math.min(W - BALL_R - 4, aimX + kdir * 320 * dt))
      // 4 small physics steps per frame keeps fast balls from passing through pegs
      for (const b of balls) if (!b.done) for (let i = 0; i < 4; i++) if (!b.done) physics(b, dt / 4)
      for (const t of texts) t.t += dt
      while (texts.length && texts[0].t > 1.2) texts.shift()
      draw(now)
    }

    const drawPumpkin = (x: number, y: number, golden: boolean, rot: number) => {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rot)
      if (golden) {
        ctx.fillStyle = 'rgba(255,224,138,.3)'
        ctx.beginPath()
        ctx.arc(0, 0, BALL_R + 6, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = golden ? '#ffd84d' : '#f28c1f'
      ctx.strokeStyle = '#071022'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.ellipse(0, 1, BALL_R, BALL_R * 0.88, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.strokeStyle = golden ? '#c99400' : '#b25a08'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.ellipse(0, 1, BALL_R * 0.4, BALL_R * 0.86, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = '#3a7d1a'
      ctx.fillRect(-1.5, -BALL_R - 3, 3, 5)
      ctx.restore()
    }

    const draw = (now: number) => {
      if (bg) ctx.drawImage(bg, 0, 0, W, H)
      // dropper
      if (!over && dropped < BALLS) {
        const ready = cooldown <= 0
        ctx.strokeStyle = 'rgba(244,247,255,.25)'
        ctx.setLineDash([4, 6])
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(aimX, TOP)
        ctx.lineTo(aimX, TOP + 60)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.globalAlpha = ready ? 1 : 0.4
        drawPumpkin(aimX, TOP - 6 + Math.sin(now / 200) * 2, dropped === BALLS - 1, 0)
        ctx.globalAlpha = 1
      }
      for (const b of balls) drawPumpkin(b.x, b.y, b.golden, b.spin)
      for (const t of texts) {
        ctx.globalAlpha = Math.max(0, 1 - t.t / 1.2)
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
      } else if ((k === ' ' || k === 'enter' || k === 'arrowdown') && !e.repeat) {
        e.preventDefault()
        drop()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase())
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    aimX = W / 2
    raf = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(raf)
      stopFit()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const localX = (e: RPointerEvent) => e.clientX - (e.currentTarget as HTMLElement).getBoundingClientRect().left

  return (
    <div
      className="absolute inset-0"
      onPointerMove={(e) => e.pointerType === 'mouse' && aimRef.current(localX(e))}
      onPointerDown={(e) => {
        e.preventDefault()
        dropRef.current(localX(e))
      }}
      role="button"
      tabIndex={-1}
      aria-label="Tap where you want to drop the pumpkin"
    >
      <canvas ref={canvasRef} className="block touch-none" aria-label="Plinko board. Tap or click to drop a pumpkin. Arrow keys aim, space drops." />
      <div className="absolute top-3 inset-x-3 flex flex-wrap gap-2 pointer-events-none">
        <ScoreDisplay label="SCORE" value={hud.score} bump={hud.score} />
        <ScoreDisplay label="PUMPKINS LEFT" value={hud.left} color="var(--color-orange)" bump={hud.left} />
        {hud.left === 1 && <span className="tag self-center" style={{ ['--c' as string]: 'var(--color-yellow)' }}>LAST ONE IS GOLDEN: 3X</span>}
      </div>
    </div>
  )
}
