-- Onboarding state — persistent one-shot flags on profiles
--
-- onboarding_complete: true once the mask-ceremony onboarding has EVER been
--   completed. Gates ceremony replay so onboarding is a one-shot FLOW, not a LOOP
--   (previously the ceremony re-armed and re-fired on every hard refresh for every
--   user, because maskSelected was session-only with no persisted "done" signal).
--   The client also mirrors this to localStorage (sb_onboarding_complete) for
--   immediate same-device coverage; this column makes it cross-device.
--
-- onboarding_gift_granted: true once the new-account onboarding Fortune wallet has
--   been presented. The "Fate has placed N Fortunes upon your shelf" line keys off
--   THIS flag ("has never received the onboarding wallet"), NOT the numeric balance
--   — so it shows exactly once for a genuine new account and never misframes a
--   subscriber's or returning account's balance as a fresh gift.
--
-- Run in the Supabase SQL editor. (Separate from 20260703_gift_60_fortunes.sql,
-- which sets the DEFAULT-60 wallet; BOTH should be applied.)

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_gift_granted boolean DEFAULT false;

-- Backfill existing accounts: they have already been through onboarding and already
-- hold their balance, so mark both flags true — no replayed ceremony, no re-gift,
-- no "Fate placed N on your shelf" line misframing their existing balance.
UPDATE public.profiles SET onboarding_complete = true, onboarding_gift_granted = true;

COMMIT;

-- Rollback: ALTER TABLE public.profiles DROP COLUMN onboarding_complete, DROP COLUMN onboarding_gift_granted;
