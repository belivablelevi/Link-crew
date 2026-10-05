import { useSyncExternalStore } from 'react'
import type { CosmeticKind, GameId, GameResult, PlayerState, Rewards } from '../lib/types'
import { levelFromXp, levelUpTokens } from '../lib/progression'
import { ACHIEVEMENTS, getAchievement } from '../lib/achievements'
import { COSMETICS, DEFAULT_EQUIPPED, STARTER_COSMETICS, cosmeticsUnlockedAtLevel, getCosmetic } from '../lib/cosmetics'
import { challengeForDay, dayOffsetKey, getChallenge, todayKey } from '../lib/daily'
import { getGame } from '../games/meta'
import { fx } from '../lib/fx'
import { configureSound, play } from '../lib/sound'
import { leaderboard } from '../lib/leaderboard'

const STORAGE_KEY = 'lcff:player:v1'
export const SPIN_COOLDOWN_MS = 15 * 60 * 1000

function randomName() {
  const a = ['Turbo', 'Spicy', 'Neon', 'Pixel', 'Crispy', 'Mega', 'Sneaky', 'Cosmic', 'Golden', 'Hyper']
  const b = ['Duck', 'Pumpkin', 'Leaf', 'Locker', 'Gourd', 'Goose', 'Acorn', 'Maple', 'Waffle', 'Raccoon']
  return `${a[Math.floor(Math.random() * a.length)]}${b[Math.floor(Math.random() * b.length)]}${Math.floor(Math.random() * 90 + 10)}`
}

function defaults(): PlayerState {
  const day = todayKey()
  return {
    version: 1,
    username: randomName(),
    onboarded: false,
    xp: 0,
    tokens: 100,
    gamesPlayed: 0,
    totalScore: 0,
    highScores: {},
    playsByGame: {},
    achievements: {},
    stats: {
      buttonsClicked: 0,
      ducksCaught: 0,
      bestReactionMs: null,
      maxCombo: 0,
      jackpots: 0,
      bossKills: 0,
      lockersOpened: 0,
      secretLockers: 0,
      spins: 0,
      bestWpm: 0,
      bestStack: 0,
      bestMemoryRound: 0,
      secretsFound: [],
      dailiesCompleted: 0,
    },
    streak: { count: 0, lastDay: '' },
    cosmetics: { owned: [...STARTER_COSMETICS], equipped: { ...DEFAULT_EQUIPPED } },
    settings: { sound: true, volume: 0.5, motion: 'system' },
    daily: { day, challengeId: challengeForDay(day).id, progress: 0, completed: false },
    spin: { lastSpinAt: 0, bonusSpins: 0 },
    boosts: { xp2xUntil: 0, tokens2xUntil: 0 },
  }
}

/** Deep-merge saved data over defaults so new fields added later never crash old saves. */
function merge<T>(base: T, saved: unknown): T {
  if (saved === undefined) return base
  if (base === null) return saved as T // nullable field (e.g. bestReactionMs): trust the save
  if (saved === null) return base
  if (Array.isArray(base)) return (Array.isArray(saved) ? saved : base) as T
  if (typeof base === 'object' && base !== null) {
    if (typeof saved !== 'object') return base
    const out: Record<string, unknown> = { ...(saved as Record<string, unknown>) }
    for (const k of Object.keys(base as object)) {
      out[k] = merge((base as Record<string, unknown>)[k], (saved as Record<string, unknown>)[k])
    }
    return out as T
  }
  return (typeof saved === typeof base ? saved : base) as T
}

function load(): PlayerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return merge(defaults(), JSON.parse(raw))
  } catch {
    /* corrupted or blocked storage — start fresh */
  }
  return defaults()
}

function save(s: PlayerState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* storage full / private mode — progress is session-only */
  }
}

let state: PlayerState = load()
const listeners = new Set<() => void>()
configureSound(state.settings.sound, state.settings.volume)

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getState() {
  return state
}

export function useStore<T>(selector: (s: PlayerState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state))
}

// ---------------------------------------------------------------------------
// Mutation pipeline: clone → change → award level-ups / achievements → save → notify → fire effects
// ---------------------------------------------------------------------------
type Effect = () => void
let pendingEffects: Effect[] = []

function grantXp(d: PlayerState, amount: number) {
  const before = levelFromXp(d.xp)
  d.xp += Math.max(0, Math.round(amount))
  const after = levelFromXp(d.xp)
  for (let lvl = before + 1; lvl <= after; lvl++) {
    const tokens = levelUpTokens(lvl)
    d.tokens += tokens
    d.spin.bonusSpins += 1
    const unlocks = cosmeticsUnlockedAtLevel(lvl)
    unlocks.forEach((c) => {
      if (!d.cosmetics.owned.includes(c.id)) d.cosmetics.owned.push(c.id)
    })
    const names = unlocks.map((c) => `${c.name} ${c.kind === 'avatar' ? c.value : ''}`.trim())
    pendingEffects.push(() => fx.levelUp(lvl, tokens, names))
  }
}

function checkAchievements(d: PlayerState) {
  let changed = true
  while (changed) {
    changed = false
    for (const a of ACHIEVEMENTS) {
      if (d.achievements[a.id]) continue
      if (a.check(d)) {
        d.achievements[a.id] = Date.now()
        d.tokens += a.tokens
        if (a.id === 'jackpot' && !d.cosmetics.owned.includes('ti-jackpot')) d.cosmetics.owned.push('ti-jackpot')
        pendingEffects.push(() => fx.achievement(a.id))
        changed = true
      }
    }
  }
}

function rollDaily(d: PlayerState) {
  const day = todayKey()
  if (d.daily.day !== day) d.daily = { day, challengeId: challengeForDay(day).id, progress: 0, completed: false }
}

function mutate(fn: (d: PlayerState) => void) {
  const draft: PlayerState = structuredClone(state)
  fn(draft)
  checkAchievements(draft)
  state = draft
  save(state)
  listeners.forEach((l) => l())
  const effects = pendingEffects
  pendingEffects = []
  // Stagger overlays so a level-up and achievement don't land on the same frame.
  effects.forEach((e, i) => setTimeout(e, 250 + i * 900))
}

// ---------------------------------------------------------------------------
// Public actions
// ---------------------------------------------------------------------------
export const isBoostActive = (until: number) => until > Date.now()

export interface GameSummary {
  rewards: Rewards
  baseRewards: Rewards
  newHigh: boolean
  prevHigh: number
  dailyJustCompleted: boolean
  boosted: { xp: boolean; tokens: boolean }
}

export function recordGame(id: GameId, result: GameResult): GameSummary {
  const meta = getGame(id)!
  const score = Math.max(0, Math.round(result.score))
  const base = meta.reward(score)
  const xp2 = isBoostActive(state.boosts.xp2xUntil)
  const tk2 = isBoostActive(state.boosts.tokens2xUntil)
  const rewards = { xp: base.xp * (xp2 ? 2 : 1), tokens: base.tokens * (tk2 ? 2 : 1) }
  const prevHigh = state.highScores[id] ?? 0
  const newHigh = score > prevHigh
  let dailyJustCompleted = false

  mutate((d) => {
    rollDaily(d)
    d.gamesPlayed += 1
    d.playsByGame[id] = (d.playsByGame[id] ?? 0) + 1
    d.totalScore += score
    if (newHigh) d.highScores[id] = score
    d.tokens += rewards.tokens

    const s = result.stats ?? {}
    const st = d.stats
    if (s.bestReactionMs && (st.bestReactionMs === null || s.bestReactionMs < st.bestReactionMs)) st.bestReactionMs = Math.round(s.bestReactionMs)
    if (s.maxCombo) st.maxCombo = Math.max(st.maxCombo, s.maxCombo)
    st.ducksCaught += s.ducksCaught ?? 0
    st.buttonsClicked += s.buttonsClicked ?? 0
    st.lockersOpened += s.lockersOpened ?? 0
    st.secretLockers += s.secretLockers ?? 0
    if (s.bossDefeated) st.bossKills += 1
    if (s.wpm) st.bestWpm = Math.max(st.bestWpm, Math.round(s.wpm))
    if (s.stackHeight) st.bestStack = Math.max(st.bestStack, s.stackHeight)
    if (s.memoryRound) st.bestMemoryRound = Math.max(st.bestMemoryRound, s.memoryRound)

    const ch = getChallenge(d.daily.challengeId)
    if (ch && !d.daily.completed) {
      const v = ch.measure(id, result)
      d.daily.progress = ch.best ? Math.max(d.daily.progress, v) : d.daily.progress + v
      if (d.daily.progress >= ch.goal) {
        d.daily.completed = true
        d.daily.progress = ch.goal
        d.tokens += ch.tokens
        st.dailiesCompleted += 1
        dailyJustCompleted = true
        grantXp(d, ch.xp)
        pendingEffects.push(() => {
          fx.toast({ title: 'DAILY CHALLENGE CLEARED!', body: `+${ch.xp} XP · +${ch.tokens} TOKENS`, icon: '🎯', tone: 'achievement' })
          fx.confetti(160)
          play('victory')
        })
      }
    }
    grantXp(d, rewards.xp)
  })

  void leaderboard.submitRun(id, score, result.stats ?? {}, getState())
  return { rewards, baseRewards: base, newHigh: newHigh && score > 0, prevHigh, dailyJustCompleted, boosted: { xp: xp2, tokens: tk2 } }
}

export function addTokens(amount: number, reason?: string) {
  mutate((d) => {
    d.tokens += amount
  })
  if (reason) fx.toast({ title: `+${amount} TOKENS`, body: reason, icon: '🪙', tone: 'token' })
}

export function addXp(amount: number) {
  mutate((d) => grantXp(d, amount))
}

export function setBoost(kind: 'xp' | 'tokens', ms: number) {
  mutate((d) => {
    const key = kind === 'xp' ? 'xp2xUntil' : 'tokens2xUntil'
    d.boosts[key] = Math.max(d.boosts[key], Date.now()) + ms
  })
}

export function canSpin(s = state) {
  return s.spin.bonusSpins > 0 || Date.now() - s.spin.lastSpinAt >= SPIN_COOLDOWN_MS
}

/** Consumes a spin. Uses a bonus spin only when the free cooldown hasn't finished. */
export function consumeSpin(): boolean {
  if (!canSpin()) return false
  mutate((d) => {
    if (Date.now() - d.spin.lastSpinAt >= SPIN_COOLDOWN_MS) d.spin.lastSpinAt = Date.now()
    else d.spin.bonusSpins -= 1
    d.stats.spins += 1
    d.playsByGame['spin-to-win'] = (d.playsByGame['spin-to-win'] ?? 0) + 1
  })
  return true
}

export function grantSpinPrize(p: { tokens?: number; xp?: number; jackpot?: boolean; cosmetic?: string; xpBoostMs?: number }) {
  mutate((d) => {
    if (p.tokens) d.tokens += p.tokens
    if (p.jackpot) d.stats.jackpots += 1
    if (p.cosmetic && !d.cosmetics.owned.includes(p.cosmetic)) d.cosmetics.owned.push(p.cosmetic)
    if (p.xpBoostMs) d.boosts.xp2xUntil = Math.max(d.boosts.xp2xUntil, Date.now()) + p.xpBoostMs
    if (p.tokens) d.highScores['spin-to-win'] = Math.max(d.highScores['spin-to-win'] ?? 0, p.tokens)
    if (p.xp) grantXp(d, p.xp)
  })
}

export function buyCosmetic(id: string): boolean {
  const c = getCosmetic(id)
  if (!c || state.cosmetics.owned.includes(id) || c.special || c.level || state.tokens < c.cost) return false
  mutate((d) => {
    d.tokens -= c.cost
    d.cosmetics.owned.push(id)
    d.cosmetics.equipped[c.kind] = id
  })
  return true
}

export function equipCosmetic(kind: CosmeticKind, id: string) {
  if (!state.cosmetics.owned.includes(id)) return
  mutate((d) => {
    d.cosmetics.equipped[kind] = id
  })
}

export function setUsername(name: string) {
  mutate((d) => {
    d.username = name
    d.onboarded = true
  })
}

export function updateSettings(patch: Partial<PlayerState['settings']>) {
  mutate((d) => {
    d.settings = { ...d.settings, ...patch }
  })
  configureSound(state.settings.sound, state.settings.volume)
}

/** Returns true the first time a given secret is found. */
export function registerSecret(key: string): boolean {
  if (state.stats.secretsFound.includes(key)) return false
  mutate((d) => {
    d.stats.secretsFound.push(key)
    if (key === 'duck' && !d.cosmetics.owned.includes('av-goldduck')) d.cosmetics.owned.push('av-goldduck')
    if (d.stats.secretsFound.length >= 4 && !d.cosmetics.owned.includes('ti-secret')) d.cosmetics.owned.push('ti-secret')
  })
  return true
}

/** Called once on app start: rolls the daily challenge and updates the visit streak. */
export function startSession() {
  mutate((d) => {
    rollDaily(d)
    // Make sure level-reward cosmetics are owned (covers saves from before an item was added).
    for (let lvl = 2; lvl <= levelFromXp(d.xp); lvl++) {
      cosmeticsUnlockedAtLevel(lvl).forEach((c) => {
        if (!d.cosmetics.owned.includes(c.id)) d.cosmetics.owned.push(c.id)
      })
    }
    const today = todayKey()
    if (d.streak.lastDay === today) return
    d.streak.count = d.streak.lastDay === dayOffsetKey(-1) ? d.streak.count + 1 : 1
    d.streak.lastDay = today
  })
}

export function resetProgress() {
  const keepSettings = state.settings
  const fresh = defaults()
  fresh.settings = keepSettings
  state = fresh
  save(state)
  listeners.forEach((l) => l())
  startSession()
}

export function achievementTokens(id: string) {
  return getAchievement(id)?.tokens ?? 0
}

export const ALL_COSMETICS = COSMETICS
