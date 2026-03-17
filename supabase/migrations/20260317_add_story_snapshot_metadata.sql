-- Add lightweight metadata columns to story_snapshots so the vault library
-- can query titles and scene counts without downloading full snapshot blobs.

ALTER TABLE public.story_snapshots
  ADD COLUMN IF NOT EXISTS title       text,
  ADD COLUMN IF NOT EXISTS turn_count  integer DEFAULT 0;

-- Backfill from existing snapshot JSONB
UPDATE public.story_snapshots
SET
  title      = COALESCE(snapshot->>'title', 'Untitled'),
  turn_count = COALESCE((snapshot->'stateSnapshot'->>'turnCount')::integer, 0)
WHERE title IS NULL;

-- Index for vault library listing (owner's stories, most recent first)
CREATE INDEX IF NOT EXISTS idx_story_snapshots_vault
  ON public.story_snapshots(profile_id, updated_at DESC);
