-- =============================================================================
-- STORYBOUND — STRIPE SECURITY LOCKDOWN MIGRATIONS
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- =============================================================================

-- ─── 1. stripe_events table (webhook idempotency) ───
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_created_at ON public.stripe_events (created_at);

-- ─── 2. consume_one_credit RPC (atomic credit decrement) ───
CREATE OR REPLACE FUNCTION public.consume_one_credit(p_user_id uuid)
RETURNS TABLE(source text, subscription_credits int, image_credits int)
LANGUAGE plpgsql SECURITY DEFINER AS $$
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

-- ─── 3. RLS hardening (profiles table) ───
-- Drop overly broad update policy if it exists
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Restricted update policy — blocks sensitive columns from client-side writes
CREATE POLICY profiles_update_safe_fields ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    subscription_credits IS NOT DISTINCT FROM (SELECT subscription_credits FROM public.profiles WHERE id = auth.uid())
    AND image_credits IS NOT DISTINCT FROM (SELECT image_credits FROM public.profiles WHERE id = auth.uid())
    AND is_subscriber IS NOT DISTINCT FROM (SELECT is_subscriber FROM public.profiles WHERE id = auth.uid())
    AND subscription_tier IS NOT DISTINCT FROM (SELECT subscription_tier FROM public.profiles WHERE id = auth.uid())
    AND has_god_mode IS NOT DISTINCT FROM (SELECT has_god_mode FROM public.profiles WHERE id = auth.uid())
    AND has_storypass IS NOT DISTINCT FROM (SELECT has_storypass FROM public.profiles WHERE id = auth.uid())
  );
