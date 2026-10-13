-- Link Crew Fall Fest arcade: leaderboard database
-- Paste this whole file into Supabase > SQL Editor > New query, then click RUN.
-- Safe to run more than once.

create table if not exists public.scores (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  -- random id generated on each device, so two people with the same name stay separate
  player_id uuid not null,
  name text not null check (char_length(name) between 2 and 16 and name ~ '^[A-Za-z0-9 _.-]+$'),
  game text not null check (game in (
    'reaction-rush', 'dodge-the-principal', 'locker-smash', 'fall-fest-stacker', 'memory-meltdown',
    'button-mayhem', 'fall-fest-typer', 'catch-the-duck', 'fall-fest-boss'
  )),
  score integer not null check (score > 0),
  -- generous upper limits so obviously fake scores are rejected
  constraint score_cap check (score <= case game
    when 'reaction-rush' then 40000
    when 'dodge-the-principal' then 100000
    when 'locker-smash' then 60000
    when 'fall-fest-stacker' then 30000
    when 'memory-meltdown' then 60000
    when 'button-mayhem' then 150000
    when 'fall-fest-typer' then 60000
    when 'catch-the-duck' then 3000
    when 'fall-fest-boss' then 200000
  end)
);

create index if not exists scores_game_score_idx on public.scores (game, score desc);

-- Row level security: the website (anon key) may read and add scores, never edit or delete.
alter table public.scores enable row level security;

drop policy if exists "anyone can read scores" on public.scores;
create policy "anyone can read scores" on public.scores for select to anon using (true);

drop policy if exists "anyone can add a score" on public.scores;
create policy "anyone can add a score" on public.scores for insert to anon with check (true);

-- Each player's best score per game, shown under the name they used most recently
create or replace view public.leaderboard with (security_invoker = true) as
select b.game, b.player_id, latest.name, b.score, b.created_at
from (
  select distinct on (game, player_id) game, player_id, score, created_at
  from public.scores
  order by game, player_id, score desc, created_at asc
) b
cross join lateral (
  select s.name from public.scores s
  where s.player_id = b.player_id
  order by s.created_at desc
  limit 1
) latest;

-- The school record for each game
create or replace view public.game_records with (security_invoker = true) as
select game, max(score) as score
from public.scores
group by game;

grant select, insert on public.scores to anon;
grant select on public.leaderboard, public.game_records to anon;
