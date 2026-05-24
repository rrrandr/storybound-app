-- ============================================================================
-- ALT POV / COMPANION EDITION SCHEMA MIGRATION
-- ============================================================================
-- Adds the server-side support for Alt POV editions (LI / Villain / Alternate /
-- Hidden Scenes companion editions of completed runs).
--
-- Client-side wiring is in place; this migration unlocks:
--   (a) Persistent library entries for Alt POV editions (one per kind)
--   (b) Parent-child relationship between alt POVs and the original run
--   (c) Visual-canon inheritance so alt POVs reuse parent images without
--       re-generating (the actual cost-saving step)
--
-- Filename underscore prefix marks this as a doc / migration sketch — not
-- a runnable endpoint. Apply via Supabase SQL editor when ready.
-- ============================================================================

-- ── 1. New columns on library_entries ──────────────────────────────────────
-- edition_suffix: NULL for original entries, 'LI' / 'VIL' / 'ALT' / 'HIDDEN'
--                 for companion editions. Drives the display label and the
--                 cache-lookup namespace.
-- parent_entry_id: For alt POV entries, points at the original library entry
--                  they re-narrate. NULL for originals. Enables library
--                  shelf nesting (alt POVs render under their parent).
-- inherits_visuals_from: For alt POV entries, points at the original entry
--                        whose phase image URLs they reuse. Usually equal to
--                        parent_entry_id but kept separate so we could in
--                        theory inherit visuals from a different entry.

ALTER TABLE library_entries ADD COLUMN IF NOT EXISTS edition_suffix TEXT;
ALTER TABLE library_entries ADD COLUMN IF NOT EXISTS parent_entry_id UUID REFERENCES library_entries(id) ON DELETE CASCADE;
ALTER TABLE library_entries ADD COLUMN IF NOT EXISTS inherits_visuals_from UUID REFERENCES library_entries(id) ON DELETE SET NULL;

-- ── 2. Uniqueness constraint update ────────────────────────────────────────
-- Old: (user_id, flavor_key, issue_number) UNIQUE — one entry per run.
-- New: (user_id, flavor_key, issue_number, COALESCE(edition_suffix, ''))
--      so the same parent run can have multiple companion editions.
--
-- ADJUST CONSTRAINT NAME TO MATCH YOUR ACTUAL SCHEMA. The name below is a
-- guess based on common Postgres naming conventions.

-- DROP CONSTRAINT IF EXISTS library_entries_user_flavor_issue_unique;
-- CREATE UNIQUE INDEX IF NOT EXISTS library_entries_user_flavor_issue_edition_unique
--   ON library_entries (user_id, flavor_key, issue_number, COALESCE(edition_suffix, ''));

-- ── 3. Library shelf query index ───────────────────────────────────────────
-- Alt POVs render adjacent to their parent in the Forbidden Library. The
-- shelf-fetch query joins library_entries to itself on parent_entry_id;
-- an index makes that fast even with thousands of entries.

CREATE INDEX IF NOT EXISTS library_entries_parent_idx ON library_entries (parent_entry_id) WHERE parent_entry_id IS NOT NULL;

-- ── 4. Phase image lookup ──────────────────────────────────────────────────
-- The alt POV image-reuse path (client: _getAltPOVReusableImage) needs to
-- fetch the parent run's phase image URLs by (storyId, sceneIndex, phaseIdx).
-- Two options:
--
--   (a) If phase images are stored as a JSONB blob on library_entries
--       (e.g., scene_images_jsonb keyed by 'sceneIdx:phaseIdx'), no schema
--       change needed — fetch the parent entry and read the blob client-side.
--
--   (b) If phase images live in a separate table (e.g., scene_phase_images
--       with columns story_id, scene_idx, phase_idx, image_url), the alt
--       POV lookup is a standard JOIN through parent_entry_id.
--
-- VERIFY which model is in use. If neither — or if image URLs are only
-- ephemeral in the client's state.scenePhases — then alt POV image reuse
-- ALSO requires server-side image URL persistence, which is a separate
-- migration not scoped here.

-- ── 5. New endpoint: /api/get-parent-images ────────────────────────────────
-- Returns { sceneIdx, phaseIdx, imageUrl }[] for the given parentStoryId.
-- Called by the client on alt POV scene N generation to populate
-- state.altPOVParentImages before image regen kicks off.
--
-- POST /api/get-parent-images
--   body: { userId, parentStoryId }
--   returns: { images: [{ scene_idx, phase_idx, image_url }, ...] }
--
-- ENDPOINT NOT YET CREATED. Sketch:
--
--   const { data } = await supabase
--     .from('scene_phase_images')   -- or .from('library_entries').select('scene_images_jsonb')
--     .select('scene_idx, phase_idx, image_url')
--     .eq('story_id', parentStoryId)
--     .eq('user_id', userId);
--   return res.json({ images: data });

-- ── 6. RLS policy notes ────────────────────────────────────────────────────
-- The new columns inherit existing RLS on library_entries — assume the
-- existing user_id check applies. Parent-child queries should verify both
-- the parent and child belong to the calling user.
--
-- For /api/get-parent-images: enforce user_id ownership on the parent
-- before returning image URLs (defense in depth — RLS catches it too).

-- ── 7. One-time backfill (if needed) ───────────────────────────────────────
-- Existing entries get edition_suffix = NULL, parent_entry_id = NULL.
-- That's the correct default — original entries have no parent and no
-- edition suffix. No data migration required for the v1 alt POV ship.
