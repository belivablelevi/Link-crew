import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { GameId } from '../lib/types'
import type { GameProps } from './types'

/** Each game is code-split so the home screen stays fast on school wifi. */
export const GAME_COMPONENTS: Record<GameId, LazyExoticComponent<ComponentType<GameProps>>> = {
  'reaction-rush': lazy(() => import('./ReactionRush')),
  'dodge-the-principal': lazy(() => import('./DodgeThePrincipal')),
  'locker-smash': lazy(() => import('./LockerSmash')),
  'fall-fest-stacker': lazy(() => import('./FallFestStacker')),
  'memory-meltdown': lazy(() => import('./MemoryMeltdown')),
  'button-mayhem': lazy(() => import('./ButtonMayhem')),
  'fall-fest-typer': lazy(() => import('./FallFestTyper')),
  'catch-the-duck': lazy(() => import('./CatchTheDuck')),
  'spin-to-win': lazy(() => import('./SpinToWin')),
  'fall-fest-boss': lazy(() => import('./FallFestBoss')),
}
