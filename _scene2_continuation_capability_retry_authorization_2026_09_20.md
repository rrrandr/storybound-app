# Continuation Capability Retry — Future Authorization Sheet (2026-09-20, seventh revision)

**Not authorized. Not run. No provider or image call has been made preparing this sheet.** This
describes a proposed, separate, later paid operation for when you choose to authorize it.

This revision follows Roman's decision after the planner-role trace: **"the default event-decider
should be the stronger model... This is not where to save money."** The scene-spine/open-row
planner's default is now Grok-primary (ministral-8b-2512 fallback, transport/parse failure only),
alongside the Planner Function Gate from the prior revision. Both are dry-proven, not yet tested
against a real, live generation.

## What this is testing

Not "does Scene 2 read well" — closed, four times, no. Not "is the wiring correct" — closed, proven
live in retry 4. Not "does the gate work" — proven dry, 10/10 and 12/12 across two controls. This
would be retry #5: the FIRST real test of a Grok-primary planner, gated, on the SAME causal input
four prior attempts have failed on. Five real attempts is a lot on one input — worth weighing
against testing a different player branch instead, a decision for whoever authorizes this.

## What changed since retry 4

- **Root causes A/B/C** and **Findings 1-3** (harness/OAS-history/cosmology) — unchanged this
  revision, all fixed and dry-proven, confirmed firing live in retry 4's real dispatch.
- **Planner Function Gate** (prior revision) — `_detectPlannerFunctionGap` rejects a structurally-
  valid-but-inadequate plan before the author is ever dispatched. Proven 10/10,
  `_scene2_planner_function_gate_control.mjs`, using retry 4's real rejected plan as the red
  fixture.
- **NEW — Grok-primary planner policy** (this pass): the scene-spine/open-row planner's
  `_plannerGrok` default is inverted (`public/app.js`, `_generateLiteraryPlotContract`) — Grok is
  now PRIMARY, ministral-8b-2512 is the FALLBACK (unchanged trigger: transport/parse failure only).
  `window._scenePlannerEngine='ministral'` is the escape hatch back to the old default. Proven
  12/12, `_scene2_planner_grok_primary_control.mjs`: Grok is tried first and ministral is never even
  attempted when it succeeds; ministral still serves correctly as fallback when Grok transport
  fails; the Planner Function Gate still catches a bad plan regardless of which tier produced it;
  CG scaffold and the commit verifier are confirmed untouched (separate, unchanged
  `_callTieredProvider` role tags). All 8 pre-existing controls re-run green (90/90 total across the
  suite after this addition).
- Real, measured cost basis (Retry 4's actual planner-call tokens: 5468 prompt / 858 completion):
  ministral $0.00095/call; Grok at the same counts ≈ $0.00898/call (≈9.4×, ≈+$0.008 absolute) —
  small against the author call's own ~$0.085-0.09.

## Scope

- Same mechanism as every prior replay: reuse the already-paid, persisted real OAS turn-reply,
  Fate-Card, and scaffold content via the zero-cost stub-lane replay — real spend starts only at the
  planner/author call.
- Same player decision (Boundary card, the same real Say/Do) — a capability retry on the SAME
  causal input, not a new player branch — unless whoever authorizes this prefers a fresh branch
  instead, given four failures already on this one.
- The planner now dispatches to Grok first (new default) — real spend at this step will be closer
  to the ≈$0.009 estimate above than ministral's ≈$0.001, still small.
- If the planner's own plan fails the Planner Function Gate, the attempt stops there — $0 author
  spend, logged and reported as a gate rejection, not a failed generation sample.
- Only if the gate passes does the author fire; THEN run `_detectSceneAdequacyFailure` (full
  continuity/canon/aftermath/ending checks) on the delivered prose before calling it usable.
- If this retry ALSO fails (gate-rejected OR author-adequacy-failed) even with Grok as the
  event-decider, that is real, strong evidence the remaining gap is not model-tier-shaped — reported
  honestly either way, not concealed.

## Cost ceiling (estimate)

Retry #4's real, measured total was $0.228671. A Grok-primary planner adds an estimated ~$0.008 to
the planner phase; a gate rejection would cap real cost near the planner-only estimate (~$0.009-
0.018 across the one bounded retry) instead of paying for a doomed author call. Ceiling unchanged,
already proven to hold with wide margin across four real runs:

| Phase | Ceiling (USD) | Physical requests |
|---|---|---|
| scene2-planner (unchanged) | $0.05 | ≤2 |
| scene2-author (unchanged) | $0.40 | ≤2 |
| **Total** | **$0.45** | **≤8** |

Adequacy re-validation is dry (`_detectSceneAdequacyFailure`, `_detectPlannerFunctionGap`) — $0
additional.

## What this would (and would not) prove

Would prove: whether a Grok-primary planner, gated, produces a meaningfully different plan than
ministral did four times running — and if it does, whether the resulting dramatization clears full
adequacy.

Would not prove: that Scenes 3-10 are adequate; that a different player branch holds the same
standard; that beat-kind diversity or semantic retreading (neither encoded as a reject-only check)
are satisfied. Would also not, on its own, cleanly separate "the model got better" from "this
specific draw got lucky" — a single sample from a stronger model is still one sample.

## Status

Ten fixes in place and dry-proven across five passes (root causes A/B/C, Findings 1-3, the Planner
Function Gate, the Grok-primary planner policy). Requirements and traces documented
(`_continuation_scene_adequacy_requirements_2026_09_20.md`,
`_scene2_capability_test_root_causes_2026_09_20.md`, `_scene2_skeleton_handoff_trace_2026_09_20.md`,
`_scene2_skeleton_handoff_trace2_2026_09_20.md`, `_planner_role_ledger_2026_09_20.md`). Four real
capability samples on record, all FAILED (retries 1-3) or would-have-been-gate-rejected (retry 4,
retroactively — the gate did not exist yet when it ran). No provider or image calls made preparing
this sheet or making the policy change. Awaiting explicit authorization before running a fifth
retry.
