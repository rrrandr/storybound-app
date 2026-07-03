-- Preview Onboarding — Gifted-Fortunes wallet
--
-- New users receive a single up-front 60-Fortune wallet (replaces the old
-- 20-base + per-book/first-cliffhanger drip). The base balance for a new
-- account comes solely from this column default (there is no signup trigger),
-- so bumping the default is the single-source, server-authoritative fix.
--
-- Affects NEW rows only. Existing rows keep their current balance (the sole
-- live user already has a balance; no rollup needed).
--
-- SEQUENCING: apply this together with the Phase-2 charging drop
-- (starters → charged Previews + TASTE_BOOK_GRANTS removal). Applying the 60F
-- gift while per-book +20 grants are still live would over-grant new accounts.
--
-- Run in the Supabase SQL editor.

BEGIN;

ALTER TABLE public.profiles
  ALTER COLUMN fortunes SET DEFAULT 60;

COMMIT;

-- Rollback (if needed): ALTER TABLE public.profiles ALTER COLUMN fortunes SET DEFAULT 20;
