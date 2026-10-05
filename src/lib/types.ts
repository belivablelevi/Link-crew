export type GameId =
  | 'reaction-rush'
  | 'dodge-the-principal'
  | 'locker-smash'
  | 'fall-fest-stacker'
  | 'memory-meltdown'
  | 'button-mayhem'
  | 'fall-fest-typer'
  | 'catch-the-duck'
  | 'spin-to-win'
  | 'fall-fest-boss'

/** What a game reports back to the shell when a run ends. */
export interface GameResult {
  score: number
  /** Optional extra stats used for achievements, daily challenges and leaderboards. */
  stats?: GameStats
  /** Big headline on the game-over screen, e.g. "BOSS DEFEATED!" */
  headline?: string
  /** Small stat chips on the game-over screen. */
  details?: { label: string; value: string }[]
}

export interface GameStats {
  bestReactionMs?: number
  avgReactionMs?: number
  maxCombo?: number
  ducksCaught?: number
  buttonsClicked?: number
  lockersOpened?: number
  secretLockers?: number
  wpm?: number
  accuracy?: number
  memoryRound?: number
  stackHeight?: number
  perfectDrops?: number
  survivedSec?: number
  coins?: number
  bossDefeated?: boolean
  bossDamage?: number
  criticalHits?: number
}

export interface Rewards {
  xp: number
  tokens: number
}

export type CosmeticKind = 'avatar' | 'title' | 'background' | 'nameEffect' | 'confetti'

export interface Settings {
  sound: boolean
  volume: number // 0..1
  motion: 'system' | 'reduced' | 'full'
}

export interface DailyState {
  day: string
  challengeId: string
  progress: number
  completed: boolean
}

export interface LifetimeStats {
  buttonsClicked: number
  ducksCaught: number
  bestReactionMs: number | null
  maxCombo: number
  jackpots: number
  bossKills: number
  lockersOpened: number
  secretLockers: number
  spins: number
  bestWpm: number
  bestStack: number
  bestMemoryRound: number
  secretsFound: string[]
  eventsCaught: number
  dailiesCompleted: number
}

export interface PlayerState {
  version: 1
  username: string
  onboarded: boolean
  xp: number
  tokens: number
  gamesPlayed: number
  totalScore: number
  highScores: Partial<Record<GameId, number>>
  playsByGame: Partial<Record<GameId, number>>
  achievements: Record<string, number>
  stats: LifetimeStats
  streak: { count: number; lastDay: string }
  cosmetics: {
    owned: string[]
    equipped: Record<CosmeticKind, string>
  }
  settings: Settings
  daily: DailyState
  spin: { lastSpinAt: number; bonusSpins: number }
  boosts: { xp2xUntil: number; tokens2xUntil: number }
}
