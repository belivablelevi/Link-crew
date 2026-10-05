import type { GameResult } from '../lib/types'

/** Every game component receives exactly this. Call onEnd once when the run is over. */
export interface GameProps {
  onEnd: (result: GameResult) => void
}
