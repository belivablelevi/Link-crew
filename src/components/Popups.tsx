import { useCallback, useRef, useState, type CSSProperties } from 'react'

interface Popup {
  id: number
  text: string
  x: number
  y: number
  color: string
  size: number
}

/**
 * Floating "+100" / "INSANE!" text for games. Coordinates are relative to the
 * positioned parent you render <PopupLayer/> in.
 */
export function usePopups() {
  const [items, setItems] = useState<Popup[]>([])
  const id = useRef(0)
  const spawn = useCallback((text: string, x: number, y: number, color = 'var(--color-yellow)', size = 28) => {
    const p = { id: id.current++, text, x, y, color, size }
    setItems((s) => [...s.slice(-14), p])
    setTimeout(() => setItems((s) => s.filter((i) => i.id !== p.id)), 950)
  }, [])
  const layer = (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-30" aria-hidden>
      {items.map((p) => (
        <div key={p.id} className="popup-text" style={{ left: p.x, top: p.y, color: p.color, fontSize: p.size } as CSSProperties}>
          {p.text}
        </div>
      ))}
    </div>
  )
  return { spawn, layer }
}
