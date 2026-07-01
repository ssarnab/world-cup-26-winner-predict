-- ============================================================
-- Live chat — run once in Supabase: SQL Editor → New query → Run.
-- This is additive; it does not touch predictions / match_results.
-- ============================================================

create table if not exists public.messages (
  id          bigint generated always as identity primary key,
  user_id     text not null,
  user_name   text not null,
  user_photo  text,
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists messages_created_idx on public.messages (created_at);

alter table public.messages enable row level security;

-- Anyone can read the chat
drop policy if exists "read messages" on public.messages;
create policy "read messages" on public.messages
  for select using (true);

-- Anyone can post a message, 1–500 characters (client is trusted with its uid)
drop policy if exists "insert messages" on public.messages;
create policy "insert messages" on public.messages
  for insert with check (char_length(body) between 1 and 500);

-- Live updates
alter publication supabase_realtime add table public.messages;
