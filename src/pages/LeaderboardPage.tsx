import { Leaderboard, RANKED_GAMES } from '../components/Leaderboard'
import type { GameId } from '../lib/types'

export default function LeaderboardPage({ game }: { game?: string }) {
  const id = (RANKED_GAMES.find((g) => g.id === game)?.id ?? RANKED_GAMES[0].id) as GameId
  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-5 pt-8">
      <div className="font-pixel text-[0.75rem] text-lime">WHO&apos;S THE BEST?</div>
      <h1 className="font-display title-outline text-[clamp(2.1rem,11vw,3.75rem)] break-words text-yellow mt-1 mb-6">LEADERBOARD</h1>
      <div className="panel p-4 sm:p-6">
        <Leaderboard game={id} />
      </div>
    </div>
  )
}
