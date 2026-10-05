import { Leaderboard } from '../components/Leaderboard'

export default function LeaderboardPage() {
  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-5 pt-8">
      <div className="font-pixel text-[0.6rem] text-lime">WHO&apos;S THE BEST?</div>
      <h1 className="font-display title-outline text-[clamp(2.1rem,11vw,3.75rem)] break-words text-yellow mt-1 mb-6">LEADERBOARD</h1>
      <div className="panel p-4 sm:p-6">
        <Leaderboard />
      </div>
    </div>
  )
}
