import { useEffect, useRef, useState } from 'react'
import type { GameProps } from './types'
import { ScoreDisplay } from '../components/ScoreDisplay'
import { drawSprite, fitCanvas } from './canvas'
import { fx } from '../lib/fx'
import { play } from '../lib/sound'

interface Vec {
  x: number
  y: number
}
interface Enemy extends Vec {
  vx: number
  vy: number
  r: number
  speed: number
  label: string
  emoji: string
}
interface Bullet extends Vec {
  vx: number
  vy: number
  r: number
  rot: number
  emoji: string
}
interface Pickup extends Vec {
  kind: 'coin' | 'shield' | 'slow' | 'magnet'
  born: number
}
interface FloatText extends Vec {
  text: string
  color: string
  t: number
}

const PICKUP_EMOJI = { coin: '🪙', shield: '⭐', slow: '⏰', magnet: '🧲' } as const
const HOMEWORK = ['📄', '📚', '📝', '📐']
const PLAYER_SPEED = 270

export default function DodgeThePrincipal({ onEnd }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hud, setHud] = useState({ score: 0, time: 0, combo: 0, coins: 0, shield: false, slow: false, magnet: false })
  const [joy, setJoy] = useState<{ ax: number; ay: number; x: number; y: number } | null>(null)
  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let W = 600
    let H = 400
    const stopFit = fitCanvas(canvas, (w, h) => {
      W = w
      H = h
    })

    const player = { x: W / 2, y: H / 2, r: 16, vx: 0, vy: 0, facing: 1 }
    const enemies: Enemy[] = [{ x: 40, y: 40, vx: 0, vy: 0, r: 22, speed: 105, label: 'THE PRINCIPAL', emoji: '🤨' }]
    const bullets: Bullet[] = []
    const pickups: Pickup[] = []
    const texts: FloatText[] = []
    const keys = new Set<string>()
    let joystick: { ax: number; ay: number; x: number; y: number } | null = null

    let time = 0
    let coinScore = 0
    let coins = 0
    let combo = 0
    let maxCombo = 0
    let lastCoinAt = -99
    let shieldUntil = 0
    let slowUntil = 0
    let magnetUntil = 0
    let invulnUntil = 0
    let nextBullet = 2.5
    let nextCoin = 0.5
    let nextPower = 9
    let spawnedVice = false
    let over = false
    let raf = 0
    let prev = performance.now()
    let hudTick = 0

    const float = (text: string, x: number, y: number, color: string) => texts.push({ text, x, y, color, t: 0 })
    const score = () => Math.floor(time * 10) + coinScore

    const end = () => {
      over = true
      play('gameover')
      fx.shake('lg')
      fx.flash('rgba(255,77,94,.45)')
      setTimeout(() => {
        const sec = Math.floor(time)
        onEndRef.current({
          score: score(),
          headline: 'DETENTION!',
          stats: { survivedSec: sec, coins, maxCombo },
          details: [
            { label: 'SURVIVED', value: `${sec}s` },
            { label: 'COINS', value: `${coins}` },
            { label: 'MAX COMBO', value: `${maxCombo}x` },
          ],
        })
      }, 700)
    }

    const spawnEdge = (): Vec => {
      const side = Math.floor(Math.random() * 4)
      if (side === 0) return { x: Math.random() * W, y: -20 }
      if (side === 1) return { x: W + 20, y: Math.random() * H }
      if (side === 2) return { x: Math.random() * W, y: H + 20 }
      return { x: -20, y: Math.random() * H }
    }
    const spawnInside = (): Vec => {
      for (let i = 0; i < 10; i++) {
        const p = { x: 40 + Math.random() * (W - 80), y: 60 + Math.random() * (H - 100) }
        if (Math.hypot(p.x - player.x, p.y - player.y) > 90) return p
      }
      return { x: W / 2, y: H / 2 }
    }

    const step = (now: number) => {
      raf = requestAnimationFrame(step)
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      if (over) {
        draw(now)
        return
      }
      time += dt
      const slow = time < slowUntil ? 0.45 : 1

      // --- player input
      let ix = 0
      let iy = 0
      if (keys.has('arrowleft') || keys.has('a')) ix -= 1
      if (keys.has('arrowright') || keys.has('d')) ix += 1
      if (keys.has('arrowup') || keys.has('w')) iy -= 1
      if (keys.has('arrowdown') || keys.has('s')) iy += 1
      let mag = Math.hypot(ix, iy)
      if (joystick) {
        const dx = joystick.x - joystick.ax
        const dy = joystick.y - joystick.ay
        const d = Math.hypot(dx, dy)
        if (d > 6) {
          ix = dx / d
          iy = dy / d
          mag = Math.min(1, d / 50)
        }
      } else if (mag > 0) {
        ix /= mag
        iy /= mag
        mag = 1
      }
      player.vx += (ix * PLAYER_SPEED * mag - player.vx) * Math.min(1, dt * 14)
      player.vy += (iy * PLAYER_SPEED * mag - player.vy) * Math.min(1, dt * 14)
      player.x = Math.max(player.r, Math.min(W - player.r, player.x + player.vx * dt))
      player.y = Math.max(player.r + 30, Math.min(H - player.r, player.y + player.vy * dt))
      if (Math.abs(player.vx) > 10) player.facing = player.vx > 0 ? 1 : -1

      // --- enemies: steer toward player, speed ramps with time
      if (!spawnedVice && time > 30) {
        spawnedVice = true
        const p = spawnEdge()
        enemies.push({ ...p, vx: 0, vy: 0, r: 18, speed: 120, label: 'VICE PRINCIPAL', emoji: '🧐' })
        float('VICE PRINCIPAL INCOMING!', W / 2, 70, '#ff4d5e')
        play('error')
      }
      for (const e of enemies) {
        const sp = (e.speed + time * 3.2) * slow
        const dx = player.x - e.x
        const dy = player.y - e.y
        const d = Math.hypot(dx, dy) || 1
        e.vx += ((dx / d) * sp - e.vx) * Math.min(1, dt * 2.2)
        e.vy += ((dy / d) * sp - e.vy) * Math.min(1, dt * 2.2)
        e.x += e.vx * dt
        e.y += e.vy * dt
      }
      // keep the two chasers from stacking
      if (enemies.length > 1) {
        const [a, b] = enemies
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (d < 50 && d > 0) {
          const push = (50 - d) / 2
          a.x += ((a.x - b.x) / d) * push
          a.y += ((a.y - b.y) / d) * push
          b.x -= ((a.x - b.x) / d) * push
          b.y -= ((a.y - b.y) / d) * push
        }
      }

      // --- homework barrage
      nextBullet -= dt
      if (nextBullet <= 0) {
        nextBullet = Math.max(0.45, 1.7 - time * 0.025)
        const p = spawnEdge()
        const tx = player.x + (Math.random() - 0.5) * 160
        const ty = player.y + (Math.random() - 0.5) * 160
        const d = Math.hypot(tx - p.x, ty - p.y) || 1
        const sp = 170 + Math.random() * 90 + time * 2
        bullets.push({ ...p, vx: ((tx - p.x) / d) * sp, vy: ((ty - p.y) / d) * sp, r: 11, rot: 0, emoji: HOMEWORK[Math.floor(Math.random() * HOMEWORK.length)] })
      }
      for (const b of bullets) {
        b.x += b.vx * dt * slow
        b.y += b.vy * dt * slow
        b.rot += dt * 6
      }
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i]
        if (b.x < -60 || b.x > W + 60 || b.y < -60 || b.y > H + 60) bullets.splice(i, 1)
      }

      // --- pickups
      nextCoin -= dt
      if (nextCoin <= 0 && pickups.filter((p) => p.kind === 'coin').length < 4) {
        nextCoin = 1.1 + Math.random()
        pickups.push({ ...spawnInside(), kind: 'coin', born: time })
      }
      nextPower -= dt
      if (nextPower <= 0) {
        nextPower = 10 + Math.random() * 6
        const kinds: Pickup['kind'][] = ['shield', 'slow', 'magnet']
        pickups.push({ ...spawnInside(), kind: kinds[Math.floor(Math.random() * kinds.length)], born: time })
      }
      const magnet = time < magnetUntil
      for (let i = pickups.length - 1; i >= 0; i--) {
        const p = pickups[i]
        if (magnet && p.kind === 'coin') {
          const dx = player.x - p.x
          const dy = player.y - p.y
          const d = Math.hypot(dx, dy) || 1
          if (d < 220) {
            p.x += (dx / d) * 320 * dt
            p.y += (dy / d) * 320 * dt
          }
        }
        if (time - p.born > (p.kind === 'coin' ? 7 : 8)) {
          pickups.splice(i, 1)
          continue
        }
        if (Math.hypot(player.x - p.x, player.y - p.y) < player.r + 14) {
          pickups.splice(i, 1)
          if (p.kind === 'coin') {
            combo = time - lastCoinAt < 3 ? combo + 1 : 1
            lastCoinAt = time
            maxCombo = Math.max(maxCombo, combo)
            const pts = 25 * combo
            coinScore += pts
            coins++
            float(`+${pts}${combo > 1 ? ` x${combo}` : ''}`, p.x, p.y, '#ffc72c')
            play('coin', 1 + Math.min(combo, 10) * 0.04)
          } else {
            play('levelup')
            if (p.kind === 'shield') {
              shieldUntil = time + 10
              float('HALL PASS!', p.x, p.y, '#ffc72c')
            } else if (p.kind === 'slow') {
              slowUntil = time + 5
              float('SLOW-MO!', p.x, p.y, '#4fb3ff')
            } else {
              magnetUntil = time + 7
              float('COIN MAGNET!', p.x, p.y, '#8ec2ff')
            }
            fx.flash('rgba(79,179,255,.18)')
          }
        }
      }
      if (time - lastCoinAt > 3) combo = 0

      // --- collisions
      if (time > invulnUntil) {
        let hit = false
        for (const e of enemies) if (Math.hypot(player.x - e.x, player.y - e.y) < player.r + e.r - 4) hit = true
        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i]
          if (Math.hypot(player.x - b.x, player.y - b.y) < player.r + b.r - 3) {
            hit = true
            bullets.splice(i, 1)
          }
        }
        if (hit) {
          if (time < shieldUntil) {
            shieldUntil = 0
            invulnUntil = time + 1.2
            fx.shake('md')
            play('hit')
            float('PASS USED!', player.x, player.y - 20, '#ffc72c')
            // knock chasers back
            for (const e of enemies) {
              const dx = e.x - player.x
              const dy = e.y - player.y
              const d = Math.hypot(dx, dy) || 1
              e.x += (dx / d) * 120
              e.y += (dy / d) * 120
              e.vx = e.vy = 0
            }
          } else {
            end()
          }
        }
      }

      for (const t of texts) t.t += dt
      while (texts.length && texts[0].t > 1) texts.shift()

      hudTick += dt
      if (hudTick > 0.1) {
        hudTick = 0
        setHud({ score: score(), time: Math.floor(time), combo, coins, shield: time < shieldUntil, slow: time < slowUntil, magnet })
      }
      draw(now)
    }

    const draw = (now: number) => {
      // hallway floor
      ctx.fillStyle = '#0b1834'
      ctx.fillRect(0, 0, W, H)
      ctx.strokeStyle = 'rgba(47,107,255,.16)'
      ctx.lineWidth = 2
      for (let x = 0; x < W; x += 48) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, H)
        ctx.stroke()
      }
      for (let y = 30; y < H; y += 48) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(W, y)
        ctx.stroke()
      }
      // lockers along the top wall
      for (let x = 0; x < W; x += 34) {
        ctx.fillStyle = x % 68 ? '#1d8fbf' : '#2aa7d9'
        ctx.fillRect(x + 1, 0, 32, 28)
        ctx.fillStyle = '#0b3b55'
        ctx.fillRect(x + 6, 6, 22, 3)
        ctx.fillRect(x + 6, 12, 22, 3)
      }

      for (const p of pickups) {
        const bob = Math.sin(now / 200 + p.x) * 3
        if (p.kind !== 'coin') {
          ctx.fillStyle = 'rgba(255,199,44,.18)'
          ctx.beginPath()
          ctx.arc(p.x, p.y, 22 + Math.sin(now / 150) * 3, 0, Math.PI * 2)
          ctx.fill()
        }
        drawSprite(ctx, PICKUP_EMOJI[p.kind], p.x, p.y + bob, p.kind === 'coin' ? 22 : 26)
      }
      for (const b of bullets) drawSprite(ctx, b.emoji, b.x, b.y, 22, b.rot)

      for (const e of enemies) {
        ctx.fillStyle = 'rgba(255,77,94,.18)'
        ctx.beginPath()
        ctx.arc(e.x, e.y, e.r + 8, 0, Math.PI * 2)
        ctx.fill()
        drawSprite(ctx, e.emoji, e.x, e.y, e.r * 2, 0, e.vx < 0)
        ctx.font = '700 10px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.lineWidth = 3
        ctx.strokeStyle = '#071022'
        ctx.strokeText(e.label, e.x, e.y - e.r - 8)
        ctx.fillStyle = '#ff4d5e'
        ctx.fillText(e.label, e.x, e.y - e.r - 8)
      }

      const blink = time < invulnUntil && Math.floor(now / 80) % 2 === 0
      if (!blink) {
        if (time < shieldUntil) {
          ctx.strokeStyle = '#ffc72c'
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.arc(player.x, player.y, player.r + 8 + Math.sin(now / 100) * 2, 0, Math.PI * 2)
          ctx.stroke()
        }
        drawSprite(ctx, over ? '😵' : '🏃', player.x, player.y, player.r * 2.2, 0, player.facing > 0)
      }

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
      if (time < slowUntil) {
        ctx.fillStyle = 'rgba(79,179,255,.08)'
        ctx.fillRect(0, 0, W, H)
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'w', 'a', 's', 'd'].includes(k)) {
        e.preventDefault()
        keys.add(k)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase())

    // Virtual joystick: press anywhere, drag in the direction you want to go.
    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId)
      const p = local(e)
      joystick = { ax: p.x, ay: p.y, x: p.x, y: p.y }
      setJoy(joystick)
    }
    const onMove = (e: PointerEvent) => {
      if (!joystick) return
      const p = local(e)
      joystick = { ...joystick, x: p.x, y: p.y }
      setJoy(joystick)
    }
    const onUp = () => {
      joystick = null
      setJoy(null)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)
    player.x = W / 2
    player.y = H / 2 + 40
    raf = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(raf)
      stopFit()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
    }
  }, [])

  return (
    <div className="absolute inset-0">
      <canvas ref={canvasRef} className="block touch-none" aria-label="Dodge the Principal play area. Use arrow keys or WASD, or drag to move." />
      <div className="absolute top-10 inset-x-3 flex flex-wrap gap-2 pointer-events-none">
        <ScoreDisplay label="SCORE" value={hud.score.toLocaleString()} />
        <ScoreDisplay label="TIME" value={`${hud.time}s`} color="var(--color-blue)" />
        <ScoreDisplay label="COMBO" value={`${hud.combo}x`} color="var(--color-pink)" bump={hud.combo} />
        <div className="flex gap-1 items-center">
          {hud.shield && <span className="tag" style={{ ['--c' as string]: 'var(--color-yellow)' }}>⭐ PASS</span>}
          {hud.slow && <span className="tag" style={{ ['--c' as string]: 'var(--color-blue)' }}>⏰ SLOW</span>}
          {hud.magnet && <span className="tag" style={{ ['--c' as string]: 'var(--color-pink)' }}>🧲 MAGNET</span>}
        </div>
      </div>
      {joy && (
        <div className="absolute pointer-events-none" style={{ left: joy.ax - 50, top: joy.ay - 50, width: 100, height: 100 }} aria-hidden>
          <div className="absolute inset-0 rounded-full border-4 border-white/25 bg-white/5" />
          <div
            className="absolute w-10 h-10 rounded-full bg-white/40 border-2 border-white/60"
            style={{
              left: 30 + Math.max(-40, Math.min(40, joy.x - joy.ax)),
              top: 30 + Math.max(-40, Math.min(40, joy.y - joy.ay)),
            }}
          />
        </div>
      )}
      <div className="absolute bottom-2 inset-x-0 text-center font-pixel text-[0.7rem] text-dim pointer-events-none">WASD / ARROWS · OR DRAG ANYWHERE TO MOVE</div>
    </div>
  )
}
