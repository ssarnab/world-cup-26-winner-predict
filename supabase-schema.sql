-- ============================================================
-- World Cup 2026 Predictions — database schema
-- Run this in Supabase: SQL Editor → New query → paste → Run.
-- Safe to re-run (drops & recreates). NOTE: this clears existing picks.
-- ============================================================

-- Old version of the table (single champion row) — remove if present.
drop view if exists public.user_scores;
drop table if exists public.predictions cascade;
drop table if exists public.match_results cascade;

-- ------------------------------------------------------------
-- 1. predictions: one row per user, per match slot
-- ------------------------------------------------------------
create table public.predictions (
  user_id       text  not null,   -- Firebase uid
  user_name     text  not null,   -- Google display name
  user_photo    text,             -- Google avatar url
  round         int2  not null,   -- 0=R32 1=R16 2=QF 3=SF 4=Final
  match_index   int2  not null,
  selected_team text  not null,
  updated_at    timestamptz not null default now(),
  primary key (user_id, round, match_index)
);

create index predictions_user_idx on public.predictions (user_id);
create index predictions_name_idx on public.predictions (lower(user_name));

alter table public.predictions enable row level security;

-- Anyone may read all predictions (needed for leaderboard + viewing others)
create policy "read predictions" on public.predictions
  for select using (true);
-- Anyone may write (client is trusted with its own Firebase uid — casual app)
create policy "insert predictions" on public.predictions
  for insert with check (true);
create policy "update predictions" on public.predictions
  for update using (true) with check (true);
create policy "delete predictions" on public.predictions
  for delete using (true);

-- ------------------------------------------------------------
-- 2. match_results: the real winners (source of truth for grading)
--    Read-only to the public; written only via service role (dashboard/script).
-- ------------------------------------------------------------
create table public.match_results (
  round       int2 not null,
  match_index int2 not null,
  winner      text not null,
  decided_at  timestamptz not null default now(),
  primary key (round, match_index)
);

alter table public.match_results enable row level security;
create policy "read results" on public.match_results
  for select using (true);
-- (no insert/update/delete policy → only the service_role key can write)

-- Seed the four completed Round-of-32 results (ESPN).
insert into public.match_results (round, match_index, winner) values
  (0, 0, 'Paraguay'),
  (0, 2, 'Canada'),
  (0, 3, 'Morocco'),
  (0, 8, 'Brazil')
on conflict (round, match_index) do update set winner = excluded.winner;

-- ------------------------------------------------------------
-- 3. user_scores: accuracy per user (powers the leaderboard)
-- ------------------------------------------------------------
create view public.user_scores
with (security_invoker = true) as
select
  p.user_id,
  max(p.user_name)  as user_name,
  max(p.user_photo) as user_photo,
  count(*) filter (where r.winner is not null) as graded,
  count(*) filter (where r.winner is not null and p.selected_team = r.winner) as correct,
  case
    when count(*) filter (where r.winner is not null) > 0
    then round(
      100.0 * count(*) filter (where r.winner is not null and p.selected_team = r.winner)
      / count(*) filter (where r.winner is not null)
    )::int
    else 0
  end as pct
from public.predictions p
left join public.match_results r
  on r.round = p.round and r.match_index = p.match_index
group by p.user_id;

grant select on public.user_scores to anon, authenticated;

-- ------------------------------------------------------------
-- 4. Realtime so leaderboard / brackets update live
-- ------------------------------------------------------------
alter publication supabase_realtime add table public.predictions;
alter publication supabase_realtime add table public.match_results;
