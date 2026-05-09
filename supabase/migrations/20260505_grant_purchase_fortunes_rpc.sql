-- ────────────────────────────────────────────────────────────────────────────
-- grant_purchase_fortunes — atomic intent-completion + additive fortune credit.
--
-- The webhook for checkout.session.completed used to do this in two separate
-- queries: (1) UPDATE purchase_intents pending→completed as the idempotency
-- lock, (2) UPDATE profiles SET fortunes = fortunes + delta. A silent error
-- between (1) and (2) committed the intent transition without crediting the
-- user — and on retry, the lock had already been consumed, so the grant was
-- skipped forever. This RPC merges both writes into a single transaction so
-- a failure in either rolls both back. Stripe's retry can then re-claim and
-- re-attempt cleanly.
--
-- Returns granted=true with new_balance on success, granted=false with
-- reason='intent_not_pending' if another handler already won the lock.
-- Raises if the user profile is missing (caller should retry).
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.grant_purchase_fortunes(
  p_user_id uuid,
  p_intent_id uuid,
  p_fortunes int
) returns jsonb
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_new_fortunes int;
begin
  -- Atomic lock: only one concurrent caller wins the pending → completed transition.
  update public.purchase_intents
  set status = 'completed',
      completed_at = coalesce(completed_at, now())
  where id = p_intent_id
    and status = 'pending';

  if not found then
    return jsonb_build_object('granted', false, 'reason', 'intent_not_pending');
  end if;

  -- Same transaction as the lock — failure here rolls the lock back too.
  if p_fortunes > 0 then
    update public.profiles
    set fortunes = coalesce(fortunes, 0) + p_fortunes
    where id = p_user_id
    returning fortunes into v_new_fortunes;

    if not found then
      raise exception 'grant_purchase_fortunes: profile_not_found user_id=%', p_user_id;
    end if;
  else
    select fortunes into v_new_fortunes from public.profiles where id = p_user_id;
  end if;

  return jsonb_build_object(
    'granted', true,
    'new_balance', coalesce(v_new_fortunes, 0)
  );
end;
$$;

-- Service role only — webhook handler is the sole caller.
revoke all on function public.grant_purchase_fortunes(uuid, uuid, int) from public;
revoke all on function public.grant_purchase_fortunes(uuid, uuid, int) from anon;
revoke all on function public.grant_purchase_fortunes(uuid, uuid, int) from authenticated;
