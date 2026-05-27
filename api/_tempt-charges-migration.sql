-- Monthly subscription Tempt Fate entitlement (Favored = 1, Chosen = 3).
-- Run once against the Storybound Supabase project (SQL editor or psql).
--
-- bonus_tempt_charges : durable account-level balance of free Tempt Fate
--                       charges (granted monthly by tier, consumed via
--                       /api/consume-tempt-charge). Previously this lived only
--                       in client state.bonus_tempt_charges and was never
--                       persisted, so the advertised Chosen "3 Free Tempt Fate"
--                       benefit showed "None earned" in the Treasury.
-- tempt_grant_month   : 'YYYY-MM' of the last monthly grant — idempotency key
--                       so re-subscribe / multiple webhook events / verify
--                       reconciles within the same month don't stack grants.
--
-- Granted server-side in: api/stripe-webhook.js (checkout.session.completed +
-- invoice.paid renewal) and api/verify-subscription.js (reconcile fallback).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bonus_tempt_charges integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tempt_grant_month   text;
