import { Leaderboard, RANKED_GAMES, type BoardId } from '../components/Leaderboard'

export default function LeaderboardPage({ game }: { game?: string }) {
  const id: BoardId = RANKED_GAMES.find((g) => g.id === game)?.id ?? 'all-time'
  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-5 pt-8">
      <div className="font-pixel text-[0.75rem] text-lime">WHO&apos;S THE BEST?</div>
      <h1 className="font-display title-outline text-[clamp(2.1rem,11vw,3.75rem)] break-words text-yellow mt-1 mb-6">LEADERBOARD</h1>
      <div className="panel p-4 sm:p-6">
        <Leaderboard board={id} />
      </div>
    </div>
  )
}
