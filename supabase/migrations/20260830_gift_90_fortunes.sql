-- Starter economy — 90-Fortune new-account wallet (supersedes the 60F default
-- set by 20260703_gift_60_fortunes.sql).
--
-- WHY 90: the wallet is deliberately sized so a new reader can afford either
-- order of the starter experiences, and nothing is earmarked — these are
-- ordinary, fungible Fortunes.
--
--   15 (Famous Fate trial) + 15 (First Sacrifice one-on-one) + 60 (one complete
--      literary / Famous Fate Issue One)                                  = 90
--   60 (one complete Issue One first) + 15 + 15                           = 90
--
-- SERVER-AUTHORITATIVE AND IDEMPOTENT BY CONSTRUCTION. There is no signup
-- trigger and no client-side grant: the balance of a new account comes solely
-- from this column default, applied by Postgres when hydrateProfile inserts the
-- row (public/app.js, `sb.from('profiles').insert({ id: userId })`, which only
-- runs when no row exists). One row per account means one grant per account —
-- a repeat login finds the existing row and receives nothing.
--
-- AFFECTS NEW ROWS ONLY. Existing users keep their current balance; a column
-- default is not retroactive. No backfill is intended — this is not a top-up
-- for accounts that already received the 60F wallet.
--
-- Run in the Supabase SQL editor.

BEGIN;

ALTER TABLE public.profiles
  ALTER COLUMN fortunes SET DEFAULT 90;

COMMIT;

-- Verify:
--   SELECT column_default FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='profiles' AND column_name='fortunes';
--   -- expected: 90
--
-- Rollback: ALTER TABLE public.profiles ALTER COLUMN fortunes SET DEFAULT 60;
