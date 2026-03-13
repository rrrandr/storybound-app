-- Resumable purchase intents
-- Each row = one purchase attempt that should resume on next app boot.
-- Run this in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS purchase_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,              -- storypass | fortunes | subscription
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | completed | resumed
  resume_action TEXT,              -- begin_story | buy_fortunes | etc
  resume_payload JSONB,            -- full story config for resume
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Fast lookup: unresumed intents for a user
CREATE INDEX IF NOT EXISTS idx_purchase_intents_user_status
  ON purchase_intents (user_id, status);

-- Prevent stale intents from accumulating: only one pending intent per user+type
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_intents_pending
  ON purchase_intents (user_id, type) WHERE status = 'pending';
