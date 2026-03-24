-- story_alt_pov: Alternate POV editions (Secret Editions).
-- Stores LI POV, villain POV, and archived material rewrites.
-- Append-only — the app never updates or deletes these rows.
-- Multiple rows per (user, story) are expected (e.g. dual generates LI + villain).

create table public.story_alt_pov (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  original_story_id     text not null,
  pov_character         jsonb not null,
  scenes                text not null,
  generated_at          timestamptz not null default now(),
  is_read_only          boolean not null default true,
  edition_type          text not null,              -- 'single', 'dual', 'dual_secret_edition'
  library_type          text not null default 'secret_edition',
  alt_pov_hidden_truths integer not null default 3,
  created_at            timestamptz not null default now()
);

-- Covers: hasAltPovEdition(user, story, type), appendArchivedMaterialIfUnlocked
create index idx_alt_pov_user_story_type
  on public.story_alt_pov (user_id, original_story_id, edition_type);

-- Covers: loadUserSecretEditions (user, order by generated_at desc)
create index idx_alt_pov_user_generated
  on public.story_alt_pov (user_id, generated_at desc);

-- RLS: owner-only (no update/delete policies — app is append-only)
alter table public.story_alt_pov enable row level security;

create policy "Users can read own alt POV editions"
  on public.story_alt_pov
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own alt POV editions"
  on public.story_alt_pov
  for insert
  with check (auth.uid() = user_id);
