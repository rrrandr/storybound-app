-- Beta Observatory — structured beta-only telemetry (Roman 2026-07-10).
-- Clients POST events to /api/beta-events (anon insert allowed); the admin page reads via the
-- service-role key only (no anon SELECT). Privacy: user_id_hash only — never email/PII/card.
-- Run in the Supabase SQL editor.

create table if not exists public.beta_events (
  id           bigint generated always as identity primary key,
  event_name   text not null,
  session_id   text,
  user_id_hash text,
  story_id     text,
  scene_index  int,
  mode         text,
  payload      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists beta_events_created_at_idx on public.beta_events (created_at desc);
create index if not exists beta_events_session_idx    on public.beta_events (session_id);

-- RLS: anon may INSERT (clients log their own events); anon may NOT SELECT
-- (the admin endpoint reads with the service-role key, bypassing RLS).
alter table public.beta_events enable row level security;

drop policy if exists beta_events_anon_insert on public.beta_events;
create policy beta_events_anon_insert on public.beta_events
  for insert to anon, authenticated
  with check (true);

-- Optional: prune events older than 30 days (beta is short-lived). Run manually or via a cron.
-- delete from public.beta_events where created_at < now() - interval '30 days';
