# Continuation Capability Retry — Future Authorization Sheet (2026-09-20, eighth revision + harness fix note)

**Not authorized. Not run. No provider or image call has been made preparing this sheet.** This
describes a proposed, separate, later paid operation for when you choose to authorize it.

This revision follows retry #5 (real, run — the gate caught a bad Grok-sourced plan live, zero
author spend, see `_scene2_capability_retry5_report_2026_09_20.md`) and Roman's verdict:
**"Model strength alone is not the fix... The player choice should steer the story, not hijack the
skeleton."** The planner contract itself changed this pass — a REQUIRED SCENE FUNCTION frame now
renders before the reader's posture, and a new posture-echo check catches a plan that paraphrases
the raw Say/Do text instead of translating it. See `_scene2_required_scene_function_trace_2026_09_20.md`.

**Post-revision addendum:** retry #6 (same day) came back inconclusive — a real 502 from the
Grok-primary planner tier, $0 spend, no capability evidence either way
(`_scene2_capability_retry6_report_2026_09_20.md`). Traced dry, no provider calls: the real bug was
in the TEST HARNESS, not production code. `_e2e_network_gate.mjs`'s `waitForSettlement` returned the
instant the first tracked call settled, before the app's own correctly-implemented fallback/retry
logic had a chance to issue its next request — so both retry 5 (the gate's bounded retry) and retry
6 (the tier fallback after the 502) may have been silently cut off before they finished, not
genuinely single-shot outcomes. Addressed, NOT confirmed fixed (`_e2e_network_gate.mjs`,
quiet-period settlement check, commit `cc503c04`) — full control suite re-run green, 104/104, no
behavior change for any existing control, only timing. **This means retries 5 and 6 may understate
what the app actually did**; report language calling them single-attempt outcomes should be read
with that caveat. Retry #7 (below) shows this first pass at the fix was real but incomplete — read
the "Second addendum" before treating this settlement-timing question as resolved.

**Second addendum:** retry #7 (same session, on the fixed harness) hit a SECOND real 502 from the
same Grok endpoint — worth naming as a possible real, current reliability issue on that serving
function, separate from this codebase. New finding: the app's own console log proved
`_callTieredProvider`'s fallback logic DID fire correctly this time ("attempt 2 tier=fallback
provider=mistral...") — retry 6's implied "fallback never fires" read does not hold up. The gap is
narrower than first thought: the fallback's own resulting request never got tracked/settled before
the browser closed — a race the quiet-period fix didn't fully close. Widened further as a precaution
(`quietMs` default 3s → 8s), not a confirmed fix. See `_scene2_capability_retry7_report_2026_09_20.md`.
Two consecutive real infrastructure failures (0/2, both $0 spend) — before an eighth attempt, worth
deciding whether to wait out possible endpoint instability or accept the residual risk.

**Roman, 2026-09-21: "Hold off. Don't keep poking a flaky Grok endpoint tonight... the next 'retry'
is mostly testing whether that endpoint feels better, not whether Scene 2 works."** No further
retry authorized as of this addendum. Retry now only when separately authorized.

**Third addendum (same day, dry work only):** the scene-spine planner chain gained a third tier —
Grok primary → ministral-8b-2512 fallback → **gpt-4o terminal** (new) — since this is the one role
that decides the actual next-scene event and previously had no terminal, unlike every other
important text path in this codebase. A single Grok 502 (or a Grok+ministral double failure) no
longer necessarily means the planner produced nothing; the terminal tier gives it one more real
chance before genuinely exhausting. The Planner Function Gate is unchanged and applies identically
regardless of which tier produced the plan. Also: the harness observation gap behind retries 6 and 7
is now more precisely understood and directly addressed (not just widened) — see the corrected
pre-run note and full trace below. Proven 19/19 (`_scene2_planner_terminal_tier_control.mjs`) + 3/3
(`_harness_tier_log_cross_check_control.mjs`); full trace:
`_scene2_planner_terminal_tier_trace_2026_09_21.md`. All 8 pre-existing controls re-run green
(104/104 before this addition). No live retry run.

## Pre-run note — classify a fully-exhausted chain as infrastructure, not a story result

The chain is now Grok → ministral → gpt-4o terminal. If a future retry exhausts ALL THREE tiers
(each returning a transport/parse failure — `_callTieredProvider` throws "all tiers exhausted"):
classify it immediately as provider/serving instability across multiple providers simultaneously —
record cost (likely near $0, since failed tiers rarely bill) and stop. Do NOT interpret total
exhaustion as evidence about the required-scene-function contract, the planner-policy change, or
Scene 2 capability. A single Grok 502 alone is no longer grounds to stop early — the chain should be
given the chance to fall through to ministral and then gpt-4o before concluding infrastructure
failure. That capability question stays open and untested until a real planner reply is obtained on
some tier AND evaluated by the Planner Function Gate.

**Fourth addendum, retry #8 (same day) — the harness fix worked; the diagnosis changes.** Under the
full 3-tier chain with the tier-log-cross-checking harness, retry #8 ran correctly end to end: six
real dispatches (grok/ministral/gpt-4o, twice — the initial pass and the app's own bounded retry),
all observed through to real settlement, exactly as designed. **All six returned HTTP 502 with the
identical error body** `"An error occurred with this application. NO_RESPONSE_FROM_FUNCTION"` —
across THREE independent, unrelated providers (xAI, Mistral, OpenAI). That is not a plausible
coincidence across three separate companies. Checked directly on this machine: **157** running
`@vercel/node/dist/dev-server.mjs` processes, most dating back days, with only one actually bound to
port 3000. This makes a LOCAL dev-server infrastructure problem the better-supported explanation for
retries 6-8's failures than "Grok is flaky" — the earlier single-tier observations (retries 6-7)
were consistent with either explanation; this run's three-independent-provider, identical-error
result is not. Full account: `_scene2_capability_retry8_report_2026_09_21.md`. **Revise the pre-run
note above accordingly:** a full chain exhaustion with this exact identical-error-across-providers
signature should prompt checking local dev-server health (and the stale-process count) BEFORE
assuming provider-side instability — the gpt-4o terminal tier, however well-built, cannot route
around a problem in the shared local proxy layer all three tiers depend on.

## Future option — controlled fallback-path test (not a policy change)

A SEPARATE, explicitly-scoped option still exists for later, now less urgent given the terminal
tier: force `window._scenePlannerEngine = 'ministral'` (the existing escape hatch, `public/app.js`)
for one retry, to verify the REST of the continuation stack against a planner tier that isn't Grok.
Explicitly NOT a proposal to revert the Grok-primary policy decision. Would need its own explicit
authorization, separate from a normal Grok-primary retry.

## What this is testing

Not "which model is smarter" — closed; retry 5 showed Grok alone didn't fix it. Not "does the gate
work" — proven dry AND live (retry 5). This would be retry #6: the FIRST real test of whether a
required-function frame — instantiated first, with posture as modulation rather than the event's
source — changes what either model actually proposes. Six real attempts on one causal input is a
lot; whoever authorizes this may want to weigh a fresh player branch instead.

## What changed since retry 5

- **Root causes A/B/C**, **Findings 1-3**, the **Planner Function Gate**, and the **Grok-primary
  planner policy** — all unchanged this revision, confirmed coexisting with today's addition.
- **NEW — REQUIRED SCENE FUNCTION frame**: `STARTER_PLANS.starter_first_sacrifice.scenes[n=2]`
  carries a new `sceneFunction` field (not new canon — restated from this row's own `exitState` and
  the seed's own worldTruths-sanctioned lanes), rendered in the planner prompt as a HARD block
  BEFORE the reader's posture. The posture line itself is reframed as the reader's "ANGLE" into that
  frame, never the source of the central event. Two new required JSON output keys
  (`scene_function_instantiated`, `aftermath_obligations`) requested when the field is present.
- **NEW — posture-echo reject check**: `_postureEchoBigram`, folded into
  `_detectPlannerFunctionGap` as a second, independent rejection reason — catches a plan that
  shares a meaningfully distinctive phrase with the reader's raw Say/Do text (retry 5's real plan
  shared "to burn"/"burn for" with the Fate-Card line it was supposed to translate, not restate).
- Proven 14/14, `_scene2_required_scene_function_control.mjs`, using retry 5's real posture + real
  rejected plan as the red fixture. All 8 pre-existing controls re-run green (104/104 total across
  the suite after this addition).

## Scope

- Same mechanism as every prior replay: reuse the already-paid, persisted real OAS turn-reply,
  Fate-Card, and scaffold content via the zero-cost stub-lane replay — real spend starts only at the
  planner/author call.
- Same player decision (Boundary card, the same real Say/Do) — a capability retry on the SAME
  causal input, not a new player branch — unless whoever authorizes this prefers a fresh branch,
  given five failures/rejections already on this one.
- The planner now sees the REQUIRED SCENE FUNCTION frame before the posture, and must return
  `scene_function_instantiated`/`aftermath_obligations` alongside its existing fields.
- If the plan fails the (now two-part) Planner Function Gate — no aftermath signal, OR echoes the
  posture almost verbatim — the attempt stops there, $0 author spend, reported as a gate rejection.
- Only if the gate passes does the author fire; THEN run `_detectSceneAdequacyFailure` on the
  delivered prose before calling it usable.
- If this retry ALSO fails or gate-rejects, that is real, strong evidence the remaining gap is
  neither model-tier-shaped nor posture-framing-shaped — a genuinely harder open question, reported
  honestly, not concealed.

## Cost ceiling (estimate)

Retry #5's real, measured total was $0.00981465 (gate-rejected before author spend — the cheapest
outcome so far). Retries 6-7 were $0.00 (pure 502 exhaustion under the old 2-tier chain). If a
future retry's plan clears the gate, real cost would run closer to retry #4's $0.228671 (Grok
planner + Grok author + adjacent calls). **Ceiling revised** for the new 3-tier planner chain (Grok
→ ministral → gpt-4o terminal) — worst case now includes a real gpt-4o call if both earlier tiers
fail transport-wise (estimated ≤$0.03 for that one call at this prompt's real size, ~24.3K chars /
~6.1K tokens, `max_tokens: 1200`, well under the $0.08 line below):

| Phase | Ceiling (USD) | Physical requests |
|---|---|---|
| scene2-planner (chain now 3-tier — Grok → ministral → gpt-4o terminal) | $0.08 | ≤3 |
| scene2-author (unchanged) | $0.40 | ≤2 |
| **Total** | **$0.48** | **≤8** |

Adequacy re-validation is dry (`_detectSceneAdequacyFailure`, `_detectPlannerFunctionGap`) — $0
additional. This is a proposed revision on an unauthorized, not-run sheet — not itself a spend
commitment.

## What this would (and would not) prove

Would prove: whether framing the required scene function explicitly, before the planner reads
posture, changes what event it proposes — and if the gate now passes, whether the resulting
dramatization clears full adequacy.

Would not prove: that Scenes 3-10 are adequate; that a different player branch holds the same
standard; that beat-kind diversity (still not encoded as a reject-only check) is satisfied. A single
sample is still one sample — this framework change deserves more than one real draw before anyone
concludes it works, but that's a larger, separately-authorized program, not this one retry.

## Status

Fifteen fixes in place and dry-proven across nine passes (root causes A/B/C, Findings 1-3, the
Planner Function Gate, the Grok-primary planner policy, the Required Scene Function frame, the
posture-echo check, the gpt-4o terminal tier, the harness tier-log cross-check, the reserved/
aftermath schema hardening). Requirements and traces documented
(`_continuation_scene_adequacy_requirements_2026_09_20.md`,
`_scene2_capability_test_root_causes_2026_09_20.md`, `_scene2_skeleton_handoff_trace_2026_09_20.md`,
`_scene2_skeleton_handoff_trace2_2026_09_20.md`, `_planner_role_ledger_2026_09_20.md`,
`_scene2_required_scene_function_trace_2026_09_20.md`,
`_scene2_planner_terminal_tier_trace_2026_09_21.md`, `_scene2_reserved_schema_trace_2026_09_21.md`).
Seven real capability samples on record — six FAILED/gate-rejected/would-have-been-gate-rejected,
plus retry 9 (schema-rejected, real content progress), plus three real infrastructure non-results
(retries 6-8, all $0, resolved by the local dev-server cleanup — see
`_local_dev_server_contamination_incident_2026_09_21.md`).

**Fifth addendum, retry #9 (same day, after environment cleanup) — real content progress, blocked
by a NEW, narrow bug.** First retry on the cleaned environment: zero 502s, two real HTTP 200 planner
replies ($0.014627 total). Both explicitly engaged the required-scene-function frame with real,
specific `scene_function_instantiated`/`aftermath_obligations` content — the first time in nine real
attempts. Both were rejected before reaching author OR the Planner Function Gate, by a different,
pre-existing, earlier validator (`_validateLocalObjective`'s reserved-events completeness check):
both replies returned `"reserved": {}` (empty) instead of the four required IDs, despite the
planner's own system prompt requiring them. Full account: `_scene2_capability_retry9_report_2026_09_21.md`.
This is a genuinely new, narrowly-diagnosed, mechanical schema-completeness issue — not a repeat of
any prior finding. No further retry followed retry 9, per standing instruction.

**Sixth addendum (same day, dry fix) — the reserved/aftermath schema gap is closed, not the
validator loosened.** `reserved`/`aftermath` now get their own dedicated prompt block: an explicit
"an EMPTY object {} for EITHER is INVALID" statement, the real ids restated, and a worked JSON
example built from the scene's own real ids. `_validateLocalObjective`'s reject-only check is
completely unchanged — proven by re-testing retry 9's real replies against it unmodified (still
correctly rejected) and confirming attempt 1's real content, with ONLY reserved/aftermath corrected,
is accepted. Proven 16/16, `_scene2_reserved_schema_control.mjs`; full trace:
`_scene2_reserved_schema_trace_2026_09_21.md`. A future retry would be the first real test of
whether the planner can now preserve retry 9's genuinely improved scene-function behavior WHILE
satisfying the hardened schema — a combination not yet tested live. No live retry run in this pass.

**Seventh addendum, retry #10 (2026-09-21) — zero capability evidence, a THIRD infra fault, distinct
from retries 6-8.** One retry authorized to test the reserved-schema-hardened stack live. Both real
dispatch rounds (2 × 3 tiers = 6 calls) returned 502 `NO_RESPONSE_FROM_FUNCTION` across all three
providers, identically — the same symptom as retries 6-8, but a **different, more specific root
cause** this time: the live `vercel dev` server log showed 95 `Error: spawn EBADF` lines landing
exactly at the point of failure — the dev-server parent process (PID 24065, up since the prior
Wednesday) failed to spawn a child handler at the OS level, independent of which provider endpoint
was being called. `ps aux` ruled out the retry-6-8 cause (leaked stale children): only 6 fresh,
~1-minute-old children existed this time, not 155. The planner never produced a single reply; none
of the five evaluation questions are answerable. $0 spent. Full account:
`_scene2_capability_retry10_report_2026_09_21.md`. No follow-up retry run, per standing instruction.
Likely fix (NOT actioned, needs separate authorization distinct from "run a retry"): restart the
`vercel dev` parent process itself, not just clean up children as before.

## Status update (after retry #10)

Eight real capability samples now on record: six FAILED/gate-rejected/would-have-been-gate-rejected,
retry 9 (schema-rejected, real content progress), and now four real infrastructure non-results
(retries 6, 7, 8 — leaked child processes, $0 each — and retry 10 — parent-process `spawn EBADF`,
$0). All six dry-proven fixes remain unconfirmed end-to-end against a live 200 response. The local
dev environment has now caused two DISTINCT infra failures in two days; before any further retry,
the `vercel dev` parent process itself likely needs a clean restart (separate authorization required
— this is more invasive than the prior child-process cleanup, since it stops the actively-listening
server).
