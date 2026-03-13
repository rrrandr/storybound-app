-- Add story-scoped fortune balance to storypass_entitlements.
-- Each arc purchase grants 20 fortunes usable ONLY within that story.
-- Run this in the Supabase SQL editor.

ALTER TABLE storypass_entitlements
  ADD COLUMN IF NOT EXISTS storypass_fortunes_remaining INTEGER NOT NULL DEFAULT 20;

-- Backfill: any existing entitlements that don't have a value get 20
-- (the default handles this, but be explicit for rows inserted before the column existed)
UPDATE storypass_entitlements
  SET storypass_fortunes_remaining = 20
  WHERE storypass_fortunes_remaining IS NULL;
