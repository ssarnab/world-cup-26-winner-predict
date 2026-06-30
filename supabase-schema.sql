-- Run this in your Supabase project: SQL Editor → New query → paste → Run.

-- 1. Table that stores every prediction (vote)
create table if not exists public.predictions (
  id            bigint generated always as identity primary key,
  match_id      text not null,
  voter_name    text not null,
  selected_team text not null,
  created_at    timestamptz not null default now()
);

-- Helpful index for aggregating live percentages per match
create index if not exists predictions_match_id_idx
  on public.predictions (match_id);

-- 2. Row Level Security: anonymous visitors may read + insert votes only
alter table public.predictions enable row level security;

drop policy if exists "anyone can read predictions" on public.predictions;
create policy "anyone can read predictions"
  on public.predictions for select
  using (true);

drop policy if exists "anyone can insert predictions" on public.predictions;
create policy "anyone can insert predictions"
  on public.predictions for insert
  with check (true);

-- 3. Enable Realtime so live percentages update without refresh
alter publication supabase_realtime add table public.predictions;
