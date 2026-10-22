import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import type { GameProps } from './types'
import { ScoreDisplay } from '../components/ScoreDisplay'
import { fitCanvas, makeLayer } from './canvas'
import { fx } from '../lib/fx'
import { play } from '../lib/sound'
import { AIM_MAX, AIM_MIN, BALL_R, BOARD_H, BOARD_W, DROP_Y, SLOT_TOP, SLOT_VALUES, SLOT_W, makePegs, newBall, stepBall, type Ball } from './plinkoPhysics'

const BALLS = 10
const HUD_SPACE = 74 // keep the board below the score boxes

interface Pumpkin extends Ball {
  golden: boolean
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
  const dropRef = useRef<(clientX?: number) => void>(() => {})
  const aimRef = useRef<(clientX: number) => void>(() => {})
  const [hud, setHud] = useState({ score: 0, left: BALLS })
  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pegs = makePegs()
    // The board is a fixed BOARD_W x BOARD_H, scaled to fit, so it plays the same on every screen.
    let W = 400
    let H = 600
    let scale = 1
    let ox = 0
    let oy = 0
    let bg: HTMLCanvasElement | null = null

    const paintBoard = (c: CanvasRenderingContext2D) => {
      const g = c.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, '#0d1d45')
      g.addColorStop(1, '#13214a')
      c.fillStyle = g
      c.fillRect(0, 0, W, H)
      c.translate(ox, oy)
      c.scale(scale, scale)
      c.strokeStyle = 'rgba(79,179,255,.35)'
      c.lineWidth = 2
      c.strokeRect(0, 0, BOARD_W, BOARD_H)
      for (const p of pegs) {
        c.fillStyle = '#071022'
        c.beginPath()
        c.arc(p.x + 1, p.y + 1.5, p.r, 0, Math.PI * 2)
        c.fill()
        c.fillStyle = p.r > 5 ? '#4fb3ff' : '#8ec2ff'
        c.beginPath()
        c.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        c.fill()
      }
      SLOT_VALUES.forEach((v, i) => {
        const x = i * SLOT_W
        c.fillStyle = slotColor(v)
        c.fillRect(x + 2, SLOT_TOP + 8, SLOT_W - 4, BOARD_H - SLOT_TOP - 10)
        c.strokeStyle = '#071022'
        c.lineWidth = 2.5
        c.strokeRect(x + 2, SLOT_TOP + 8, SLOT_W - 4, BOARD_H - SLOT_TOP - 10)
        c.fillStyle = v >= 40 ? '#071022' : '#f4f7ff'
        c.font = '800 16px Outfit, sans-serif'
        c.textAlign = 'center'
        c.textBaseline = 'middle'
        c.fillText(String(v), x + SLOT_W / 2, SLOT_TOP + 8 + (BOARD_H - SLOT_TOP - 10) / 2)
      })
      c.fillStyle = '#4fb3ff'
      for (let i = 0; i <= SLOT_VALUES.length; i++) c.fillRect(i * SLOT_W - 1.5, SLOT_TOP - 10, 3, BOARD_H - SLOT_TOP + 10)
    }

    const stopFit = fitCanvas(canvas, (w, h) => {
      W = w
      H = h
      scale = Math.max(0.05, Math.min(W / BOARD_W, (H - HUD_SPACE - 8) / BOARD_H))
      ox = (W - BOARD_W * scale) / 2
      oy = HUD_SPACE + (H - HUD_SPACE - BOARD_H * scale) / 2
      bg = makeLayer(W, H, paintBoard)
    })
    const toBoardX = (clientX: number) => (clientX - canvas.getBoundingClientRect().left - ox) / scale

    const balls: Pumpkin[] = []
    const texts: FloatText[] = []
    let aimX = BOARD_W / 2
    let dropped = 0
    let landed = 0
    let score = 0
    let bigSlots = 0
    let cooldown = 0
    let over = false
    let endTimer: ReturnType<typeof setTimeout> | undefined
    let raf = 0
    let prev = performance.now()
    const keys = new Set<string>()

    const clampAim = (x: number) => Math.max(AIM_MIN, Math.min(AIM_MAX, x))

    const drop = (clientX?: number) => {
      if (over || dropped >= BALLS || cooldown > 0) return
      if (clientX !== undefined) aimX = clampAim(toBoardX(clientX))
      const golden = dropped === BALLS - 1
      dropped++
      cooldown = 0.45
      balls.push({ ...newBall(aimX), golden, spin: 0 })
      play('pop', golden ? 1.4 : 1)
      setHud({ score, left: BALLS - dropped })
    }
    dropRef.current = drop
    aimRef.current = (clientX) => {
      aimX = clampAim(toBoardX(clientX))
    }

    const land = (b: Pumpkin) => {
      landed++
      const base = SLOT_VALUES[b.slot!]
      const value = base * (b.golden ? 3 : 1)
      score += value
      if (base >= 100) bigSlots++
      texts.push({ text: `+${value}${b.golden ? ' GOLDEN x3' : ''}`, x: b.x, y: SLOT_TOP - 16, color: base >= 100 ? '#ffc72c' : '#3ddc84', t: 0 })
      if (base >= 100) {
        play('jackpot')
        fx.flash('rgba(255,199,44,.3)')
        const r = canvas.getBoundingClientRect()
        fx.confetti(70, { x: r.left + ox + b.x * scale, y: r.top + oy + SLOT_TOP * scale })
      } else play('coin', base >= 40 ? 1.2 : 0.9)
      setHud({ score, left: BALLS - dropped })
      if (landed >= BALLS) {
        over = true
        endTimer = setTimeout(() => {
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

    const step = (now: number) => {
      raf = requestAnimationFrame(step)
      const dt = Math.min(0.033, (now - prev) / 1000)
      prev = now
      cooldown = Math.max(0, cooldown - dt)
      const kdir = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0)
      if (kdir) aimX = clampAim(aimX + kdir * 260 * dt)
      for (const b of balls) {
        if (b.done) continue
        // 4 small physics steps per frame keep fast balls from skipping through pegs
        for (let i = 0; i < 4 && !b.done; i++) {
          const ev = stepBall(b, pegs, dt / 4)
          if (ev === 'peg') play('tick', 1.4 + Math.random() * 0.4)
          else if (ev === 'landed') land(b)
        }
        b.spin += b.vx * dt * 0.05
      }
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
        ctx.arc(0, 0, BALL_R + 5, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = golden ? '#ffd84d' : '#f28c1f'
      ctx.strokeStyle = '#071022'
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.ellipse(0, 0.5, BALL_R, BALL_R * 0.88, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.strokeStyle = golden ? '#c99400' : '#b25a08'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.ellipse(0, 0.5, BALL_R * 0.4, BALL_R * 0.86, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = '#3a7d1a'
      ctx.fillRect(-1.2, -BALL_R - 2.5, 2.4, 4)
      ctx.restore()
    }

    const draw = (now: number) => {
      if (bg) ctx.drawImage(bg, 0, 0, W, H)
      ctx.save()
      ctx.translate(ox, oy)
      ctx.scale(scale, scale)
      if (!over && dropped < BALLS) {
        ctx.strokeStyle = 'rgba(244,247,255,.25)'
        ctx.setLineDash([4, 6])
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(aimX, DROP_Y)
        ctx.lineTo(aimX, DROP_Y + 45)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.globalAlpha = cooldown <= 0 ? 1 : 0.4
        drawPumpkin(aimX, DROP_Y + Math.sin(now / 200) * 1.5, dropped === BALLS - 1, 0)
        ctx.globalAlpha = 1
      }
      for (const b of balls) drawPumpkin(b.x, b.y, b.golden, b.spin)
      for (const t of texts) {
        ctx.globalAlpha = Math.max(0, 1 - t.t / 1.2)
        ctx.font = '800 17px Outfit, sans-serif'
        ctx.textAlign = 'center'
        ctx.lineWidth = 3.5
        ctx.strokeStyle = '#071022'
        ctx.strokeText(t.text, t.x, t.y - t.t * 34)
        ctx.fillStyle = t.color
        ctx.fillText(t.text, t.x, t.y - t.t * 34)
        ctx.globalAlpha = 1
      }
      ctx.restore()
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
    raf = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(endTimer)
      stopFit()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  return (
    <div
      className="absolute inset-0"
      onPointerMove={(e: RPointerEvent) => e.pointerType === 'mouse' && aimRef.current(e.clientX)}
      onPointerDown={(e: RPointerEvent) => {
        if (e.button !== 0) return // left click / touch only
        e.preventDefault()
        dropRef.current(e.clientX)
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
