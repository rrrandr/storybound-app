-- ============================================================================
-- Mistral quota governor — durable cross-instance admission (Roman 2026-09-04)
-- ----------------------------------------------------------------------------
-- Vercel Node functions are stateless and horizontally scaled: an in-process
-- limiter governs ONE instance, so two users on two instances both pass it and
-- collide at the provider's own limit. This table plus RPC is the shared
-- authority every instance consults BEFORE dispatching to Mistral.
--
-- ROLLING WINDOW, NOT A MINUTE BUCKET. 20260616_concierge_ip_rate_limit.sql
-- uses fixed buckets keyed 'm:<minute-index>'. That is fine for a coarse
-- per-IP abuse cap, but it permits a whole window of traffic at the end of one
-- bucket and again at the start of the next — a 2x burst across the boundary,
-- which is precisely what breaks an RPS ceiling. Admission here sums the
-- trailing WINDOW_MS of live reservations.
--
-- THE EMPTY-ROW LESSON, taken from 20260830_atomic_fortune_operations.sql:
-- "SELECT … FOR UPDATE locks an EXISTING row; on a first attempt there is no
-- row, so it locks nothing" — two concurrent first requests both passed and
-- both charged. Admission here takes pg_advisory_xact_lock on the BUCKET KEY
-- before reading, which serialises whether or not any row exists yet.
--
-- SELF-SUFFICIENT AND RE-RUNNABLE, because this database does not have a
-- complete migration history (see the same file: a table was ALTERed by a
-- migration whose CREATE had never been applied). Everything needed is created
-- here with IF NOT EXISTS / CREATE OR REPLACE. Safe to run twice.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.mistral_quota_reservations (
  op_id        TEXT        PRIMARY KEY,
  bucket       TEXT        NOT NULL,
  reserved     INTEGER     NOT NULL,
  actual       INTEGER,                       -- NULL until the provider reports usage
  state        TEXT        NOT NULL DEFAULT 'reserved',  -- reserved | reconciled | released
  created_ms   BIGINT      NOT NULL,          -- caller-supplied clock, so tests are deterministic
  expires_at   TIMESTAMPTZ NOT NULL
);

-- Admission reads (bucket, created_ms) for everything still inside the window.
CREATE INDEX IF NOT EXISTS mistral_quota_bucket_time_idx
  ON public.mistral_quota_reservations(bucket, created_ms);
CREATE INDEX IF NOT EXISTS mistral_quota_expires_idx
  ON public.mistral_quota_reservations(expires_at);

-- RLS on with NO policies = deny by default for every non-superuser role. service_role
-- bypasses RLS, which is exactly and only what should reach this table.
ALTER TABLE public.mistral_quota_reservations ENABLE ROW LEVEL SECURITY;
-- PUBLIC FIRST. Revoking anon/authenticated alone leaves the implicit PUBLIC grant intact and
-- every future role inherits it. PUBLIC is the one that matters.
REVOKE ALL ON public.mistral_quota_reservations FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.mistral_quota_reservations TO service_role;

-- ── ADMIT ────────────────────────────────────────────────────────────────────
-- Returns JSONB:
--   {admitted:true,  used_tokens:int}
--   {admitted:false, reason:'tpm'|'rps', used_tokens:int,
--    retry_tpm_ms:int|null, retry_rps_ms:int|null, retry_after_ms:int}
--
-- TPM and RPS are evaluated independently and their wait times computed
-- separately: TPM clears when the oldest counted reservation rolls out of the
-- window; RPS clears one minimum-interval after the last admission. Reporting a
-- single blended number would be wrong for whichever limit did not bind.
CREATE OR REPLACE FUNCTION public.mistral_quota_admit(
  p_op_id            TEXT,
  p_bucket           TEXT,
  p_now_ms           BIGINT,
  p_reserve          INTEGER,
  p_tpm              INTEGER,
  p_window_ms        INTEGER,
  p_min_interval_ms  INTEGER,
  p_retention_ms     INTEGER,
  p_prune_limit      INTEGER DEFAULT 500
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_used        INTEGER;
  v_last_ms     BIGINT;
  v_oldest_ms   BIGINT;
  v_retry_tpm   INTEGER;
  v_retry_rps   INTEGER;
  v_pruned      INTEGER := 0;
  v_ex_bucket   TEXT;
  v_ex_reserved INTEGER;
  v_ex_state    TEXT;
BEGIN
  -- ── ARGUMENT VALIDATION ────────────────────────────────────────────────────
  -- A NULL or non-positive limit would make every comparison below meaningless
  -- and could admit anything. Refused as a typed outcome rather than raised, so
  -- the caller can tell a bad call from an unreachable store — those need
  -- different responses.
  IF p_op_id IS NULL OR p_bucket IS NULL OR p_now_ms IS NULL
     OR p_reserve IS NULL OR p_reserve <= 0
     OR p_tpm IS NULL OR p_tpm <= 0
     OR p_window_ms IS NULL OR p_window_ms <= 0
     OR p_min_interval_ms IS NULL OR p_min_interval_ms < 0
     OR p_retention_ms IS NULL OR p_retention_ms <= 0
     OR p_prune_limit IS NULL OR p_prune_limit <= 0 THEN
    RETURN jsonb_build_object('admitted', false, 'reason', 'invalid_arguments',
      'detail', 'reserve/tpm/window/retention/prune must be positive, min_interval non-negative, ids non-null');
  END IF;
  IF p_retention_ms <= p_window_ms THEN
    RAISE EXCEPTION 'retention (% ms) must exceed the admission window (% ms) — pruning inside the window would reopen spent capacity',
      p_retention_ms, p_window_ms;
  END IF;

  -- ── TWO LOCKS, ALWAYS IN THIS ORDER: OP THEN BUCKET ────────────────────────
  -- op_id is the table's PRIMARY KEY and is therefore GLOBAL, but the bucket lock
  -- is not: two concurrent first requests carrying the same op_id and different
  -- buckets took two DIFFERENT locks, both saw no row, and both proceeded to
  -- insert. One won and the other hit the primary key — raising a SQL error
  -- instead of returning the op_id_mismatch this function promises. The op lock
  -- is global to the id, so those two now serialise against each other and the
  -- loser is answered, not thrown at.
  --
  -- ORDER IS FIXED (op before bucket) in every function that takes both, so no
  -- cycle can form and these locks cannot deadlock against one another.
  PERFORM pg_advisory_xact_lock(hashtext('mistral_quota_op:' || p_op_id));

  -- ── IDEMPOTENCY IS DECIDED FIRST ───────────────────────────────────────────
  -- Before this, admission evaluated RPS and TPM and only then met ON CONFLICT
  -- DO NOTHING. Two things were wrong. A replay could be REFUSED BY ITS OWN
  -- PRIOR ROW — its earlier reservation counted against the window, and its
  -- earlier timestamp violated the minimum interval — so a retried request was
  -- told the bucket was full by itself. And when it was admitted, the conflict
  -- was swallowed silently while the function returned admitted:true with
  -- used + reserve, reporting a charge that never happened. The existing row is
  -- now found FIRST and answered from, so a replay is stable by construction.
  --
  -- Looked up BEFORE pruning, so the answer cannot depend on whether this call
  -- happened to collect the row. A replay arriving after the retention horizon
  -- finds nothing and is admitted afresh, which is correct: that reservation
  -- stopped charging the bucket long ago.
  SELECT bucket, reserved, state INTO v_ex_bucket, v_ex_reserved, v_ex_state
    FROM public.mistral_quota_reservations WHERE op_id = p_op_id;
  IF FOUND THEN
    -- A DIFFERENT REQUEST WEARING THE SAME ID is not a replay. Answering it
    -- from the old row would admit an unmeasured request; answering it as new
    -- would double-charge. Named, refused, and left to the caller.
    IF v_ex_bucket IS DISTINCT FROM p_bucket OR v_ex_reserved IS DISTINCT FROM p_reserve THEN
      RETURN jsonb_build_object('admitted', false, 'reason', 'op_id_mismatch',
        'detail', 'op_id already exists with different bucket/reserve',
        'existing_bucket', v_ex_bucket, 'existing_reserved', v_ex_reserved,
        'requested_bucket', p_bucket, 'requested_reserved', p_reserve);
    END IF;
    -- The sum is a BUCKET fact, so the bucket lock is taken here — after the row
    -- has been resolved, and on the EXISTING row's bucket, which for a matching
    -- replay is the requested one.
    PERFORM pg_advisory_xact_lock(hashtext('mistral_quota:' || v_ex_bucket));
    SELECT COALESCE(SUM(COALESCE(actual, reserved)), 0) INTO v_used
      FROM public.mistral_quota_reservations
     WHERE bucket = p_bucket AND state <> 'released'
       AND created_ms > p_now_ms - p_window_ms;
    -- A released row replays as released: the capacity is not silently retaken.
    RETURN jsonb_build_object('admitted', v_ex_state <> 'released', 'replay', true,
      'reason', CASE WHEN v_ex_state = 'released' THEN 'already_released' ELSE NULL END,
      'used_tokens', v_used, 'state', v_ex_state, 'pruned', 0);
  END IF;

  -- No row for this op_id. Take the bucket lock now, then RE-CHECK: the op lock
  -- keeps other admissions for this id out, but re-validating under both locks
  -- is what makes the insert below safe to write without an ON CONFLICT clause.
  PERFORM pg_advisory_xact_lock(hashtext('mistral_quota:' || p_bucket));
  SELECT bucket, reserved, state INTO v_ex_bucket, v_ex_reserved, v_ex_state
    FROM public.mistral_quota_reservations WHERE op_id = p_op_id;
  IF FOUND THEN
    IF v_ex_bucket IS DISTINCT FROM p_bucket OR v_ex_reserved IS DISTINCT FROM p_reserve THEN
      RETURN jsonb_build_object('admitted', false, 'reason', 'op_id_mismatch',
        'detail', 'op_id already exists with different bucket/reserve (revalidated)',
        'existing_bucket', v_ex_bucket, 'existing_reserved', v_ex_reserved,
        'requested_bucket', p_bucket, 'requested_reserved', p_reserve);
    END IF;
    SELECT COALESCE(SUM(COALESCE(actual, reserved)), 0) INTO v_used
      FROM public.mistral_quota_reservations
     WHERE bucket = p_bucket AND state <> 'released'
       AND created_ms > p_now_ms - p_window_ms;
    RETURN jsonb_build_object('admitted', v_ex_state <> 'released', 'replay', true,
      'reason', CASE WHEN v_ex_state = 'released' THEN 'already_released' ELSE NULL END,
      'used_tokens', v_used, 'state', v_ex_state, 'pruned', 0);
  END IF;

  -- ── SELF-PRUNE, UNDER THE BUCKET LOCK ──────────────────────────────────────
  -- Retention is not a cron's job. Pruning happens here, on the normal path,
  -- inside the lock already held for this bucket, so it can never race the
  -- aggregate read below.
  --
  -- IT CANNOT REOPEN CAPACITY: only rows older than the retention horizon go,
  -- and retention exceeds the window (asserted above), so every deleted row was
  -- already outside every live sum.
  --
  -- BOUNDED WORK, NOT BOUNDED STORAGE. LIMIT caps one request's COST. Rows are
  -- only removed when a later call touches this bucket, so a bucket that goes
  -- quiet keeps its historical rows until traffic returns.
  WITH doomed AS (
    SELECT ctid FROM public.mistral_quota_reservations
     WHERE bucket = p_bucket AND created_ms < p_now_ms - p_retention_ms
     LIMIT p_prune_limit
  )
  DELETE FROM public.mistral_quota_reservations r
   USING doomed d WHERE r.ctid = d.ctid;
  GET DIAGNOSTICS v_pruned = ROW_COUNT;

  -- Live charge = the provider's number where known, the conservative
  -- reservation where not. Released rows never count.
  SELECT COALESCE(SUM(COALESCE(actual, reserved)), 0),
         MAX(created_ms),
         MIN(created_ms)
    INTO v_used, v_last_ms, v_oldest_ms
    FROM public.mistral_quota_reservations
   WHERE bucket = p_bucket
     AND state <> 'released'
     AND created_ms > p_now_ms - p_window_ms;

  -- ① RPS — minimum spacing since the last admitted request.
  IF v_last_ms IS NOT NULL AND (p_now_ms - v_last_ms) < p_min_interval_ms THEN
    v_retry_rps := p_min_interval_ms - (p_now_ms - v_last_ms);
    RETURN jsonb_build_object(
      'admitted', false, 'reason', 'rps', 'used_tokens', v_used,
      'retry_tpm_ms', NULL, 'retry_rps_ms', v_retry_rps, 'retry_after_ms', v_retry_rps, 'pruned', v_pruned);
  END IF;

  -- ② TPM — the reservation must fit what is left of the rolling window.
  IF v_used + p_reserve > p_tpm THEN
    v_retry_tpm := GREATEST(1, (v_oldest_ms + p_window_ms) - p_now_ms);
    RETURN jsonb_build_object(
      'admitted', false, 'reason', 'tpm', 'used_tokens', v_used,
      'retry_tpm_ms', v_retry_tpm, 'retry_rps_ms', NULL, 'retry_after_ms', v_retry_tpm, 'pruned', v_pruned);
  END IF;

  -- No ON CONFLICT clause: the existing-row case returned above, and the
  -- advisory lock means no concurrent inserter can appear between there and
  -- here. A conflict now would be a genuine invariant violation and should
  -- raise rather than be swallowed.
  INSERT INTO public.mistral_quota_reservations
         (op_id, bucket, reserved, actual, state, created_ms, expires_at)
  VALUES (p_op_id, p_bucket, p_reserve, NULL, 'reserved', p_now_ms,
          NOW() + make_interval(secs => (p_retention_ms / 1000.0)));

  RETURN jsonb_build_object('admitted', true, 'replay', false,
                            'used_tokens', v_used + p_reserve, 'pruned', v_pruned);
END;
$$;

-- ── RECONCILE ────────────────────────────────────────────────────────────────
-- p_actual NULL means the provider reported no usage: the conservative
-- reservation STANDS until it rolls out of the window. Unknown is not zero.
CREATE OR REPLACE FUNCTION public.mistral_quota_reconcile(
  p_op_id        TEXT,
  p_actual       INTEGER,
  p_now_ms       BIGINT   DEFAULT NULL,
  p_window_ms    INTEGER  DEFAULT NULL,
  p_retention_ms INTEGER  DEFAULT NULL,
  p_prune_limit  INTEGER  DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_reserved INTEGER; v_bucket TEXT; v_pruned INTEGER := 0;
  v_prune_requested BOOLEAN;
BEGIN
  IF p_op_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_arguments', 'released', 0,
      'detail', 'op_id is required');
  END IF;

  -- ── PRUNE ARGUMENTS ARE VALIDATED BEFORE ANYTHING IS TOUCHED ───────────────
  -- This path used to prune on `p_retention_ms > 0` alone, while ADMISSION also
  -- required retention > window. A caller passing retention = 1 therefore had a
  -- horizon of one millisecond here: every row older than 1 ms — including
  -- reservations still inside the live 60 s window, still charging the bucket —
  -- was deleted, silently reopening capacity that was genuinely in use. The
  -- claim that every RPC input was validated was false for exactly this one.
  --
  -- The window is now an INPUT rather than an assumption, and the same
  -- retention > window invariant admission enforces is enforced here.
  --
  -- ALL-OR-NOTHING: supplying no prune arguments means "reconcile only" and is
  -- valid. Supplying SOME means a caller intended to prune and got it wrong —
  -- that is refused, not silently downgraded to skipping the prune, because a
  -- caller who believes it is pruning and is not will let a table grow forever
  -- while reporting success.
  v_prune_requested := (p_now_ms IS NOT NULL OR p_window_ms IS NOT NULL
                        OR p_retention_ms IS NOT NULL OR p_prune_limit IS NOT NULL);
  IF v_prune_requested THEN
    IF p_now_ms IS NULL OR p_window_ms IS NULL OR p_retention_ms IS NULL OR p_prune_limit IS NULL
       OR p_window_ms <= 0 OR p_retention_ms <= 0 OR p_prune_limit <= 0
       OR p_retention_ms <= p_window_ms THEN
      -- NOTHING IS TOUCHED: no reconcile, no update, no delete. The conservative
      -- reservation stands, which is the safe direction for a malformed call.
      RETURN jsonb_build_object('ok', false, 'reason', 'invalid_arguments', 'released', 0,
        'detail', 'prune arguments must all be present and positive, with retention > window',
        'now_ms', p_now_ms, 'window_ms', p_window_ms,
        'retention_ms', p_retention_ms, 'prune_limit', p_prune_limit);
    END IF;
  END IF;

  -- Same fixed order as admission: op lock first, then bucket.
  PERFORM pg_advisory_xact_lock(hashtext('mistral_quota_op:' || p_op_id));
  SELECT bucket INTO v_bucket FROM public.mistral_quota_reservations WHERE op_id = p_op_id;
  IF NOT FOUND THEN
    -- A LATE RESPONSE IS NOT AN ERROR. The reservation may already have been
    -- pruned: a provider call can outlive the retention horizon. There is
    -- nothing to reconcile and nothing to give back — the row left the window
    -- long ago and its capacity was returned by time. Never re-insert (that
    -- would charge the present for a past call) and never raise (the proxy
    -- calls this after the response is already produced).
    RETURN jsonb_build_object('ok', false, 'reason', 'unknown_op',
                              'late', true, 'released', 0, 'held', 0, 'exact', false);
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('mistral_quota:' || v_bucket));
  SELECT reserved, bucket INTO v_reserved, v_bucket
    FROM public.mistral_quota_reservations WHERE op_id = p_op_id;
  IF NOT FOUND THEN     -- pruned between the two reads
    RETURN jsonb_build_object('ok', false, 'reason', 'unknown_op',
                              'late', true, 'released', 0, 'held', 0, 'exact', false);
  END IF;

  -- ── AN INVALID ACTUAL MUST NOT REDUCE THE CHARGE ───────────────────────────
  -- A negative or absent total is not evidence that less was spent. Treating it
  -- as a number would hand back capacity on the strength of a malformed
  -- response; the conservative reservation stands until the window rolls.
  IF p_actual IS NULL OR p_actual < 0 THEN
    RETURN jsonb_build_object('ok', true, 'released', 0, 'held', v_reserved,
                              'exact', false,
                              'invalid_actual', (p_actual IS NOT NULL AND p_actual < 0));
  END IF;

  UPDATE public.mistral_quota_reservations
     SET actual = p_actual, state = 'reconciled'
   WHERE op_id = p_op_id;

  -- Prune this bucket on the reconcile path too, under the lock already held,
  -- and only with arguments validated above.
  IF v_prune_requested THEN
    WITH doomed AS (
      SELECT ctid FROM public.mistral_quota_reservations
       WHERE bucket = v_bucket AND created_ms < p_now_ms - p_retention_ms
       LIMIT p_prune_limit
    )
    DELETE FROM public.mistral_quota_reservations r
     USING doomed d WHERE r.ctid = d.ctid;
    GET DIAGNOSTICS v_pruned = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object('ok', true, 'released', v_reserved - p_actual,
                            'held', p_actual, 'exact', true, 'pruned', v_pruned);
END;
$$;

-- ── RELEASE ──────────────────────────────────────────────────────────────────
-- ONLY for outcomes that prove the provider did no work. See the proxy: a 429
-- is refused before any generation, so its reservation is genuinely unspent. A
-- 5xx or a thrown fetch proves nothing — the request may have been served and
-- the response lost — and those reservations are RETAINED until the window
-- expires. Releasing them would hand back capacity that was, in fact, consumed.
CREATE OR REPLACE FUNCTION public.mistral_quota_release(
  p_op_id  TEXT,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_reserved INTEGER; v_bucket TEXT;
BEGIN
  IF p_op_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_arguments', 'released', 0);
  END IF;
  -- Same lock discipline as admission and reconcile.
  -- Same fixed order as admission: op lock first, then bucket.
  PERFORM pg_advisory_xact_lock(hashtext('mistral_quota_op:' || p_op_id));
  SELECT bucket INTO v_bucket FROM public.mistral_quota_reservations WHERE op_id = p_op_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unknown_or_already_released',
                              'late', true, 'released', 0);
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('mistral_quota:' || v_bucket));

  UPDATE public.mistral_quota_reservations
     SET state = 'released'
   WHERE op_id = p_op_id AND state <> 'released'
  RETURNING reserved INTO v_reserved;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unknown_or_already_released',
                              'late', true, 'released', 0);
  END IF;
  RETURN jsonb_build_object('ok', true, 'released', v_reserved, 'reason', p_reason);
END;
$$;

-- ── PRIVILEGES: SERVICE ROLE ONLY ───────────────────────────────────────────
-- Postgres grants EXECUTE on a new function to PUBLIC by default. A SECURITY
-- DEFINER quota RPC reachable by anon or authenticated is a spend and
-- availability bypass: any browser holding the anon key could admit itself
-- unlimited capacity, or exhaust the bucket for everyone by reserving it.
-- Revoking PUBLIC is the load-bearing line; naming anon/authenticated as well
-- is belt-and-braces for roles that may hold explicit grants.
REVOKE ALL ON FUNCTION public.mistral_quota_admit(TEXT,TEXT,BIGINT,INTEGER,INTEGER,INTEGER,INTEGER,INTEGER,INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mistral_quota_reconcile(TEXT,INTEGER,BIGINT,INTEGER,INTEGER,INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mistral_quota_release(TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mistral_quota_admit(TEXT,TEXT,BIGINT,INTEGER,INTEGER,INTEGER,INTEGER,INTEGER,INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.mistral_quota_reconcile(TEXT,INTEGER,BIGINT,INTEGER,INTEGER,INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.mistral_quota_release(TEXT,TEXT) TO service_role;

-- ── SELF-ASSERTING MIGRATION ────────────────────────────────────────────────
-- The migration refuses to commit unless the security properties it claims are
-- actually true in the catalog. A hardening step that is merely WRITTEN is not
-- a hardening step; these read it back.
DO $$
DECLARE
  v_fn   TEXT;
  v_cfg  TEXT[];
  v_acl  TEXT;
BEGIN
  FOREACH v_fn IN ARRAY ARRAY['mistral_quota_admit','mistral_quota_reconcile','mistral_quota_release'] LOOP
    SELECT p.proconfig, COALESCE(array_to_string(p.proacl, ','), '')
      INTO v_cfg, v_acl
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = v_fn;

    IF v_cfg IS NULL OR NOT ('search_path=pg_catalog, public' = ANY(v_cfg)) THEN
      RAISE EXCEPTION 'ASSERTION FAILED: %() has no fixed search_path (proconfig=%)', v_fn, v_cfg;
    END IF;
    -- '=X/' with no role prefix is the PUBLIC grant; 'anon=' / 'authenticated=' are theirs.
    IF v_acl LIKE '%,=%' OR v_acl LIKE '=%' THEN
      RAISE EXCEPTION 'ASSERTION FAILED: %() is EXECUTABLE BY PUBLIC (acl=%)', v_fn, v_acl;
    END IF;
    IF v_acl LIKE '%anon=%' OR v_acl LIKE '%authenticated=%' THEN
      RAISE EXCEPTION 'ASSERTION FAILED: %() is executable by anon/authenticated (acl=%)', v_fn, v_acl;
    END IF;
    IF v_acl NOT LIKE '%service_role=%' THEN
      RAISE EXCEPTION 'ASSERTION FAILED: %() is not executable by service_role (acl=%)', v_fn, v_acl;
    END IF;
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                  WHERE n.nspname='public' AND c.relname='mistral_quota_reservations' AND c.relrowsecurity) THEN
    RAISE EXCEPTION 'ASSERTION FAILED: mistral_quota_reservations does not have RLS enabled';
  END IF;

  RAISE NOTICE 'mistral quota governor: security assertions passed (search_path fixed, service_role only, RLS on)';
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;
