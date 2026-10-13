import { useEffect, useRef, useState } from 'react'
import type { GameProps } from './types'
import { ScoreDisplay } from '../components/ScoreDisplay'
import { ProgressBar } from '../components/ProgressBar'
import { fitCanvas, makeLayer } from './canvas'
import { fx } from '../lib/fx'
import { play } from '../lib/sound'

const DURATION = 45
const LIVES = 3

type Kind = 'red' | 'orange' | 'yellow' | 'golden' | 'acorn'
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

const LEAF_COLOR: Record<Exclude<Kind, 'acorn'>, [string, string]> = {
  red: ['#e2412d', '#9e2416'],
  orange: ['#f28c1f', '#b25a08'],
  yellow: ['#ffc72c', '#c99400'],
  golden: ['#fff3a6', '#ffc72c'],
}
const POINTS: Record<Kind, number> = { red: 10, orange: 10, yellow: 10, golden: 50, acorn: 0 }

/** A maple-ish leaf drawn with canvas paths so it looks the same on every device. */
function drawLeaf(ctx: CanvasRenderingContext2D, kind: Exclude<Kind, 'acorn'>, size: number, now: number) {
  const [fill, vein] = LEAF_COLOR[kind]
  const s = size / 2
  if (kind === 'golden') {
    // cheap pulsing halo (canvas shadowBlur is very slow on Chromebooks)
    ctx.fillStyle = 'rgba(255,224,138,.28)'
    ctx.beginPath()
    ctx.arc(0, 0, s * (1.25 + Math.sin(now / 120) * 0.12), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = fill
  ctx.strokeStyle = '#071022'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, -s)
  ctx.lineTo(s * 0.25, -s * 0.45)
  ctx.lineTo(s * 0.8, -s * 0.6)
  ctx.lineTo(s * 0.55, -s * 0.1)
  ctx.lineTo(s, s * 0.15)
  ctx.lineTo(s * 0.35, s * 0.35)
  ctx.lineTo(s * 0.3, s * 0.75)
  ctx.lineTo(0, s * 0.5)
  ctx.lineTo(-s * 0.3, s * 0.75)
  ctx.lineTo(-s * 0.35, s * 0.35)
  ctx.lineTo(-s, s * 0.15)
  ctx.lineTo(-s * 0.55, -s * 0.1)
  ctx.lineTo(-s * 0.8, -s * 0.6)
  ctx.lineTo(-s * 0.25, -s * 0.45)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = vein
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(0, s * 0.9)
  ctx.lineTo(0, -s * 0.7)
  ctx.moveTo(0, 0)
  ctx.lineTo(s * 0.6, -s * 0.35)
  ctx.moveTo(0, 0)
  ctx.lineTo(-s * 0.6, -s * 0.35)
  ctx.stroke()
}

function drawAcorn(ctx: CanvasRenderingContext2D, size: number) {
  const s = size / 2
  ctx.strokeStyle = '#071022'
  ctx.lineWidth = 2
  ctx.fillStyle = '#a0612b'
  ctx.beginPath()
  ctx.ellipse(0, s * 0.2, s * 0.62, s * 0.75, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#5b3a1a'
  ctx.beginPath()
  ctx.ellipse(0, -s * 0.35, s * 0.8, s * 0.38, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(0, -s * 0.7)
  ctx.lineTo(s * 0.15, -s)
  ctx.stroke()
}

export default function LeafCatcher({ onEnd }: GameProps) {
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
        g.addColorStop(0, '#0d1d45')
        g.addColorStop(1, '#14306b')
        c.fillStyle = g
        c.fillRect(0, 0, w, h)
        // tree silhouettes + ground
        c.fillStyle = '#0a1733'
        for (let x = -20; x < w + 60; x += 110) {
        c.beginPath()
        c.arc(x, h - 70, 70, Math.PI, 0)
        c.fill()
        }
        c.fillStyle = '#1f5a2e'
        c.fillRect(0, h - 30, w, 30)
        c.fillStyle = '#3ddc84'
        c.fillRect(0, h - 30, w, 3)
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
            headline: reason === 'time' ? 'LEAF PILE COMPLETE!' : 'BONKED OUT!',
            stats: { leavesCaught: caught, maxCombo },
            details: [
              { label: 'LEAVES', value: `${caught}` },
              { label: 'GOLDEN', value: `${golden}` },
              { label: 'MAX COMBO', value: `${maxCombo}x` },
            ],
          }),
        600,
      )
    }

    const spawn = () => {
      const r = Math.random()
      const acornChance = Math.min(0.3, 0.12 + time * 0.004)
      const kind: Kind = r < acornChance ? 'acorn' : r < acornChance + 0.06 ? 'golden' : (['red', 'orange', 'yellow'] as const)[Math.floor(Math.random() * 3)]
      const speed = 110 + time * 4 + Math.random() * 60
      items.push({
        kind,
        x: 30 + Math.random() * (W - 60),
        y: -30,
        vy: kind === 'acorn' ? speed * 1.35 : kind === 'golden' ? speed * 1.2 : speed,
        sway: kind === 'acorn' ? 0 : 25 + Math.random() * 45,
        phase: Math.random() * Math.PI * 2,
        rot: Math.random() * Math.PI,
        vr: kind === 'acorn' ? 2 : (Math.random() - 0.5) * 3,
        size: kind === 'acorn' ? 30 : 38 + Math.random() * 10,
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
            if (it.kind === 'acorn') {
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
                fx.confetti(40, { x: canvas.getBoundingClientRect().left + x, y: canvas.getBoundingClientRect().top + by }, 'leaves')
                float(`GOLDEN +${pts}`, x, by - 20, '#ffe08a')
              } else {
                play('pop', 0.9 + Math.min(combo, 30) * 0.02)
                float(`+${pts}`, x, by - 20, '#3ddc84')
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
            if (it.kind !== 'acorn' && combo > 0) {
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
        if (it.kind === 'acorn') drawAcorn(ctx, it.size)
        else drawLeaf(ctx, it.kind, it.size, now)
        ctx.restore()
      }

      // basket
      const bx = basket.x - basket.w / 2
      const by = H - 30 - basket.h
      ctx.save()
      if (hurtT > 0) ctx.translate(Math.sin(now / 20) * 4, 0)
      ctx.fillStyle = '#c98a3f'
      ctx.strokeStyle = '#071022'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(bx, by)
      ctx.lineTo(bx + basket.w, by)
      ctx.lineTo(bx + basket.w - 10, by + basket.h)
      ctx.lineTo(bx + 10, by + basket.h)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.strokeStyle = '#8a5a22'
      ctx.lineWidth = 2
      for (let i = 1; i < 4; i++) {
        ctx.beginPath()
        ctx.moveTo(bx + 4 + i, by + (basket.h / 4) * i)
        ctx.lineTo(bx + basket.w - 4 - i, by + (basket.h / 4) * i)
        ctx.stroke()
      }
      ctx.fillStyle = '#e0a55a'
      ctx.strokeStyle = '#071022'
      ctx.lineWidth = 3
      ctx.fillRect(bx - 4, by - 6, basket.w + 8, 9)
      ctx.strokeRect(bx - 4, by - 6, basket.w + 8, 9)
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
      <canvas ref={canvasRef} className="block touch-none" aria-label="Leaf Catcher play area. Move with arrow keys, or drag and tap to move the basket." />
      <div className="absolute top-3 inset-x-3 grid gap-2 pointer-events-none">
        <div className="flex flex-wrap gap-2">
          <ScoreDisplay label="SCORE" value={hud.score.toLocaleString()} bump={hud.score} />
          <ScoreDisplay label="COMBO" value={`${hud.combo}x`} color="var(--color-pink)" bump={hud.combo} />
          <ScoreDisplay label="LIVES" value={hearts} color="var(--color-red)" />
          <ScoreDisplay label="TIME" value={Math.ceil(hud.left)} color={hud.left < 10 ? 'var(--color-red)' : 'var(--color-blue)'} />
        </div>
        <ProgressBar value={hud.left / DURATION} height={12} color="var(--color-orange)" label="Time left" />
      </div>
      <div className="absolute bottom-9 inset-x-0 text-center font-pixel text-[0.7rem] text-ink/70 pointer-events-none">DRAG OR TAP TO MOVE · ARROW KEYS WORK TOO</div>
    </div>
  )
}
