# PRODUCTION LOG CHECK — the unseeded Scene-1 stage fatal · 2026-09-07 (read-only)

**Ask.** Confirm from production logs, 2026-08-25 onward, the stage-contract-unresolved fatal and its reader-facing /
refund path: count, earliest/latest, deployments, entry form (unseeded / corridor / Famous Fate), and any
counterexample of a successful unseeded Scene 1.

**Result: NOT CONFIRMABLE from Vercel — the retained data does not reach the window, and the fatal itself never
reaches a server.** Dry reproduction remains evidence, not confirmation.

## 1 · What was checked (signed-in Vercel CLI 59.5.0, team `romans-projects-…`, project `storybound-app`)
- Production deployments on record: **2026-08-07**, **2026-08-30 12:00 EDT** (the first production deployment after
  commit `c8d08fc`, 2026-08-25, which introduced "STAGE RESOLVED BEFORE THE PROMPT"), **2026-09-05 01:08**, **2026-09-05
  16:08** (current).
- Runtime logs retained per deployment (`vercel logs --json -n 100`, no `--since` exists in this CLI):
  - current (09-05 16:08): **10 entries**, window **2026-09-06 10:33 UTC → 2026-09-07 03:27 UTC**; paths
    `/api/csp-report` ×4, `/api/config` ×3, `/api/geo` ×2, `/api/beta-events` ×1. **No `/api/proxy`, `/api/mistral-proxy`,
    `/api/chatgpt-proxy`, `/api/consume-fortune` or `/api/refund-fortune` in the window** — i.e., no story generation
    attempt of any kind is visible in the retained ~17 hours.
  - 09-05 01:08 deployment: **0 entries retained.** 08-30 deployment: **0 entries retained.**
  - No log drain / observability integration on the project (`vercel integration list` → none), so nothing older exists
    anywhere Vercel-side.
- Error-level logs, current deployment: one entry — `POST /api/beta-events` → `[beta-events] insert failed: Could not
  find the table 'public.beta_events' in the schema cache`. **Client telemetry (`sbLogBeta`: scene_generation_started /
  completed, fortune_debit_*, preview_stop_shown…) is not being persisted at all** — the table the endpoint inserts into
  does not exist. So the one durable event trail that could have shown "started, never completed" is empty by defect.

## 2 · Why the fatal cannot appear in server logs even with full retention
`[SCENE1:STAGE:UNRESOLVED]` / `stage contract unresolved …` is a **browser** `console` message. `_markInvocationFatal`
writes only to in-memory state and a test-only sink (`window.__invTrace`); `_settleChainCommit` makes no network call.
The server-visible signature of the abort is indirect: an issue purchase (`/api/consume-fortune` → `fortune_operations`)
followed by **no planner dispatch** (`/api/mistral-proxy` role `PROMPT_PREPROCESSOR`) and then
`/api/refund-fortune` with `context: 'refund_issue'` / `'refund_…'` (a negative `fortune_operations` row keyed by the
purchase's `operationId`). None of those endpoints occur in the retained window.

## 3 · Where a durable answer DOES exist (not queried — outside the authorized scope)
Supabase, read-only:
- `fortune_operations`: purchase rows paired with a `refund_issue` negative row within seconds/minutes and **no
  subsequent story activity** = the abort signature; count and timestamps since 2026-08-30 12:00 EDT.
- `story_snapshots` / `library_entries`: any story created after 2026-08-30 whose `stateSnapshot._starterId` is null
  (or is Famous Fate) with `turn_count ≥ 0` and ≥ 1 saved page = a **counterexample** (a successful unseeded Scene 1).
- `beta_events`: **cannot help** until the table exists.
These would give count, first/last, and entry form (starter id / `fateMode` in the snapshot). A query plan is one
authorization away; no query was run.

## 4 · Standing
- Confirmation status: **open.** Evidence for the unseeded-Scene-1 abort = two dry reproductions under
  shape-faithful fixtures + the committed-code reading (`c8d08fc`); production logs neither confirm nor contradict.
- Separately surfaced: **beta telemetry is dropped in production** (`public.beta_events` missing) — a defect in its own
  right, unrelated to routing.
- No story generation dispatched, no logs/config altered, no secrets printed (only project/team id prefixes shown).
