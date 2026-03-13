-- Stripe webhook event persistence + idempotency guard
-- Run this in the Supabase SQL editor to create the table.
-- If the table already exists with a minimal schema, this will upgrade it.

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB,
  processed BOOLEAN DEFAULT FALSE,
  user_id TEXT,
  stripe_customer_id TEXT,
  checkout_session_id TEXT,
  story_id TEXT
);

-- If table already exists with minimal columns, add missing ones
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_events' AND column_name = 'type'
  ) THEN
    ALTER TABLE stripe_events ADD COLUMN type TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_events' AND column_name = 'payload'
  ) THEN
    ALTER TABLE stripe_events ADD COLUMN payload JSONB;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_events' AND column_name = 'processed'
  ) THEN
    ALTER TABLE stripe_events ADD COLUMN processed BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_events' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE stripe_events ADD COLUMN user_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_events' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE stripe_events ADD COLUMN stripe_customer_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_events' AND column_name = 'checkout_session_id'
  ) THEN
    ALTER TABLE stripe_events ADD COLUMN checkout_session_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stripe_events' AND column_name = 'story_id'
  ) THEN
    ALTER TABLE stripe_events ADD COLUMN story_id TEXT;
  END IF;
END $$;

-- Index for querying unprocessed events (debugging / retry monitoring)
CREATE INDEX IF NOT EXISTS idx_stripe_events_unprocessed
  ON stripe_events (processed) WHERE processed = FALSE;

-- Index for querying by event type (audit queries)
CREATE INDEX IF NOT EXISTS idx_stripe_events_type
  ON stripe_events (type);

-- Index for querying all events for a specific user (debugging)
CREATE INDEX IF NOT EXISTS idx_stripe_events_user_id
  ON stripe_events (user_id);
