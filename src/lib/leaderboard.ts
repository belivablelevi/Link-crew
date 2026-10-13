import type { GameId } from './types'
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './supabaseConfig'
import { getGame } from '../games/meta'

/**
 * Leaderboard service
 * -------------------
 * ONLINE mode (school-wide): connection details live in supabaseConfig.ts (env vars
 * VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY override them). Scores are stored in a
 * Supabase database (schema in supabase/schema.sql) and everyone sees the same board.
 *
 * LOCAL mode (fallback): if those aren't set, the board shows scores from this device only.
 */

export interface BoardRow {
  rank: number
  name: string
  score: number
  isYou: boolean
  /** All-time board only: how many games this player has finished. */
  games?: number
}

/** Points a single run is worth on the all-time board (same formula as XP; 10 to 260 per run). */
export function runPoints(game: GameId, score: number): number {
  return getGame(game)?.reward(score).xp ?? 0
}

export interface LeaderboardService {
  readonly mode: 'online' | 'local'
  /** Save a finished run. Never throws. */
  submit(game: GameId, score: number, name: string): Promise<void>
  /** Top players for a game (best score per player), plus your row if you're outside the top. */
  top(game: GameId, yourName: string, limit?: number): Promise<BoardRow[]>
  /** All-time points: every finished run adds points (see runPoints). */
  allTime(yourName: string, limit?: number): Promise<BoardRow[]>
  /** Best score ever for each game. */
  records(): Promise<Partial<Record<GameId, number>>>
}

// ---------------------------------------------------------------------------
// A random id per device so two players with the same name stay separate.
// ---------------------------------------------------------------------------
const ID_KEY = 'lcff:player-id'
function playerId(): string {
  try {
    let id = localStorage.getItem(ID_KEY)
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16))
      localStorage.setItem(ID_KEY, id)
    }
    return id
  } catch {
    return '00000000-0000-4000-8000-000000000000'
  }
}

// ---------------------------------------------------------------------------
// Online: Supabase REST API (no SDK needed)
// ---------------------------------------------------------------------------
class OnlineLeaderboard implements LeaderboardService {
  readonly mode = 'online' as const
  constructor(
    private url: string,
    private key: string,
  ) {}

  private headers(extra: Record<string, string> = {}) {
    // New-style publishable keys (sb_publishable_...) go in the apikey header only;
    // legacy anon keys (JWTs) also go in Authorization.
    const auth: Record<string, string> = this.key.startsWith('sb_') ? {} : { Authorization: `Bearer ${this.key}` }
    return { apikey: this.key, ...auth, ...extra }
  }

  private async get<T>(path: string, extra?: Record<string, string>): Promise<{ data: T; res: Response }> {
    const res = await fetch(`${this.url}/rest/v1/${path}`, { headers: this.headers(extra) })
    if (!res.ok) throw new Error(`Leaderboard request failed (${res.status})`)
    return { data: (await res.json()) as T, res }
  }

  async submit(game: GameId, score: number, name: string) {
    try {
      await fetch(`${this.url}/rest/v1/scores`, {
        method: 'POST',
        headers: this.headers({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
        body: JSON.stringify({ player_id: playerId(), name, game, score: Math.round(score) }),
      })
    } catch {
      /* offline: the score still counts locally */
    }
  }

  async top(game: GameId, _yourName: string, limit = 10): Promise<BoardRow[]> {
    const me = playerId()
    const g = encodeURIComponent(game)
    const { data } = await this.get<{ name: string; score: number; player_id: string }[]>(
      `leaderboard?select=name,score,player_id&game=eq.${g}&order=score.desc,created_at.asc&limit=${limit}`,
    )
    const rows: BoardRow[] = data.map((r, i) => ({ rank: i + 1, name: r.name, score: r.score, isYou: r.player_id === me }))
    if (!rows.some((r) => r.isYou)) {
      // Find your own best + rank so you always see where you stand.
      const mine = await this.get<{ name: string; score: number }[]>(`leaderboard?select=name,score&game=eq.${g}&player_id=eq.${me}`)
      const you = mine.data[0]
      if (you) {
        const { res } = await this.get<unknown[]>(`leaderboard?select=player_id&game=eq.${g}&score=gt.${you.score}&limit=1`, { Prefer: 'count=exact' })
        const ahead = Number(res.headers.get('content-range')?.split('/')[1] ?? rows.length)
        rows.push({ rank: ahead + 1, name: you.name, score: you.score, isYou: true })
      }
    }
    return rows
  }

  async allTime(_yourName: string, limit = 10): Promise<BoardRow[]> {
    const me = playerId()
    const { data } = await this.get<{ name: string; points: number; games: number; player_id: string }[]>(
      `all_time?select=name,points,games,player_id&order=points.desc&limit=${limit}`,
    )
    const rows: BoardRow[] = data.map((r, i) => ({ rank: i + 1, name: r.name, score: r.points, games: r.games, isYou: r.player_id === me }))
    if (!rows.some((r) => r.isYou)) {
      const mine = await this.get<{ name: string; points: number; games: number }[]>(`all_time?select=name,points,games&player_id=eq.${me}`)
      const you = mine.data[0]
      if (you) {
        const { res } = await this.get<unknown[]>(`all_time?select=player_id&points=gt.${you.points}&limit=1`, { Prefer: 'count=exact' })
        const ahead = Number(res.headers.get('content-range')?.split('/')[1] ?? rows.length)
        rows.push({ rank: ahead + 1, name: you.name, score: you.points, games: you.games, isYou: true })
      }
    }
    return rows
  }

  async records() {
    const { data } = await this.get<{ game: GameId; score: number }[]>('game_records?select=game,score')
    return Object.fromEntries(data.map((r) => [r.game, r.score])) as Partial<Record<GameId, number>>
  }
}

// ---------------------------------------------------------------------------
// Local fallback: real scores from players on this device only.
// ---------------------------------------------------------------------------
const LOCAL_KEY = 'lcff:board:v2'
const LOCAL_ALLTIME_KEY = 'lcff:alltime:v1'
type LocalAllTime = Record<string, { points: number; games: number }> // name -> totals
type LocalBoard = Record<string, Partial<Record<GameId, number>>> // name -> game -> best

class LocalLeaderboard implements LeaderboardService {
  readonly mode = 'local' as const

  private read(): LocalBoard {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}')
    } catch {
      return {}
    }
  }

  private readAllTime(): LocalAllTime {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_ALLTIME_KEY) || '{}')
    } catch {
      return {}
    }
  }

  async submit(game: GameId, score: number, name: string) {
    const totals = this.readAllTime()
    const t = (totals[name] ??= { points: 0, games: 0 })
    t.points += runPoints(game, score)
    t.games += 1
    try {
      localStorage.setItem(LOCAL_ALLTIME_KEY, JSON.stringify(totals))
    } catch {
      /* storage blocked */
    }
    const all = this.read()
    const mine = (all[name] ??= {})
    if (score > (mine[game] ?? 0)) mine[game] = Math.round(score)
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(all))
    } catch {
      /* storage blocked */
    }
  }

  async top(game: GameId, yourName: string, limit = 10): Promise<BoardRow[]> {
    return Object.entries(this.read())
      .filter(([, g]) => (g[game] ?? 0) > 0)
      .map(([name, g]) => ({ name, score: g[game]! }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((r, i) => ({ rank: i + 1, name: r.name, score: r.score, isYou: r.name === yourName }))
  }

  async allTime(yourName: string, limit = 10): Promise<BoardRow[]> {
    return Object.entries(this.readAllTime())
      .sort((a, b) => b[1].points - a[1].points)
      .slice(0, limit)
      .map(([name, t], i) => ({ rank: i + 1, name, score: t.points, games: t.games, isYou: name === yourName }))
  }

  async records() {
    const out: Partial<Record<GameId, number>> = {}
    for (const g of Object.values(this.read())) for (const [k, v] of Object.entries(g)) out[k as GameId] = Math.max(out[k as GameId] ?? 0, v ?? 0)
    return out
  }
}

const URL_ = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) || SUPABASE_URL)?.replace(/\/+$/, '')
const KEY_ = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || SUPABASE_PUBLISHABLE_KEY

export const leaderboard: LeaderboardService = URL_ && KEY_ ? new OnlineLeaderboard(URL_, KEY_) : new LocalLeaderboard()
