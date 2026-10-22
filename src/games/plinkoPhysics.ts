/**
 * Pumpkin Plinko physics on a FIXED logical board (BOARD_W x BOARD_H), scaled to fit the screen.
 * Because the geometry never changes with screen size, the game plays the same on a phone and a
 * laptop, and resizing mid-game only changes how it's drawn. Pure functions, no DOM, so it can be
 * stress-tested headless.
 */

export const SLOT_VALUES = [100, 40, 20, 10, 5, 10, 20, 40, 100]
export const BOARD_W = 360
export const BOARD_H = 560
export const SLOT_W = BOARD_W / SLOT_VALUES.length // 40
export const BALL_R = 7
export const PEG_R = 4
export const WALL_PEG_R = 6
export const DROP_Y = 18
export const SLOT_TOP = BOARD_H - 64
/** Aim range: the drop point can't hug the walls. */
export const AIM_MIN = SLOT_W / 2
export const AIM_MAX = BOARD_W - SLOT_W / 2

const GRAVITY = 1100
const BOUNCE = 0.2
const AIR_DRAG = 2.5 // sideways speed bleeds off, so balls settle into a fall
const MAX_VX = 130
const ROWS = 11
const FIRST_ROW_Y = 70
const ROW_GAP = (SLOT_TOP - 30 - FIRST_ROW_Y) / (ROWS - 1)
/** Safety nets so a ball can never hold up the game. */
const STUCK_AFTER = 0.8 // s without falling -> nudge toward the middle
const FORCE_LAND_AFTER = 8 // s in the air -> drop straight into the slot below

export interface Peg {
  x: number
  y: number
  r: number
}

export interface Ball {
  x: number
  y: number
  vx: number
  vy: number
  slot: number | null
  done: boolean
  age: number
  bestY: number
  stillFor: number
}

/**
 * Staggered rows. Even rows: pegs at 20, 60, ... 340 (gap to the wall is wider than a ball, so
 * nothing wedges there). Odd rows: pegs at 40 ... 320 plus a bumper peg ON each wall, so there is
 * no straight lane down the edge into the 100 slots.
 */
export function makePegs(): Peg[] {
  const pegs: Peg[] = []
  for (let r = 0; r < ROWS; r++) {
    const y = FIRST_ROW_Y + r * ROW_GAP
    if (r % 2 === 0) {
      for (let x = SLOT_W / 2; x < BOARD_W; x += SLOT_W) pegs.push({ x, y, r: PEG_R })
    } else {
      pegs.push({ x: 0, y, r: WALL_PEG_R }, { x: BOARD_W, y, r: WALL_PEG_R })
      for (let x = SLOT_W; x < BOARD_W - 1; x += SLOT_W) pegs.push({ x, y, r: PEG_R })
    }
  }
  return pegs
}

export function newBall(aimX: number, rand: () => number = Math.random): Ball {
  const x = Math.max(AIM_MIN, Math.min(AIM_MAX, aimX)) + (rand() - 0.5) * 2
  return { x, y: DROP_Y, vx: (rand() - 0.5) * 20, vy: 0, slot: null, done: false, age: 0, bestY: DROP_Y, stillFor: 0 }
}

export const slotAt = (x: number) => Math.max(0, Math.min(SLOT_VALUES.length - 1, Math.floor(x / SLOT_W)))

/**
 * Advance one ball by dt seconds (call with small dt; the game does 4 substeps per frame).
 * Returns 'peg' if it bounced off a peg (for the tick sound), 'landed' when it reaches the
 * bottom of a slot, otherwise null.
 */
export function stepBall(b: Ball, pegs: Peg[], dt: number, rand: () => number = Math.random): 'peg' | 'landed' | null {
  if (b.done) return null
  let event: 'peg' | 'landed' | null = null
  b.age += dt
  b.vy += GRAVITY * dt
  b.vx *= 1 - AIR_DRAG * dt
  b.vx = Math.max(-MAX_VX, Math.min(MAX_VX, b.vx))
  b.x += b.vx * dt
  b.y += b.vy * dt

  // walls
  if (b.x < BALL_R) {
    b.x = BALL_R
    b.vx = Math.abs(b.vx) * BOUNCE
  } else if (b.x > BOARD_W - BALL_R) {
    b.x = BOARD_W - BALL_R
    b.vx = -Math.abs(b.vx) * BOUNCE
  }

  // pegs
  if (b.y < SLOT_TOP) {
    for (const p of pegs) {
      const dx = b.x - p.x
      const dy = b.y - p.y
      const min = BALL_R + p.r
      if (Math.abs(dx) >= min || Math.abs(dy) >= min) continue
      const d = Math.hypot(dx, dy)
      if (d >= min || d === 0) continue
      const nx = dx / d
      const ny = dy / d
      b.x = p.x + nx * min
      b.y = p.y + ny * min
      const vn = b.vx * nx + b.vy * ny
      if (vn < 0) {
        b.vx -= (1 + BOUNCE) * vn * nx
        b.vy -= (1 + BOUNCE) * vn * ny
        // never balance on top of a peg
        if (Math.abs(b.vx) < 20) b.vx += (b.x < p.x ? -1 : b.x > p.x ? 1 : rand() < 0.5 ? -1 : 1) * (30 + rand() * 30)
        b.vx = Math.max(-MAX_VX, Math.min(MAX_VX, b.vx))
        b.vy = Math.max(-80, b.vy) // soft pegs: never launch a ball back up the board
        event = 'peg'
      }
    }
  }

  // safety net 1: not falling for a while -> push toward the middle
  if (b.y > b.bestY + 2) {
    b.bestY = b.y
    b.stillFor = 0
  } else {
    b.stillFor += dt
    if (b.stillFor > STUCK_AFTER) {
      b.vx = (b.x < BOARD_W / 2 ? 1 : -1) * 120
      b.vy = Math.max(b.vy, 60)
      b.stillFor = 0
    }
  }

  // inside the slots: stay between this slot's dividers
  if (b.y > SLOT_TOP - 10) {
    if (b.slot === null) b.slot = slotAt(b.x)
    const l = b.slot * SLOT_W + 2 + BALL_R
    const r = (b.slot + 1) * SLOT_W - 2 - BALL_R
    if (b.x < l) {
      b.x = l
      b.vx = Math.abs(b.vx) * BOUNCE
    } else if (b.x > r) {
      b.x = r
      b.vx = -Math.abs(b.vx) * BOUNCE
    }
  }

  // safety net 2: hard limit on time in the air
  if (b.age > FORCE_LAND_AFTER && b.slot === null) b.slot = slotAt(b.x)

  if (b.y > BOARD_H - BALL_R - 6 || b.age > FORCE_LAND_AFTER + 0.5) {
    if (b.slot === null) b.slot = slotAt(b.x)
    b.y = Math.min(b.y, BOARD_H - BALL_R - 6)
    b.done = true
    event = 'landed'
  }
  return event
}
