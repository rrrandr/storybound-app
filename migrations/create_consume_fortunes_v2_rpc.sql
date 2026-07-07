-- Storybound Currency Unification — consume_fortunes_v2 RPC
--
-- Replaces the two-bucket consume_fortunes RPC with a single-column atomic
-- decrement against profiles.fortunes. Returns ('consumed' | 'insufficient' |
-- 'not_found') plus the remaining balance.
--
-- Safe to run multiple times (CREATE OR REPLACE).
-- Run in the Supabase SQL editor AFTER 20260504_unify_fortunes.sql.
-- Old consume_fortunes is left in place during burn-in; drop after Stage 0b.
--
-- 2026-07-07 RE-SYNC: the committed definition had drifted behind production — it lacked
-- BOTH the fortune_ledger threading (context/story_id/scene_idx/source_endpoint/metadata)
-- AND the 42702 disambiguation. Re-synced from the LIVE function (pg_get_functiondef) so
-- re-running this migration can no longer reintroduce the old ambiguous `fortunes` bug.
-- No behavior change vs production. (Copy artifacts from the SQL-editor display — trailing
-- padding + two soft-wraps — normalized; not stored in the live function.)

CREATE OR REPLACE FUNCTION public.consume_fortunes_v2(p_user_id uuid, p_amount integer DEFAULT 1, p_context text DEFAULT NULL::text, p_story_id text DEFAULT NULL::text, p_scene_idx integer DEFAULT NULL::integer, p_source_endpoint text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(source text, fortunes integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  DECLARE
    v_fortunes int;
    v_after    int;
  BEGIN
    IF p_amount IS NULL OR p_amount <= 0 THEN
      RAISE EXCEPTION 'consume_fortunes_v2: invalid p_amount=% (must be a positive integer) user=% context=%',
        p_amount, p_user_id, coalesce(p_context, 'none');
    END IF;

    SELECT p.fortunes INTO v_fortunes
      FROM public.profiles p WHERE p.id = p_user_id FOR UPDATE;

    IF NOT FOUND THEN
      RETURN QUERY SELECT 'not_found'::text, 0;
      RETURN;
    END IF;

    IF v_fortunes < p_amount THEN
      RETURN QUERY SELECT 'insufficient'::text, COALESCE(v_fortunes, 0);
      RETURN;
    END IF;

    v_after := v_fortunes - p_amount;

    -- fixed: assign the pre-computed value (bare `fortunes` is ambiguous with the
    -- RETURNS TABLE output column of the same name → 42702).
    UPDATE public.profiles SET fortunes = v_after WHERE id = p_user_id;

    INSERT INTO public.fortune_ledger
      (user_id, amount, direction, context, story_id, scene_idx, balance_after, source_endpoint, metadata)
    VALUES
      (p_user_id, p_amount, 'debit', p_context, p_story_id, p_scene_idx, v_after, p_source_endpoint, coalesce(p_metadata, '{}'::jsonb));

    RETURN QUERY SELECT 'consumed'::text, v_after;
  END;
  $function$;

GRANT EXECUTE ON FUNCTION public.consume_fortunes_v2(uuid, integer, text, text, integer, text, jsonb) TO anon, authenticated;
