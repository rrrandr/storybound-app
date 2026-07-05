-- Famous Fate — shared CANON CACHE (cross-story reuse of generated Character
-- Contracts, World Contracts, and Relationship edges). Keyed by universe +
-- entry_type + entry_key + version, so "Professor X" generated once is reused
-- across every Famous Fate story in that universe until edited. Access is
-- service-role ONLY (via /api/famous-fate-canon); RLS is enabled with no
-- policies so the anon/auth client cannot read or write it directly.

create table if not exists public.ff_canon_cache (
  id          uuid primary key default gen_random_uuid(),
  universe    text not null,                 -- normalized world/franchise (carries "version" when the reader typed one, e.g. "x-men 97")
  entry_type  text not null check (entry_type in ('character','world','relationship')),
  entry_key   text not null,                 -- character: normalized name · world: '__world__' · relationship: 'fromKey>toKey'
  version     text not null default '',       -- reserved for an explicit continuity tag
  role        text,                           -- character role label (e.g. "Recurring Rival", "Major Ally")
  payload     jsonb not null,                 -- the lightweight/full contract or relationship edge
  hits        integer not null default 0,     -- reuse counter (best-effort)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (universe, entry_type, entry_key, version)
);

create index if not exists ff_canon_cache_lookup
  on public.ff_canon_cache (universe, version);

-- Service-role-only: RLS on, zero policies → anon/auth clients are denied; the
-- service-role key used by /api/famous-fate-canon bypasses RLS.
alter table public.ff_canon_cache enable row level security;
