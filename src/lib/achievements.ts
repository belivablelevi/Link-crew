import type { PlayerState } from './types'
import { levelFromXp } from './progression'

export interface AchievementDef {
  id: string
  name: string
  desc: string
  icon: string
  tokens: number
  /** Hidden until unlocked. */
  secret?: boolean
  check: (s: PlayerState) => boolean
  /** Optional progress (current, goal) shown on locked cards. */
  progress?: (s: PlayerState) => [number, number]
}

const played = (s: PlayerState) => Object.keys(s.playsByGame).length

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-play', name: 'FIRST PLAY', desc: 'Play your first game.', icon: '🕹️', tokens: 25, check: (s) => s.gamesPlayed >= 1 },
  { id: 'no-life', name: 'NO LIFE', desc: 'Play 10 games.', icon: '🛋️', tokens: 75, check: (s) => s.gamesPlayed >= 10, progress: (s) => [s.gamesPlayed, 10] },
  { id: 'touch-grass', name: 'TOUCH GRASS?', desc: 'Play 50 games. Seriously.', icon: '🌱', tokens: 200, check: (s) => s.gamesPlayed >= 50, progress: (s) => [s.gamesPlayed, 50] },
  { id: 'sampler', name: 'SAMPLER PLATTER', desc: 'Try 5 different games.', icon: '🍱', tokens: 60, check: (s) => played(s) >= 5, progress: (s) => [played(s), 5] },
  { id: 'completionist', name: 'ARCADE TOURIST', desc: 'Play all 10 games.', icon: '🗺️', tokens: 150, check: (s) => played(s) >= 10, progress: (s) => [played(s), 10] },
  { id: 'speed-demon', name: 'SPEED DEMON', desc: 'Get under 250ms reaction time.', icon: '⚡', tokens: 100, check: (s) => s.stats.bestReactionMs !== null && s.stats.bestReactionMs < 250 },
  { id: 'not-human', name: 'ARE YOU EVEN HUMAN?', desc: 'Get under 180ms reaction time.', icon: '🤖', tokens: 200, check: (s) => s.stats.bestReactionMs !== null && s.stats.bestReactionMs < 180 },
  { id: 'button-masochist', name: 'BUTTON MASOCHIST', desc: 'Click 1,000 buttons.', icon: '🔘', tokens: 150, check: (s) => s.stats.buttonsClicked >= 1000, progress: (s) => [s.stats.buttonsClicked, 1000] },
  { id: 'duck-curious', name: 'DUCK CURIOUS', desc: 'Catch 25 ducks.', icon: '🐣', tokens: 40, check: (s) => s.stats.ducksCaught >= 25, progress: (s) => [s.stats.ducksCaught, 25] },
  { id: 'duck-lord', name: 'DUCK LORD', desc: 'Catch 100 ducks.', icon: '🦆', tokens: 150, check: (s) => s.stats.ducksCaught >= 100, progress: (s) => [s.stats.ducksCaught, 100] },
  { id: 'combo-10', name: 'COMBO STARTER', desc: 'Reach a 10x combo.', icon: '🔥', tokens: 30, check: (s) => s.stats.maxCombo >= 10, progress: (s) => [s.stats.maxCombo, 10] },
  { id: 'combo-king', name: 'COMBO KING', desc: 'Reach a 50x combo.', icon: '👑', tokens: 200, check: (s) => s.stats.maxCombo >= 50, progress: (s) => [s.stats.maxCombo, 50] },
  { id: 'jackpot', name: 'JACKPOT', desc: 'Win the jackpot on Spin to Win.', icon: '💰', tokens: 0, check: (s) => s.stats.jackpots >= 1 },
  { id: 'spinner', name: 'DIZZY', desc: 'Spin the wheel 10 times.', icon: '🌀', tokens: 50, check: (s) => s.stats.spins >= 10, progress: (s) => [s.stats.spins, 10] },
  { id: 'boss-slayer', name: 'BOSS SLAYER', desc: 'Defeat the Ultimate Fall Fest Boss.', icon: '⚔️', tokens: 150, check: (s) => s.stats.bossKills >= 1 },
  { id: 'locksmith', name: 'LOCKSMITH', desc: 'Smash open 50 lockers.', icon: '🔐', tokens: 80, check: (s) => s.stats.lockersOpened >= 50, progress: (s) => [s.stats.lockersOpened, 50] },
  { id: 'secret-locker', name: 'WHAT’S IN THE BOX', desc: 'Open a SECRET LOCKER.', icon: '🗝️', tokens: 50, check: (s) => s.stats.secretLockers >= 1 },
  { id: 'keyboard-warrior', name: 'KEYBOARD WARRIOR', desc: 'Type at 60+ WPM in Fall Fest Typer.', icon: '⌨️', tokens: 120, check: (s) => s.stats.bestWpm >= 60 },
  { id: 'skyscraper', name: 'SKYSCRAPER', desc: 'Stack 25 blocks in Fall Fest Stacker.', icon: '🏙️', tokens: 100, check: (s) => s.stats.bestStack >= 25, progress: (s) => [s.stats.bestStack, 25] },
  { id: 'big-brain', name: 'BIG BRAIN', desc: 'Reach round 12 in Memory Meltdown.', icon: '🧠', tokens: 120, check: (s) => s.stats.bestMemoryRound >= 12, progress: (s) => [s.stats.bestMemoryRound, 12] },
  { id: 'escape-artist', name: 'ESCAPE ARTIST', desc: 'Score 1,500+ in Dodge the Principal.', icon: '🏃', tokens: 100, check: (s) => (s.highScores['dodge-the-principal'] ?? 0) >= 1500 },
  { id: 'streak-3', name: 'ON A ROLL', desc: 'Visit 3 days in a row.', icon: '📅', tokens: 75, check: (s) => s.streak.count >= 3, progress: (s) => [s.streak.count, 3] },
  { id: 'daily-1', name: 'DAILY GRINDER', desc: 'Complete a Daily Challenge.', icon: '🎯', tokens: 40, check: (s) => s.stats.dailiesCompleted >= 1 },
  { id: 'shopper', name: 'DRIP CHECK', desc: 'Own 10 cosmetics.', icon: '🛍️', tokens: 60, check: (s) => s.cosmetics.owned.length >= 10, progress: (s) => [s.cosmetics.owned.length, 10] },
  { id: 'level-5', name: 'WARMED UP', desc: 'Reach level 5.', icon: '⭐', tokens: 50, check: (s) => levelFromXp(s.xp) >= 5 },
  { id: 'level-10', name: 'DOUBLE DIGITS', desc: 'Reach level 10.', icon: '🌟', tokens: 150, check: (s) => levelFromXp(s.xp) >= 10 },
  { id: 'legend', name: 'LEGEND', desc: 'Reach level 25.', icon: '🏆', tokens: 500, check: (s) => levelFromXp(s.xp) >= 25, progress: (s) => [levelFromXp(s.xp), 25] },
  { id: 'rich', name: 'TOKEN TYCOON', desc: 'Hold 2,000 Fest Tokens at once.', icon: '🪙', tokens: 100, check: (s) => s.tokens >= 2000, progress: (s) => [s.tokens, 2000] },
  // Secrets, hidden until found
  { id: 'secret-logo', name: 'LOGO MASHER', desc: 'Clicked the logo way too many times.', icon: '🖱️', tokens: 50, secret: true, check: (s) => s.stats.secretsFound.includes('logo') },
  { id: 'secret-konami', name: 'OLD SCHOOL', desc: 'Entered the ancient code.', icon: '🎮', tokens: 100, secret: true, check: (s) => s.stats.secretsFound.includes('konami') },
  { id: 'secret-duck', name: 'THE CHOSEN DUCK', desc: 'Found the duck hiding in plain sight.', icon: '🐥', tokens: 75, secret: true, check: (s) => s.stats.secretsFound.includes('duck') },
  { id: 'secret-button', name: 'DO NOT PRESS', desc: 'Pressed the button you weren’t supposed to.', icon: '🔴', tokens: 75, secret: true, check: (s) => s.stats.secretsFound.includes('button') },
  { id: 'secret-all', name: 'SECRET MODE MASTER', desc: 'Found every secret.', icon: '🕵️', tokens: 300, secret: true, check: (s) => ['logo', 'konami', 'duck', 'button'].every((k) => s.stats.secretsFound.includes(k)) },
]

export function getAchievement(id: string) {
  return ACHIEVEMENTS.find((a) => a.id === id)
}
