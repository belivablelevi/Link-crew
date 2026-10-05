import type { GameId, GameStats, PlayerState } from './types'
import { levelFromXp } from './progression'
import { cosmeticValue } from './cosmetics'

/**
 * Leaderboard architecture
 * ------------------------
 * The UI only talks to the `LeaderboardBackend` interface. Today we ship `LocalLeaderboard`,
 * which ranks YOU (from localStorage) against a fixed set of demo rivals. Nothing is synced.
 *
 * To go global later, implement `LeaderboardBackend` against your API/database (e.g. Supabase,
 * Firebase, a tiny Express server) and swap the export at the bottom of this file:
 *
 *   export const leaderboard: LeaderboardBackend = new RemoteLeaderboard('https://api.example.com')
 *
 * `submitRun` is already called after every game with the score + stats, so a remote backend
 * receives everything it needs. Remember to validate scores server-side.
 */

export type BoardCategory = 'overall' | 'reaction' | 'duck' | 'memory' | 'typing' | 'boss'

export interface BoardCategoryDef {
  id: BoardCategory
  label: string
  icon: string
  unit: string
  lowerIsBetter?: boolean
}

export const BOARD_CATEGORIES: BoardCategoryDef[] = [
  { id: 'overall', label: 'OVERALL', icon: '🏆', unit: 'XP' },
  { id: 'reaction', label: 'REACTION', icon: '⚡', unit: 'ms', lowerIsBetter: true },
  { id: 'duck', label: 'DUCK CATCH', icon: '🦆', unit: 'pts' },
  { id: 'memory', label: 'MEMORY', icon: '🧠', unit: 'pts' },
  { id: 'typing', label: 'TYPING', icon: '⌨️', unit: 'WPM' },
  { id: 'boss', label: 'BOSS', icon: '💥', unit: 'dmg' },
]

export interface BoardEntry {
  rank: number
  name: string
  avatar: string
  title?: string
  level: number
  value: number
  isYou?: boolean
  isDemo?: boolean
}

export interface LeaderboardBackend {
  readonly kind: 'local' | 'remote'
  /** Human-readable note shown under the board so nobody is misled about sync. */
  readonly syncNote: string
  getTop(category: BoardCategory, player: PlayerState, limit?: number): Promise<BoardEntry[]>
  submitRun(game: GameId, score: number, stats: GameStats, player: PlayerState): Promise<void>
}

type Rival = { name: string; avatar: string; level: number } & Record<BoardCategory, number>

// Demo rivals — clearly fictional. Values tuned so a new player can climb in a session or two.
const RIVALS: Rival[] = [
  { name: 'PumpkinSpiceLord', avatar: '🎃', level: 14, overall: 14200, reaction: 198, duck: 212, memory: 1450, typing: 82, boss: 61000 },
  { name: 'DuckWhisperer', avatar: '🦆', level: 11, overall: 9100, reaction: 231, duck: 264, memory: 820, typing: 64, boss: 42000 },
  { name: 'xX_LockerGoblin_Xx', avatar: '👺', level: 9, overall: 6400, reaction: 244, duck: 160, memory: 990, typing: 58, boss: 38500 },
  { name: 'MapleSyrupSniper', avatar: '🍁', level: 8, overall: 5300, reaction: 256, duck: 141, memory: 640, typing: 71, boss: 29800 },
  { name: 'CaptainHallPass', avatar: '🪪', level: 7, overall: 4100, reaction: 270, duck: 133, memory: 510, typing: 49, boss: 25100 },
  { name: 'GourdOfWar', avatar: '🪓', level: 6, overall: 3000, reaction: 289, duck: 118, memory: 470, typing: 44, boss: 21000 },
  { name: 'CafeteriaPizzaFan', avatar: '🍕', level: 5, overall: 2100, reaction: 302, duck: 96, memory: 360, typing: 39, boss: 16800 },
  { name: 'NotARobot_404', avatar: '🤖', level: 4, overall: 1400, reaction: 318, duck: 84, memory: 280, typing: 52, boss: 12400 },
  { name: 'SleepyGrade9', avatar: '😴', level: 3, overall: 700, reaction: 355, duck: 61, memory: 170, typing: 31, boss: 8200 },
  { name: 'CandyCornCritic', avatar: '🍬', level: 2, overall: 260, reaction: 410, duck: 38, memory: 90, typing: 26, boss: 4300 },
]

function playerValue(cat: BoardCategory, p: PlayerState): number | null {
  switch (cat) {
    case 'overall':
      return p.xp
    case 'reaction':
      return p.stats.bestReactionMs
    case 'duck':
      return p.highScores['catch-the-duck'] ?? null
    case 'memory':
      return p.highScores['memory-meltdown'] ?? null
    case 'typing':
      return p.stats.bestWpm || null
    case 'boss':
      return p.highScores['fall-fest-boss'] ?? null
  }
}

class LocalLeaderboard implements LeaderboardBackend {
  readonly kind = 'local' as const
  readonly syncNote = 'LOCAL BOARD: you vs. demo rivals on this device. Global rankings switch on when a server is connected.'

  async getTop(category: BoardCategory, player: PlayerState, limit = 10): Promise<BoardEntry[]> {
    const def = BOARD_CATEGORIES.find((c) => c.id === category)!
    const rows: Omit<BoardEntry, 'rank'>[] = RIVALS.map((r) => ({ name: r.name, avatar: r.avatar, level: r.level, value: r[category], isDemo: true }))
    const mine = playerValue(category, player)
    if (mine !== null && mine > 0) {
      rows.push({
        name: player.username,
        avatar: cosmeticValue(player.cosmetics.equipped.avatar, 'avatar'),
        title: cosmeticValue(player.cosmetics.equipped.title, 'title'),
        level: levelFromXp(player.xp),
        value: mine,
        isYou: true,
      })
    }
    rows.sort((a, b) => (def.lowerIsBetter ? a.value - b.value : b.value - a.value))
    const ranked = rows.map((r, i) => ({ ...r, rank: i + 1 }))
    const top = ranked.slice(0, limit)
    // Always show the player even if they're outside the top N.
    const you = ranked.find((r) => r.isYou)
    if (you && !top.includes(you)) top.push(you)
    return top
  }

  async submitRun(): Promise<void> {
    // Local mode: the player's bests already live in the player store. Nothing to send.
  }
}

export const leaderboard: LeaderboardBackend = new LocalLeaderboard()
