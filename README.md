# Link Crew Fall Fest Arcade

PLAY. COMPETE. DOMINATE. A browser game hub for Lisgar Collegiate's Link Crew Fall Fest. It has 10 mini-games, XP and levels, Fest Tokens, cosmetics, achievements, daily challenges, random events, leaderboards and hidden secrets.

Built with React, TypeScript, Vite and Tailwind CSS v4. There are no image assets: everything is CSS, SVG, Canvas or emoji. Sounds are generated with the Web Audio API.

## Run it

```bash
npm install
npm run dev        # local dev server
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
```

`dist/` is a static site that uses hash routing (`#/games/...`). You can drop it on GitHub Pages, Netlify, a school web server or any other host, and it needs no server config.

## Edit the event details

Open `src/lib/eventInfo.ts` and fill in the date, time and location. They currently say `TBA`.

## The games (`src/games/`)

| Game | File | Controls |
| --- | --- | --- |
| Reaction Rush | `ReactionRush.tsx` | tap / SPACE |
| Dodge the Principal | `DodgeThePrincipal.tsx` (canvas) | WASD / arrows / drag anywhere (virtual joystick) |
| Locker Smash | `LockerSmash.tsx` | tap / SPACE |
| Fall Fest Stacker | `FallFestStacker.tsx` (canvas) | tap / SPACE |
| Memory Meltdown | `MemoryMeltdown.tsx` | tap pads / keys 1–6 |
| Button Mayhem | `ButtonMayhem.tsx` | tap |
| Fall Fest Typer | `FallFestTyper.tsx` | keyboard (mobile keyboard works) |
| Catch the Duck | `CatchTheDuck.tsx` | tap |
| Spin to Win | `SpinToWin.tsx` | tap (15-min cooldown, plus a bonus spin each level-up) |
| Fall Fest Boss | `FallFestBoss.tsx` | tap / keys 1–4, SPACE to block |

Every game is a component that receives `{ onEnd(result) }` (see `src/games/types.ts`). `components/GameShell.tsx` handles the intro screen, the 3-2-1 countdown, the game-over screen, rewards and replay. To add a game:

1. Add its metadata (name, colours, how-to, reward curve, record) in `src/games/meta.ts`.
2. Register the component in `src/games/registry.ts`.
3. Optionally add card art in `components/GameArt.tsx`.

## Where things live

```
src/
  state/store.ts        player state (localStorage), XP/levels, tokens, achievements, daily, boosts
  lib/progression.ts    level curve (L2 = 100 XP, L3 = 250, L4 = 500, L5 = 900, …)
  lib/achievements.ts   34 achievements (5 are secret)
  lib/daily.ts          daily challenge pool (same challenge for everyone on a given day)
  lib/cosmetics.ts      avatars, titles, backdrops, name FX, confetti styles
  lib/leaderboard.ts    leaderboard service interface + local implementation
  lib/sound.ts          generated sound effects
  lib/fx.ts             event bus for toasts, confetti, flashes, shakes, level-up and achievement overlays
  components/           Button, Modal, ProgressBar, XPBar, GameCard, Leaderboard, Achievement, Toast,
                        Confetti, Profile, Navigation, GameShell, ScoreDisplay, RandomEvents, …
  pages/                Home, Games, GamePage, Leaderboard, Profile, Achievements
```

## Leaderboard: going global later

Right now the board ranks **you** (from this device's localStorage) against fixed **demo rivals**. The UI labels it that way, and nothing is synced. To make it global, implement `LeaderboardBackend` in `src/lib/leaderboard.ts` (`getTop` + `submitRun`) against a real API or database such as Supabase, Firebase or a small server, then swap the exported `leaderboard`. `submitRun` is already called after every game with the score and stats. Validate scores server-side.

## Secrets (spoilers)

- Click the LC logo 5 times quickly.
- Type ↑ ↑ ↓ ↓ ← → ← → B A.
- Find the tiny duck in the event info panel.
- Find the nearly invisible button in the footer.

Each one turns on SECRET MODE for 30 seconds. Finding all four unlocks a secret title.

## Accessibility

- MOTION setting (Profile): AUTO follows the OS reduced-motion setting, and CALM disables shakes, confetti and most animation.
- The sound toggle is always visible in the top bar, and volume can be changed in Profile.
- Keyboard play is supported in every game, with visible focus rings and a skip link.
- Game pieces never rely on colour alone. Memory pads have symbols, fake buttons and ducks are labelled, and difficulty tags are text.
