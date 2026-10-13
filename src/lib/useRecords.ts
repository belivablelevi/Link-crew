import { useEffect, useState } from 'react'
import type { GameId } from './types'
import { leaderboard } from './leaderboard'

type Records = Partial<Record<GameId, number>>
let cache: Records | null = null
let lastFetch = 0
const listeners = new Set<(r: Records) => void>()

async function refresh() {
  if (Date.now() - lastFetch < 30_000) return
  lastFetch = Date.now()
  try {
    cache = await leaderboard.records()
    listeners.forEach((l) => l(cache!))
  } catch {
    /* offline or not set up yet: cards just won't show a school best */
  }
}

/** Force the next useRecords() to refetch (e.g. right after you finish a game). */
export function invalidateRecords() {
  lastFetch = 0
}

/** Best score per game across the whole school (or this device in local mode). */
export function useRecords(): Records | null {
  const [records, setRecords] = useState<Records | null>(cache)
  useEffect(() => {
    listeners.add(setRecords)
    void refresh()
    return () => {
      listeners.delete(setRecords)
    }
  }, [])
  return records
}
