# Scene 2 Capability Retry #12 (2026-09-21, after aftermath-lane scaffolding)

Authorized scope: same Boundary input, full planner fallback chain, aftermath lane menu +
required `chosen_aftermath_lane`/`lane_posture_modulation` fields, lane-content gate, reserved-
schema hardening, planner-function gate, posture-echo gate, CONT_AFTERMATH, worldTruths, OAS
history, mouth-band continuity, Fatelands cosmology ban, $0.45/8-request ceiling, no follow-up
retry on failure.

## Result: the planner chose a lane, but its own content did not instantiate it — caught correctly

One real planner dispatch: `grok-4-1-fast-non-reasoning`, HTTP 200, first try, $0.0113159.

## Evaluation against the six authorized questions

**1. Did the planner choose one of the declared aftermath lanes?** Yes —
`"chosen_aftermath_lane": "lirael_defensive_path"` (Lirael submits to procedure, gathers proof,
conceals, flees, counter-accuses, or forces a procedural bind). The new required field was
populated with a valid id from the menu. This is real progress: the model engaged with the menu
mechanism itself.

**2. Did the actual proposed content instantiate that lane, rather than just label it?** **No.**
The real `state_change`: "The presiding Dohkar turns to Lirael and demands she state before the
assembly whether she shaped Seren's wish." The ACTOR here is the Dohkar, demanding an answer —
not Lirael taking any of the defensive actions the chosen lane names (submit to procedure, gather
proof, conceal, flee, counter-accuse, force a procedural bind). `forces_choice`/`branch_a`/
`branch_b` are about whether Lirael claims or denies interference — still the same immediate
ritual/interrogation exchange the AFTERMATH TRUTHS already establish (Julian's interrogation,
now continued by the Dohkar), not a new aftermath event. The model declared the RIGHT KIND of
label without writing the underlying beat that label describes.

**3. Did the Boundary posture modulate the lane instead of replacing it?** Partially assessable:
`lane_posture_modulation`: "Her defiant confrontation with Julian raises the stakes so the
Dohkar's demand for her statement becomes a direct response to her challenge rather than neutral
procedure" — this sentence itself describes the Dohkar's demand (the same ritual-moment event),
not Lirael's defensive path. The posture modulated WHO reacts and HOW urgently, but the underlying
event never left the ritual moment for the posture to modulate a genuine lane instantiation.

**4. Did the plan pass `_validateLocalObjective` and the Planner Function Gate for substantive
reasons?** Passed the structural validator (reserved/aftermath schema again fully correct — 4/4
and 4/4, matching retry 11's confirmed-working fix). **Rejected by the Planner Function Gate**,
correctly: `[CG:PLANNER-GATE] REJECTED ... the planner declared chosen_aftermath_lane=
"lirael_defensive_path" but its own proposed event/tactical-move/forces-choice does not actually
instantiate that lane's content — a declared lane label alone is not enough.` This is exactly the
new check built this session, firing on its intended, correctly-identified target — the second
real confirmation of this specific mechanism (after the dry control's 22/22).

**5-6. Not reached.** The author call never ran; no prose was produced.

## Retry mechanism behavior

Same as retry 11: the one-bounded-retry machinery fired (`[CG:STALE-REJECTED] retrying once`),
but reused the cached objective rather than drawing a fresh planner sample
(`[OBJECTIVE:REUSED] ... no planner call`), then `[CG:STALE-STOP] ... stopped; resumable; no
engine switch`. This sample is one real planner draw, evaluated by the gate twice against
unchanged content.

## Cost

$0.0113159 spent (1 physical request of 8 allowed), well under the $0.45 ceiling.

## Artifacts

- `_scene2_repair_replay_sample_out/run_1789968972908.jsonl` — full raw request/response log.
- `report_retry12.json`, `console_tail_retry12.txt`, `partial_tracked_calls_retry12.json` — this
  run's outputs under distinct filenames. Fixed-name fixture files confirmed clean via
  `git status` before the run, restored via `git checkout --` immediately after (verified clean
  again) — they remain valid, unchanged fixtures.

## Honest classification

This is a genuinely informative, two-sample-deep finding now: across retry 11 (freeform,
vocabulary-only compliance) and retry 12 (lane menu, valid-id compliance), the SAME underlying
planner behavior recurs — the model satisfies whatever compliance SURFACE it is given (aftermath
vocabulary, then a valid lane id) while its actual proposed event stays anchored to the Dohkar-
interrogates-Lirael beat the scene opens on. The lane menu did not solve the creative-jump problem
Roman named after retry 11; it made the SAME failure more precisely diagnosable — the gate now
names exactly which lane was claimed and exactly why the content doesn't back it, rather than a
generic "no aftermath signal" message. Both gates (structural validator, Planner Function Gate,
now including the lane-content check) continue to behave exactly as designed against real model
output. This is one data point, not proof the model can never leave the ritual moment — but it is
the SECOND real sample in a row showing the same specific pattern.

## Status

No follow-up retry run, per standing instruction. Report written and committed. Stopping here.
