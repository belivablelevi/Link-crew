/**
 * Level curve. TOTAL XP required to reach each level:
 *   L1 = 0, L2 = 100, L3 = 250, L4 = 500, L5 = 900, then each level costs 100 more than the last.
 */
const EARLY = [0, 100, 250, 500, 900]

export const MAX_LEVEL = 99

export function xpForLevel(level: number): number {
  if (level <= 1) return 0
  if (level <= EARLY.length) return EARLY[level - 1]
  let total = EARLY[EARLY.length - 1]
  let step = 400
  for (let l = EARLY.length + 1; l <= level; l++) {
    step += 100
    total += step
  }
  return total
}

export function levelFromXp(xp: number): number {
  let level = 1
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++
  return level
}

export interface LevelProgress {
  level: number
  intoLevel: number
  needed: number
  pct: number
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelFromXp(xp)
  const base = xpForLevel(level)
  const next = xpForLevel(level + 1)
  const needed = next - base
  const intoLevel = xp - base
  return { level, intoLevel, needed, pct: needed > 0 ? Math.min(1, intoLevel / needed) : 1 }
}

/** Tokens granted for reaching `level`. */
export function levelUpTokens(level: number): number {
  return 50 + level * 15
}
