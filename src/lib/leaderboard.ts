import type { GameId, GameStats, PlayerState } from './types'
import { levelFromXp } from './progression'
import { cosmeticValue } from './cosmetics'

/**
 * Leaderboard architecture
 * ------------------------
 * The UI only talks to the `LeaderboardBackend` interface. Today we ship `LocalLeaderboard`,
 * which ranks real players who have played on this device (localStorage). Nothing is synced.
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
}

export interface LeaderboardBackend {
  readonly kind: 'local' | 'remote'
  /** Human-readable note shown under the board so nobody is misled about sync. */
  readonly syncNote: string
  getTop(category: BoardCategory, player: PlayerState, limit?: number): Promise<BoardEntry[]>
  submitRun(game: GameId, score: number, stats: GameStats, player: PlayerState): Promise<void>
}

/** Best value a player has for a category (null = hasn't played it). */
function playerValue(cat: BoardCategory, p: PlayerState): number | null {
  switch (cat) {
    case 'overall':
      return p.xp || null
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

interface StoredEntry {
  name: string
  avatar: string
  level: number
  values: Partial<Record<BoardCategory, number>>
  updatedAt: number
}

const BOARD_KEY = 'lcff:board:v1'

/**
 * Real scores only — no made-up players. Every name on this board has actually played
 * on this device/browser (e.g. friends taking turns on one school computer under
 * different names). Stored in localStorage.
 */
class LocalLeaderboard implements LeaderboardBackend {
  readonly kind = 'local' as const
  readonly syncNote = 'This board shows real scores from players on this device. A school-wide board needs a server connection (not set up yet).'

  private read(): Record<string, StoredEntry> {
    try {
      return JSON.parse(localStorage.getItem(BOARD_KEY) || '{}')
    } catch {
      return {}
    }
  }

  private upsert(player: PlayerState) {
    const all = this.read()
    const values: Partial<Record<BoardCategory, number>> = {}
    for (const c of BOARD_CATEGORIES) {
      const v = playerValue(c.id, player)
      if (v !== null && v > 0) values[c.id] = v
    }
    if (!Object.keys(values).length) return
    all[player.username] = {
      name: player.username,
      avatar: cosmeticValue(player.cosmetics.equipped.avatar, 'avatar'),
      level: levelFromXp(player.xp),
      values,
      updatedAt: Date.now(),
    }
    try {
      localStorage.setItem(BOARD_KEY, JSON.stringify(all))
    } catch {
      /* storage blocked — board just won't persist */
    }
  }

  async getTop(category: BoardCategory, player: PlayerState, limit = 10): Promise<BoardEntry[]> {
    this.upsert(player)
    const def = BOARD_CATEGORIES.find((c) => c.id === category)!
    const rows = Object.values(this.read())
      .filter((e) => (e.values[category] ?? 0) > 0)
      .map((e) => ({ name: e.name, avatar: e.avatar, level: e.level, value: e.values[category]!, isYou: e.name === player.username }))
    rows.sort((a, b) => (def.lowerIsBetter ? a.value - b.value : b.value - a.value))
    const ranked = rows.map((r, i) => ({ ...r, rank: i + 1 }))
    const top = ranked.slice(0, limit)
    const you = ranked.find((r) => r.isYou)
    if (you && !top.includes(you)) top.push(you)
    return top
  }

  async submitRun(_game: GameId, _score: number, _stats: GameStats, player: PlayerState): Promise<void> {
    this.upsert(player)
  }
}

export const leaderboard: LeaderboardBackend = new LocalLeaderboard()
