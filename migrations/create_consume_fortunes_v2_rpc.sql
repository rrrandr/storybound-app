-- Storybound Currency Unification — consume_fortunes_v2 RPC
--
-- Replaces the two-bucket consume_fortunes RPC with a single-column atomic
-- decrement against profiles.fortunes. Returns ('consumed' | 'insufficient' |
-- 'not_found') plus the remaining balance.
--
-- Safe to run multiple times (CREATE OR REPLACE).
-- Run in the Supabase SQL editor AFTER 20260504_unify_fortunes.sql.
-- Old consume_fortunes is left in place during burn-in; drop after Stage 0b.

CREATE OR REPLACE FUNCTION public.consume_fortunes_v2(p_user_id uuid, p_amount int DEFAULT 1)
RETURNS TABLE(source text, fortunes int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_fortunes int;
BEGIN
  SELECT p.fortunes
    INTO v_fortunes
    FROM public.profiles p
    WHERE p.id = p_user_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::text, 0;
    RETURN;
  END IF;

  IF v_fortunes < p_amount THEN
    RETURN QUERY SELECT 'insufficient'::text, COALESCE(v_fortunes, 0);
    RETURN;
  END IF;

  UPDATE public.profiles
     SET fortunes = fortunes - p_amount
     WHERE id = p_user_id;

  RETURN QUERY SELECT 'consumed'::text, (v_fortunes - p_amount);
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_fortunes_v2(uuid, int) TO anon, authenticated;
