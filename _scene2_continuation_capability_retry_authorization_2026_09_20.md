# Continuation Capability Retry — Future Authorization Sheet (2026-09-20, eighth revision)

**Not authorized. Not run. No provider or image call has been made preparing this sheet.** This
describes a proposed, separate, later paid operation for when you choose to authorize it.

This revision follows retry #5 (real, run — the gate caught a bad Grok-sourced plan live, zero
author spend, see `_scene2_capability_retry5_report_2026_09_20.md`) and Roman's verdict:
**"Model strength alone is not the fix... The player choice should steer the story, not hijack the
skeleton."** The planner contract itself changed this pass — a REQUIRED SCENE FUNCTION frame now
renders before the reader's posture, and a new posture-echo check catches a plan that paraphrases
the raw Say/Do text instead of translating it. See `_scene2_required_scene_function_trace_2026_09_20.md`.

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
outcome so far). If this retry's plan clears the gate, real cost would run closer to retry #4's
$0.228671 (Grok planner + Grok author + adjacent calls). Ceiling unchanged, already proven to hold
with wide margin across five real runs:

| Phase | Ceiling (USD) | Physical requests |
|---|---|---|
| scene2-planner (unchanged) | $0.05 | ≤2 |
| scene2-author (unchanged) | $0.40 | ≤2 |
| **Total** | **$0.45** | **≤8** |

Adequacy re-validation is dry (`_detectSceneAdequacyFailure`, `_detectPlannerFunctionGap`) — $0
additional.

## What this would (and would not) prove

Would prove: whether framing the required scene function explicitly, before the planner reads
posture, changes what event it proposes — and if the gate now passes, whether the resulting
dramatization clears full adequacy.

Would not prove: that Scenes 3-10 are adequate; that a different player branch holds the same
standard; that beat-kind diversity (still not encoded as a reject-only check) is satisfied. A single
sample is still one sample — this framework change deserves more than one real draw before anyone
concludes it works, but that's a larger, separately-authorized program, not this one retry.

## Status

Twelve fixes in place and dry-proven across six passes (root causes A/B/C, Findings 1-3, the
Planner Function Gate, the Grok-primary planner policy, the Required Scene Function frame, the
posture-echo check). Requirements and traces documented
(`_continuation_scene_adequacy_requirements_2026_09_20.md`,
`_scene2_capability_test_root_causes_2026_09_20.md`, `_scene2_skeleton_handoff_trace_2026_09_20.md`,
`_scene2_skeleton_handoff_trace2_2026_09_20.md`, `_planner_role_ledger_2026_09_20.md`,
`_scene2_required_scene_function_trace_2026_09_20.md`). Five real capability samples on record — all
FAILED, gate-rejected, or (retroactively) would-have-been-gate-rejected. No provider or image calls
made preparing this sheet or making today's changes. Awaiting explicit authorization before running
a sixth retry.
