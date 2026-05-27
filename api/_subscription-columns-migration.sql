-- Subscription / Stripe billing columns on profiles.
-- Run once against the Storybound Supabase project your dev server points at
-- (its profiles table predates the subscription system — verify-subscription
-- failed with "column profiles.stripe_subscription_id does not exist", and the
-- webhook couldn't resolve/bind a profile by subscription, so grants were
-- skipped). All IF NOT EXISTS, so it's safe to run even where some exist.
--
-- Referenced by api/stripe-webhook.js, api/verify-subscription.js,
-- api/billing-portal.js, and the client PROFILE_COLUMNS hydrate.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id     text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS is_subscriber          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_tier      text,
  ADD COLUMN IF NOT EXISTS billing_status         text,
  ADD COLUMN IF NOT EXISTS billing_grace_until    timestamptz;

-- Helps resolveProfileBySubscription() (webhook) look profiles up by Stripe id.
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id ON profiles (stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id     ON profiles (stripe_customer_id);

-- Force PostgREST (the REST layer @supabase/supabase-js uses) to pick up the
-- new columns immediately instead of waiting for its schema-cache refresh.
NOTIFY pgrst, 'reload schema';
