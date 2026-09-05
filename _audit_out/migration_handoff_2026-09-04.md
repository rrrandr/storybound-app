# Migration handoff — 2026-09-04

Written for picking this work up on a new Mac. **Contains no credentials, tokens or keys**, and
authorizes nothing: no paid call, no live scene, no deploy, no routing change.

---

## 1 · Where the work is

| | |
|---|---|
| repo | `~/storybound-app` |
| branch | `fix/procedural-container-rootout` |
| head | **`9b82320`** — the Mistral quota governor (scoped commit) |
| upstream | **not pushed.** The branch has no tracking relationship reported; nothing has left this machine |

Relevant recent commits, newest first:

- **`9b82320`** `feat(quota)` — shared durable Mistral quota governor. The subject of this handoff.
- **`6462d31`** `fix(payload)` — four author-payload blocks entered the prompt through gates that
  could not say no (onboarding orchestration ungated, deck-frame QA bypass, wish adjudication
  gated on story-level text, tautological wish-demo gate).
- **`750b4b3`** `feat(cost)` — xAI usage ledger: reasoning spend made measurable without changing
  what is spent.
- **`310b93c`** `docs(cplus)` — what one real scene costs, and why it stayed unrun at that point.

---

## 2 · Database state — APPLIED

`supabase/migrations/20260904_mistral_quota_governor.sql` **has been applied** to the live
Supabase project via the SQL editor. Do not re-apply blindly; it is idempotent and safe to
re-run, but the preflight in §1 of `_audit_out/governor_integration_plan.md` tells you whether
it is already there (`to_regclass` + a `pg_proc` query, both read-only).

It created one table and three `SECURITY DEFINER` functions, all `service_role`-only with a fixed
`search_path`, RLS on, and `EXECUTE` revoked from `PUBLIC`/`anon`/`authenticated`. The migration
asserts those properties in a `DO` block and rolls itself back if any is false.

### Acceptance: PASSED against live Supabase

`node _governor_supabase_integration.mjs` — **80 assertions, 0 failed**, covering P1–P17:

| case | result |
|---|---|
| P1 service-role admit / reconcile / release | documented shapes |
| P2 / P3 anon **401**, authenticated **403** on all three RPCs | denied |
| P4 table unreadable by anon and authenticated | denied |
| P5 2 and **20** simultaneous first requests on an empty bucket | exactly **one** admitted |
| P6 cross-process contention | second process saw the first's spend |
| P7 all four RPS boundaries (80 / 320 / 1000 / 2000 ms) | exact |
| P8 TPM refusal + retry time | matched the oldest row's remaining window |
| P9 / P10 reconcile releases; absent usage holds | correct |
| P11 provider-429 release, double release | correct |
| P12 / P14 idempotency, replay before RPS/TPM, named mismatch | correct |
| P15 argument validation, negative actual preserved | correct |
| P16 concurrent same-op / different-bucket, ×10 bursts | 0 raises, 0 double rows |
| P17 reconcile prune validation | live reservation survived every invalid call |
| L1–L4 late/pruned response · D1–D4 bounded drain · P13a rollback signatures | correct |

**Cleanup confirmed.** The runner reported `remaining test rows=0` and deleted its disposable
auth user (`http=200`, post-delete lookup `404`). An earlier invocation of mine was killed by
`SIGPIPE` (piped through `head`) before its `finally` ran and left 36 `__itest_*` rows and one
orphaned user; both were removed and re-verified at **0 rows, 0 users**. Nothing of the test
remains in the project.

---

## 3 · What the governor does, and what is proven

Admission for `/api/mistral-proxy` is decided in Postgres — shared by every serverless instance —
**before** any provider dispatch.

- **Rolling window**, not a fixed minute bucket. A fixed bucket admits a full window at the end
  of one and again at the start of the next; that 2× burst is what breaks an RPS ceiling.
- **Fractional rates are never rounded up.** Spacing is `ceil(1000/rps)`, so 3.13 rps → 320 ms
  (3.125/s, *under* the allowance). TPM and RPS wait times are computed and reported separately.
- **Conservative reservation**: UTF-8 request bytes + `max_tokens` (~4× the real input),
  reconciled to the provider's reported total on response. **A response with no usage keeps the
  conservative charge until the window rolls — unknown is never zero.**
- **Over-budget fails before dispatch** with a named error. Never sent over budget, never
  silently moved to a larger model.
- **Fail-closed**: no governor (missing config, unconstructable client, unreachable store) ⇒
  named **503**, zero provider calls.
- **Release only where no provider work occurred**: provider 429 and face-rejection 4xx.
  **5xx and thrown fetches RETAIN** their reservation until the window expires — a 5xx can follow
  a request that was served and billed whose response was lost.
- **Terminal for the caller.** A `governor:true` refusal never retries, never falls back to
  OpenAI/Grok, never substitutes a model. All 17 Mistral dispatch sites are audited by
  `_mistral_path_audit.mjs`: 2 guarded, 1 reviewed-unreachable, 14 inert, **0 unguarded**.
- **Reader-visible outcome** on Scene 1: *"Storybound is at capacity right now, so your story
  hasn't started. Please try again in about N seconds."* Before this, that abort path printed
  nothing and left a dead screen.

### Known maintenance caveat — idle-row retention

Pruning runs on the admission and reconcile paths, under the bucket lock, capped at
`PRUNE_LIMIT` (500) rows per call. **That bounds the cost of a request, not storage.** Rows are
removed only when a later call touches that bucket, so:

- a bucket that goes quiet (a model that stops being used, a traffic lull) **keeps its historical
  rows indefinitely**;
- a backlog drains only as fast as new admissions arrive.

Cases D1–D4 assert exactly this, including that leftovers *remain* after a bounded drain. If
unbounded retention on an idle bucket becomes unacceptable, it needs a sweeper (a daily
`DELETE … WHERE expires_at < NOW()`). **This is a stated gap, not a defect** — but it is the one
thing about the governor that will quietly grow over months.

A second, smaller note: `now_ms` is supplied by the caller so tests are deterministic. Every
caller is our own serverless function, but a badly skewed instance clock would mis-window its own
requests. Moving to `clock_timestamp()` server-side would remove that at the cost of the
deterministic tests. Flagged, not decided.

---

## 4 · Deployment state

**Nothing is deployed. Nothing is pushed.** `9b82320` exists only in the local repo on the
machine being migrated. The live site runs whatever was last deployed, which does **not** include
the governor. The database, however, **does** have the migration — so production code and
production schema are currently out of step in the safe direction: the new objects exist and
nothing calls them.

---

## 5 · Model-routing drafts — deliberately EXCLUDED and INACTIVE

None of the following is committed, and none of it is active:

| draft | state |
|---|---|
| flag-gated `PROMPT_PREPROCESSOR` route (`window._preprocessorRoute` → `small`/`8b`/`14b`) | excluded; default was `small`, i.e. no behaviour change even if restored |
| Ministral entries in the proxy `ALLOWED_MISTRAL_MODELS` allowlist | excluded — **the committed allowlist has no Ministral model, so nothing can route to one** |
| per-model `reasoning_effort` capability map for the three Ministral ids | excluded |
| browser-side Mistral pacing gate | **rejected and fully reverted.** Superseded by the server governor. Do not revive it |
| in-payload `callSite` telemetry field | reverted (it covered 8 of 49 dispatches; `role` also selects the model, so it could not be used as a label) |
| harness-only fetch observer in `_cold_scene1_cost_run.mjs` | uncommitted; harness-only, never in a shipped file |

`api/_mistral-governor.js` **does** carry Ministral entries in `MODEL_LIMITS` (3B 1.3M TPM /
12.5 RPS, 8B 625k / 3.13, 14B 937.5k / 0.5, dated to the account Limits page). That is limit
*configuration*, not routing: with no allowlist entry the proxy rejects those models before
dispatch. It is inert and correct to keep.

> ### ⚠ The drafts live only in this machine's temp directory
> The excluded hunks were backed up to
> `/private/tmp/claude-501/.../scratchpad/{app.full.js, proxy.full.js}`, which is machine-local
> and **will not survive the migration**. They are small and fully described in §7 below, so
> reconstructing them is a short job — but if you want the exact bytes, copy those two files off
> the old Mac before wiping it. Nothing else depends on them.

---

## 6 · Open work, in priority order

1. **Decide whether to push/deploy `9b82320`.** The migration is applied and the code is not.
   Deploying activates admission for every Mistral call. Fail-closed means a Supabase outage
   refuses Mistral rather than spending unmetered — correct, but it is a behaviour change worth
   choosing deliberately.
2. **Idle-row sweeper** (§3 caveat) — small, and best done before the governor has been live
   long enough to accumulate.
3. **`PROMPT_PREPROCESSOR` routing** — the largest cost lever, gated below.
4. **The 71 KB → 33 KB question is already closed** by `6462d31`; no action.
5. **Cold Scene 1 cost measurement has never completed.** Two live attempts stopped before the
   author ran (first: harness dispatching to the live site; second: Mistral 429s). The wire-level
   measurement path is repaired and dry-proven but the *number* does not exist yet.
6. **`_buildFatelandsWishCoreDirective`** (~6 KB) has the same story-level-text gating leak that
   `6462d31` fixed elsewhere. Untouched by decision; its own scoped change.

---

## 7 · Prerequisites and decision gate for model-routing evaluation

Nothing about routing should be attempted until all of these are true. They are ordered; each
depends on the one before.

1. **Governor deployed and observed.** Admission must be live and behaving before routing changes
   ride on top of it, or a routing failure and a quota failure become indistinguishable.
2. **`PRIMARY_AUTHOR` call sites separated.** 67 `callChatGPT` sites resolve to that one role
   (40 explicit, 22 by omission, the rest via an options-object shift). `role` **selects and
   authorizes the model** in `api/chatgpt-proxy.js`, so it cannot be repurposed as a label —
   separation needs a non-routing field, and the in-payload attempt was reverted because it
   covered only the `callChatGPT` path. A harness-only fetch observer attributed 49/49 dry
   dispatches to 38 sites; that inventory is in `_audit_out/per_site_inventory_dry.md`.
3. **A frozen input corpus for the preprocessor.** Building one means capturing real prompt
   content, which has been deliberately avoided all along. **This needs an explicit scope
   decision from you**, because it changes what gets stored.
4. **Contract fixtures per migrated role** — one real response shape each, never a union.
5. **A paid budget decision.** Comparing 8B vs 14B for the preprocessor requires real dispatch.
   **This handoff authorizes none.**

**The decision gate:** routing may proceed only when (1)–(4) are done *and* you have explicitly
authorized a bounded spend for (5), naming the ceiling. Absent that, the correct next action on
routing is nothing.

Useful context already established, so it need not be re-derived: the preprocessor request is
~85 KB (~21k nominal tokens) and cannot fit Mistral Small's 20,000 TPM bucket; both Ministral 8B
and 14B solve throughput comfortably, so the choice is contract quality, not capacity; **14B has
the tightest rate in the family at 0.5 RPS** (one request per 2 s) despite the second-largest
TPM, which matters for anything bursty.

---

## 8 · No authorization is granted by this document

This handoff authorizes **no** paid or live model call, **no** live Scene 1, **no** deploy or
push, **no** routing activation, and **no** schema change. Every one of those needs its own
explicit go-ahead. In particular: `_governor_supabase_integration.mjs` has already been run and
passed; **it does not need to be run again**, and re-running it requires fresh credentials and a
disposable auth user.

---

## 9 · New-Mac setup checklist

No secrets are listed here. Every credential must be copied from a password manager or
regenerated from its provider's dashboard.

**Repo and toolchain**

1. Clone the repo and check out `fix/procedural-container-rootout`. Confirm the head is
   `9b82320` — if it is not, the branch did not travel and the work is still only on the old Mac.
2. Node 25.x (the toolchain in use), then `npm install`.
3. `node node_modules/playwright-core/cli.js install chromium` — every harness here drives a real
   page. Use the repository-pinned installer, not `npx playwright install chromium`: npx can
   download a newer browser build that the pinned `playwright-core` cannot launch.

**Environment**

4. Recreate `.env.local` at the repo root. It is git-ignored and holds the provider and Supabase
   credentials. Copy the values from your password manager; the *names* the code reads are
   discoverable from `api/config.js` and the proxy handlers. **Do not copy the file over an
   unencrypted channel.**
5. Nothing in the repo reads a dotenv file for the integration runner — it takes credentials from
   the environment only, by design.

**Verify the machine is healthy**

6. Start the dev server: `npx vercel dev --listen 3000`. If port 3000 is occupied by a wedged
   process, `lsof -ti:3000 | xargs kill -9` first — this happened repeatedly and looks like an
   app fault when it is not.
7. Free, no provider calls:
   ```
   node _mistral_governor.mjs        # expect 137 passed, 0 failed
   node _mistral_path_audit.mjs      # expect  10 passed, 0 failed
   node _governor_failclosed.mjs     # expect  19 passed, 0 failed
   node _governor_client_path.mjs    # expect  13 passed, 0 failed
   ```
8. Broader regression (needs the dev server; still free):
   ```
   node _scene1_skeleton_delivery.mjs   # expect 369 passed · 0 failed (~10-15 min)
   node _block_gating_proof.mjs         # expect  84 passed, 0 failed
   node _pending_admission.mjs          # expect  66 passed · 0 failed
   npm run verify:scene1 && npm run verify:causal && npm run verify:economy
   ```
9. `_scene1_skeleton_delivery.mjs` regularly exceeds a 10-minute foreground timeout. Run it in the
   background and poll rather than assuming it hung.

**Do not, without a fresh decision**

10. Do not re-apply the migration (already applied), re-run the integration runner (already
    passed), push, deploy, enable any route flag, or make a paid call.

**Orientation reading, in order**

- `_audit_out/governor_integration_plan.md` — preflight, exact SQL steps, rollback block,
  P1–P17 specifications.
- `_audit_out/per_site_inventory_dry.md` — the 38-site dispatch inventory behind any routing work.
- `_audit_out/routing_matrix.md` — the model routing matrix and its corrections.
- `_audit_out/cold_scene1_run2.md` — why the last live cost run is not a valid Scene-1 cost.
- `_audit_out/measurement_path_fixes.md` — what was repaired in the measurement path and what
  remains unproven.
