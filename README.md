# Link Crew Winter Fest Arcade

PLAY. COMPETE. DOMINATE. A browser game hub for Lisgar Collegiate's Link Crew Winter Fest. It has 13 mini-games, XP and levels, Fest Tokens, cosmetics, achievements, daily challenges, a school-wide leaderboard and hidden secrets.

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

Everything in the **ABOUT WINTER FEST** section on the home page comes from `src/lib/eventInfo.ts`: date, time, location, the about text, the "What's happening" list and the Q&A. Some of it is still general wording or `TBA`, so update it as plans are confirmed.

## School logo

The Lisgar crest lives at `public/lisgar-logo.webp`. To swap it, replace that file (or add `lisgar-logo.png` / `.svg` / `.jpg`). It appears in the top bar and above the home title.

## Leaderboard (school-wide, Supabase)

Each player's best score per game goes to a free [Supabase](https://supabase.com) database, so everyone sees the same leaderboard and school bests.

The **ALL-TIME** board adds up every game a player has finished. Each run is converted to points with the same formula as XP (`reward: scaled(...)` in `src/games/meta.ts`, 10 to 260 points per run), so big-number games like the boss fight don't drown out the others. The database does this math itself in the `all_time` view, so if you change a game's reward scale, update the matching number in `supabase/schema.sql` too. If the connection is ever removed, the leaderboard falls back to scores from the current device.

The site is connected to the Supabase project in `src/lib/supabaseConfig.ts` (project URL + publishable key, both safe to be public). The database itself is set up by running `supabase/schema.sql` once in Supabase > **SQL Editor > New query > Run**. Run it again after changing the word filter; that's safe.

**Never** put the `service_role` / secret key in this repo or the website. It bypasses every database rule.

Moderation: names go through a profanity filter in the app (`src/lib/names.ts`) **and** in the database (`is_clean_name` in `supabase/schema.sql`), so a bad name can't be saved even by bypassing the site. It catches look-alike tricks (`5h1t`, `f.u.c.k`, `BigAssDuck`) without blocking names like Cassie or Dickens. To add a word, add it to both lists and re-run the SQL file. To remove a name or score anyway, open **Table Editor > scores** in Supabase and delete the row. The database rejects impossible scores, but this isn't cheat-proof, since anyone tech-savvy can send their own scores.

To point a build at a different Supabase project, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (for example in `.env.local`, or as GitHub repo variables `SUPABASE_URL` / `SUPABASE_ANON_KEY`).

## Colours & fonts

The theme is set at the top of `src/index.css` in the `@theme { … }` block:

- **Colours:** `--color-bg` (navy background), `--color-panel` (cards), `--color-yellow` (gold, the main accent), `--color-purple` (royal blue), `--color-blue` (sky blue), and a few others. Change a value there and it updates across the site. The names are left over from the first version, so `yellow` is now gold and `purple` is now royal blue.
- **Fonts:** `--font-display` (headings: Outfit) and `--font-body` / `--font-pixel` (text and small labels: Inter). If you switch fonts, also update the Google Fonts link in `index.html`.

## Effects intensity

Confetti, screen flashes and screen shakes all go through one dial, `INTENSITY` in `src/lib/fx.ts`. Turn it up or down to taste.

## The games (`src/games/`)

| Game | File | Controls |
| --- | --- | --- |
| Reaction Rush | `ReactionRush.tsx` | tap / SPACE |
| Dodge the Principal | `DodgeThePrincipal.tsx` (canvas) | WASD / arrows / drag anywhere (virtual joystick) |
| Locker Smash | `LockerSmash.tsx` | tap / SPACE |
| Gift Stacker | `GiftStacker.tsx` (canvas) | tap / SPACE |
| Memory Meltdown | `MemoryMeltdown.tsx` | tap pads / keys 1–6 |
| Button Mayhem | `ButtonMayhem.tsx` | tap |
| Winter Fest Typer | `WinterFestTyper.tsx` | keyboard (mobile keyboard works) |
| Catch the Duck | `CatchTheDuck.tsx` | tap |
| Spin to Win | `SpinToWin.tsx` | tap (15-min cooldown, plus a bonus spin each level-up) |
| Winter Fest Boss | `WinterFestBoss.tsx` | tap / keys 1–4, SPACE to block |
| Snowflake Catcher | `SnowflakeCatcher.tsx` (canvas) | drag / tap / mouse / arrow keys |
| Goose Flight | `GooseFlight.tsx` (canvas) | tap / click / SPACE |
| Ornament Plinko | `Plinko.tsx` + `plinkoPhysics.ts` (canvas) | tap where to drop / arrow keys + SPACE |

Game ids (like `leaf-catcher` or `fall-fest-boss`) still use the original Fall Fest names because saves and the leaderboard database store them. Only the display names changed.

Every game is a component that receives `{ onEnd(result) }` (see `src/games/types.ts`). `components/GameShell.tsx` handles the intro screen, the 3-2-1 countdown, the game-over screen, rewards and replay. To add a game:

1. Add its metadata (name, colours, how-to, reward curve) in `src/games/meta.ts`.
2. Register the component in `src/games/registry.ts`.
3. Optionally add card art in `components/GameArt.tsx`.
4. Add the game id (and a score limit) to `supabase/schema.sql` and re-run it in Supabase, or its scores won't be saved to the leaderboard.

## Where things live

```
src/
  state/store.ts        player state (localStorage), XP/levels, tokens, achievements, daily, boosts
  lib/progression.ts    level curve (L2 = 100 XP, L3 = 250, L4 = 500, L5 = 900, …)
  lib/leaderboard.ts    leaderboard: Supabase (online) or this-device fallback
  lib/achievements.ts   36 achievements (5 are secret)
  lib/daily.ts          daily challenge pool (same challenge for everyone on a given day)
  lib/cosmetics.ts      avatars, titles, backdrops, name FX, confetti styles
  lib/sound.ts          generated sound effects
  lib/fx.ts             event bus for toasts, confetti, flashes, shakes, level-up and achievement overlays
  components/           Button, Modal, ProgressBar, XPBar, GameCard, Leaderboard, Achievement, Toast,
                        Confetti, Profile, Navigation, GameShell, ScoreDisplay, …
  pages/                Home, Games, GamePage, Leaderboard, Profile, Achievements
```

## Secrets (spoilers)

- Click the LC logo 5 times quickly.
- Type ↑ ↑ ↓ ↓ ← → ← → B A. On a phone or tablet: swipe up, up, down, down, left, right, left, right, then tap twice (not inside a game).
- Find the tiny duck in the event info panel.
- Find the nearly invisible button in the footer.

Each one turns on SECRET MODE for 30 seconds. Finding all four unlocks a secret title.

## Accessibility

- MOTION setting (Profile): AUTO follows the OS reduced-motion setting, and CALM disables shakes, confetti and most animation.
- The sound toggle is always visible in the top bar, and volume can be changed in Profile.
- Keyboard play is supported in every game, with visible focus rings and a skip link.
- Game pieces never rely on colour alone. Memory pads have symbols, fake buttons and ducks are labelled, and difficulty tags are text.
