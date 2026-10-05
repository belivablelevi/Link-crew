import type { CSSProperties } from 'react'
import { GAMES, featuredGame } from '../games/meta'
import { GameCard } from '../components/GameCard'
import { GameArt } from '../components/GameArt'
import { ProfileCard } from '../components/Profile'
import { DailyChallenge } from '../components/DailyChallenge'
import { Button, LinkButton } from '../components/Button'
import { href, navigate } from '../lib/router'
import { todayKey } from '../lib/daily'
import { useStore } from '../state/store'
import { triggerSecret } from '../lib/secrets'
import { play } from '../lib/sound'
import { EVENT_INFO } from '../lib/eventInfo'

const MARQUEE = ['PLAY.', 'COMPETE.', 'DOMINATE.', '★', 'ONE MORE GAME.', '★', 'BEAT THE HIGH SCORE.', '★', 'YOU’RE IN.', '★']

function Marquee() {
  const items = [...MARQUEE, ...MARQUEE]
  return (
    <div className="relative -mx-3 sm:-mx-5 overflow-hidden border-y-[3px] border-bg bg-yellow text-bg -rotate-1 my-2" aria-hidden>
      <div className="marquee-track py-2">
        {items.concat(items).map((t, i) => (
          <span key={i} className="font-display text-lg px-4 whitespace-nowrap">
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}

function Hero() {
  const featured = featuredGame(todayKey())
  const played = useStore((s) => s.gamesPlayed)
  return (
    <section className="relative text-center pt-8 sm:pt-14 pb-8">
      {/* sticker decorations */}
      <div className="absolute left-0 sm:left-6 top-6 text-5xl sm:text-6xl anim-float" style={{ '--r': '-12deg' } as CSSProperties} aria-hidden>
        🎃
      </div>
      <div className="absolute right-0 sm:right-8 top-10 text-5xl sm:text-6xl anim-float" style={{ '--r': '10deg', animationDelay: '.6s' } as CSSProperties} aria-hidden>
        🕹️
      </div>
      <div className="absolute left-[8%] bottom-10 text-4xl anim-float hidden sm:block" style={{ '--r': '8deg', animationDelay: '1.1s' } as CSSProperties} aria-hidden>
        🍁
      </div>
      <div className="absolute right-[10%] bottom-16 text-4xl anim-float hidden sm:block" style={{ '--r': '-6deg', animationDelay: '.3s' } as CSSProperties} aria-hidden>
        🏆
      </div>

      <div className="inline-block font-pixel text-[0.6rem] sm:text-xs bg-pink text-white px-3 py-2 rounded-lg sticker -rotate-2 mb-4">{played ? 'WELCOME BACK. YOU’RE IN.' : 'YOU’RE IN.'}</div>
      <h1 className="font-display leading-[0.85] select-none">
        <span className="block title-outline text-yellow text-[clamp(3.5rem,15vw,9rem)] -rotate-2">LINK CREW</span>
        <span className="block title-outline text-[clamp(3rem,13vw,8rem)] rotate-1 fx-rainbow" style={{ WebkitTextStroke: '0' }}>
          FALL FEST
        </span>
      </h1>
      <p className="font-display text-base sm:text-xl text-blue mt-4 tracking-wide">THE SCHOOL&apos;S BIGGEST GAME HUB</p>
      <p className="font-pixel text-[0.6rem] sm:text-xs text-dim mt-3">PLAY. COMPETE. DOMINATE.</p>
      <div className="mt-8">
        <Button
          mega
          onClick={() => {
            play('whoosh')
            navigate(`/games/${featured.id}`)
          }}
        >
          ▶ PLAY NOW
        </Button>
      </div>
      <a href={href('/games')} className="inline-block mt-6 font-pixel text-[0.55rem] text-dim hover:text-yellow">
        OR BROWSE ALL {GAMES.length} GAMES ↓
      </a>
      <a href="#event" onClick={(e) => (e.preventDefault(), document.getElementById('event')?.scrollIntoView({ behavior: 'smooth' }))} className="block mt-3 font-pixel text-[0.55rem] text-orange hover:text-yellow">
        WHAT IS FALL FEST? ↓
      </a>
    </section>
  )
}

function Featured() {
  const g = featuredGame(todayKey())
  const best = useStore((s) => s.highScores[g.id] ?? 0)
  const plays = useStore((s) => s.playsByGame[g.id] ?? 0)
  return (
    <section aria-label="Featured game">
      <h2 className="font-display text-2xl sm:text-3xl mb-3 flex items-center gap-2">
        <span className="text-pink">★</span> FEATURED GAME
        <span className="tag ml-2" style={{ '--c': 'var(--color-pink)' } as CSSProperties}>TODAY ONLY</span>
      </h2>
      <div className="card-game grid md:grid-cols-2" style={{ '--c': g.color, '--c2': g.color2 } as CSSProperties}>
        <div className="relative min-h-[220px] md:min-h-[300px] border-b-[3px] md:border-b-0 md:border-r-[3px] border-bg overflow-hidden" style={{ background: `conic-gradient(from 0deg at 50% 50%, ${g.color}33, ${g.color2}55, ${g.color}33, ${g.color2}55, ${g.color}33)` }}>
          <div className="absolute inset-[-50%] anim-spin-slow opacity-40" style={{ background: `repeating-conic-gradient(${g.color}44 0 12deg, transparent 12deg 24deg)` }} aria-hidden />
          <GameArt id={g.id} big />
        </div>
        <div className="p-5 sm:p-7 flex flex-col">
          <div className="flex items-center gap-3">
            <span className="sticker grid place-items-center w-14 h-14 rounded-2xl text-3xl -rotate-6" style={{ background: g.color }} aria-hidden>
              {g.icon}
            </span>
            <h3 className="font-display text-3xl sm:text-4xl leading-none" style={{ color: g.color }}>
              {g.name}
            </h3>
          </div>
          <p className="text-dim mt-3 text-lg leading-snug">{g.tagline}</p>
          <div className="grid grid-cols-2 gap-2 mt-5 text-center">
            <div className="rounded-xl bg-bg/60 p-2">
              <div className="font-pixel text-[0.45rem] text-dim">YOUR BEST</div>
              <div className="font-display text-lg" style={{ color: g.color }}>
                {best ? best.toLocaleString() : '—'}
              </div>
            </div>
            <div className="rounded-xl bg-bg/60 p-2">
              <div className="font-pixel text-[0.45rem] text-dim">YOU PLAYED</div>
              <div className="font-display text-lg">{plays}×</div>
            </div>
          </div>
          <LinkButton href={href(`/games/${g.id}`)} color="yellow" size="lg" className="mt-5 md:mt-auto">
            ▶ {best ? 'BEAT YOUR BEST' : 'PLAY'}
          </LinkButton>
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    ['🎮', 'PLAY GAMES'],
    ['⭐', 'EARN XP'],
    ['🪙', 'EARN TOKENS'],
    ['🏅', 'UNLOCK BADGES'],
    ['🏆', 'CLIMB THE BOARD'],
  ]
  return (
    <section className="panel p-4 sm:p-6" aria-label="How it works">
      <h2 className="font-display text-xl mb-4">HOW IT WORKS</h2>
      <ol className="flex flex-wrap items-center gap-2">
        {steps.map(([icon, label], i) => (
          <li key={label} className="flex items-center gap-2">
            <span className="sticker rounded-xl bg-panel2 px-3 py-2 font-display text-xs sm:text-sm flex items-center gap-2">
              <span className="text-xl" aria-hidden>
                {icon}
              </span>
              {label}
            </span>
            {i < steps.length - 1 && (
              <span className="font-display text-yellow" aria-hidden>
                →
              </span>
            )}
          </li>
        ))}
      </ol>
      <p className="text-sm text-dim mt-4">Everything is free. Tokens are just for fun cosmetics — no real money, ever.</p>
    </section>
  )
}

function EventInfo() {
  return (
    <section id="event" className="panel p-5 sm:p-8 relative overflow-hidden scroll-mt-20" aria-labelledby="event-title">
      <div className="font-pixel text-[0.55rem] text-orange">THE EVENT</div>
      <h2 id="event-title" className="font-display text-3xl sm:text-4xl mt-1">
        ABOUT <span className="text-orange">FALL FEST</span>
      </h2>
      <p className="text-dim mt-1">{EVENT_INFO.tagline}</p>

      <dl className="grid grid-cols-3 gap-2 mt-5">
        {[
          ['📅', 'DATE', EVENT_INFO.date],
          ['⏰', 'TIME', EVENT_INFO.time],
          ['📍', 'WHERE', EVENT_INFO.location],
        ].map(([icon, k, v]) => (
          <div key={k} className="rounded-xl bg-bg/60 border-2 border-[#3a2766] p-3">
            <dt className="font-pixel text-[0.45rem] text-dim">
              <span aria-hidden>{icon}</span> {k}
            </dt>
            <dd className="font-display text-sm sm:text-base mt-1 break-words">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <div className="grid gap-3 content-start">
          {EVENT_INFO.about.map((p) => (
            <p key={p} className="leading-relaxed text-ink/90">
              {p}
            </p>
          ))}
        </div>
        <div>
          <h3 className="font-display text-lg mb-3">WHAT&apos;S HAPPENING</h3>
          <ul className="grid sm:grid-cols-2 gap-2">
            {EVENT_INFO.happenings.map((h) => (
              <li key={h.title} className="rounded-xl bg-bg/60 border-2 border-[#3a2766] p-3">
                <div className="font-display text-sm">
                  <span aria-hidden className="mr-1.5">
                    {h.icon}
                  </span>
                  {h.title}
                </div>
                <p className="text-sm text-dim mt-1 leading-snug">{h.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="font-display text-lg mb-3">QUESTIONS</h3>
        <div className="grid gap-2">
          {EVENT_INFO.faq.map((f) => (
            <details key={f.q} className="rounded-xl bg-bg/60 border-2 border-[#3a2766] px-4 py-3 group">
              <summary className="font-display text-sm cursor-pointer list-none flex justify-between items-center gap-3">
                {f.q}
                <span className="text-orange transition-transform group-open:rotate-45" aria-hidden>
                  +
                </span>
              </summary>
              <p className="text-dim text-sm mt-2">{f.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* Easter egg: the chosen duck. It's tiny and just sits there. */}
      <button
        className="absolute right-3 bottom-2 text-base opacity-40 hover:opacity-100 hover:scale-150 transition-transform"
        aria-label="A suspicious duck"
        onClick={() => triggerSecret('duck')}
      >
        🦆
      </button>
    </section>
  )
}

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-5">
      <Hero />
      <Marquee />
      <div className="mt-8">
        <EventInfo />
      </div>
      <div className="grid lg:grid-cols-[1fr_1.1fr] gap-4 mt-8">
        <ProfileCard />
        <DailyChallenge />
      </div>
      <div className="mt-10">
        <Featured />
      </div>
      <section className="mt-12" aria-label="All games">
        <div className="flex items-end justify-between mb-4">
          <h2 className="font-display text-2xl sm:text-3xl">ALL GAMES</h2>
          <a href={href('/games')} className="font-pixel text-[0.55rem] text-blue hover:underline">
            ARCADE VIEW →
          </a>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {GAMES.map((g, i) => (
            <GameCard key={g.id} game={g} index={i} />
          ))}
        </div>
      </section>
      <div className="mt-12">
        <HowItWorks />
      </div>
    </div>
  )
}
