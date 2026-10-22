-- Link Crew Fall Fest arcade: leaderboard database
-- Paste this whole file into Supabase > SQL Editor > New query, then click RUN.
-- Safe to run more than once.

create table if not exists public.scores (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  -- random id generated on each device, so two people with the same name stay separate
  player_id uuid not null,
  name text not null check (char_length(name) between 2 and 16 and name ~ '^[A-Za-z0-9 _.-]+$'),
  game text not null,
  score integer not null check (score > 0)
);

-- Which games are allowed, and generous score limits so obviously fake scores are rejected.
-- Dropped and re-added so re-running this file picks up new games.
alter table public.scores drop constraint if exists scores_game_check;
alter table public.scores add constraint scores_game_check check (game in ('reaction-rush', 'dodge-the-principal', 'locker-smash', 'fall-fest-stacker', 'memory-meltdown',
    'button-mayhem', 'fall-fest-typer', 'catch-the-duck', 'fall-fest-boss', 'leaf-catcher', 'goose-flight', 'plinko'
  )) not valid;

alter table public.scores drop constraint if exists score_cap;
alter table public.scores add constraint score_cap check (score <= case game
    when 'reaction-rush' then 40000
    when 'dodge-the-principal' then 100000
    when 'locker-smash' then 60000
    when 'fall-fest-stacker' then 30000
    when 'memory-meltdown' then 60000
    when 'button-mayhem' then 150000
    when 'fall-fest-typer' then 60000
    when 'catch-the-duck' then 3000
    when 'fall-fest-boss' then 200000
    when 'leaf-catcher' then 40000
    when 'goose-flight' then 30000
    when 'plinko' then 1500
  end) not valid;

-- Profanity filter: same rules and word lists as src/lib/names.ts (keep them in sync).
-- Undoes look-alike tricks (0->o 1->i 3->e 4->a 5->s 7->t 8->b @->a $->s !->i |->i) and repeated letters.
create or replace function public.is_clean_name(raw text) returns boolean
language plpgsql immutable as $fn$
declare
  anywhere text[] := array[
    'fuck', 'fck', 'phuck', 'bullshit', 'shithead', 'shitty', 'bitch', 'cunt', 'pussy', 'pussi', 'nigg', 'faggot',
    'fagot', 'slut', 'whore', 'hitler', 'porn', 'penis', 'vagina', 'retard', 'molest', 'pedophile', 'paedo', 'dildo',
    'jizz', 'twat', 'bastard', 'asshole', 'arsehole', 'dumbass', 'jackass', 'bollock', 'orgasm', 'horny', 'onlyfans', 'cocaine',
    'tranny', 'wetback', 'beaner', 'killyourself', 'blowjob', 'handjob', 'boner', 'erection', 'masturbat', 'motherfuck', 'sexy', 'boobs',
    'titties', 'nudes', 'kkk', 'swastika'
  ];
  whole text[] := array[
    'shit', 'shits', 'fuk', 'ass', 'arse', 'dick', 'cock', 'fag', 'rape', 'rapist', 'sex', 'cum',
    'tit', 'tits', 'boob', 'prick', 'spic', 'chink', 'kike', 'dyke', 'coon', 'gook', 'homo', 'anal',
    'anus', 'nude', 'naked', 'weed', 'meth', 'heroin', 'kys', 'pedo', 'hoe', 'hoes', 'thot', 'nig',
    'niger', 'nazi', 'nazis', 'isis', 'wank', 'wanker', 'damn', 'hell', 'crap', 'piss', 'slag', 'skank',
    'butt', 'poop', 'pee'
  ];
  sq text;
  sqc text;
  w text;
  t text;
begin
  -- whole name with everything but letters removed ("f.u.c.k", "xXfuckXx")
  sq := regexp_replace(translate(lower(raw), '0134578@$!|', 'oieastbasii'), '[^a-z]', '', 'g');
  sqc := regexp_replace(sq, '(.)\1+', '\1', 'g');
  foreach w in array anywhere loop
    if position(w in sq) > 0 or position(w in sqc) > 0 then
      return false;
    end if;
  end loop;
  if sq = any(whole) or sqc = any(whole) then
    return false;
  end if;
  -- separate words: spaces, symbols and camelCase ("BigAssDuck" -> big ass duck)
  foreach t in array regexp_split_to_array(
    translate(lower(regexp_replace(raw, '([a-z])([A-Z])', '\1 \2', 'g')), '0134578@$!|', 'oieastbasii'), '[^a-z]+'
  ) loop
    if t <> '' and (t = any(whole) or regexp_replace(t, '(.)\1+', '\1', 'g') = any(whole)) then
      return false;
    end if;
  end loop;
  return true;
end
$fn$;

alter table public.scores drop constraint if exists name_clean;
alter table public.scores add constraint name_clean check (public.is_clean_name(name)) not valid;

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

-- All-time points: every run counts. Each run is converted to points with the same formula the
-- site uses for XP (src/games/meta.ts, reward: scaled(...)), so every game is worth 10 to 260
-- points per run no matter how big its raw scores are. Keep the numbers in sync with meta.ts.
create or replace view public.all_time with (security_invoker = true) as
select t.player_id, latest.name, t.points, t.games
from (
  select
    player_id,
    sum(greatest(10, least(260, round(15 + score::numeric / case game
      when 'reaction-rush' then 90
      when 'dodge-the-principal' then 12
      when 'locker-smash' then 14
      when 'fall-fest-stacker' then 4
      when 'memory-meltdown' then 6
      when 'button-mayhem' then 16
      when 'fall-fest-typer' then 25
      when 'catch-the-duck' then 0.7
      when 'fall-fest-boss' then 180
      when 'leaf-catcher' then 22
      when 'goose-flight' then 2
      when 'plinko' then 3
      else 1000000 end))))::int as points,
    count(*)::int as games
  from public.scores
  group by player_id
) t
cross join lateral (
  select s.name from public.scores s
  where s.player_id = t.player_id
  order by s.created_at desc
  limit 1
) latest;

grant select, insert on public.scores to anon;
grant select on public.leaderboard, public.game_records, public.all_time to anon;
