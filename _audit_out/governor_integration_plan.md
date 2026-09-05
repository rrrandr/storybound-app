# Mistral quota governor — status and Supabase integration plan

## STATUS: UNPROVEN

The governor is **not proven** and must not be described as working. What exists is a
contract, a mirror of that contract, and tests against the mirror.

| what is proven | how |
|---|---|
| the governor's decision logic | 52 assertions, fake clock, memory adapter |
| the client refuses terminally and shows a busy message | 13 assertions through the real Scene-1 path |
| the SQL *says* what it should | source assertions (S1–S7) |
| **the SQL DOES what it says** | **NOT PROVEN — no database has run it** |

The memory adapter mirrors the PL/pgSQL by hand. Every semantic in it — the advisory lock, the
rolling sum, `ON CONFLICT DO NOTHING`, the release/reconcile updates — is a claim about Postgres
that no Postgres has been asked to confirm. **A mirrored contract passing is not the RPC
passing.** Until the plan below runs green against Supabase, treat the governor as untested
infrastructure.

## Exact SQL execution steps

**Correction to an earlier version of this file.** It opened with
`pg_dump --schema-only --table=public.mistral_quota_reservations` as a "snapshot for rollback".
That is not a valid preflight: `pg_dump --table` on a relation that does not exist **errors**,
and there is nothing to snapshot in the first place. **Every object here is new.** Rollback is
therefore a `DROP`, not a restore, and the preflight's only job is to confirm that the names are
in fact free.

1. **Read-only preflight** — confirm nothing of this name already exists:
   ```sql
   SELECT to_regclass('public.mistral_quota_reservations') AS table_should_be_null;
   SELECT proname, pg_get_function_identity_arguments(p.oid) AS args
     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND proname LIKE 'mistral_quota_%';   -- expect zero rows
   ```
   A non-NULL `to_regclass` or any rows means a previous apply exists: re-running the migration
   is still safe (it is idempotent), but read the rollback section before proceeding.
2. Open the Supabase SQL editor on the target project.
3. Paste `supabase/migrations/20260904_mistral_quota_governor.sql` **whole** and run it. It is
   wrapped in `BEGIN … COMMIT` and is re-runnable.
4. The migration asserts its own security properties before committing. On success it emits
   `NOTICE: mistral quota governor: security assertions passed`. **Any `ASSERTION FAILED`
   exception rolls the whole thing back — that is the intended behaviour, not a partial apply.**
5. Re-run the preflight queries. `to_regclass` non-NULL, three `mistral_quota_*` rows.
6. **Acceptance:**
   ```
   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_ANON_KEY=... \
   SUPABASE_TEST_USER_JWT=... node _governor_supabase_integration.mjs
   ```
   **This runner is the acceptance gate.** A PostgREST root listing showing the RPCs is *not*
   acceptance — it proves registration, not behaviour, and every defect this work has found so
   far was a behaviour that looked registered and correct.

**Rollback** (safe at any point; the table holds only transient reservations).
**These signatures must match the migration exactly.** `DROP FUNCTION IF EXISTS` with the wrong
argument list SUCCEEDS and drops nothing — a rollback that appears to work and did not. Two of
these three were stale (they still named the pre-widening `admit` and `reconcile`); P13a in the
runner exists to catch precisely that, but the runner has never been executed, so it caught
nothing. An assertion that has not run is not a control.
```sql
BEGIN;
DROP FUNCTION IF EXISTS public.mistral_quota_admit(TEXT,TEXT,BIGINT,INTEGER,INTEGER,INTEGER,INTEGER,INTEGER,INTEGER);
DROP FUNCTION IF EXISTS public.mistral_quota_reconcile(TEXT,INTEGER,BIGINT,INTEGER,INTEGER,INTEGER);
DROP FUNCTION IF EXISTS public.mistral_quota_release(TEXT,TEXT);
DROP TABLE IF EXISTS public.mistral_quota_reservations;
NOTIFY pgrst, 'reload schema';
COMMIT;
```
Recovery if the governor misbehaves in production **without** a rollback: the proxy treats an
absent governor as a deployment fault and logs loudly, so the intended kill switch is to revert
the proxy deploy, not to drop the table underneath a running deploy. Note the window: between
the `DROP` and a re-apply the governor does not exist and the proxy **fails closed** — Mistral
requests are refused rather than silently unmetered. `node _governor_supabase_integration.mjs
--rollback-drill` prints the manual drill steps; it deliberately does not perform them, because
a test runner should not open that window on its own schedule.

## Integration test plan — to run against Supabase, with service credentials

Each case names the fixture, the exact call, and the pass condition. All are free: no provider
call is made at any point, and the governor is exercised directly.

| # | case | procedure | pass condition |
|---|---|---|---|
| **P1** | RPC smoke | call each of the three RPCs once with a synthetic `op_id` and a synthetic `now_ms` | all three return JSONB of the documented shape; no exception |
| **P2** | permissions — anon | call `mistral_quota_admit` with the **anon** key | HTTP 401/403, or PostgREST "function not found"; **never** an admission |
| **P3** | permissions — authenticated | same with a signed-in user JWT | same as P2 |
| **P4** | permissions — table | `GET /rest/v1/mistral_quota_reservations` with anon and authenticated keys | empty or denied; never rows |
| **P5** | ★ concurrent first-row admission | 2 (then 20) simultaneous `admit` calls, same bucket, **same `now_ms`**, empty table, sized so only one fits | exactly **one** admitted; the rest refused with a reason. This is the case `SELECT … FOR UPDATE` cannot hold and the advisory lock exists for |
| **P6** | ★ cross-instance contention | admit from two separate processes against the same project | the second sees the first's spend; totals never exceed the configured TPM |
| **P7** | RPS boundary | admit, then admit at `now_ms + interval − 1` and `+ interval`, per model (80 / 320 / 2000 ms) | refused then admitted, exactly at the boundary |
| **P8** | TPM refusal | fill a bucket to its limit, then request one token more | refused with `reason:'tpm'` and `retry_tpm_ms` equal to the oldest row's remaining window |
| **P9** | reconcile releases | admit 42,000, reconcile to 10,000, then request 615,000 on 8B | released = 32,000; the follow-up is admitted |
| **P10** | reconcile absent usage | admit, reconcile with `p_actual = NULL` | released = 0, `exact:false`; the bucket still charged until the window rolls |
| **P11** | release on provider 429 | admit, release, re-request the same size | full reservation returned; re-request admitted; a second release is a no-op |
| **P12** | idempotent op id | admit twice with the same `op_id` | one row; the bucket charged once |
| **P13** | rollback drill | run the rollback block, then re-run the migration | both succeed; the assertions pass again |

The runner implements all of the above plus L1–L4 (late/pruned response) and D1–D4 (bounded
drain). It writes only to buckets named `__itest_<runId>`, which no real model maps to, and
deletes its own rows in a `finally` block — failing the run if any remain. It requires
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` and `SUPABASE_TEST_USER_JWT`
in the environment, reads no dotenv file, and exits 2 if any is absent. It makes no provider
call of any kind. P3 needs a real signed-in user token because an authenticated caller must be
proven denied — the gate does not skip cases it cannot prove.

**Exit criterion:** P1–P13 green against Supabase. Only then may the governor be called proven,
and only then is enabling the preprocessor route worth discussing.

## Not covered, and deliberately

- **Storage is NOT globally bounded, and should not be described as if it were.** Pruning runs
  on the admission and reconcile paths, under the same per-bucket lock, and is capped at
  `PRUNE_LIMIT` rows per call. That bounds the **cost of a request**. It does not bound
  **storage**: rows are only removed when a later admission or reconcile happens on that
  bucket, so a bucket that goes quiet — a model that stops being used, or a traffic lull —
  keeps its historical rows indefinitely, and a backlog only drains as fast as new traffic
  arrives. Cases D1–D4 in the runner assert exactly this, including that leftovers REMAIN after
  a bounded drain. If unbounded retention on an idle bucket is unacceptable, that needs a
  sweeper — but it is now a smaller, stated gap rather than the whole retention story.
- **Clock trust.** `now_ms` is supplied by the caller so tests are deterministic. Every caller
  is our own serverless function, but a skewed instance clock would mis-window its own
  requests. Using `EXTRACT(EPOCH FROM clock_timestamp())*1000` server-side would remove that,
  at the cost of the deterministic tests. Flagged, not decided.
- **The 14B RPS surprise.** 0.5 RPS is the tightest rate in the table despite the second-largest
  TPM: one request per 2 seconds. That bears directly on the 8B-vs-14B preprocessor choice and
  should be weighed there, not here.
