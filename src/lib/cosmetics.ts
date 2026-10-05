import type { CosmeticKind } from './types'

export interface Cosmetic {
  id: string
  kind: CosmeticKind
  name: string
  /** Emoji for avatars, display text for titles, CSS background for backgrounds, class for effects. */
  value: string
  /** Token price. 0 + no unlock rule = free starter item. */
  cost: number
  /** Unlocked automatically at this level (instead of buying). */
  level?: number
  /** Only obtainable from somewhere special (spin wheel, secrets). */
  special?: 'rare' | 'secret' | 'jackpot'
}

export const COSMETICS: Cosmetic[] = [
  // Avatars
  { id: 'av-duck', kind: 'avatar', name: 'Duck', value: '🦆', cost: 0 },
  { id: 'av-pumpkin', kind: 'avatar', name: 'Pumpkin', value: '🎃', cost: 0 },
  { id: 'av-fox', kind: 'avatar', name: 'Fox', value: '🦊', cost: 0, level: 2 },
  { id: 'av-leaf', kind: 'avatar', name: 'Leaf', value: '🍁', cost: 120 },
  { id: 'av-pizza', kind: 'avatar', name: 'Pizza', value: '🍕', cost: 150 },
  { id: 'av-alien', kind: 'avatar', name: 'Alien', value: '👾', cost: 250 },
  { id: 'av-robot', kind: 'avatar', name: 'Robot', value: '🤖', cost: 300 },
  { id: 'av-dragon', kind: 'avatar', name: 'Dragon', value: '🐉', cost: 0, level: 6 },
  { id: 'av-crown', kind: 'avatar', name: 'Royal', value: '👑', cost: 0, level: 10 },
  { id: 'av-ghost', kind: 'avatar', name: 'Ghost', value: '👻', cost: 400 },
  { id: 'av-unicorn', kind: 'avatar', name: 'Unicorn', value: '🦄', cost: 0, special: 'rare' },
  { id: 'av-goldduck', kind: 'avatar', name: 'Golden Duck', value: '🐥', cost: 0, special: 'secret' },

  // Titles
  { id: 'ti-rookie', kind: 'title', name: 'Rookie', value: 'FRESH RECRUIT', cost: 0 },
  { id: 'ti-linker', kind: 'title', name: 'Linker', value: 'CERTIFIED LINKER', cost: 0, level: 3 },
  { id: 'ti-spice', kind: 'title', name: 'Pumpkin Spice', value: 'PUMPKIN SPICE MENACE', cost: 200 },
  { id: 'ti-ducklord', kind: 'title', name: 'Duck Lord', value: 'LORD OF THE DUCKS', cost: 350 },
  { id: 'ti-tryhard', kind: 'title', name: 'Tryhard', value: 'PROFESSIONAL TRYHARD', cost: 300 },
  { id: 'ti-speed', kind: 'title', name: 'Speedy', value: 'FASTER THAN WIFI', cost: 0, level: 5 },
  { id: 'ti-boss', kind: 'title', name: 'Boss Slayer', value: 'BOSS SLAYER', cost: 0, level: 8 },
  { id: 'ti-legend', kind: 'title', name: 'Legend', value: 'HALL MONITOR’S NIGHTMARE', cost: 0, level: 12 },
  { id: 'ti-lucky', kind: 'title', name: 'Lucky', value: 'SUSPICIOUSLY LUCKY', cost: 0, special: 'rare' },
  { id: 'ti-jackpot', kind: 'title', name: 'Jackpot', value: 'JACKPOT ROYALTY', cost: 0, special: 'jackpot' },
  { id: 'ti-secret', kind: 'title', name: 'Secret', value: 'KNOWS THE SECRETS', cost: 0, special: 'secret' },

  // Profile backgrounds
  { id: 'bg-night', kind: 'background', name: 'Midnight', value: 'linear-gradient(135deg,#2b1055,#120826)', cost: 0 },
  { id: 'bg-harvest', kind: 'background', name: 'Harvest', value: 'linear-gradient(135deg,#ff7a1a,#c2185b)', cost: 0, level: 4 },
  { id: 'bg-lime', kind: 'background', name: 'Slime', value: 'linear-gradient(135deg,#3cff6e,#0f7c6b)', cost: 180 },
  { id: 'bg-ocean', kind: 'background', name: 'Neon Sea', value: 'linear-gradient(135deg,#00e1ff,#3b2bff)', cost: 220 },
  { id: 'bg-arcade', kind: 'background', name: 'Arcade Grid', value: 'repeating-linear-gradient(0deg,#ff2bd6 0 2px,transparent 2px 22px),repeating-linear-gradient(90deg,#ff2bd6 0 2px,transparent 2px 22px),#1a0633', cost: 350 },
  { id: 'bg-gold', kind: 'background', name: 'Gold Rush', value: 'linear-gradient(135deg,#ffe83d,#ff9f1a,#ffe83d)', cost: 0, level: 9 },
  { id: 'bg-rainbow', kind: 'background', name: 'Rainbow', value: 'linear-gradient(135deg,#ff2bd6,#ff9f1a,#ffe83d,#3cff6e,#00e1ff,#8b5cff)', cost: 0, special: 'rare' },

  // Name effects
  { id: 'ne-none', kind: 'nameEffect', name: 'Plain', value: '', cost: 0 },
  { id: 'ne-glow', kind: 'nameEffect', name: 'Neon Glow', value: 'fx-glow', cost: 150 },
  { id: 'ne-fire', kind: 'nameEffect', name: 'On Fire', value: 'fx-fire', cost: 250 },
  { id: 'ne-rainbow', kind: 'nameEffect', name: 'Rainbow', value: 'fx-rainbow', cost: 0, level: 7 },
  { id: 'ne-glitch', kind: 'nameEffect', name: 'Glitch', value: 'fx-glitch', cost: 400 },
  { id: 'ne-gold', kind: 'nameEffect', name: 'Gold', value: 'fx-gold', cost: 0, special: 'jackpot' },

  // Confetti styles
  { id: 'cf-classic', kind: 'confetti', name: 'Classic', value: 'classic', cost: 0 },
  { id: 'cf-leaves', kind: 'confetti', name: 'Fall Leaves', value: 'leaves', cost: 100 },
  { id: 'cf-pixel', kind: 'confetti', name: 'Pixels', value: 'pixel', cost: 0, level: 5 },
  { id: 'cf-ducks', kind: 'confetti', name: 'Ducks', value: 'ducks', cost: 250 },
  { id: 'cf-candy', kind: 'confetti', name: 'Candy', value: 'candy', cost: 200 },
]

export const COSMETIC_KIND_LABEL: Record<CosmeticKind, string> = {
  avatar: 'AVATARS',
  title: 'TITLES',
  background: 'BACKDROPS',
  nameEffect: 'NAME FX',
  confetti: 'CONFETTI',
}

export const STARTER_COSMETICS = COSMETICS.filter((c) => c.cost === 0 && !c.level && !c.special).map((c) => c.id)

export const DEFAULT_EQUIPPED: Record<CosmeticKind, string> = {
  avatar: 'av-duck',
  title: 'ti-rookie',
  background: 'bg-night',
  nameEffect: 'ne-none',
  confetti: 'cf-classic',
}

export function getCosmetic(id: string): Cosmetic | undefined {
  return COSMETICS.find((c) => c.id === id)
}

export function cosmeticValue(id: string, fallbackKind: CosmeticKind): string {
  return (getCosmetic(id) ?? getCosmetic(DEFAULT_EQUIPPED[fallbackKind])!).value
}

export function cosmeticsUnlockedAtLevel(level: number): Cosmetic[] {
  return COSMETICS.filter((c) => c.level === level)
}
