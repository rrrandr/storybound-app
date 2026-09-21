# Local Dev-Server Contamination Incident — Retries 6-8 (2026-09-21)

Roman: "This is one of the few cases where process cleanup is absolutely in-scope, because
otherwise every paid-capability test is contaminated... Clean the machine first; otherwise every
model conclusion is suspect." Dry work only: process hygiene, no provider calls, no image calls, no
story retry, no forks.

## What was wrong

Scene 2 capability retries 6, 7, and 8 (2026-09-20/21) each ended in real infrastructure failure —
HTTP 502s from the scene-spine planner's provider tier(s). Retry 8, run under the newly-added full
3-tier chain (Grok → ministral-8b-2512 → gpt-4o terminal) with the harness's tier-log cross-check,
produced the decisive evidence: **all six real dispatches across two full chain passes** (both the
initial attempt and the app's own bounded retry) returned HTTP 502 with the **identical error body**
— `"An error occurred with this application. NO_RESPONSE_FROM_FUNCTION"` — across three
independent, unrelated providers (xAI/Grok, Mistral, OpenAI). Three separate companies' APIs do not
fail with byte-identical boilerplate by coincidence; that text reads as a Vercel serverless-function-
layer error, not a provider-surfaced one.

Checked directly on this machine (`ps aux` / `lsof`): **157** (later re-confirmed at 155) running
`@vercel/node/dist/dev-server.mjs` processes — each a per-invocation local serverless-function
handler, ALL children (confirmed via `ps -eo pid,ppid,command`) of the single active `vercel dev
--listen 3000` process (PID 24065, running continuously for **4 days, 9+ hours** at time of
discovery). None of the 155 held port 3000 directly (only the parent, PID 24065, did) — they were
per-request handlers that should have exited after completing their work and were not being reaped.
Elapsed times ranged from minutes to over 3 days old. Combined RSS across all 155: **~6.3GB**.

## Diagnosis

This makes retries 6, 7, and 8 **infrastructure-inconclusive, not evidence about model/provider
behavior**. Retries 6-7 each only observed a single tier failing (Grok) before the (separately
already-fixed) harness settlement bug cut them short — consistent with either "Grok is flaky" or
"the local function layer is contaminated," not distinguishing between them. Retry 8, with the full
3-tier chain and the fixed harness observing all six calls to real settlement, produced evidence
that only the local-contamination explanation accounts for: three unrelated providers cannot
plausibly fail identically at the same moment unless the shared local layer routing to all three is
itself the point of failure. The most likely mechanism: `vercel dev`'s per-invocation child-process
handling was not cleanly reaping completed `dev-server.mjs` processes over this session's multi-day
runtime, and the resulting accumulation (155 processes, ~6.3GB RSS) degraded the local server's
ability to spawn or route new function invocations correctly — independent of anything in
`public/app.js`'s provider-tier logic, which retry 8 also proved is correctly implemented (all three
tiers were attempted, in order, exactly as designed).

## Cleanup performed

Dry, no provider calls, no image calls, no story retry, no forks:

1. Identified all `@vercel/node/dist/dev-server.mjs` processes: 155 at cleanup time.
2. Identified the actual active process bound to `localhost:3000` via `lsof -iTCP:3000
   -sTCP:LISTEN`: PID 24065 (`node node_modules/.bin/vercel dev --listen 3000`), confirmed NOT
   itself a `dev-server.mjs` process and NOT touched by this cleanup.
3. Confirmed all 155 candidates shared PPID 24065 exclusively (no other parent, no PID-1 orphans) —
   legitimate children of the one active server, not unrelated or ambiguous processes.
4. Sent `SIGTERM` (not `SIGKILL`) to exactly those 155 PIDs — a graceful termination request, not a
   forced kill.
5. Verified after a few seconds: **0** `dev-server.mjs` processes remained — all exited cleanly on
   `SIGTERM`; no stragglers required escalation to `SIGKILL`.
6. Re-checked PID 24065: still running, still bound to port 3000, RSS actually dropped slightly
   (360MB → 312MB) as the OS reclaimed memory from the exited children — the active server itself
   was never disrupted.
7. Verified `localhost:3000` still responds: `HTTP 200` on a plain `GET /`.
8. Checked overall system memory post-cleanup: ~12.9GB free (`vm_stat`); top memory consumers are
   unrelated applications (ChatGPT/Codex helper processes, a separate local app), not anything in
   this repo's dev environment. Two `claude` process entries are visible at reasonable sizes for
   active agent sessions — normal, not addressed here (not this session's stale processes to kill).

## What this does and does not establish

Does establish: a real, measured, now-resolved process-accumulation problem on this machine that is
a well-supported (not proven beyond all doubt, but far better supported than the alternative)
explanation for retries 6-8's identical, cross-provider 502 pattern.

Does not establish: that this WAS the exact, sole cause (no live retry was run after cleanup to
confirm — out of scope for this pass, per "no story retry"); that the planner-chain and harness work
from the last two passes was unnecessary — both are real, independently valuable, already-proven
fixes regardless of what caused retries 6-8's specific failures.

## Status

Environment cleaned, dry, verified. No code changes in this pass — this is a process-hygiene
incident note, not a fix to `public/app.js` or the test harness. No live retry run or authorized in
this pass. Next Scene 2 retry awaits Roman's explicit authorization, now with a clean local dev
server as a precondition rather than an open question.
