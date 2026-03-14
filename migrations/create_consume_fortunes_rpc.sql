-- Create the consume_fortunes RPC function.
-- Atomically deducts fortunes: subscription pool first, then purchased pool.
-- Returns source ('consumed', 'insufficient', 'not_found') + remaining balances.
-- Safe to run multiple times (CREATE OR REPLACE).
-- Run this in the Supabase SQL editor.

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

GRANT EXECUTE ON FUNCTION public.consume_fortunes(uuid, int) TO anon, authenticated;
