-- Storybound Currency Unification — Stage 0a
--
-- Collapses the multi-bucket fortune economy (subscription_fortunes,
-- purchased_fortunes, drip_fortunes, storypass_entitlements) plus
-- free_custom_story_credits ("Free Taste credit") into a single `fortunes`
-- column. Adds welcome-grant milestone tracking columns.
--
-- This is Stage 0a (additive). Stage 0b drops the old columns AFTER the new
-- server/client code has shipped and a smoke-test burn-in passes.
--
-- Run in Supabase SQL editor. User is sole live user, so the rollup UPDATE
-- targets all rows.

BEGIN;

-- ── New columns ─────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fortunes int DEFAULT 20,
  ADD COLUMN IF NOT EXISTS signup_date timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_seen_date date,
  ADD COLUMN IF NOT EXISTS welcome_first_arc_granted bool DEFAULT false,
  ADD COLUMN IF NOT EXISTS welcome_day2_granted bool DEFAULT false;

-- ── One-time rollup for existing rows ───────────────────────────────────────
-- Sums every legacy fortune source into the unified `fortunes` field.
-- Free Taste credits convert at 20F apiece (≈ one Taste-length story's average value).
-- Existing users are flagged as having already passed the first-cliffhanger
-- and Day-2 milestones, so they don't double-collect on next login.

UPDATE public.profiles SET
  fortunes = COALESCE(subscription_fortunes, 0)
           + COALESCE(purchased_fortunes, 0)
           + COALESCE(drip_fortunes, 0)
           + COALESCE(
               (SELECT SUM(storypass_fortunes_remaining)
                  FROM public.storypass_entitlements
                  WHERE user_id = profiles.id
                    AND storypass_fortunes_remaining > 0),
               0)
           + COALESCE(free_custom_story_credits, 0) * 20,
  signup_date = COALESCE(signup_date, created_at, now()),
  welcome_first_arc_granted = true,
  welcome_day2_granted = true;

-- Sanity: never end up below the welcome floor
UPDATE public.profiles SET fortunes = 20 WHERE fortunes IS NULL OR fortunes < 0;

COMMIT;

-- ── Stage 0b (DEFERRED — run only after burn-in) ────────────────────────────
-- Uncomment and run separately once the new code is verified in production:
--
-- BEGIN;
-- DROP TABLE IF EXISTS public.storypass_entitlements;
-- ALTER TABLE public.profiles
--   DROP COLUMN IF EXISTS subscription_fortunes,
--   DROP COLUMN IF EXISTS purchased_fortunes,
--   DROP COLUMN IF EXISTS drip_fortunes,
--   DROP COLUMN IF EXISTS has_storypass,
--   DROP COLUMN IF EXISTS free_custom_story_credits,
--   DROP COLUMN IF EXISTS total_tease_scenes_generated;
-- COMMIT;
