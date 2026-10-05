import type { GameId, GameResult } from './types'

export interface DailyChallengeDef {
  id: string
  text: string
  game?: GameId
  goal: number
  /** Display unit for progress, e.g. "ducks". */
  unit?: string
  /** If true, progress only counts the best single run (set), not accumulates (add). */
  best?: boolean
  /** Returns the value this run contributes. */
  measure: (game: GameId, r: GameResult) => number
  xp: number
  tokens: number
}

const stat = (g: GameId, want: GameId, v: number | undefined) => (g === want ? v ?? 0 : 0)

export const DAILY_CHALLENGES: DailyChallengeDef[] = [
  { id: 'react-300', text: 'Get a reaction time under 300ms.', game: 'reaction-rush', goal: 1, measure: (g, r) => (g === 'reaction-rush' && (r.stats?.bestReactionMs ?? 9999) < 300 ? 1 : 0), best: true, xp: 100, tokens: 50 },
  { id: 'ducks-40', text: 'Catch 40 ducks (any number of runs).', game: 'catch-the-duck', goal: 40, unit: 'ducks', measure: (g, r) => stat(g, 'catch-the-duck', r.stats?.ducksCaught), xp: 100, tokens: 50 },
  { id: 'play-5', text: 'Play 5 games of anything.', goal: 5, unit: 'games', measure: (g) => (g === 'spin-to-win' ? 0 : 1), xp: 100, tokens: 50 },
  { id: 'lockers-12', text: 'Smash open 12 lockers.', game: 'locker-smash', goal: 12, unit: 'lockers', measure: (g, r) => stat(g, 'locker-smash', r.stats?.lockersOpened), xp: 100, tokens: 50 },
  { id: 'stack-15', text: 'Stack 15 blocks in one tower.', game: 'fall-fest-stacker', goal: 15, unit: 'blocks', best: true, measure: (g, r) => stat(g, 'fall-fest-stacker', r.stats?.stackHeight), xp: 120, tokens: 60 },
  { id: 'memory-8', text: 'Reach round 8 in Memory Meltdown.', game: 'memory-meltdown', goal: 8, unit: 'rounds', best: true, measure: (g, r) => stat(g, 'memory-meltdown', r.stats?.memoryRound), xp: 120, tokens: 60 },
  { id: 'wpm-40', text: 'Hit 40 WPM in Fall Fest Typer.', game: 'fall-fest-typer', goal: 40, unit: 'WPM', best: true, measure: (g, r) => stat(g, 'fall-fest-typer', r.stats?.wpm), xp: 120, tokens: 60 },
  { id: 'buttons-60', text: 'Click 60 buttons in Button Mayhem.', game: 'button-mayhem', goal: 60, unit: 'buttons', measure: (g, r) => stat(g, 'button-mayhem', r.stats?.buttonsClicked), xp: 100, tokens: 50 },
  { id: 'dodge-45', text: 'Survive 45 seconds from The Principal.', game: 'dodge-the-principal', goal: 45, unit: 'sec', best: true, measure: (g, r) => stat(g, 'dodge-the-principal', r.stats?.survivedSec), xp: 120, tokens: 60 },
  { id: 'boss-dmg', text: 'Deal 15,000 total damage to the Boss.', game: 'fall-fest-boss', goal: 15000, unit: 'dmg', measure: (g, r) => stat(g, 'fall-fest-boss', r.stats?.bossDamage), xp: 150, tokens: 75 },
  { id: 'combo-25', text: 'Reach a 25x combo in any game.', goal: 25, unit: 'combo', best: true, measure: (_g, r) => r.stats?.maxCombo ?? 0, xp: 120, tokens: 60 },
]

export function todayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function dayOffsetKey(offset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return todayKey(d)
}

/** Deterministic pick so everyone on the same day gets the same challenge. */
export function challengeForDay(day: string): DailyChallengeDef {
  let h = 0
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return DAILY_CHALLENGES[h % DAILY_CHALLENGES.length]
}

export function getChallenge(id: string) {
  return DAILY_CHALLENGES.find((c) => c.id === id)
}
