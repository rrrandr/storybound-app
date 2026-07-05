-- ═══════════════════════════════════════════════════════════════════════
-- ISSUE SERIALIZATION — canon_map_jsonb groundwork (Slice 2)
-- ═══════════════════════════════════════════════════════════════════════
-- Adds the private-name → published-name transform map that the Forbidden
-- Library scrub pipeline will apply when canonizing user stories for the
-- public archive. The map MUST be immutable once an issue's first
-- publication occurs, so all future issues in the same run (Book 2, 3,
-- …) reuse the EXACT same name transforms — otherwise sequel coherence
-- collapses (Ethan Rivera becomes Elias Vale in #256.1, but Marcus Vey
-- in #256.2 — broken continuity).
--
-- Continuity key: (issue_flavor, issue_number). Already serves as the
-- de facto publication_continuity_id in the existing
-- story_library_versions schema. Book 2 inherits its parent's
-- (flavor, number) tuple by way of state.previous_story_id carrying
-- the parent storyId in the JSONB snapshot.
--
-- The actual scrub pipeline (build the map, apply transforms, freeze
-- library_entries read-only) lands in Slice 4. This migration is
-- groundwork: column + immutability trigger only.
-- ═══════════════════════════════════════════════════════════════════════

-- Column: canon_map_jsonb on story_library_versions ----------------------
-- Default '{}'::jsonb so existing rows don't violate any NOT NULL
-- constraint and so reads can rely on the field always being an object.
ALTER TABLE public.story_library_versions
    ADD COLUMN IF NOT EXISTS canon_map_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.story_library_versions.canon_map_jsonb IS
    'Private-name → published-name transform applied during Forbidden '
    'Library scrub. Allocated on first publication of the run. Once '
    'non-empty, IMMUTABLE for the lifetime of the (issue_flavor, '
    'issue_number) run — future issues in the same continuity reuse '
    'this exact map to preserve cross-issue name/institution coherence. '
    'Slice 2 groundwork; consumed by Slice 4 scrub pipeline.';

-- Immutability trigger ---------------------------------------------------
-- Extend the existing prevent_issue_mutation trigger to also lock
-- canon_map_jsonb once it's been populated (transitioned from empty to
-- non-empty). Allows the publisher to write it ONCE (empty → real map)
-- but blocks any subsequent edit.
--
-- Note: the existing trigger function is defined out-of-band (created
-- 2026-05-12, see api/claim-issue-number.js header). We extend it here
-- via CREATE OR REPLACE so the new clause coexists with the existing
-- issue_number / playthrough_credit immutability clauses.
CREATE OR REPLACE FUNCTION public.prevent_issue_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Existing clause: issue_number / issue_flavor locked once assigned.
  IF OLD.issue_number IS NOT NULL AND (
    NEW.issue_number IS DISTINCT FROM OLD.issue_number
    OR NEW.issue_flavor IS DISTINCT FROM OLD.issue_flavor
  ) THEN
    RAISE EXCEPTION 'Issue metadata is immutable once assigned';
  END IF;

  -- Existing clause: playthrough_credit locked once claimed (client roles
  -- only; service_role retains moderation ability).
  IF current_setting('request.jwt.claim.role', true) IN ('authenticated', 'anon')
     AND OLD.playthrough_credit IS NOT NULL
     AND NEW.playthrough_credit IS DISTINCT FROM OLD.playthrough_credit THEN
    RAISE EXCEPTION 'Playthrough credit is immutable once claimed';
  END IF;

  -- Existing clause: auto-sync normalized credit.
  IF NEW.playthrough_credit IS NOT NULL THEN
    NEW.playthrough_credit_normalized :=
      lower(regexp_replace(NEW.playthrough_credit, '[^a-zA-Z0-9]', '', 'g'));
  ELSE
    NEW.playthrough_credit_normalized := NULL;
  END IF;

  -- NEW clause (Slice 2): canon_map_jsonb locked once populated.
  -- The empty object '{}' is the "unallocated" sentinel — publishers may
  -- write a real map (one transition: empty → non-empty), but once the
  -- map is non-empty, ANY change (including back to empty) is rejected.
  -- Sequel issues in the same run inherit this map via application logic;
  -- they don't write it again.
  IF OLD.canon_map_jsonb IS NOT NULL
     AND OLD.canon_map_jsonb <> '{}'::jsonb
     AND NEW.canon_map_jsonb IS DISTINCT FROM OLD.canon_map_jsonb THEN
    RAISE EXCEPTION 'canon_map_jsonb is immutable once published';
  END IF;

  RETURN NEW;
END;
$$;

-- Note: trigger binding (CREATE TRIGGER ... BEFORE UPDATE ON
-- story_library_versions ... EXECUTE FUNCTION prevent_issue_mutation)
-- already exists from the 2026-05-12 out-of-band setup. CREATE OR
-- REPLACE FUNCTION updates the body in place — no re-bind needed.
