-- library_bookmarks: per-user bookmark state for stories read in the Forbidden Library.
-- Written by client on scroll (throttled). Restored on reopen.

create table public.library_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  story_id text not null,
  last_scene_index int not null default 0,
  scroll_position float not null default 0,
  updated_at timestamp with time zone not null default now()
);

-- Unique constraint: one bookmark per (user, story)
create unique index idx_library_bookmarks_user_story
  on public.library_bookmarks(user_id, story_id);

alter table public.library_bookmarks enable row level security;

-- Users can read their own bookmarks
create policy "Users can read own bookmarks"
  on public.library_bookmarks
  for select
  using (auth.uid() = user_id);

-- Users can insert their own bookmarks
create policy "Users can insert own bookmarks"
  on public.library_bookmarks
  for insert
  with check (auth.uid() = user_id);

-- Users can update their own bookmarks
create policy "Users can update own bookmarks"
  on public.library_bookmarks
  for update
  using (auth.uid() = user_id);
