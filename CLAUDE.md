# Link Crew Fall Fest Arcade

React 19 + TypeScript + Vite + Tailwind CSS v4 static site with a Supabase leaderboard. See `README.md` for how everything fits together.

- Typecheck: `npm run typecheck`
- Build: `npm run build`

## Review before committing

Before every commit that changes code, run the matching reviewer agent(s) from `.claude/agents/` on the changes:

| Changed | Reviewer |
|---|---|
| `src/games/` | `game-reviewer` |
| `supabase/`, `src/lib/leaderboard.ts`, `src/lib/supabaseConfig.ts`, `src/lib/names.ts`, `.github/workflows/` | `supabase-reviewer` |
| Any other `.ts`/`.tsx` in `src/` | `react-reviewer` |

- If changes span several areas, run each matching reviewer (in parallel).
- Fix every **Must fix** finding, then re-run that reviewer to confirm. Fix **Should fix** findings when they're small; otherwise mention them to the user.
- Tell the user in one or two lines what the review found and what you fixed.
- Skip the review for changes that are only docs, comments, `README.md`, or files in `.claude/`.
