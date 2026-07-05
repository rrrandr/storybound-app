-- ────────────────────────────────────────────────────────────────────────────
-- Make paid Fortune grants authoritative + idempotent on a MONEY-PATH marker
-- (purchase_intents.fortunes_granted_at) instead of status = 'pending'.
--
-- THE RACE THIS FIXES: the webhook granted fortunes only when the intent was
-- still 'pending'. But the client marks the intent resumed on checkout-return
-- (to prevent double-resume on refresh). If the client wins the race, the
-- webhook's grant_purchase_fortunes saw the intent non-pending and returned
-- intent_not_pending → the paid Fortune grant was SKIPPED FOREVER (the user
-- ended up on an optimistic-only balance that collapses on first spend).
--
-- Fix: gate the grant on `fortunes_granted_at IS NULL` (set atomically the
-- first time fortunes are credited for an intent) — completely independent of
-- the client's resume/status writes. The client's resume bookkeeping moves to
-- a separate `resumed_at` column (see app.js) so it can never block credit.
--
-- Hardened: schema-qualified, SECURITY DEFINER with search_path pinned to
-- pg_catalog, public, and table-aliased column references so the `fortunes`
-- column is never ambiguous.
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Money-path marker + non-money resume marker.
ALTER TABLE public.purchase_intents
  ADD COLUMN IF NOT EXISTS fortunes_granted_at timestamptz,
  ADD COLUMN IF NOT EXISTS resumed_at          timestamptz;

-- 2. Backfill: under the OLD RPC, status was set to 'completed' in the SAME
--    transaction as the credit, so status='completed' ⟹ already granted.
--    Stamp those so the new idempotent RPC treats them as already_granted and
--    never re-grants historical purchases.
--    CAVEAT: this is correct ONLY because those completed intents were already
--    credited. Do NOT use this backfill to recover an UNCREDITED completed
--    intent — it would mark it granted without ever crediting. Intentionally
--    leaves 'pending'/'resumed' intents unstamped so verify/webhook can still
--    recover a grant lost to the race above.
UPDATE public.purchase_intents
SET fortunes_granted_at = COALESCE(completed_at, now())
WHERE status = 'completed'
  AND fortunes_granted_at IS NULL;

-- 3. Replace the grant RPC: claim on fortunes_granted_at IS NULL, NOT on
--    status='pending'. Still transitions status pending→completed for
--    continuity, but no longer REQUIRES it. Atomic single-transaction credit;
--    a profile-missing raise rolls the whole thing back so Stripe can retry.
CREATE OR REPLACE FUNCTION public.grant_purchase_fortunes(
  p_user_id uuid,
  p_intent_id uuid,
  p_fortunes int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_new_fortunes int;
BEGIN
  -- Atomic idempotent claim: only the FIRST caller for this intent (whose
  -- fortunes_granted_at is still null) wins. Independent of status, so a
  -- client 'resumed'/'completed' write can never block the credit.
  UPDATE public.purchase_intents AS pi
  SET fortunes_granted_at = now(),
      status = CASE WHEN pi.status = 'pending' THEN 'completed' ELSE pi.status END,
      completed_at = COALESCE(pi.completed_at, now())
  WHERE pi.id = p_intent_id
    AND pi.fortunes_granted_at IS NULL;

  IF NOT FOUND THEN
    -- Already granted, or the intent row doesn't exist. Distinguish so callers
    -- can treat already_granted as success (idempotent) vs a missing intent.
    IF EXISTS (
      SELECT 1
      FROM public.purchase_intents AS pi
      WHERE pi.id = p_intent_id
    ) THEN
      SELECT p.fortunes
      INTO v_new_fortunes
      FROM public.profiles AS p
      WHERE p.id = p_user_id;

      RETURN jsonb_build_object(
        'granted', false,
        'already_granted', true,
        'new_balance', COALESCE(v_new_fortunes, 0),
        'reason', 'already_granted'
      );
    END IF;

    RETURN jsonb_build_object(
      'granted', false,
      'already_granted', false,
      'reason', 'intent_not_found'
    );
  END IF;

  -- We own the claim — credit in the same transaction (rolls back with the
  -- claim on failure, so a retry can re-claim cleanly).
  IF p_fortunes > 0 THEN
    UPDATE public.profiles AS p
    SET fortunes = COALESCE(p.fortunes, 0) + p_fortunes
    WHERE p.id = p_user_id
    RETURNING p.fortunes INTO v_new_fortunes;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'grant_purchase_fortunes: profile_not_found user_id=%', p_user_id;
    END IF;
  ELSE
    SELECT p.fortunes
    INTO v_new_fortunes
    FROM public.profiles AS p
    WHERE p.id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'granted', true,
    'already_granted', false,
    'new_balance', COALESCE(v_new_fortunes, 0)
  );
END;
$$;

-- Service role only — the webhook / verify handlers are the sole callers.
-- (CREATE OR REPLACE preserves existing grants, but re-assert for a fresh DB.)
REVOKE ALL ON FUNCTION public.grant_purchase_fortunes(uuid, uuid, int) FROM public;
REVOKE ALL ON FUNCTION public.grant_purchase_fortunes(uuid, uuid, int) FROM anon;
REVOKE ALL ON FUNCTION public.grant_purchase_fortunes(uuid, uuid, int) FROM authenticated;

NOTIFY pgrst, 'reload schema';
