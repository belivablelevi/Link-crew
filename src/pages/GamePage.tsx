import { Suspense } from 'react'
import { getGame } from '../games/meta'
import { GAME_COMPONENTS } from '../games/registry'
import { GameShell } from '../components/GameShell'
import NotFound from './NotFound'

export default function GamePage({ id }: { id: string }) {
  const meta = getGame(id)
  if (!meta) return <NotFound />
  const Game = GAME_COMPONENTS[meta.id]
  if (meta.custom) {
    return (
      <Suspense fallback={<div className="p-10 text-center font-pixel text-xs text-dim">LOADING…</div>}>
        <Game onEnd={() => {}} />
      </Suspense>
    )
  }
  return <GameShell key={meta.id} meta={meta} Game={Game} />
}
