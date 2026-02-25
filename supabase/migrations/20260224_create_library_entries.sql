-- library_entries: denormalized metadata for stories eligible to appear in the Forbidden Library.
-- Populated by a scheduled publishing job (NOT by gameplay code).
-- Client queries this table read-only to render shelves and load sanitized prose.

create table public.library_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references auth.users(id) on delete cascade,
  story_id text not null,
  title text not null default 'Untitled',
  world text not null default 'Modern',
  scene_count int not null default 0,
  sanitized_text text,                          -- cleaned prose for read-only view
  cover_url text,                               -- placeholder for future cover URLs
  visibility text not null default 'public',    -- 'public' | 'private'
  library_opt_in boolean not null default true,
  world_cycle_id text,
  series_id text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Unique constraint: one entry per (profile, story)
create unique index idx_library_entries_profile_story
  on public.library_entries(profile_id, story_id);

-- Query index: eligible stories sorted by scene_count
create index idx_library_entries_eligible
  on public.library_entries(scene_count desc)
  where visibility = 'public' and library_opt_in = true and scene_count >= 20;

alter table public.library_entries enable row level security;

-- Public read: anyone can read public, opted-in entries
create policy "Anyone can read public library entries"
  on public.library_entries
  for select
  using (visibility = 'public' and library_opt_in = true);

-- Owners can read their own entries regardless of visibility
create policy "Owners can read own entries"
  on public.library_entries
  for select
  using (auth.uid() = profile_id);

-- Only service role (scheduled job) can insert/update/delete
-- No client-side insert/update/delete policies
