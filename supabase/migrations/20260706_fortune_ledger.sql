-- ────────────────────────────────────────────────────────────────────────────
-- Fortune Ledger + fail-loud consume  (Roman 2026-07-06)
--
-- Motivation: consume_fortunes_v2 only decremented profiles.fortunes with NO
-- audit trail, and the API defaulted a missing/NaN price to 1 (`parseInt||1`), so
-- any mispriced call silently charged exactly 1 Fortune and left no record. A user
-- lost 1F to an unknown path and it was un-diagnosable from SQL.
--
-- This migration:
--   1. Creates a durable, append-only public.fortune_ledger (debits + credits).
--   2. Rewrites consume_fortunes_v2 to (a) REJECT a non-positive p_amount at the DB
--      (belt-and-suspenders with the endpoint), and (b) write a debit ledger row in
--      the SAME transaction as the balance decrement — atomic, DB is source of truth.
--   3. Adds a credit ledger row to grant_purchase_fortunes.
--
-- Safe to re-run (idempotent DDL + CREATE OR REPLACE).
-- ────────────────────────────────────────────────────────────────────────────

-- 1. LEDGER TABLE ────────────────────────────────────────────────────────────
create table if not exists public.fortune_ledger (
  id              bigint generated always as identity primary key,
  user_id         uuid not null,
  amount          int  not null check (amount > 0),
  direction       text not null check (direction in ('debit', 'credit')),
  context         text,
  story_id        text,
  scene_idx       int,
  balance_after   int,
  source_endpoint text,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists fortune_ledger_user_created_idx
  on public.fortune_ledger (user_id, created_at desc);
create index if not exists fortune_ledger_context_idx
  on public.fortune_ledger (context);

alter table public.fortune_ledger enable row level security;

-- service_role bypasses RLS entirely (admin/back-office reads). Authenticated users
-- may read ONLY their own rows; nobody may write via the API — only the
-- SECURITY DEFINER functions below insert (they bypass RLS).
drop policy if exists fortune_ledger_owner_read on public.fortune_ledger;
create policy fortune_ledger_owner_read
  on public.fortune_ledger for select
  to authenticated
  using (auth.uid() = user_id);

-- 2. CONSUME — fail-loud + atomic debit ledger row ───────────────────────────
-- Signature changes (extra params), so drop the old 2-arg overload first to avoid
-- an ambiguous-function error on named-param calls.
drop function if exists public.consume_fortunes_v2(uuid, int);

create or replace function public.consume_fortunes_v2(
  p_user_id         uuid,
  p_amount          int   default 1,
  p_context         text  default null,
  p_story_id        text  default null,
  p_scene_idx       int   default null,
  p_source_endpoint text  default null,
  p_metadata        jsonb default '{}'::jsonb
)
RETURNS TABLE(source text, fortunes int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_fortunes int;
  v_after    int;
BEGIN
  -- DB-level fail-loud: a NULL / zero / negative amount is a caller bug, never a
  -- 1F fallback. Raising here guarantees invalid pricing can never silently charge.
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'consume_fortunes_v2: invalid p_amount=% (must be a positive integer) user=% context=%',
      p_amount, p_user_id, coalesce(p_context, 'none');
  END IF;

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

  v_after := v_fortunes - p_amount;

  -- Assign the pre-computed value (not `fortunes - p_amount`): the RETURNS TABLE output
  -- column is also named `fortunes`, so the bare RHS is ambiguous (42702). Safe under the
  -- FOR UPDATE lock held above.
  UPDATE public.profiles
     SET fortunes = v_after
     WHERE id = p_user_id;

  -- Atomic audit: same transaction as the decrement. If this insert fails, the
  -- whole charge rolls back — DB truth and ledger never diverge.
  INSERT INTO public.fortune_ledger
    (user_id, amount, direction, context, story_id, scene_idx, balance_after, source_endpoint, metadata)
  VALUES
    (p_user_id, p_amount, 'debit', p_context, p_story_id, p_scene_idx, v_after, p_source_endpoint, coalesce(p_metadata, '{}'::jsonb));

  RETURN QUERY SELECT 'consumed'::text, v_after;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_fortunes_v2(uuid, int, text, text, int, text, jsonb) TO anon, authenticated;

-- 3. GRANT (purchase) — write a credit ledger row too ────────────────────────
-- Unchanged signature (stays compatible); adds an atomic credit row on success.
-- NOTE (fast-follow): grant_subscription_fortunes should get the same credit row.
-- Left untouched here to avoid editing a function body not in this migration.
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
  update public.purchase_intents
  set status = 'completed',
      completed_at = coalesce(completed_at, now())
  where id = p_intent_id
    and status = 'pending';

  if not found then
    return jsonb_build_object('granted', false, 'reason', 'intent_not_pending');
  end if;

  if p_fortunes > 0 then
    update public.profiles
    set fortunes = coalesce(fortunes, 0) + p_fortunes
    where id = p_user_id
    returning fortunes into v_new_fortunes;

    if not found then
      raise exception 'grant_purchase_fortunes: profile_not_found user_id=%', p_user_id;
    end if;

    insert into public.fortune_ledger
      (user_id, amount, direction, context, balance_after, source_endpoint, metadata)
    values
      (p_user_id, p_fortunes, 'credit', 'purchase', v_new_fortunes, 'grant_purchase_fortunes',
       jsonb_build_object('intent_id', p_intent_id));
  else
    select fortunes into v_new_fortunes from public.profiles where id = p_user_id;
  end if;

  return jsonb_build_object(
    'granted', true,
    'new_balance', coalesce(v_new_fortunes, 0)
  );
end;
$$;
