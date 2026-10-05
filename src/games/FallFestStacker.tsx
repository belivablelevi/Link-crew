import { useEffect, useRef, useState } from 'react'
import type { GameProps } from './types'
import { ScoreDisplay } from '../components/ScoreDisplay'
import { fitCanvas } from './canvas'
import { fx } from '../lib/fx'
import { play } from '../lib/sound'

interface Block {
  x: number // left edge, world units
  w: number
  y: number // index in tower (0 = base)
  color: string
}
interface Chunk {
  x: number
  y: number // world pixel y (top)
  w: number
  vx: number
  vy: number
  rot: number
  vr: number
  color: string
}

const COLORS = ['#f2a900', '#ffc72c', '#3ddc84', '#4fb3ff', '#2f6bff', '#8ec2ff', '#ff4d5e']
const WORLD_W = 400 // world is 400 units wide, scaled to the canvas
const BLOCK_H = 34
const START_W = 220
const PERFECT = 6

export default function FallFestStacker({ onEnd }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hud, setHud] = useState({ score: 0, height: 0, combo: 0 })
  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd
  const dropRef = useRef<() => void>(() => {})

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let W = 400
    let H = 600
    const stopFit = fitCanvas(canvas, (w, h) => {
      W = w
      H = h
    })

    const tower: Block[] = [{ x: (WORLD_W - START_W) / 2, w: START_W, y: 0, color: '#2f6bff' }]
    const chunks: Chunk[] = []
    let moving = { x: 0, w: START_W, dir: 1, speed: 140 }
    let score = 0
    let combo = 0
    let maxCombo = 0
    let perfects = 0
    let over = false
    let camY = 0 // world height (in px) the camera is centred around
    let zoom = 1
    let flashT = 0
    let banner: { text: string; t: number; color: string } | null = null
    let raf = 0
    let prev = performance.now()

    const top = () => tower[tower.length - 1]
    const spawnNext = () => {
      const h = tower.length
      const fromLeft = Math.random() < 0.5
      moving = { x: fromLeft ? -30 : WORLD_W - top().w + 30, w: top().w, dir: fromLeft ? 1 : -1, speed: Math.min(420, 140 + h * 11) }
    }
    spawnNext()

    const finish = () => {
      over = true
      play('gameover')
      fx.shake('md')
      const height = tower.length - 1
      setTimeout(
        () =>
          onEndRef.current({
            score,
            headline: height >= 20 ? 'SKY HIGH!' : 'TIMBERRR!',
            stats: { stackHeight: height, perfectDrops: perfects, maxCombo },
            details: [
              { label: 'HEIGHT', value: `${height}` },
              { label: 'PERFECTS', value: `${perfects}` },
              { label: 'MAX COMBO', value: `${maxCombo}x` },
            ],
          }),
        900,
      )
    }

    const drop = () => {
      if (over) return
      const t = top()
      const y = tower.length
      const color = COLORS[y % COLORS.length]
      const left = Math.max(moving.x, t.x)
      const right = Math.min(moving.x + moving.w, t.x + t.w)
      const overlap = right - left
      if (overlap <= 0) {
        chunks.push({ x: moving.x, y: y * BLOCK_H, w: moving.w, vx: moving.dir * 60, vy: 0, rot: 0, vr: moving.dir * 2, color })
        finish()
        return
      }
      if (Math.abs(moving.x - t.x) <= PERFECT) {
        // Perfect: snap, keep width, and grow a little on streaks.
        combo++
        perfects++
        maxCombo = Math.max(maxCombo, combo)
        let w = t.w
        if (combo >= 3) w = Math.min(START_W, w + 8)
        const x = t.x - (w - t.w) / 2
        tower.push({ x, w, y, color })
        const pts = 10 + 15 * combo
        score += pts
        banner = { text: combo > 1 ? `PERFECT x${combo}!` : 'PERFECT!', t: 0, color: '#3ddc84' }
        play('combo', 1 + Math.min(combo, 10) * 0.08)
        flashT = 1
        if (combo % 5 === 0) fx.confetti(50)
      } else {
        combo = 0
        tower.push({ x: left, w: overlap, y, color })
        // slice off the overhang and let it fall
        if (moving.x < t.x) chunks.push({ x: moving.x, y: y * BLOCK_H, w: t.x - moving.x, vx: -40, vy: 0, rot: 0, vr: -1.5, color })
        else chunks.push({ x: right, y: y * BLOCK_H, w: moving.x + moving.w - right, vx: 40, vy: 0, rot: 0, vr: 1.5, color })
        score += 10
        play('hit')
        if (overlap < 25) banner = { text: 'CLOSE ONE!', t: 0, color: '#f2a900' }
      }
      setHud({ score, height: tower.length - 1, combo })
      spawnNext()
    }
    dropRef.current = drop

    const step = (now: number) => {
      raf = requestAnimationFrame(step)
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      if (!over) {
        moving.x += moving.dir * moving.speed * dt
        if (moving.x + moving.w > WORLD_W + 40) moving.dir = -1
        if (moving.x < -40) moving.dir = 1
      }
      for (const c of chunks) {
        c.vy += 900 * dt
        c.x += c.vx * dt
        c.y -= c.vy * dt
        c.rot += c.vr * dt
      }
      while (chunks.length > 12) chunks.shift()

      // Camera: follow the top and zoom out as the tower grows.
      const h = tower.length
      const targetZoom = Math.max(0.45, 1 - h * 0.018)
      zoom += (targetZoom - zoom) * Math.min(1, dt * 3)
      const targetCam = Math.max(0, (h - 4) * BLOCK_H)
      camY += (targetCam - camY) * Math.min(1, dt * 4)
      flashT = Math.max(0, flashT - dt * 3)
      if (banner) {
        banner.t += dt
        if (banner.t > 1) banner = null
      }
      draw()
    }

    const draw = () => {
      // sky gets darker/starrier the higher you go
      const hgt = tower.length
      const g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, hgt > 25 ? '#05020f' : '#0d1d45')
      g.addColorStop(1, hgt > 25 ? '#0d1d45' : '#1a3570')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
      if (hgt > 10) {
        ctx.fillStyle = 'rgba(255,255,255,.6)'
        for (let i = 0; i < 40; i++) ctx.fillRect((i * 97) % W, (i * 53 + camY * 0.2) % H, 2, 2)
      }

      const scale = (W / WORLD_W) * Math.min(1, 0.95) * zoom
      const ox = (W - WORLD_W * scale) / 2
      const groundY = H * 0.82
      const toScreenY = (worldTopPx: number) => groundY - (worldTopPx - camY) * scale

      ctx.save()
      // ground
      ctx.fillStyle = '#2a7d2e'
      ctx.fillRect(0, toScreenY(0) + 0, W, H)
      ctx.fillStyle = '#3ddc84'
      ctx.fillRect(0, toScreenY(0), W, 4)

      const drawBlock = (x: number, yTopWorld: number, w: number, color: string) => {
        const sx = ox + x * scale
        const sy = toScreenY(yTopWorld + BLOCK_H)
        const sw = w * scale
        const sh = BLOCK_H * scale
        ctx.fillStyle = '#071022'
        ctx.beginPath()
        ctx.roundRect(sx, sy + 3, sw, sh, 6 * scale)
        ctx.fill()
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.roundRect(sx, sy, sw, sh - 2, 6 * scale)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,.3)'
        ctx.fillRect(sx + 4 * scale, sy + 4 * scale, Math.max(0, sw - 8 * scale), 4 * scale)
        ctx.strokeStyle = '#071022'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.roundRect(sx, sy, sw, sh - 2, 6 * scale)
        ctx.stroke()
        // hay-bale stripes
        ctx.strokeStyle = 'rgba(0,0,0,.18)'
        for (let i = 1; i < 4; i++) {
          ctx.beginPath()
          ctx.moveTo(sx + (sw * i) / 4, sy + 3)
          ctx.lineTo(sx + (sw * i) / 4, sy + sh - 5)
          ctx.stroke()
        }
      }

      for (const b of tower) {
        const sy = toScreenY(b.y * BLOCK_H)
        if (sy < -60 || sy > H + 60) continue
        drawBlock(b.x, b.y * BLOCK_H, b.w, b.color)
      }
      if (!over) drawBlock(moving.x, tower.length * BLOCK_H, moving.w, COLORS[tower.length % COLORS.length])
      for (const c of chunks) {
        const sx = ox + (c.x + c.w / 2) * scale
        const sy = toScreenY(c.y + BLOCK_H / 2)
        ctx.save()
        ctx.translate(sx, sy)
        ctx.rotate(c.rot)
        ctx.fillStyle = c.color
        ctx.strokeStyle = '#071022'
        ctx.lineWidth = 2
        ctx.fillRect((-c.w / 2) * scale, (-BLOCK_H / 2) * scale, c.w * scale, BLOCK_H * scale)
        ctx.strokeRect((-c.w / 2) * scale, (-BLOCK_H / 2) * scale, c.w * scale, BLOCK_H * scale)
        ctx.restore()
      }
      ctx.restore()

      if (flashT > 0) {
        ctx.fillStyle = `rgba(61,220,132,${flashT * 0.15})`
        ctx.fillRect(0, 0, W, H)
      }
      if (banner) {
        ctx.globalAlpha = 1 - banner.t
        ctx.font = `800 ${30 + (1 - banner.t) * 8}px Outfit, sans-serif`
        ctx.textAlign = 'center'
        ctx.lineWidth = 6
        ctx.strokeStyle = '#071022'
        ctx.strokeText(banner.text, W / 2, H * 0.3 - banner.t * 30)
        ctx.fillStyle = banner.color
        ctx.fillText(banner.text, W / 2, H * 0.3 - banner.t * 30)
        ctx.globalAlpha = 1
      }
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || (e.key !== ' ' && e.key !== 'Enter' && e.key !== 'ArrowDown')) return
      e.preventDefault()
      drop()
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
    <div className="absolute inset-0" onPointerDown={() => dropRef.current()} role="button" aria-label="Tap to drop the block" tabIndex={-1}>
      <canvas ref={canvasRef} className="block" />
      <div className="absolute top-3 inset-x-3 flex flex-wrap gap-2 pointer-events-none">
        <ScoreDisplay label="SCORE" value={hud.score.toLocaleString()} bump={hud.score} />
        <ScoreDisplay label="HEIGHT" value={hud.height} color="var(--color-blue)" bump={hud.height} />
        <ScoreDisplay label="PERFECT" value={`${hud.combo}x`} color="var(--color-lime)" bump={hud.combo} />
      </div>
      <div className="absolute bottom-3 inset-x-0 text-center font-pixel text-[0.7rem] text-ink/70 pointer-events-none">TAP / SPACE TO DROP</div>
    </div>
  )
}
