alter table public.profiles
  add column if not exists romance_preferences jsonb not null default '[]'::jsonb;
