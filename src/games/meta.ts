import type { GameId, Rewards } from '../lib/types'

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'CHAOS'

export interface GameMeta {
  id: GameId
  name: string
  tagline: string
  icon: string
  difficulty: Difficulty
  /** Accent colour used for the card + shell. */
  color: string
  /** Second accent for gradients. */
  color2: string
  howTo: string[]
  controls: string
  scoreLabel: string
  /** Turns a final score into XP + tokens. */
  reward: (score: number) => Rewards
  /** Spin to Win runs its own flow instead of the standard intro/countdown/game-over loop. */
  custom?: boolean
}

const scaled = (scale: number, cap = 260) => (score: number): Rewards => {
  const xp = Math.max(10, Math.min(cap, Math.round(15 + Math.max(0, score) / scale)))
  return { xp, tokens: Math.round(xp / 3) + 5 }
}

export const GAMES: GameMeta[] = [
  {
    id: 'reaction-rush',
    name: 'REACTION RUSH',
    tagline: 'Wait for it… SLAM IT. How fast are your thumbs really?',
    icon: '⚡',
    difficulty: 'EASY',
    color: '#ffc72c',
    color2: '#f2a900',
    howTo: ['Wait for the big button to appear.', 'Tap it as fast as humanly possible.', 'Tap too early and your combo dies.', 'Later rounds: it moves. Good luck.'],
    controls: 'Tap / click / SPACE',
    scoreLabel: 'POINTS',
    reward: scaled(90),
  },
  {
    id: 'dodge-the-principal',
    name: 'DODGE THE PRINCIPAL',
    tagline: 'You’re late to class. THE PRINCIPAL is coming. RUN.',
    icon: '🏃',
    difficulty: 'MEDIUM',
    color: '#3ddc84',
    color2: '#4fb3ff',
    howTo: ['Move with WASD / arrow keys, or drag your finger.', 'Avoid THE PRINCIPAL and flying homework.', 'Grab coins fast to chain combos.', '⭐ = hall pass shield, ⏰ = slow-mo.'],
    controls: 'WASD / Arrows / Touch-drag',
    scoreLabel: 'POINTS',
    reward: scaled(12),
  },
  {
    id: 'locker-smash',
    name: 'LOCKER SMASH',
    tagline: 'Your locker is jammed. Again. Mash it open before the bell.',
    icon: '🔐',
    difficulty: 'EASY',
    color: '#4fb3ff',
    color2: '#2f6bff',
    howTo: ['Tap the locker as fast as you can.', 'Each locker type needs a different number of hits.', 'Bigger lockers = bigger loot.', 'Watch for the golden SECRET LOCKER.'],
    controls: 'Tap / click / SPACE',
    scoreLabel: 'POINTS',
    reward: scaled(14),
  },
  {
    id: 'fall-fest-stacker',
    name: 'FALL FEST STACKER',
    tagline: 'Stack hay bales to the sky. Miss and it gets chopped.',
    icon: '🏗️',
    difficulty: 'MEDIUM',
    color: '#f2a900',
    color2: '#8ec2ff',
    howTo: ['A block slides back and forth.', 'Tap to drop it on the tower.', 'Overhang gets sliced off.', 'Line it up perfectly for PERFECT combos.'],
    controls: 'Tap / click / SPACE',
    scoreLabel: 'POINTS',
    reward: scaled(4),
  },
  {
    id: 'memory-meltdown',
    name: 'MEMORY MELTDOWN',
    tagline: 'Watch the pattern. Repeat it. Try not to melt.',
    icon: '🧠',
    difficulty: 'MEDIUM',
    color: '#8ec2ff',
    color2: '#2f6bff',
    howTo: ['Watch the pads light up.', 'Repeat the sequence in order.', 'Every round adds one more step and speeds up.', 'One mistake = meltdown.'],
    controls: 'Tap pads / keys 1–4 (1–6 later)',
    scoreLabel: 'POINTS',
    reward: scaled(6),
  },
  {
    id: 'button-mayhem',
    name: 'BUTTON MAYHEM',
    tagline: 'Buttons everywhere. Some are lying to you.',
    icon: '🔘',
    difficulty: 'CHAOS',
    color: '#ff4d5e',
    color2: '#ffc72c',
    howTo: ['Hit buttons before they vanish.', 'Each hit builds your combo.', 'DON’T hit the ☠ fake ones.', 'Gold buttons = big bonus. 3 misses and you’re out.'],
    controls: 'Tap / click',
    scoreLabel: 'POINTS',
    reward: scaled(16),
  },
  {
    id: 'fall-fest-typer',
    name: 'FALL FEST TYPER',
    tagline: 'Type LISGAR faster than you can spell it. 45 seconds.',
    icon: '⌨️',
    difficulty: 'MEDIUM',
    color: '#2f6bff',
    color2: '#4fb3ff',
    howTo: ['Type the glowing word.', 'Words auto-advance the moment you finish them.', 'Mistakes break your combo.', 'Clean streaks multiply your score.'],
    controls: 'Keyboard (mobile keyboard works too)',
    scoreLabel: 'POINTS',
    reward: scaled(25),
  },
  {
    id: 'catch-the-duck',
    name: 'CATCH THE DUCK',
    tagline: 'The duck is loose. The duck is fast. The duck must be caught.',
    icon: '🦆',
    difficulty: 'EASY',
    color: '#ffc72c',
    color2: '#3ddc84',
    howTo: ['Tap ducks before they hop away.', 'Normal +1 · Golden +10 · Diamond +50.', 'Fake ducks (purple, with the DECOY tag) are −10!', '30 seconds. Go.'],
    controls: 'Tap / click',
    scoreLabel: 'POINTS',
    reward: scaled(0.7),
  },
  {
    id: 'spin-to-win',
    name: 'SPIN TO WIN',
    tagline: 'Free spin. Big prizes. Maybe a JACKPOT. No cost, ever.',
    icon: '🎡',
    difficulty: 'EASY',
    color: '#f2a900',
    color2: '#ffc72c',
    howTo: ['Hit SPIN.', 'Win tokens, XP boosts, cosmetics or the JACKPOT.', 'One free spin every 15 minutes.', 'Level-ups give bonus spins.'],
    controls: 'Tap / click',
    scoreLabel: 'TOKENS',
    reward: () => ({ xp: 0, tokens: 0 }),
    custom: true,
  },
  {
    id: 'fall-fest-boss',
    name: 'FALL FEST BOSS',
    tagline: 'GOURDZILLA has taken over the cafeteria. Only you can stop it.',
    icon: '👹',
    difficulty: 'HARD',
    color: '#ff4d5e',
    color2: '#f2a900',
    howTo: ['Tap SLAP to attack. Fast taps build combo.', 'New attacks unlock as the fight goes on.', 'When the boss winds up, hit BLOCK!', 'Beat it in 75 seconds for a huge bonus.'],
    controls: 'Tap / click · keys 1–4 + SPACE to block',
    scoreLabel: 'DAMAGE',
    reward: scaled(180),
  },
]

export function getGame(id: string): GameMeta | undefined {
  return GAMES.find((g) => g.id === id)
}

/** Featured game rotates daily (skips the wheel). */
export function featuredGame(day: string): GameMeta {
  const pool = GAMES.filter((g) => !g.custom)
  let h = 7
  for (const ch of day) h = (h * 17 + ch.charCodeAt(0)) >>> 0
  return pool[h % pool.length]
}
