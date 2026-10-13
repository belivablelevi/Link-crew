import type { GameId } from './types'

/**
 * Leaderboard service
 * -------------------
 * ONLINE mode (school-wide): set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY at build time
 * (GitHub repo variables SUPABASE_URL / SUPABASE_ANON_KEY, see README). Scores are stored in a
 * Supabase database (schema in supabase/schema.sql) and everyone sees the same board.
 *
 * LOCAL mode (fallback): if those aren't set, the board shows scores from this device only.
 */

export interface BoardRow {
  rank: number
  name: string
  score: number
  isYou: boolean
}

export interface LeaderboardService {
  readonly mode: 'online' | 'local'
  /** Save a finished run. Never throws. */
  submit(game: GameId, score: number, name: string): Promise<void>
  /** Top players for a game (best score per player), plus your row if you're outside the top. */
  top(game: GameId, yourName: string, limit?: number): Promise<BoardRow[]>
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
    return { apikey: this.key, Authorization: `Bearer ${this.key}`, ...extra }
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

  async records() {
    const { data } = await this.get<{ game: GameId; score: number }[]>('game_records?select=game,score')
    return Object.fromEntries(data.map((r) => [r.game, r.score])) as Partial<Record<GameId, number>>
  }
}

// ---------------------------------------------------------------------------
// Local fallback: real scores from players on this device only.
// ---------------------------------------------------------------------------
const LOCAL_KEY = 'lcff:board:v2'
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

  async submit(game: GameId, score: number, name: string) {
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

  async records() {
    const out: Partial<Record<GameId, number>> = {}
    for (const g of Object.values(this.read())) for (const [k, v] of Object.entries(g)) out[k as GameId] = Math.max(out[k as GameId] ?? 0, v ?? 0)
    return out
  }
}

const URL_ = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, '')
const KEY_ = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const leaderboard: LeaderboardService = URL_ && KEY_ ? new OnlineLeaderboard(URL_, KEY_) : new LocalLeaderboard()
