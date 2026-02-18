create table public.user_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create index idx_user_events_user_id on public.user_events(user_id);
create index idx_user_events_event_type on public.user_events(event_type);
create index idx_user_events_created_at on public.user_events(created_at);

alter table public.user_events enable row level security;

create policy "Users can insert own events"
  on public.user_events
  for insert
  with check (auth.uid() = user_id);
