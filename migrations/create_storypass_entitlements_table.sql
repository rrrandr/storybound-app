-- Arc-based Storypass entitlements
-- Each row = one purchased 20-scene arc for a specific story.
-- Run this in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS storypass_entitlements (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  story_id TEXT NOT NULL,
  arc_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, story_id, arc_number)
);

-- Named unique index — guarantees no duplicate arc unlocks even if application logic fails
-- (Supplements the UNIQUE table constraint for explicit visibility in pg_indexes)
CREATE UNIQUE INDEX IF NOT EXISTS storypass_unique_arc
  ON storypass_entitlements (user_id, story_id, arc_number);

-- Fast lookups: all arcs a user owns for a story
CREATE INDEX IF NOT EXISTS idx_storypass_entitlements_user_story
  ON storypass_entitlements (user_id, story_id);

-- Fast lookups: all entitlements for a user (debugging)
CREATE INDEX IF NOT EXISTS idx_storypass_entitlements_user
  ON storypass_entitlements (user_id);
