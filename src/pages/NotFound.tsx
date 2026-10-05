import { LinkButton } from '../components/Button'
import { href } from '../lib/router'

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-4 pt-20 text-center">
      <div className="text-7xl anim-wobble" aria-hidden>
        🦆
      </div>
      <h1 className="font-display title-outline text-5xl text-pink mt-4">404?!</h1>
      <p className="text-dim mt-3">This page got stuffed in a locker. Let&apos;s get you back to the games.</p>
      <LinkButton href={href('/')} className="mt-6" size="lg">
        BACK TO THE ARCADE
      </LinkButton>
    </div>
  )
}
