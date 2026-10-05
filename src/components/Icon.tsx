import type { CSSProperties } from 'react'

/** Small line-icon set (inline SVG, inherits text colour) used instead of emoji in the UI. */
export type IconName =
  | 'home'
  | 'gamepad'
  | 'trophy'
  | 'user'
  | 'medal'
  | 'coin'
  | 'flame'
  | 'volume'
  | 'volumeOff'
  | 'lock'
  | 'check'
  | 'pencil'
  | 'calendar'
  | 'clock'
  | 'pin'
  | 'close'
  | 'star'
  | 'arrowLeft'
  | 'play'

const PATHS: Record<IconName, string> = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  gamepad: 'M6 8h12a4 4 0 0 1 4 4v1a4 4 0 0 1-7 2.6L14 15h-4l-1 .6A4 4 0 0 1 2 13v-1a4 4 0 0 1 4-4zM8 10v4M6 12h4M15.5 11.5h.01M17.5 13.5h.01',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  medal: 'M8 3l2 6M16 3l-2 6M12 21a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 13v4M10.5 14.5L12 13',
  coin: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v10M9.5 9.5c0-1.2 1.1-2 2.5-2s2.5.8 2.5 2-1.1 1.7-2.5 2.1-2.5 1-2.5 2.2 1.1 2.2 2.5 2.2 2.5-.9 2.5-2',
  flame: 'M12 22a7 7 0 0 0 7-7c0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8a7 7 0 0 0 7 7z',
  volume: 'M4 9h4l5-4v14l-5-4H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12',
  volumeOff: 'M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6',
  lock: 'M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  pencil: 'M4 20l1-5L16 4l4 4L9 19zM14 6l4 4',
  calendar: 'M4 6h16v15H4zM4 10h16M8 3v5M16 3v5',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  pin: 'M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  close: 'M6 6l12 12M18 6L6 18',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  arrowLeft: 'M19 12H5M11 6l-6 6 6 6',
  play: 'M7 4.5v15l12-7.5z',
}

const FILLED: Partial<Record<IconName, boolean>> = { star: true, play: true }

export function Icon({ name, size = 18, className = '', style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  const filled = FILLED[name]
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block shrink-0 align-[-0.15em] ${className}`}
      style={style}
      aria-hidden
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
