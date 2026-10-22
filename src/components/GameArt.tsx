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
    case 'leaf-catcher':
      return (
        <div className={wrap}>
          {[
            [22, 10, '#e2412d', 0],
            [55, 4, '#ffc72c', 0.7],
            [76, 16, '#f28c1f', 1.4],
          ].map(([x, y, c, d], i) => (
            <svg key={i} viewBox="-20 -20 40 40" className="absolute" style={{ left: `${x}%`, top: `${y}%`, width: 28 * s, height: 28 * s, ...a('float', 2.4, d as number) }} aria-hidden>
              <path d="M0-18L4-8 14-11 10-2 18 3 6 6 5 13 0 9-5 13-6 6-18 3-10-2-14-11-4-8Z" fill={c as string} stroke="#071022" strokeWidth="2.5" />
            </svg>
          ))}
          <div className="absolute bottom-3 rounded-b-xl sticker" style={{ width: 70 * s, height: 30 * s, background: '#c98a3f', ...a('chase', 2.4) }} />
        </div>
      )
    case 'goose-flight':
      return (
        <div className={wrap}>
          <div className="absolute left-[18%] top-0 sticker" style={{ width: 30 * s, height: '34%', background: '#2f6bff' }} />
          <div className="absolute left-[18%] bottom-0 sticker" style={{ width: 30 * s, height: '30%', background: '#2f6bff' }} />
          <div className="absolute right-[14%] top-0 sticker" style={{ width: 30 * s, height: '22%', background: '#2f6bff' }} />
          <div className="absolute right-[14%] bottom-0 sticker" style={{ width: 30 * s, height: '42%', background: '#2f6bff' }} />
          <svg viewBox="-30 -30 72 60" style={{ width: 64 * s, height: 54 * s, ...a('float', 1.2) }} aria-hidden>
            <ellipse cx="0" cy="0" rx="20" ry="13" fill="#8b6b4a" stroke="#071022" strokeWidth="2.5" />
            <path d="M12-4Q22-12 24-20" stroke="#111" strokeWidth="7" strokeLinecap="round" fill="none" />
            <ellipse cx="27" cy="-22" rx="7" ry="5.5" fill="#111" />
            <ellipse cx="25" cy="-19" rx="3.5" ry="2.5" fill="#fff" />
            <path d="M33-24L41-21 33-19Z" fill="#f2a900" stroke="#071022" strokeWidth="1.5" />
            <path d="M-6-4Q-4-30 10-26Q6-10 8-2Z" fill="#6b5136" stroke="#071022" strokeWidth="2.5" />
          </svg>
        </div>
      )
    case 'plinko':
      return (
        <div className={wrap}>
          <svg viewBox="0 0 120 90" style={{ width: 130 * s, height: 98 * s }} aria-hidden>
            {[0, 1, 2, 3].map((r) =>
              [0, 1, 2, 3, 4, 5].map((c) => {
                const x = 12 + c * 19 + (r % 2 ? 9.5 : 0)
                return x < 115 ? <circle key={`${r}-${c}`} cx={x} cy={14 + r * 14} r="2.6" fill="#8ec2ff" /> : null
              }),
            )}
            {[100, 20, 5, 20, 100].map((v, i) => (
              <g key={i}>
                <rect x={2 + i * 23.2} y="70" width="21" height="16" rx="2" fill={v === 100 ? '#ffc72c' : v === 20 ? '#4fb3ff' : '#1b2d5c'} stroke="#071022" strokeWidth="1.5" />
                <text x={12.5 + i * 23.2} y="81.5" textAnchor="middle" fontSize="8" fontWeight="800" fontFamily="Outfit, sans-serif" fill={v === 100 ? '#071022' : '#fff'}>
                  {v}
                </text>
              </g>
            ))}
            <g style={a('hop', 2.6)}>
              <ellipse cx="40" cy="8" rx="6" ry="5.3" fill="#f28c1f" stroke="#071022" strokeWidth="1.5" />
              <rect x="39" y="1" width="2" height="3" fill="#3a7d1a" />
            </g>
          </svg>
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
