import type { CSSProperties } from 'react'
import type { GameId } from '../lib/types'

const a = (name: string, dur: number, delay = 0, extra = ''): CSSProperties => ({ animation: `${name} ${dur}s ${extra || 'ease-in-out'} ${delay}s infinite` })

/** Small animated scene for each game card, pure CSS/emoji, no images. */
export function GameArt({ id, big }: { id: GameId; big?: boolean }) {
  const s = big ? 1.5 : 1
  const wrap = 'absolute inset-0 grid place-items-center overflow-hidden'
  switch (id) {
    case 'reaction-rush':
      return (
        <div className={wrap}>
          <div className="rounded-full grid place-items-center sticker" style={{ width: 84 * s, height: 84 * s, background: 'radial-gradient(circle at 35% 30%,#ff8fa3,#ff4d5e 60%,#a3001c)', ...a('heartbeat', 1.1) }}>
            <span style={{ fontSize: 38 * s }}>⚡</span>
          </div>
        </div>
      )
    case 'dodge-the-principal':
      return (
        <div className={wrap}>
          <div className="flex items-center gap-6" style={{ fontSize: 40 * s }}>
            <span style={a('chase', 2.2)}>🏃</span>
            <span style={a('chase', 2.2, 0.35)} className="relative">
              👔<span className="absolute -top-3 left-1/2 -translate-x-1/2 font-pixel text-[0.65rem] text-red whitespace-nowrap">PRINCIPAL</span>
            </span>
          </div>
        </div>
      )
    case 'locker-smash':
      return (
        <div className={wrap}>
          <div className="sticker rounded-lg relative" style={{ width: 62 * s, height: 96 * s, background: 'linear-gradient(90deg,#1d8fbf,#38c6ff)', ...a('wobble', 0.5) }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="mx-2 mt-2 h-1.5 rounded bg-[#0b3b55]" />
            ))}
            <div className="absolute right-2 top-1/2 w-2 h-5 rounded bg-yellow border-2 border-bg" />
          </div>
        </div>
      )
    case 'fall-fest-stacker':
      return (
        <div className={wrap}>
          <div className="flex flex-col items-center gap-0.5">
            <div className="sticker rounded-md h-4" style={{ width: 70 * s, background: '#8ec2ff', ...a('slide-block', 1.4) }} />
            {['#f2a900', '#ffc72c', '#3ddc84', '#4fb3ff'].map((c, i) => (
              <div key={c} className="sticker rounded-md h-4" style={{ width: (70 + i * 4) * s, background: c, marginLeft: i % 2 ? 8 : -6 }} />
            ))}
          </div>
        </div>
      )
    case 'memory-meltdown':
      return (
        <div className={wrap}>
          <div className="grid grid-cols-2 gap-2">
            {['#8ec2ff', '#4fb3ff', '#3ddc84', '#ffc72c'].map((c, i) => (
              <div key={c} className="sticker rounded-xl grid place-items-center font-display text-bg" style={{ width: 38 * s, height: 38 * s, background: c, ...a('pad', 2.4, i * 0.6, 'linear') }}>
                {['★', '●', '▲', '◆'][i]}
              </div>
            ))}
          </div>
        </div>
      )
    case 'button-mayhem':
      return (
        <div className={wrap}>
          {[
            [20, 25, '#ff4d5e', 0],
            [62, 18, '#ffc72c', 0.4],
            [40, 60, '#3ddc84', 0.8],
            [75, 62, '#4fb3ff', 1.2],
            [12, 68, '#8ec2ff', 1.6],
          ].map(([x, y, c, d], i) => (
            <div key={i} className="absolute sticker rounded-full" style={{ left: `${x}%`, top: `${y}%`, width: 30 * s, height: 30 * s, background: c as string, ...a('popcycle', 2, d as number) }} />
          ))}
        </div>
      )
    case 'fall-fest-typer':
      return (
        <div className={wrap}>
          <div className="font-display text-ink" style={{ fontSize: 26 * s }}>
            <span className="text-lime">LIS</span>
            <span className="text-dim">GAR</span>
            <span className="anim-blink text-yellow">_</span>
          </div>
        </div>
      )
    case 'catch-the-duck':
      return (
        <div className={wrap}>
          <div className="-ml-16" style={{ fontSize: 46 * s, ...a('hop', 2.4) }}>
            🦆
          </div>
        </div>
      )
    case 'spin-to-win':
      return (
        <div className={wrap}>
          <div
            className="rounded-full sticker anim-spin-slow"
            style={{ width: 96 * s, height: 96 * s, animationDuration: '4s', background: 'conic-gradient(#8ec2ff 0 45deg,#ffc72c 0 90deg,#3ddc84 0 135deg,#4fb3ff 0 180deg,#f2a900 0 225deg,#2f6bff 0 270deg,#ff4d5e 0 315deg,#fff 0)' }}
          />
        </div>
      )
    case 'fall-fest-boss':
      return (
        <div className={wrap}>
          <div className="flex flex-col items-center">
            <div style={{ fontSize: 56 * s, ...a('heartbeat', 0.9) }}>👹</div>
            <div className="w-24 h-2.5 rounded-full bg-bg border-2 border-bg overflow-hidden mt-1">
              <div className="h-full bg-red" style={{ width: '70%' }} />
            </div>
          </div>
        </div>
      )
  }
}
