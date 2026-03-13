-- Fix: Migrate incorrectly-granted global fortunes back to story-scoped entitlements.
-- For any user who has storypass_entitlements rows, subtract the leaked 20-per-entitlement
-- from the global balance, floored at 0 to prevent negative balances.
-- Run this in the Supabase SQL editor AFTER add_storypass_fortunes_remaining.sql.

-- Step 1: Ensure all existing entitlements have 20 story-scoped fortunes
UPDATE storypass_entitlements
  SET storypass_fortunes_remaining = 20
  WHERE storypass_fortunes_remaining = 0 OR storypass_fortunes_remaining IS NULL;

-- Step 2: Subtract leaked global fortunes (20 per entitlement, floored at 0)
-- GREATEST prevents negative balances. COALESCE guards against NULL subquery.
UPDATE profiles p
SET purchased_fortunes = GREATEST(0, COALESCE(p.purchased_fortunes, 0) - COALESCE((
    SELECT COUNT(*) * 20
    FROM storypass_entitlements e
    WHERE e.user_id = p.id
), 0))
WHERE p.id IN (SELECT DISTINCT user_id FROM storypass_entitlements)
  AND COALESCE(p.purchased_fortunes, 0) > 0;
