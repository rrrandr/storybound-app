-- Add story_id column to stripe_events for webhook traceability.
-- Safe to run multiple times (IF NOT EXISTS).
-- Run this in the Supabase SQL editor.

ALTER TABLE stripe_events
  ADD COLUMN IF NOT EXISTS story_id TEXT;
