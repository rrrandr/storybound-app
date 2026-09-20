# Continuation Capability Retry — Future Authorization Sheet (2026-09-20, sixth revision)

**Not authorized. Not run. No provider or image call has been made preparing this sheet.** This
describes a proposed, separate, later paid operation for when you choose to authorize it.

This revision follows retry #4 (real, run — "the first valid retry against the intended state," see
`_scene2_capability_retry4_report_2026_09_20.md`) and Roman's verdict on it: **"The plumbing is now
mostly proven; the remaining failure is planner capability."** Retry 4 confirmed all continuity/canon
fixes hold live, and proved the planner can receive every fact it needs and still choose a weak
event — caught only after a real, paid author call had already dramatized it. A new gate
(`_detectPlannerFunctionGap`) now stops that class of failure before the author call. A separate
trace (`_planner_role_ledger_2026_09_20.md`) establishes which model/policy actually decides scene
direction and estimates the cost of a stronger planner tier — not yet acted on, Roman's call.

## What this is testing

Not "does Scene 2 read well" — closed, four times, no. Not "is the wiring correct" — closed, proven
live in retry 4. This would be retry #5: whether the SAME planner (ministral-8b-2512, unless Roman
separately authorizes a model-policy change first) can produce an adequate plan on a fresh attempt
of the SAME causal input, now that an inadequate plan can no longer reach the author uncaught. Four
real attempts have failed; a fifth is evidence about this specific generation, never a guarantee.

## What changed since the sample that failed

- **Root causes A/B/C** and **Findings 1-3** (harness/OAS-history/cosmology) — all fixed and
  dry-proven across four prior passes; confirmed firing live in retry 4's real dispatch (RECENT OAS
  EXCHANGE, mouth-band torn away, WORLD TRUTHS all present verbatim). See
  `_scene2_skeleton_handoff_trace_2026_09_20.md` / `_scene2_skeleton_handoff_trace2_2026_09_20.md`
  for full detail — unchanged this revision.
- **NEW — Planner Function Gate** (this pass): `_detectPlannerFunctionGap` re-runs the same,
  already-proven aftermath-vocabulary check against the planner's OWN proposed
  `tactical_move`/`event`/`forces_choice` — BEFORE the author is ever dispatched. Wired into the CG
  open-row flow immediately after the existing stale-objective gate, reusing its exact bounded-
  retry-then-stop machinery (not a new mechanism). Gated on the same `requiresAftermath` condition
  that already triggers `CONT_AFTERMATH` density (`sceneIndex > 0` with real committed aftermath/
  reserved data) — a scene without that data is unaffected. Proven 10/10,
  `_scene2_planner_function_gate_control.mjs`, using retry 4's REAL rejected planner output as the
  red fixture, including a full-flow proof that the author is never dispatched (zero calls at
  `max_tokens: 8000`) even across the one bounded retry.
- **NEW — planner-role trace**: `_planner_role_ledger_2026_09_20.md` establishes, from source and
  real retry logs, that exactly ONE role decides the actual next-scene event (the scene-spine/
  open-row planner) — currently ministral-8b-2512 primary, Grok fallback ONLY on transport/parse
  failure, never on plan quality. Real cost estimate: switching this one role to Grok-primary would
  cost ≈$0.008/call more (≈9.4×) than ministral's real $0.00095, still small against the author
  call's ~$0.085-0.09. Not yet acted on — a separate decision from this sheet.

## Before the next paid attempt — Roman's choice, not decided here

Per Roman's own framing, a fifth retry should run under ONE of:
1. **The gate alone** (default, no model-policy change) — the planner still runs ministral-8b-2512
   primary; if it produces another inadequate plan, the gate now catches it before author spend, and
   the attempt ends in a resumable-stop with $0 author cost instead of a fourth ~$0.09 wasted author
   call. This tests whether ministral can EVER pass its own gate on a fresh draw, cheaply.
2. **A planner-model-policy change** (e.g. `window._scenePlannerEngine = 'grok'`, or a bespoke
   change to `_scTiers`) tested FIRST, separately authorized, before spending on a full retry — this
   tests whether a stronger planner model changes the outcome at all, which the gate alone cannot
   answer (a gate only prevents bad plans from costing author spend; it doesn't make the planner
   better).

This sheet does not choose between them — that's explicitly Roman's decision, per
`_planner_role_ledger_2026_09_20.md`'s "no policy change yet."

## Scope

- Same mechanism as every prior replay: reuse the already-paid, persisted real OAS turn-reply,
  Fate-Card, and scaffold content via the zero-cost stub-lane replay — real spend starts only at the
  planner/author call.
- Same player decision (Boundary card, the same real Say/Do) — a capability retry on the SAME
  causal input, not a new player branch.
- NEW: if the planner's own plan fails the Planner Function Gate, the attempt stops there — $0
  author spend, logged and reported as a gate rejection, not a failed generation sample.
- Only if the gate passes does the author fire; THEN run `_detectSceneAdequacyFailure` (full
  continuity/canon/aftermath/ending checks) on the delivered prose before calling it usable.
- If this retry ALSO fails (gate-rejected OR author-adequacy-failed), that is real evidence
  ministral-class planning may not be sufficient for this role regardless of data completeness —
  reported honestly either way, not concealed.

## Cost ceiling (estimate, based on the measured real cost of the prior full generation)

Retry #4's real, measured total was $0.228671 (8 requests — more calls fired than prior retries;
disclosed run-to-run variance, still under ceiling). If the Planner Function Gate rejects the plan,
real cost would be roughly the planner-only cost (~$0.001-0.002, possibly ×2 for the bounded retry)
— a large savings versus paying for an author call that was going to fail anyway. Ceiling unchanged:

| Phase | Ceiling (USD) | Physical requests |
|---|---|---|
| scene2-planner (unchanged) | $0.05 | ≤2 |
| scene2-author (unchanged) | $0.40 | ≤2 |
| **Total** | **$0.45** | **≤8** |

Adequacy re-validation is dry (`_detectSceneAdequacyFailure`, `_detectPlannerFunctionGap`) — $0
additional.

## What this would (and would not) prove

Would prove: whether the SAME planner model/policy, now gated, can produce a plan worth paying an
author to dramatize — and if it does, whether that dramatization clears full adequacy.

Would not prove: that a stronger planner model would do better (a separate, not-yet-run comparison);
that Scenes 3-10 are adequate; that a different player branch holds the same standard; that
beat-kind diversity or semantic retreading (neither encoded as a reject-only check) are satisfied.
Four real attempts have already failed on the same causal input.

## Status

Nine fixes in place and dry-proven across four passes (root causes A/B/C, Findings 1-3, the Planner
Function Gate). Requirements and traces documented
(`_continuation_scene_adequacy_requirements_2026_09_20.md`,
`_scene2_capability_test_root_causes_2026_09_20.md`, `_scene2_skeleton_handoff_trace_2026_09_20.md`,
`_scene2_skeleton_handoff_trace2_2026_09_20.md`, `_planner_role_ledger_2026_09_20.md`). Four real
capability samples on record, all FAILED or (were this gate active at the time) would have been
gate-rejected before author spend. No provider or image calls made preparing this sheet. Awaiting
explicit authorization before running a fifth retry, and a separate decision on planner model policy
before or instead of it.
