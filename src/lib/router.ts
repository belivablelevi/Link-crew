import { useSyncExternalStore } from 'react'

/**
 * Minimal hash router (#/games/catch-the-duck). Hash routing works on any static host
 * with zero server config — handy for a school deployment.
 */
function current(): string {
  const h = window.location.hash.replace(/^#/, '')
  return h.startsWith('/') ? h : '/'
}

function subscribe(fn: () => void) {
  window.addEventListener('hashchange', fn)
  return () => window.removeEventListener('hashchange', fn)
}

export function useRoute(): string {
  return useSyncExternalStore(subscribe, current, () => '/')
}

export function navigate(path: string) {
  if (current() === path) return
  window.location.hash = path
}

export function href(path: string) {
  return `#${path}`
}
