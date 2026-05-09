-- Storybound Currency Unification — grant_welcome_milestone RPC
--
-- Atomic check-and-set for welcome-grant milestones (first_arc, day2).
-- Returns ('granted' | 'already_granted' | 'unknown_milestone' | 'not_found')
-- plus the post-grant balance.
--
-- The WHERE clause on the UPDATE serves as the idempotency guard: if the
-- milestone flag is already true, the UPDATE affects zero rows and we report
-- 'already_granted' without modifying the balance. This protects against
-- replays from the orchestrator (multi-tab, retried requests, etc).
--
-- Run in the Supabase SQL editor AFTER 20260504_unify_fortunes.sql.

CREATE OR REPLACE FUNCTION public.grant_welcome_milestone(p_user_id uuid, p_milestone text)
RETURNS TABLE(source text, fortunes int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_fortunes int;
  v_rowcount int;
  v_grant_amount constant int := 20;
BEGIN
  -- Validate milestone name
  IF p_milestone NOT IN ('first_arc', 'day2') THEN
    RETURN QUERY SELECT 'unknown_milestone'::text, 0;
    RETURN;
  END IF;

  -- Lock the row, ensure profile exists
  SELECT p.fortunes
    INTO v_fortunes
    FROM public.profiles p
    WHERE p.id = p_user_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::text, 0;
    RETURN;
  END IF;

  IF p_milestone = 'first_arc' THEN
    UPDATE public.profiles
       SET fortunes = fortunes + v_grant_amount,
           welcome_first_arc_granted = true
       WHERE id = p_user_id
         AND welcome_first_arc_granted = false;
  ELSIF p_milestone = 'day2' THEN
    UPDATE public.profiles
       SET fortunes = fortunes + v_grant_amount,
           welcome_day2_granted = true
       WHERE id = p_user_id
         AND welcome_day2_granted = false;
  END IF;

  GET DIAGNOSTICS v_rowcount = ROW_COUNT;

  IF v_rowcount = 0 THEN
    RETURN QUERY SELECT 'already_granted'::text, COALESCE(v_fortunes, 0);
    RETURN;
  END IF;

  RETURN QUERY SELECT 'granted'::text, (v_fortunes + v_grant_amount);
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_welcome_milestone(uuid, text) TO anon, authenticated;
