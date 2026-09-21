# Scene 2 Capability Retry #11 (2026-09-21, after vercel dev restart)

Authorized scope: same Boundary input, clean restarted dev server, real calls from Submit
onward, Grok primary → ministral-8b-2512 fallback → gpt-4o terminal, tier-log cross-check
harness, all standing fixes active including the reserved/aftermath schema hardening
(committed `c0685350`), $0.45 / ≤8-physical-request ceiling, no follow-up retry on failure.

## Result: real content, reserved-schema fix CONFIRMED, rejected by a deeper, substantive gate

One real planner dispatch: `grok-4-1-fast-non-reasoning`, HTTP 200, first try (no fallback
needed), $0.01018465. This is the first live, end-to-end confirmation that the restarted dev
server is healthy and the planner chain works cleanly under real load.

### 1. Reserved/aftermath schema hardening — CONFIRMED WORKING

The real reply's `reserved` and `aftermath` objects, verbatim from the raw response body:

```
"reserved": {"price_identified":"untouched","inquiry_opened":"untouched","julian_counter_wish":"untouched","julian_obscuring_wishes":"untouched"}
"aftermath": {"twist_manifested":"kept","interrogation_interrupted":"kept","the_answer_institutional":"kept","inquiry_authority_claimed":"kept"}
```

All 4 reserved ids and all 4 aftermath ids present, correctly spelled, correctly valued. This
is the first real sample where `_validateLocalObjective`'s reserved-events check was
satisfied — the fix built and dry-proven this session (`_scene2_reserved_schema_control.mjs`,
16/16) held on a live draw. No further schema-completeness work needed based on this sample.

### 2. Rejected by the Planner Function Gate — for a substantive, correctly-diagnosed reason

The plan passed the structural validator and reached the Planner Function Gate
(`_detectPlannerFunctionGap`), which rejected it:

> the planner's own proposed event/tactical-move/forces-choice shows no aftermath/procedure/
> consequence-movement signal, even though this continuation scene requires one
> (CONT_AFTERMATH-eligible) — rejected before the author call, not sent to be dramatized

The real content, verbatim:

- `state_change`: "Julian crosses the circle and stands before Lirael, naming himself the one
  she lost."
- `tactical_move`: "convert the Dohkar's authority claim into visible procedural pressure that
  makes the wish's literal words externally true through Julian's public action"
- `forces_choice`: "forces Lirael to choose between claiming she shaped the wish or letting the
  assembly keep its assumption"
- `local_objective`: "Julian publicly claims the role of the one Lirael lost, making the wish's
  words visibly true and exposing her standing to immediate procedural risk."
- `scene_function_instantiated` (self-report): "institutional pressure via the Dohkar's public
  assertion of authority over the ruling and the visible social fallout of Julian's claim on
  Lirael."

**The gate's rejection is correct.** The model's own self-report (`scene_function_instantiated`)
and its `tactical_move` field both borrow aftermath/procedural VOCABULARY ("procedural
pressure," "authority claim," "procedural risk"), but the actual proposed `state_change` is
still the same in-ritual beat as the scene's opening moment — Julian publicly naming himself
inside the rite — not a subsequent aftermath action (a review convened, family summoned, Lirael
removed from the circle, etc.). The forced choice is also still internal to the same ritual
moment (claim vs. deny the wish, in front of the assembly), not a procedural/aftermath
consequence. This is a real instance of the exact failure mode the REQUIRED SCENE FUNCTION
fix and the Planner Function Gate were built to catch: a plan that *labels* itself compliant
without the underlying content actually moving. The engine's separate
`_detectSceneAdequacyFailure`-style specificity check flagged the same event as `GENERIC
distinctive-tokens-in-event=0/0 ⚠ THEME-COLLAPSE`, independently corroborating that this
event is thin/generic.

### Retry mechanism behavior

The pre-existing one-bounded-retry machinery fired (`[CG:STALE-REJECTED] retrying once`), but
the retry reused the same cached objective rather than making a second independent planner
call (`[OBJECTIVE:REUSED] scene 2 posture unchanged ... no planner call`) — so this sample is
effectively **one** real planner draw, evaluated by the gate twice against unchanged content,
then correctly given up via `[CG:STALE-STOP] ... stopped; resumable; no engine switch`. No
second real dispatch, no additional spend.

## Evaluation against the five authorized questions

1. **Did the planner preserve retry 9's improved institutional/social-consequence direction?**
   Partially, and only in vocabulary — not in the actual proposed event. Retry 9's two samples
   genuinely depicted institutional-pressure content; this draw reverted to the same in-ritual
   confrontation the REQUIRED SCENE FUNCTION block was written to move past, dressed in
   aftermath-sounding language. Not consistent across draws.
2. **Did it fill the required `reserved` keys correctly?** Yes — confirmed, first live pass.
3. **Did it pass `_validateLocalObjective` and the Planner Function Gate for substantive
   reasons?** Passed the structural validator (genuinely, via the schema fix). Failed the
   Planner Function Gate, and correctly so — the gate's stated reason matches the real content.
4-5. **Not reached.** The author call never ran; no prose was produced.

## Cost

$0.01018465 spent (1 physical request of 8 allowed), well under the $0.45 ceiling.

## Artifacts

- `_scene2_repair_replay_sample_out/run_1789967346060.jsonl` — full raw request/response log.
- `report_retry11.json`, `console_tail_retry11.txt`, `partial_tracked_calls_retry11.json` —
  this run's outputs under distinct filenames. Fixed-name fixture files confirmed clean via
  `git status` before the run, restored via `git checkout --` immediately after (verified
  clean again) — they remain valid, unchanged red fixtures for the reserved-schema control.

## Honest classification

This is the cleanest, most informative real sample yet: the local environment is healthy
(confirmed by the restart), the reserved-schema fix is confirmed live, and BOTH gates
(structural validator, Planner Function Gate) behaved exactly as designed against real model
output — one correctly passed, one correctly caught a substantive content gap the model's own
self-labeling tried to paper over. The remaining, now well-isolated problem is narrower than
before: the planner's prompt does not yet RELIABLY make the model choose a genuinely new
aftermath event over re-staging the immediate ritual moment under a procedural-sounding label —
this is a single data point showing the failure can still occur, not proof it always will.

## Status

No follow-up retry run, per standing instruction. Report written and committed. Stopping here.
