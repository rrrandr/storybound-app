-- Transactional, user-bound, concurrency-safe Fortune idempotency
-- (consume_fortunes_v3)
--
-- ── WHAT THIS CLOSES ────────────────────────────────────────────────────────
-- /api/consume-fortune used to INSERT a fortune_operations row and THEN call
-- consume_fortunes_v2 — two statements, not one transaction:
--
--   1. NON-PAYMENT RECORDED AS PAYMENT. A failed or insufficient deduction left
--      the claim behind, so the next retry was answered {duplicate:true} and the
--      client unlocked a purchase nobody paid for.
--   2. REPLAYS WERE NOT BOUND TO THE PURCHASER. The lookup matched operation_id
--      alone — any caller holding someone else's id received success.
--   3. CONCURRENT FIRST ATTEMPTS COULD BOTH CHARGE. `SELECT … FOR UPDATE` locks
--      an EXISTING row; on a first attempt there is no row, so it locks nothing.
--      Two simultaneous requests with the same new operation id both passed the
--      replay lookup, both serialized on the profile, and both deducted — the
--      second INSERT then resolving through ON CONFLICT DO UPDATE, leaving one
--      operation row describing one of two charges. With mismatched requests it
--      is worse: two different users or amounts could both be charged and the
--      surviving row would describe only one of them.
--
-- The fix for (3) is to serialize on the operation id BEFORE the lookup, which
-- a transaction-scoped advisory lock does whether or not a row exists yet.
--
-- Run in the Supabase SQL editor. Safe to re-run.

BEGIN;

-- ── 0. BOOTSTRAP: the table this migration alters ──────────────────────────
--
-- fortune_operations was introduced by 20260325_create_fortune_operations.sql,
-- but that migration had never been applied to the production database — the
-- table was absent when this one was deployed on 2026-08-30 and had to be
-- created by hand first. A migration that ALTERs a table it does not create is
-- only safe on databases with a complete migration history, and this project
-- does not have one. Creating it here (IF NOT EXISTS, so it is a no-op wherever
-- it already exists) makes this file self-sufficient: a fresh database gets the
-- exact production schema from this file alone.
--
-- Schema kept identical to 20260325 so the two cannot diverge.
CREATE TABLE IF NOT EXISTS public.fortune_operations (
    operation_id text PRIMARY KEY,
    user_id      uuid NOT NULL,
    context      text,
    amount       integer,
    created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fortune_operations_created_at
  ON public.fortune_operations (created_at);

-- ── 1. Operation records carry proof of what was bought ────────────────────
--
-- status DEFAULTS TO 'unverified', which is deliberate and load-bearing: rows
-- already in this table were written by the OLD endpoint, before the deduction
-- was attempted, so some of them are orphan claims for charges that never
-- happened. Defaulting them to 'succeeded' would hand exactly those rows a paid
-- replay — the defect this migration exists to remove. They are quarantined
-- instead. v3 writes 'succeeded' explicitly, and only on the path where the
-- balance moved.
ALTER TABLE public.fortune_operations
  ADD COLUMN IF NOT EXISTS story_id      text,
  ADD COLUMN IF NOT EXISTS status        text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS balance_after integer;

-- Belt-and-braces for a re-run against a table where the column already exists
-- with the old 'succeeded' default: anything v3 did not write is unverified.
UPDATE public.fortune_operations
   SET status = 'unverified'
 WHERE status = 'succeeded'
   AND balance_after IS NULL;   -- v3 always records a balance; the old path never did

ALTER TABLE public.fortune_operations ALTER COLUMN status SET DEFAULT 'unverified';

COMMENT ON COLUMN public.fortune_operations.status IS
  'succeeded = the deduction committed in the SAME transaction as this row (v3 only). unverified = written by the pre-v3 endpoint before the deduction was attempted; it is NOT proof of payment and must never replay as paid.';
COMMENT ON COLUMN public.fortune_operations.balance_after IS
  'Balance immediately after the deduction. NULL on every pre-v3 row, which is what makes them identifiable.';

CREATE INDEX IF NOT EXISTS idx_fortune_operations_user ON public.fortune_operations (user_id);

-- ── 2. A deterministic link between a charge and its operation ─────────────
-- The ledger had no operation_id, which is why pre-v3 rows cannot be reconciled
-- by anything better than a time window — and a time window can mistake an
-- unrelated debit of the same size for proof of payment. v3 writes the id, so
-- from here on the link is exact.
ALTER TABLE public.fortune_ledger
  ADD COLUMN IF NOT EXISTS operation_id text;
CREATE INDEX IF NOT EXISTS fortune_ledger_operation_idx
  ON public.fortune_ledger (operation_id);

-- ── 3. Serialize, claim and deduct — all in one transaction ────────────────
CREATE OR REPLACE FUNCTION public.consume_fortunes_v3(
  p_operation_id   text,
  p_user_id        uuid,
  p_amount         integer,
  p_context        text DEFAULT NULL,
  p_story_id       text DEFAULT NULL,
  p_scene_idx      integer DEFAULT NULL,
  p_source_endpoint text DEFAULT NULL,
  p_metadata       jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(source text, fortunes integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
  DECLARE
    v_op       public.fortune_operations%ROWTYPE;
    v_fortunes int;
    v_after    int;
  BEGIN
    IF p_amount IS NULL OR p_amount <= 0 THEN
      RAISE EXCEPTION 'consume_fortunes_v3: invalid p_amount=% user=% context=%',
        p_amount, p_user_id, coalesce(p_context, 'none');
    END IF;
    IF p_operation_id IS NULL OR length(p_operation_id) = 0 THEN
      RAISE EXCEPTION 'consume_fortunes_v3: operation_id is required';
    END IF;

    -- ── STEP 1: serialize on the operation id ─────────────────────────────
    -- This is the whole fix for the concurrent-first-attempt race. Row locks
    -- cannot help here because on a first attempt there IS no row to lock. An
    -- advisory lock is taken on the identifier itself, so two simultaneous
    -- requests carrying the same operation id queue here; the second proceeds
    -- only after the first has committed and is therefore guaranteed to SEE its
    -- operation row. Transaction-scoped: released on commit or rollback, so a
    -- failure cannot strand it.
    PERFORM pg_advisory_xact_lock(hashtextextended(p_operation_id, 0));

    -- ── STEP 2: re-read the operation under that lock ─────────────────────
    SELECT * INTO v_op FROM public.fortune_operations
      WHERE operation_id = p_operation_id FOR UPDATE;

    IF FOUND THEN
      -- ── STEP 3: an operation id is not a bearer token ───────────────────
      IF v_op.user_id IS DISTINCT FROM p_user_id
         OR v_op.amount IS DISTINCT FROM p_amount
         OR coalesce(v_op.context, '')  IS DISTINCT FROM coalesce(p_context, '')
         OR coalesce(v_op.story_id, '') IS DISTINCT FROM coalesce(p_story_id, '') THEN
        RETURN QUERY SELECT 'operation_mismatch'::text, 0;
        RETURN;
      END IF;

      IF v_op.status = 'succeeded' THEN
        RETURN QUERY SELECT 'duplicate'::text, coalesce(v_op.balance_after, 0);
        RETURN;
      END IF;

      IF v_op.status = 'unverified' THEN
        -- A pre-v3 claim. It is not evidence that anything was paid, and it is
        -- not evidence that nothing was. Refuse both readings rather than risk
        -- a free unlock or a double charge; these need a human. See the
        -- reconciliation note at the end of this file.
        RETURN QUERY SELECT 'operation_unverified'::text, 0;
        RETURN;
      END IF;

      -- Any other recorded state is a failure, not a payment: fall through and
      -- genuinely retry.
    END IF;

    -- ── STEP 4: lock the profile ──────────────────────────────────────────
    SELECT p.fortunes INTO v_fortunes
      FROM public.profiles p WHERE p.id = p_user_id FOR UPDATE;

    IF NOT FOUND THEN
      RETURN QUERY SELECT 'not_found'::text, 0;
      RETURN;
    END IF;

    -- ── STEP 5: check funds ───────────────────────────────────────────────
    IF v_fortunes < p_amount THEN
      -- Records NOTHING. A claim written here is exactly the orphan that let an
      -- unpaid operation replay as paid.
      RETURN QUERY SELECT 'insufficient'::text, coalesce(v_fortunes, 0);
      RETURN;
    END IF;

    -- ── STEP 6: deduct, ledger, claim — inseparable ───────────────────────
    v_after := v_fortunes - p_amount;
    UPDATE public.profiles SET fortunes = v_after WHERE id = p_user_id;

    INSERT INTO public.fortune_ledger
      (user_id, amount, direction, context, story_id, scene_idx, balance_after,
       source_endpoint, metadata, operation_id)
    VALUES
      (p_user_id, p_amount, 'debit', p_context, p_story_id, p_scene_idx, v_after,
       p_source_endpoint, coalesce(p_metadata, '{}'::jsonb), p_operation_id);

    INSERT INTO public.fortune_operations
      (operation_id, user_id, context, amount, story_id, status, balance_after)
    VALUES
      (p_operation_id, p_user_id, p_context, p_amount, p_story_id, 'succeeded', v_after)
    ON CONFLICT (operation_id) DO UPDATE
      SET status = 'succeeded', balance_after = EXCLUDED.balance_after;

    RETURN QUERY SELECT 'consumed'::text, v_after;
  END;
  $function$;

-- ── 4. FUNCTION PRIVILEGES — the RPC is not a public API ───────────────────
--
-- A SECURITY DEFINER function is EXECUTABLE BY PUBLIC unless privileges are
-- revoked, and this one takes p_user_id as an argument. Left public, any holder
-- of the anon key could call it directly — bypassing /api/consume-fortune
-- entirely, including the token check that endpoint performs — and deduct
-- Fortunes from ANY account. Hardening the HTTP layer is worthless while the
-- function underneath it answers to everyone.
--
-- THIS RUNS INSIDE THE SAME TRANSACTION AS THE CREATE ABOVE, and that placement
-- is the point. Postgres grants PUBLIC execute on a new function by default, so
-- a sweep that ran after COMMIT would leave two holes: a failed sweep would
-- report a failed deployment while leaving v3 committed and world-executable,
-- and even a successful one would expose it for the gap between the two. Create
-- and lock down land together or not at all.
--
-- The same is true of the OLDER functions. consume_fortunes_v2 and its v1
-- predecessor were explicitly GRANTed to anon and authenticated
-- (20260706_fortune_ledger.sql:116, create_consume_fortunes_v2_rpc.sql:61,
-- create_consume_fortunes_rpc.sql:64), so locking down v3 alone would just move
-- the attack one function to the left. The grant-side functions are in the same
-- class: grant_welcome_milestone and grant_purchase_fortunes MINT Fortunes.
--
-- VERIFIED SAFE TO REVOKE: the browser calls exactly one RPC directly —
-- mouth_bank_merge (public/app.js:175022). Every function below is invoked only
-- from a server route holding the service-role key, which is unaffected by these
-- REVOKEs. Nothing in the client breaks.
--
-- The explicit signatures are the contract; the DO block applies them only where
-- the function actually exists, so a signature that has drifted in one
-- environment cannot abort the whole migration:
--
--   REVOKE ALL ON FUNCTION public.consume_fortunes_v3(text, uuid, integer, text, text, integer, text, jsonb) FROM PUBLIC, anon, authenticated;
--   GRANT EXECUTE ON FUNCTION public.consume_fortunes_v3(text, uuid, integer, text, text, integer, text, jsonb) TO service_role;
--   REVOKE ALL ON FUNCTION public.consume_fortunes_v2(uuid, integer, text, text, integer, text, jsonb) FROM PUBLIC, anon, authenticated;
--   REVOKE ALL ON FUNCTION public.consume_fortunes(uuid, integer) FROM PUBLIC, anon, authenticated;
--   REVOKE ALL ON FUNCTION public.grant_welcome_milestone(uuid, text) FROM PUBLIC, anon, authenticated;
--   REVOKE ALL ON FUNCTION public.grant_purchase_fortunes(...) FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  r      record;
  v_v3   oid := NULL;
  n      int := 0;
  v_anon bool := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon');
  v_auth bool := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated');
  v_svc  bool := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role');
BEGIN
  FOR r IN
    SELECT p.oid, p.oid::regprocedure AS sig, p.proname
      FROM pg_proc p
      JOIN pg_namespace ns ON ns.oid = p.pronamespace
     WHERE ns.nspname = 'public'
       AND p.proname IN ('consume_fortunes', 'consume_fortunes_v2', 'consume_fortunes_v3',
                         'grant_welcome_milestone', 'grant_purchase_fortunes')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
    IF v_anon THEN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', r.sig); END IF;
    IF v_auth THEN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', r.sig); END IF;
    IF v_svc  THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig); END IF;
    IF r.proname = 'consume_fortunes_v3' THEN v_v3 := r.oid; END IF;
    n := n + 1;
    RAISE NOTICE 'locked down %', r.sig;
  END LOOP;

  -- v3 IS CREATED BY THIS MIGRATION. Not finding it, or finding it still
  -- reachable, is a failed deployment — not a warning to be scrolled past. The
  -- exception rolls back the CREATE along with everything else, so the function
  -- never exists in an unsecured state.
  IF v_v3 IS NULL THEN
    RAISE EXCEPTION 'consume_fortunes_v3 not found after creation — aborting so it cannot be left publicly executable';
  END IF;
  IF has_function_privilege('public', v_v3, 'EXECUTE') THEN
    RAISE EXCEPTION 'consume_fortunes_v3 is STILL executable by PUBLIC after the sweep — aborting';
  END IF;
  IF v_anon AND has_function_privilege('anon', v_v3, 'EXECUTE') THEN
    RAISE EXCEPTION 'consume_fortunes_v3 is STILL executable by anon after the sweep — aborting';
  END IF;
  IF v_auth AND has_function_privilege('authenticated', v_v3, 'EXECUTE') THEN
    RAISE EXCEPTION 'consume_fortunes_v3 is STILL executable by authenticated after the sweep — aborting';
  END IF;

  -- A legacy function absent from this database is tolerable; v3 is not.
  IF n < 2 THEN
    RAISE WARNING 'only % fortune function(s) locked down — verify the legacy functions exist in this database', n;
  END IF;
END
$$;

-- ── 5. TABLE PRIVILEGES — the ledger of who paid is not public either ──────
--
-- Locking the FUNCTIONS while leaving the table readable would still expose
-- every operation id, user id and amount to any holder of the anon key — and an
-- operation id is the one value a replay attempt needs. Applied by hand in
-- production on 2026-08-30; folded in here so a fresh database is not left open.
--
-- RLS with no policies denies anon and authenticated outright. service_role
-- bypasses RLS, so the server routes are unaffected.
ALTER TABLE public.fortune_operations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.fortune_operations FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.fortune_operations FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.fortune_operations FROM authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON TABLE public.fortune_operations TO service_role;
  END IF;
END
$$;

COMMIT;

-- ── LEGACY OPERATIONS: QUARANTINED, NOT RECONCILED ──────────────────────────
-- Every pre-v3 row is now status='unverified' and returns 'operation_unverified'
-- rather than a paid replay. That is the only safe default, because THERE IS NO
-- DETERMINISTIC LINK for those rows: fortune_ledger gained operation_id only in
-- this migration, so a pre-v3 claim cannot be matched to its debit by anything
-- stronger than "a debit of the same size, for the same user, at about the same
-- time" — which will happily mistake an unrelated 60F purchase for proof.
--
-- Do NOT write a time-window UPDATE to bulk-promote them.
--
-- Inspect what is quarantined:
--   SELECT operation_id, user_id, amount, context, created_at
--     FROM public.fortune_operations
--    WHERE status = 'unverified' ORDER BY created_at DESC;
--
-- NO TTL JOB EXISTS. The cleanup in 20260325_create_fortune_operations.sql is a
-- COMMENTED example (line 15), not an installed schedule, so nothing drains this
-- table automatically — an earlier draft of this file claimed otherwise and was
-- wrong. Quarantined rows persist until deleted deliberately.
--
-- That is not a correctness problem: an operation id is minted per purchase, so
-- a stale quarantined row only ever blocks a retry of that one purchase. A user
-- who hits one (rare — it requires retrying an id minted before this deploy) is
-- resolved by support crediting the account, never by promoting the row.
--
-- If you do install a cleanup, it MUST NOT delete rows a client might still
-- retry: the client keeps its recovery id for 24h (_OP_STORE_TTL_MS in app.js),
-- and deleting a 'succeeded' row inside that window turns the next retry into a
-- SECOND REAL CHARGE. A window of several days is the safe shape:
--
--   -- run manually, or schedule if pg_cron is enabled in this project:
--   DELETE FROM public.fortune_operations WHERE created_at < now() - interval '7 days';
--
-- Rollback: DROP FUNCTION public.consume_fortunes_v3(text,uuid,integer,text,text,integer,text,jsonb);
--           (the added columns are additive and safe to leave)
