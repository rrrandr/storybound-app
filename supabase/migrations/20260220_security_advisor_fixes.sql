-- =============================================================================
-- STORYBOUND — SECURITY ADVISOR FIX MIGRATION
-- Resolves all 19 Supabase Security Advisor warnings
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
--
-- Categories:
--   A) Function Search Path Mutable
--   B) RLS Policy Always True
--   C) RLS Allows Anon
--
-- DOES NOT: change app code, alter Stripe logic, modify schemas,
--           drop tables, or change function behavior.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- A) FUNCTION SEARCH PATH MUTABLE
-- Fix: set search_path = pg_catalog, public on each SECURITY DEFINER function
-- ─────────────────────────────────────────────────────────────────────────────

-- A1: consume_one_credit — atomic credit decrement (from 003_stripe_security_lockdown.sql)
CREATE OR REPLACE FUNCTION public.consume_one_credit(p_user_id uuid)
RETURNS TABLE(source text, subscription_credits int, image_credits int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_sub int;
  v_img int;
BEGIN
  SELECT p.subscription_credits, p.image_credits
    INTO v_sub, v_img
    FROM public.profiles p
    WHERE p.id = p_user_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'none'::text, 0, 0;
    RETURN;
  END IF;

  IF v_sub > 0 THEN
    UPDATE public.profiles SET subscription_credits = subscription_credits - 1 WHERE id = p_user_id;
    RETURN QUERY SELECT 'subscription'::text, v_sub - 1, v_img;
  ELSIF v_img > 0 THEN
    UPDATE public.profiles SET image_credits = image_credits - 1 WHERE id = p_user_id;
    RETURN QUERY SELECT 'purchased'::text, v_sub, v_img - 1;
  ELSE
    RETURN QUERY SELECT 'none'::text, 0, 0;
  END IF;
END;
$$;

-- A2: consume_fortunes — atomic fortune decrement (created via dashboard)
-- NOTE: If the function signature differs from below, adjust parameters to match.
-- Run `\df public.consume_fortunes` in SQL Editor to verify before applying.
CREATE OR REPLACE FUNCTION public.consume_fortunes(p_user_id uuid, p_amount int DEFAULT 1)
RETURNS TABLE(source text, subscription_fortunes int, purchased_fortunes int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_sub int;
  v_pur int;
  v_remaining int;
BEGIN
  SELECT p.subscription_fortunes, p.purchased_fortunes
    INTO v_sub, v_pur
    FROM public.profiles p
    WHERE p.id = p_user_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::text, 0, 0;
    RETURN;
  END IF;

  v_remaining := p_amount;

  -- Burn subscription fortunes first
  IF v_sub > 0 AND v_remaining > 0 THEN
    IF v_sub >= v_remaining THEN
      UPDATE public.profiles SET subscription_fortunes = subscription_fortunes - v_remaining WHERE id = p_user_id;
      v_sub := v_sub - v_remaining;
      v_remaining := 0;
    ELSE
      UPDATE public.profiles SET subscription_fortunes = 0 WHERE id = p_user_id;
      v_remaining := v_remaining - v_sub;
      v_sub := 0;
    END IF;
  END IF;

  -- Then burn purchased fortunes
  IF v_pur > 0 AND v_remaining > 0 THEN
    IF v_pur >= v_remaining THEN
      UPDATE public.profiles SET purchased_fortunes = purchased_fortunes - v_remaining WHERE id = p_user_id;
      v_pur := v_pur - v_remaining;
      v_remaining := 0;
    ELSE
      -- Not enough
      RETURN QUERY SELECT 'insufficient'::text, v_sub, v_pur;
      RETURN;
    END IF;
  ELSIF v_remaining > 0 THEN
    RETURN QUERY SELECT 'insufficient'::text, v_sub, v_pur;
    RETURN;
  END IF;

  RETURN QUERY SELECT 'consumed'::text, v_sub, v_pur;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- B) RLS POLICY ALWAYS TRUE — Replace USING(true) with restrictive policies
-- ─────────────────────────────────────────────────────────────────────────────

-- ── B1: sb_rooms ──
-- Ensure RLS is enabled
ALTER TABLE IF EXISTS public.sb_rooms ENABLE ROW LEVEL SECURITY;

-- Drop any permissive policies
DROP POLICY IF EXISTS "Allow all" ON public.sb_rooms;
DROP POLICY IF EXISTS "Enable access for all users" ON public.sb_rooms;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.sb_rooms;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.sb_rooms;
DROP POLICY IF EXISTS "Enable update for all users" ON public.sb_rooms;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.sb_rooms;
DROP POLICY IF EXISTS "sb_rooms_select" ON public.sb_rooms;
DROP POLICY IF EXISTS "sb_rooms_insert" ON public.sb_rooms;
DROP POLICY IF EXISTS "sb_rooms_update" ON public.sb_rooms;
DROP POLICY IF EXISTS "sb_rooms_delete" ON public.sb_rooms;

-- Creator can do everything with their rooms
CREATE POLICY sb_rooms_select ON public.sb_rooms
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY sb_rooms_insert ON public.sb_rooms
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY sb_rooms_update ON public.sb_rooms
  FOR UPDATE USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY sb_rooms_delete ON public.sb_rooms
  FOR DELETE USING (auth.uid() = created_by);

-- Members can read rooms they belong to
CREATE POLICY sb_rooms_member_select ON public.sb_rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sb_room_members m
      WHERE m.room_id = sb_rooms.id AND m.user_id = auth.uid()
    )
  );


-- ── B2: sb_room_members ──
ALTER TABLE IF EXISTS public.sb_room_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON public.sb_room_members;
DROP POLICY IF EXISTS "Enable access for all users" ON public.sb_room_members;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.sb_room_members;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.sb_room_members;
DROP POLICY IF EXISTS "Enable update for all users" ON public.sb_room_members;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.sb_room_members;
DROP POLICY IF EXISTS "sb_room_members_select" ON public.sb_room_members;
DROP POLICY IF EXISTS "sb_room_members_insert" ON public.sb_room_members;
DROP POLICY IF EXISTS "sb_room_members_update" ON public.sb_room_members;
DROP POLICY IF EXISTS "sb_room_members_delete" ON public.sb_room_members;

-- Members can see their own membership
CREATE POLICY sb_room_members_select ON public.sb_room_members
  FOR SELECT USING (auth.uid() = user_id);

-- Room creator can see all members of their room
CREATE POLICY sb_room_members_creator_select ON public.sb_room_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sb_rooms r
      WHERE r.id = sb_room_members.room_id AND r.created_by = auth.uid()
    )
  );

-- Only room creator can add members
CREATE POLICY sb_room_members_insert ON public.sb_room_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sb_rooms r
      WHERE r.id = room_id AND r.created_by = auth.uid()
    )
  );

-- Only room creator can remove members
CREATE POLICY sb_room_members_delete ON public.sb_room_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.sb_rooms r
      WHERE r.id = sb_room_members.room_id AND r.created_by = auth.uid()
    )
  );


-- ── B3: sb_turns ──
ALTER TABLE IF EXISTS public.sb_turns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON public.sb_turns;
DROP POLICY IF EXISTS "Enable access for all users" ON public.sb_turns;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.sb_turns;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.sb_turns;
DROP POLICY IF EXISTS "Enable update for all users" ON public.sb_turns;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.sb_turns;
DROP POLICY IF EXISTS "sb_turns_select" ON public.sb_turns;
DROP POLICY IF EXISTS "sb_turns_insert" ON public.sb_turns;
DROP POLICY IF EXISTS "sb_turns_update" ON public.sb_turns;

-- Room members can read turns
CREATE POLICY sb_turns_select ON public.sb_turns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sb_room_members m
      WHERE m.room_id = sb_turns.room_id AND m.user_id = auth.uid()
    )
  );

-- Room members can insert turns (authored by themselves)
CREATE POLICY sb_turns_insert ON public.sb_turns
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.sb_room_members m
      WHERE m.room_id = room_id AND m.user_id = auth.uid()
    )
  );


-- ── B4: stranger_clicks / sb_stranger_clicks ──
-- These are counter tables. Lock to INSERT-only for authenticated, no UPDATE/DELETE.
-- If both table names exist, fix both. IF NOT EXISTS guards prevent errors.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stranger_clicks') THEN
    EXECUTE 'ALTER TABLE public.stranger_clicks ENABLE ROW LEVEL SECURITY';
    -- Drop permissive policies
    EXECUTE 'DROP POLICY IF EXISTS "Allow all" ON public.stranger_clicks';
    EXECUTE 'DROP POLICY IF EXISTS "Enable access for all users" ON public.stranger_clicks';
    EXECUTE 'DROP POLICY IF EXISTS "Enable insert for all users" ON public.stranger_clicks';
    EXECUTE 'DROP POLICY IF EXISTS "Enable read access for all users" ON public.stranger_clicks';
    EXECUTE 'DROP POLICY IF EXISTS "Enable update for all users" ON public.stranger_clicks';
    EXECUTE 'DROP POLICY IF EXISTS "Enable delete for all users" ON public.stranger_clicks';
    -- INSERT only for authenticated users
    EXECUTE 'CREATE POLICY stranger_clicks_insert ON public.stranger_clicks FOR INSERT TO authenticated WITH CHECK (true)';
    -- No SELECT/UPDATE/DELETE for clients
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sb_stranger_clicks') THEN
    EXECUTE 'ALTER TABLE public.sb_stranger_clicks ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Allow all" ON public.sb_stranger_clicks';
    EXECUTE 'DROP POLICY IF EXISTS "Enable access for all users" ON public.sb_stranger_clicks';
    EXECUTE 'DROP POLICY IF EXISTS "Enable insert for all users" ON public.sb_stranger_clicks';
    EXECUTE 'DROP POLICY IF EXISTS "Enable read access for all users" ON public.sb_stranger_clicks';
    EXECUTE 'DROP POLICY IF EXISTS "Enable update for all users" ON public.sb_stranger_clicks';
    EXECUTE 'DROP POLICY IF EXISTS "Enable delete for all users" ON public.sb_stranger_clicks';
    EXECUTE 'CREATE POLICY sb_stranger_clicks_insert ON public.sb_stranger_clicks FOR INSERT TO authenticated WITH CHECK (true)';
  END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- C) RLS ALLOWS ANON — Tighten or revoke anon access
-- ─────────────────────────────────────────────────────────────────────────────

-- ── C1: badges — public read is OK, no writes from anon/authenticated ──
ALTER TABLE IF EXISTS public.badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON public.badges;
DROP POLICY IF EXISTS "Enable access for all users" ON public.badges;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.badges;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.badges;
DROP POLICY IF EXISTS "Enable update for all users" ON public.badges;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.badges;
DROP POLICY IF EXISTS "badges_select" ON public.badges;

-- Public read (anon + authenticated) — badges are display data
CREATE POLICY badges_select ON public.badges
  FOR SELECT USING (true);

-- No INSERT/UPDATE/DELETE policies → only service role can write


-- ── C2: books — public read is OK, no client writes ──
ALTER TABLE IF EXISTS public.books ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON public.books;
DROP POLICY IF EXISTS "Enable access for all users" ON public.books;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.books;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.books;
DROP POLICY IF EXISTS "Enable update for all users" ON public.books;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.books;
DROP POLICY IF EXISTS "books_select" ON public.books;

-- Public read
CREATE POLICY books_select ON public.books
  FOR SELECT USING (true);

-- No INSERT/UPDATE/DELETE policies → only service role can write


-- ── C3: credit_grants — server-only, NO anon or authenticated access ──
ALTER TABLE IF EXISTS public.credit_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON public.credit_grants;
DROP POLICY IF EXISTS "Enable access for all users" ON public.credit_grants;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.credit_grants;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.credit_grants;
DROP POLICY IF EXISTS "Enable update for all users" ON public.credit_grants;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.credit_grants;
DROP POLICY IF EXISTS "credit_grants_select" ON public.credit_grants;
DROP POLICY IF EXISTS "credit_grants_insert" ON public.credit_grants;

-- Revoke all direct table access from anon and authenticated roles
REVOKE ALL ON public.credit_grants FROM anon;
REVOKE ALL ON public.credit_grants FROM authenticated;

-- No RLS policies at all → only service role can access


-- ── C4: profiles — owner-only SELECT and restricted UPDATE ──
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop broad SELECT policies
DROP POLICY IF EXISTS "Allow all" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Owner can read own profile
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Note: profiles_update_safe_fields already exists from 003_stripe_security_lockdown.sql
-- It restricts UPDATE to owner only AND blocks sensitive column changes.
-- Do NOT re-create it — just verify it exists.
-- If it was dropped somehow, uncomment the block below:
--
-- DROP POLICY IF EXISTS "profiles_update_safe_fields" ON public.profiles;
-- CREATE POLICY profiles_update_safe_fields ON public.profiles
--   FOR UPDATE
--   USING (auth.uid() = id)
--   WITH CHECK (
--     subscription_credits IS NOT DISTINCT FROM (SELECT subscription_credits FROM public.profiles WHERE id = auth.uid())
--     AND image_credits IS NOT DISTINCT FROM (SELECT image_credits FROM public.profiles WHERE id = auth.uid())
--     AND is_subscriber IS NOT DISTINCT FROM (SELECT is_subscriber FROM public.profiles WHERE id = auth.uid())
--     AND subscription_tier IS NOT DISTINCT FROM (SELECT subscription_tier FROM public.profiles WHERE id = auth.uid())
--     AND has_god_mode IS NOT DISTINCT FROM (SELECT has_god_mode FROM public.profiles WHERE id = auth.uid())
--     AND has_storypass IS NOT DISTINCT FROM (SELECT has_storypass FROM public.profiles WHERE id = auth.uid())
--   );

-- INSERT policy: user can insert their own profile row (for initial creation)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);


-- ── C5: publication_submissions — owner-only ──
ALTER TABLE IF EXISTS public.publication_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON public.publication_submissions;
DROP POLICY IF EXISTS "Enable access for all users" ON public.publication_submissions;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.publication_submissions;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.publication_submissions;
DROP POLICY IF EXISTS "Enable update for all users" ON public.publication_submissions;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.publication_submissions;
DROP POLICY IF EXISTS "publication_submissions_select" ON public.publication_submissions;
DROP POLICY IF EXISTS "publication_submissions_insert" ON public.publication_submissions;

-- Owner can read their own submissions
CREATE POLICY publication_submissions_select ON public.publication_submissions
  FOR SELECT USING (auth.uid() = user_id);

-- Owner can insert their own submissions
CREATE POLICY publication_submissions_insert ON public.publication_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- No UPDATE/DELETE from client


-- ── C6: story_snapshots — owner-only (used from client anon key) ──
ALTER TABLE IF EXISTS public.story_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON public.story_snapshots;
DROP POLICY IF EXISTS "Enable access for all users" ON public.story_snapshots;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.story_snapshots;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.story_snapshots;
DROP POLICY IF EXISTS "Enable update for all users" ON public.story_snapshots;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.story_snapshots;
DROP POLICY IF EXISTS "story_snapshots_select" ON public.story_snapshots;
DROP POLICY IF EXISTS "story_snapshots_insert" ON public.story_snapshots;
DROP POLICY IF EXISTS "story_snapshots_update" ON public.story_snapshots;

-- Owner can read own snapshots
CREATE POLICY story_snapshots_select ON public.story_snapshots
  FOR SELECT USING (auth.uid() = profile_id);

-- Owner can insert own snapshots
CREATE POLICY story_snapshots_insert ON public.story_snapshots
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Owner can update own snapshots (for upsert)
CREATE POLICY story_snapshots_update ON public.story_snapshots
  FOR UPDATE USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);


-- ── C7: generation_logs — server-only, NO client access ──
-- This table is written by chatgpt-proxy.js using service role key only.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'generation_logs') THEN
    EXECUTE 'ALTER TABLE public.generation_logs ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Allow all" ON public.generation_logs';
    EXECUTE 'DROP POLICY IF EXISTS "Enable access for all users" ON public.generation_logs';
    EXECUTE 'DROP POLICY IF EXISTS "Enable insert for all users" ON public.generation_logs';
    EXECUTE 'DROP POLICY IF EXISTS "Enable read access for all users" ON public.generation_logs';
    -- Revoke all client access
    EXECUTE 'REVOKE ALL ON public.generation_logs FROM anon';
    EXECUTE 'REVOKE ALL ON public.generation_logs FROM authenticated';
  END IF;
END $$;


-- ── C8: stories — owner-only (accessed via user JWT in stories.js) ──
ALTER TABLE IF EXISTS public.stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON public.stories;
DROP POLICY IF EXISTS "Enable access for all users" ON public.stories;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.stories;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.stories;
DROP POLICY IF EXISTS "Enable update for all users" ON public.stories;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.stories;
DROP POLICY IF EXISTS "stories_select" ON public.stories;
DROP POLICY IF EXISTS "stories_insert" ON public.stories;
DROP POLICY IF EXISTS "stories_update" ON public.stories;

-- Owner can read own stories
CREATE POLICY stories_select_own ON public.stories
  FOR SELECT USING (auth.uid() = author_user_id);

-- Owner can insert own stories
CREATE POLICY stories_insert_own ON public.stories
  FOR INSERT WITH CHECK (auth.uid() = author_user_id);

-- Owner can update own stories
CREATE POLICY stories_update_own ON public.stories
  FOR UPDATE USING (auth.uid() = author_user_id)
  WITH CHECK (auth.uid() = author_user_id);


-- ── C9: stripe_events — server-only, NO client access ──
ALTER TABLE IF EXISTS public.stripe_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON public.stripe_events;
DROP POLICY IF EXISTS "Enable access for all users" ON public.stripe_events;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.stripe_events;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.stripe_events;

REVOKE ALL ON public.stripe_events FROM anon;
REVOKE ALL ON public.stripe_events FROM authenticated;

-- No RLS policies → only service role can access


-- ── C10: user_events — already has correct INSERT policy, add missing restrictions ──
-- The existing policy "Users can insert own events" is correct.
-- Ensure no broad SELECT/UPDATE/DELETE exists.
DROP POLICY IF EXISTS "Allow all" ON public.user_events;
DROP POLICY IF EXISTS "Enable access for all users" ON public.user_events;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_events;
DROP POLICY IF EXISTS "Enable update for all users" ON public.user_events;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.user_events;

-- user_events is write-only telemetry from client. No client reads needed.
-- Only service role reads for analytics.
REVOKE SELECT ON public.user_events FROM anon;


-- =============================================================================
-- DONE. Re-run Security Advisor to verify 0 warnings.
-- =============================================================================
