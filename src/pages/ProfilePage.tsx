import { useState, type CSSProperties } from 'react'
import { buyCosmetic, equipCosmetic, resetProgress, setUsername, updateSettings, useStore } from '../state/store'
import { COSMETICS, COSMETIC_KIND_LABEL, type Cosmetic } from '../lib/cosmetics'
import type { CosmeticKind } from '../lib/types'
import { levelFromXp } from '../lib/progression'
import { ACHIEVEMENTS } from '../lib/achievements'
import { GAMES, getGame } from '../games/meta'
import { PlayerBadge } from '../components/Profile'
import { XPBar } from '../components/XPBar'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { fx } from '../lib/fx'
import { play } from '../lib/sound'
import { cleanName } from '../lib/names'
import { Icon } from '../components/Icon'

const KINDS: CosmeticKind[] = ['avatar', 'title', 'background', 'nameEffect', 'confetti']

function Preview({ c }: { c: Cosmetic }) {
  switch (c.kind) {
    case 'avatar':
      return <span className="text-4xl">{c.value}</span>
    case 'title':
      return <span className="font-pixel text-[0.65rem] text-pink text-center leading-relaxed px-1">{c.value}</span>
    case 'background':
      return <span className="block w-full h-full rounded-lg" style={{ background: c.value }} />
    case 'nameEffect':
      return <span className={`font-display text-lg ${c.value}`}>Abc</span>
    case 'confetti':
      return <span className="text-2xl">{{ classic: '🎊', leaves: '🍁', pixel: '🟪', ducks: '🦆', candy: '🍬' }[c.value] ?? '🎊'}</span>
  }
}

function Shop() {
  const [kind, setKind] = useState<CosmeticKind>('avatar')
  const owned = useStore((s) => s.cosmetics.owned)
  const equipped = useStore((s) => s.cosmetics.equipped)
  const tokens = useStore((s) => s.tokens)
  const items = COSMETICS.filter((c) => c.kind === kind)

  const act = (c: Cosmetic) => {
    if (owned.includes(c.id)) {
      equipCosmetic(c.kind, c.id)
      play('pop')
      if (c.kind === 'confetti') setTimeout(() => fx.confetti(90), 50)
      return
    }
    if (buyCosmetic(c.id)) {
      play('coin')
      fx.toast({ title: 'UNLOCKED!', body: `${c.name} equipped.`, tone: 'token' })
      fx.confetti(80)
    } else play('error')
  }

  return (
    <section className="panel p-4 sm:p-6" aria-label="Cosmetics locker">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="font-display text-2xl">YOUR LOCKER</h2>
        <span className="font-display text-yellow flex items-center gap-1.5"><Icon name="coin" size={18} /> {tokens.toLocaleString()}</span>
      </div>
      <div className="flex gap-2 scroll-x pb-2" role="tablist" aria-label="Cosmetic type">
        {KINDS.map((k) => (
          <button key={k} role="tab" aria-selected={kind === k} onClick={() => setKind(k)} className={`sticker shrink-0 rounded-xl px-3 h-10 font-display text-xs ${kind === k ? 'bg-pink text-bg -rotate-2' : 'bg-panel2 text-dim hover:text-ink'}`}>
            {COSMETIC_KIND_LABEL[k]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 min-[460px]:grid-cols-3 md:grid-cols-4 gap-3 mt-3">
        {items.map((c) => {
          const has = owned.includes(c.id)
          const on = equipped[c.kind] === c.id
          const levelLocked = !has && !!c.level
          const special = !has && !!c.special
          const afford = tokens >= c.cost
          let label = 'EQUIP'
          if (on) label = 'EQUIPPED'
          else if (levelLocked) label = `UNLOCKS AT LVL ${c.level}`
          else if (special) label = c.special === 'secret' ? 'SECRET' : c.special === 'jackpot' ? 'JACKPOT PRIZE' : 'SPIN PRIZE'
          else if (!has) label = `${c.cost} TOKENS`
          const disabled = on || levelLocked || special || (!has && !afford)
          return (
            <button
              key={c.id}
              onClick={() => act(c)}
              disabled={disabled && !on}
              aria-pressed={on}
              aria-label={`${c.name}. ${label}`}
              className={`rounded-2xl border-[3px] p-2 flex flex-col items-center gap-2 transition-transform ${on ? 'border-lime bg-lime/10' : 'border-[#2a4180] bg-bg/50 hover:-translate-y-1 hover:border-yellow'} ${disabled && !on ? 'opacity-55 hover:translate-y-0 hover:border-[#2a4180]' : ''}`}
            >
              <span className="h-16 w-full grid place-items-center rounded-xl bg-panel2 overflow-hidden p-1">
                <Preview c={c} />
              </span>
              <span className="font-display text-xs">{c.name}</span>
              <span className={`font-pixel text-[0.65rem] ${on ? 'text-lime' : has ? 'text-blue' : afford && !levelLocked && !special ? 'text-yellow' : 'text-dim'}`}>{label}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function Settings() {
  const settings = useStore((s) => s.settings)
  const [confirm, setConfirm] = useState(false)
  return (
    <section className="panel p-4 sm:p-6" aria-label="Settings">
      <h2 className="font-display text-2xl mb-4">SETTINGS</h2>
      <div className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <span className="font-display text-sm">SOUND</span>
          <Button size="sm" color={settings.sound ? 'lime' : 'ghost'} aria-pressed={settings.sound} onClick={() => updateSettings({ sound: !settings.sound })}>
            {settings.sound ? 'ON' : 'OFF'}
          </Button>
        </div>
        <label className="grid gap-2">
          <span className="font-display text-sm flex justify-between">
            VOLUME <span className="text-dim">{Math.round(settings.volume * 100)}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            onChange={(e) => updateSettings({ volume: Number(e.target.value) })}
            onPointerUp={() => play('coin')}
            className="w-full accent-[#8ec2ff] h-8"
            disabled={!settings.sound}
          />
        </label>
        <div className="grid gap-2">
          <span className="font-display text-sm">MOTION</span>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Motion">
            {(
              [
                ['system', 'AUTO'],
                ['full', 'FULL'],
                ['reduced', 'CALM'],
              ] as const
            ).map(([v, l]) => (
              <button key={v} role="radio" aria-checked={settings.motion === v} onClick={() => updateSettings({ motion: v })} className={`sticker rounded-xl h-10 font-display text-xs ${settings.motion === v ? 'bg-blue text-bg' : 'bg-panel2 text-dim'}`}>
                {l}
              </button>
            ))}
          </div>
          <span className="text-xs text-dim">CALM turns off shakes, confetti and most animation. AUTO follows your device setting.</span>
        </div>
        <Button color="red" size="sm" onClick={() => setConfirm(true)} className="justify-self-start">
          RESET ALL PROGRESS
        </Button>
      </div>
      <Modal open={confirm} onClose={() => setConfirm(false)} title="WIPE EVERYTHING?" color="var(--color-red)">
        <p className="text-dim">Level, XP, tokens, high scores, achievements and cosmetics on this device will be deleted. This can&apos;t be undone.</p>
        <div className="flex gap-3 mt-5">
          <Button color="red" onClick={() => (resetProgress(), setConfirm(false), fx.toast({ title: 'FRESH START', body: 'All progress reset.', tone: 'warn' }))}>
            YES, RESET
          </Button>
          <Button color="ghost" onClick={() => setConfirm(false)}>
            NEVERMIND
          </Button>
        </div>
      </Modal>
    </section>
  )
}

function NameEditor() {
  const name = useStore((s) => s.username)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)
  const [err, setErr] = useState('')
  if (!editing)
    return (
      <Button size="sm" color="ghost" onClick={() => (setValue(name), setEditing(true))}>
        RENAME
      </Button>
    )
  return (
    <form
      className="flex flex-wrap gap-2 items-start"
      onSubmit={(e) => {
        e.preventDefault()
        const res = cleanName(value)
        if (!res.ok) return setErr(res.error)
        setUsername(res.name)
        setEditing(false)
        setErr('')
      }}
    >
      <label className="sr-only" htmlFor="rename">
        New name
      </label>
      <input id="rename" autoFocus value={value} maxLength={16} onChange={(e) => setValue(e.target.value)} className="sticker rounded-xl bg-bg px-3 h-10 font-display text-sm w-44" />
      <Button size="sm" color="lime" type="submit">
        SAVE
      </Button>
      <Button size="sm" color="ghost" onClick={() => setEditing(false)}>
        ✕
      </Button>
      {err && <div className="w-full text-sm text-red">{err}</div>}
    </form>
  )
}

export default function ProfilePage() {
  const s = useStore((st) => st)
  const bg = COSMETICS.find((c) => c.id === s.cosmetics.equipped.background)?.value
  const fav = Object.entries(s.playsByGame).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]
  const favGame = fav ? getGame(fav[0]) : undefined
  // "Best score" = your single highest score in any game.
  const bestEntry = GAMES.filter((g) => !g.custom && s.highScores[g.id])
    .map((g) => ({ g, score: s.highScores[g.id]! }))
    .sort((a, b) => b.score - a.score)[0]
  const unlocked = ACHIEVEMENTS.filter((a) => s.achievements[a.id])

  const stats: [string, string, string][] = [
    ['LEVEL', String(levelFromXp(s.xp)), 'var(--color-purple)'],
    ['TOTAL XP', s.xp.toLocaleString(), 'var(--color-lime)'],
    ['TOKENS', s.tokens.toLocaleString(), 'var(--color-yellow)'],
    ['GAMES PLAYED', s.gamesPlayed.toLocaleString(), 'var(--color-blue)'],
    ['TOTAL SCORE', s.totalScore.toLocaleString(), 'var(--color-pink)'],
    ['BEST SCORE', bestEntry ? `${bestEntry.score.toLocaleString()} (${bestEntry.g.name})` : '-', 'var(--color-orange)'],
    ['BADGES', `${unlocked.length}/${ACHIEVEMENTS.length}`, 'var(--color-yellow)'],
    ['FAVORITE', favGame ? favGame.name : '-', 'var(--color-pink)'],
    ['STREAK', `${s.streak.count} DAY${s.streak.count === 1 ? '' : 'S'}`, 'var(--color-orange)'],
    ['BEST REACTION', s.stats.bestReactionMs ? `${s.stats.bestReactionMs}ms` : '-', 'var(--color-lime)'],
    ['DUCKS CAUGHT', s.stats.ducksCaught.toLocaleString(), 'var(--color-yellow)'],
    ['MAX COMBO', `${s.stats.maxCombo}x`, 'var(--color-pink)'],
  ]

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-5 pt-8 grid grid-cols-[minmax(0,1fr)] gap-5">
      <section className="relative rounded-[28px] border-[3px] border-bg overflow-hidden shadow-[0_8px_0_#030814]" style={{ background: bg }}>
        <div className="absolute inset-0 bg-gradient-to-t from-bg/90 via-bg/50 to-transparent" />
        <div className="relative p-5 sm:p-8 grid gap-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <PlayerBadge size="lg" />
            <NameEditor />
          </div>
          <XPBar xp={s.xp} />
        </div>
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" aria-label="Stats">
        {stats.map(([k, v, c]) => (
          <div key={k} className="panel p-3 sm:p-4">
            <div className="font-pixel text-[0.65rem] text-dim">{k}</div>
            <div className="font-display text-base sm:text-xl mt-1 truncate" style={{ color: c } as CSSProperties} title={v}>
              {v}
            </div>
          </div>
        ))}
      </section>

      <section className="panel p-4 sm:p-6" aria-label="Recent achievements">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-display text-2xl">BADGES</h2>
          <a href="#/achievements" className="font-pixel text-[0.72rem] text-blue hover:underline">
            SEE ALL →
          </a>
        </div>
        {unlocked.length === 0 ? (
          <p className="text-dim">No badges yet. Play literally anything to get your first one.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {unlocked.map((a) => (
              <span key={a.id} className="sticker rounded-xl bg-yellow text-bg px-2.5 py-1.5 font-display text-xs flex items-center gap-1.5" title={a.desc}>
                <span aria-hidden>{a.icon}</span> {a.name}
              </span>
            ))}
          </div>
        )}
      </section>

      <Shop />
      <Settings />
    </div>
  )
}
