# Tempt Fate memory-erasure live run — incident report (2026-09-23)

Roman authorized one live run under the seventh-revision authorization sheet's $0.40 combined cap.
Three real attempts followed. **None tested Tempt Fate narrative capability.** This report classifies
what actually happened, corrects the accounting gap it surfaced, and gives a read-only diagnosis of
the local failure — no retry, no server restart, no image work performed or attempted by this report.

## Accurate classification of attempts 1–3

**No billed usage/cost was observed in any attempt** — every real dispatch that fired settled with
an HTTP 502 and no `usage` block, so every `costUsd` computed for this run is `null`/`$0`, not a
positive figure. That is a fact about the observed responses, not a guarantee about what a
successful dispatch would have cost, and it does not make an unbudgeted, unapproved-in-the-sheet
dispatch retroactively fine.

- **Attempt 1**: reached the real Tempt Fate wish-seal click sequence (card → wish columns →
  `#temptZoomInput` → `.tempt-proceed-btn`) successfully. This **made one real provider dispatch**:
  `_classifyWishCG`'s gray-zone `gpt-4o-mini` classifier call, fired fire-and-forget by
  `window.WishSequence.queue(...)`, not awaited by the click handler and not declared anywhere in
  the authorization sheet through its seventh revision. Settled ~31s later with HTTP 502, no usage
  block. The run then failed at `#gnActionInput` (harness bug #1 — `#gnReader`, the screen
  containing the Say/Do input row, is never revealed by `_renderBakedScene1` alone; needs
  `window.showScreen('gnReader')`). **No Scene A or Scene B generation was attempted.**
- **Attempt 2**: fixed harness bug #1 by calling `showScreen('gnReader')` during initial mount —
  this immediately hid the "game" screen the Tempt card itself lives in (harness bug #2 — the two
  screens are mutually exclusive; the transition must happen AFTER the wish is sealed, not before).
  Failed at `.tempt-fate-card` before any click in the wish-seal sequence could occur. **Zero real
  provider dispatches this attempt** — the failure was pure DOM/screen-state, before any network
  request could fire.
- **Attempt 3**: both harness bugs fixed (screen transition moved to fire after wish-seal). Reached
  the real Tempt wish-seal (again dispatching the wish-classifier call for real — settled ~35s
  later, HTTP 502, no usage) and then Scene A's real Submit, which **dispatched the real 3-tier
  scaffold cascade** (`ministral-8b-2512` → `grok-4-1-fast-reasoning` → `gpt-4o-mini`) — **all three
  real dispatches**, each settling in 1.0–2.3 seconds with HTTP 502 and no usage block. Per the
  app's own non-blocking scaffold-failure design, scene generation should have continued to Body
  Bibles / scenePlanner / author after scaffold's total failure, but no further calls appeared
  within the settlement-quiet-period window — consistent with the local failure being systemic
  enough that the rest of the pipeline likely also failed to dispatch, not with a harness bug (see
  diagnosis below). The script correctly detected Scene A did not deliver a captured, rendered
  response and stopped before Scene B, per its own designed safety behavior. **Neither Scene A nor
  Scene B produced any story content; the wish's narrative payoff was never observed.**

**Total real provider dispatches across all three attempts: 5** (2 wish-classifier + 3 scaffold-tier).
**Total settled with a successful response: 0. Total billed cost: $0** (every dispatch failed before
any token generation could occur — a 502 from the local dev layer, not a completed-but-expensive
call). **Zero image dispatches** — `/api/bfl-kontext` was attempted once by the app's own auto-firing
`_prefireWishImage` and correctly aborted by the network gate before reaching the network (confirmed
via the app's own console log: `[BFL] Attempt 1 failed... Failed to fetch`, the standard signature of
a Playwright-aborted request, not a real network round-trip).

## The accounting gap this surfaced, and its correction

Every revision of the authorization sheet through the seventh stated "Tempt Fate itself makes no
network call... Sealing a wish (zoom Proceed) is local only." That claim was never actually verified
against a real Proceed click — every prior dry pass (harness and cost-audit) exercised the Tempt
mechanism via synthetic ledger/plan construction, never the real click-through UI flow. Attempt 1
disproved the claim directly, by making the real dispatch the claim said could not happen. The 502
meant $0 was actually billed, but that is a fact about this particular attempt's luck, not a property
of the mechanism — **a genuinely successful gray-zone classification would have been a real,
unbudgeted cost**, and more importantly, an unapproved-in-the-sheet provider dispatch is a process
gap regardless of what it happened to cost.

**Corrected this pass, before any further diagnosis or retry:**
- `_tempt_fate_memory_erasure_cost_audit.mjs`: added `wishClassifier` to `WORST_CASE_TOKENS`,
  `ROLE_CEILING`, `ROLE_TIER_MODELS`, and a new phase-isolated section 0 ("WISH-SEAL ROLE SEQUENCE")
  that calls the real `window.WishSequence.queue(...)` entry point under its own
  `gate.setPhase('wish-classifier', 1)`, `allowZeroReal:true` (the lexicon can legitimately resolve
  it locally with zero dispatch, same pattern as the Tier-0-eligible Body Bibles). **Not yet
  re-executed** — no script has been run against the app since this edit, per instruction, pending
  the infrastructure diagnosis below.
- `_tempt_fate_memory_erasure_live_authorization_2026_09_23.md`: bumped to EIGHTH REVISION. §2's
  paid-role table gained a "Wish-seal classifier" row; the "local only" claim in §2's opening is
  corrected with the real mechanism and citation. §3 gained a wish-classifier reservation line and
  a recomputed (not yet re-verified) combined ceiling of ≈$0.334289 (was $0.334112).
- `_tempt_fate_memory_erasure_live_test_harness.mjs`: added an explicit comment at the point where
  the dry harness closes the Tempt zoom without sealing a wish, documenting (a) why this is currently
  safe (the real Proceed click, and therefore the classifier, is never reached), and (b) the explicit
  requirement any future extension exercising a real Proceed click must meet first — stub
  `/api/chatgpt-proxy`'s classifier-shaped request or keep the gate fail-closed with no real lane for
  it, and assert the resulting `gate.trackedCalls()` shows the request as stubbed/aborted rather than
  assuming "no scene lane declared" is itself proof nothing was attempted.

## Read-only infrastructure diagnosis — the local failure source

**Exact error, recovered from the app's own console log** (not merely the HTTP 502 status):
```
[WISH-SEQ] CG classifier LLM call failed: LLM API error: 502 (gpt-4o-mini via chatgpt-proxy) -
An error occurred with this application.

NO_RESPONSE_FROM_FUNCTION
```
The identical `NO_RESPONSE_FROM_FUNCTION` text appeared for all three of attempt 3's scaffold-tier
dispatches too (`mistral-proxy`, `proxy`/grok, `chatgpt-proxy`) — **the same generic error, across
four different serverless functions, across two different attempts.** `NO_RESPONSE_FROM_FUNCTION` is
Vercel's own platform-level error, emitted when a function invocation never returns a response within
the platform's own handling — it is not an application-level error message (which would read like
"Missing OPENAI_API_KEY" or a provider's own JSON error body) and it does not originate from any
individual upstream AI provider.

**Process bound to port 3000**: PID 406, `node node_modules/.bin/vercel dev --listen 3000`, running
continuously since Tuesday 03:xx AM — roughly 2+ days of uptime at the time of this incident.

**Accumulated child workers**: `pgrep -P 406` returned **28 child processes**, all
`node .../@vercel/node/dist/dev-server.mjs` (the per-invocation function-runner Vercel dev spawns),
with start times spanning from Sep 22 05:58 AM through Sep 23 00:28 AM — roughly 18+ hours of
accumulation, all currently idle (0.0% CPU) but each still holding ~44-47MB RSS (~1.25GB combined
across the 28, on top of the parent process's own ~400MB). None were reaped/recycled over the
session's lifetime — consistent with a known category of `vercel dev` behavior where per-invocation
function sandboxes are not always cleanly torn down over a long-running dev session.

**Provider configuration**: `.env.local` exists (dated Aug 7, unmodified this session) and declares
`MISTRAL_API_KEY`, `OPENAI_API_KEY`, and `XAI_API_KEY` (names only checked — no values read or
exposed). All three keys needed by the failing endpoints are present.

**Conclusion**: the evidence points at the **local Vercel dev-server function layer** as the shared
failure source, not missing provider configuration (all three relevant keys are declared) and not a
coincidental simultaneous outage across three independent AI providers (implausible, and the error
text itself is a Vercel-platform code, not a provider response). The 28 accumulated idle worker
processes over a 2+ day uptime is the most concrete, specific evidence found — consistent with the
dev server's internal routing/worker-pool becoming unable to properly spawn or connect a fresh
function instance for a new invocation, manifesting identically across every endpoint tested
regardless of which upstream provider that endpoint targets.

**Not determined, and not investigable read-only**: whether a restart would actually clear this
state (plausible given the pattern, not proven), or whether some other transient condition (e.g. a
brief real outage at all three providers simultaneously, or a local network/DNS issue between the
dev server and the internet) coincided with this session. No server-side stdout/stderr log was
accessible for PID 406 (no log file found via `lsof`; it appears to log only to its own detached
terminal).

## Corrected request/cost census (summary)

| | Attempts 1–3 combined |
|---|---|
| Real provider dispatches | 5 (2 wish-classifier, 3 scaffold-tier) |
| Successful (billed) dispatches | 0 |
| Real cost incurred | $0.00 |
| Image dispatches (real) | 0 (1 attempted by the app, correctly blocked by the network gate) |
| Scene A delivered | No |
| Scene B attempted | No |
| Tempt Fate narrative capability tested | No |

## What happens next

No retry, no server restart, no image work, and no further UI-flow diagnostics will be run until
Roman reviews this report. If a restart is the right next step, that requires its own explicit
authorization — not assumed here. The corrected harness/cost-audit code is ready to re-verify the
wish-classifier's real accounting the next time a dry run is authorized, and the live-run script
(`_tempt_fate_memory_erasure_live_run_2026_09_24.mjs`) already has both real screen-transition fixes
applied and is otherwise unchanged — it has not yet completed a single full run against a healthy
server.
