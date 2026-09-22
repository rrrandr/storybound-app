# Scene 2 Capability Sample: Temptation, Attempt 3 (2026-09-21, after the lane-check field-widening fix)

Authorized scope: re-run Temptation once under the corrected `lirael_defensive_path` gate
(field-widened lane check + `executesRx`/`withholdActionRx` + `procedur\w*` stemming),
`--slot=temptation` only, no Silence/Confession, no images, replay already-paid OAS/Fate/scaffold
content, real calls only from Submit/continuation onward, $0.45/8-request ceiling, no follow-up
retry within this card. Attempts 1 and 2 (`_scene2_capability_temptation_report_2026_09_21.md`,
`_scene2_capability_temptation_attempt2_report_2026_09_21.md`) are preserved unedited.

## Result: still rejected before the author call — but NOT a repeat of either prior failure

Real cost: $0.00500405 (1 physical request of 8 allowed). Harness healthy — in-memory tracking
caught the settled planner call directly (`reconciledFromLog: false`, no discrepancy). The author
never dispatched: the planner's plan was rejected by the gate before it could be sent to be
dramatized.

**This is a third, genuinely different draw** — not hesitation (Attempt 1) and not the mouth-band
physical concealment (Attempt 2). This time the model chose an active **false statement** as its
defensive move:

```
tactical_move: "Lirael lands a concrete defensive concealment that shifts the assembly's
  information and forces her to decide whether to claim interference or let the assumption stand"
state_change: "Lirael tells the assembly the wish tested her alignment only"
state_change_precondition: "Lirael has not yet given the assembly any account of why the wish
  mattered to her"
forces_choice: "forces Lirael to choose between claiming the interference openly and letting the
  assembly keep its assumption"
local_objective_actor: "Lirael"
chosen_aftermath_lane: "lirael_defensive_path"
event_slots: { actor: "Lirael", action: "gives a false public account", target: "the assembly",
  exit_state: "the assembly now believes the wish was only an alignment test" }
aftermath_obligations: "The Dohkar now weighs Lirael's false account against the bent wish;
  Seren's family visibly withdraws support; Julian watches the deflection without intervening"
```

## The exact rejection (all three reasons, verbatim from the console log)

```
[CG:PLANNER-GATE] REJECTED before author dispatch —
1) the planner's own proposed event/tactical-move/forces-choice/precondition/event-slots/
   aftermath-obligations shows no aftermath/procedure/consequence-movement signal anywhere in the
   accepted contract (the GENERIC check)
2) the planner declared chosen_aftermath_lane="lirael_defensive_path" but its own proposed event/
   tactical-move/forces-choice/event-slots does not actually instantiate that lane's content (the
   LANE-content check)
3) the planner's proposed event echoes the reader's raw Say/Do text almost verbatim (shared
   phrase: "let the") rather than treating it as posture modulating the required scene function
   (the POSTURE-ECHO check)
```

## Evaluation against the six authorized questions

**1. Objective actor Lirael?** Yes: `local_objective_actor: "Lirael"`.

**2. Chose `lirael_defensive_path`?** Yes, exactly.

**3. Did the actual content instantiate a landed defensive move?** **Mixed, and worth being
precise about.** "Lirael tells the assembly the wish tested her alignment only" is an active,
external, observable speech-act — she deliberately lies to an institutional body, which fits the
lane's own menu ("conceals a specific fact/object/admission"). It is not hesitation and the
`hesitationRx` diagnostic did not fire. But it is also the vaguest of the three real draws so far:
it names no specific object (unlike Attempt 2's mouth-band) and the harness's own independent,
unrelated specificity diagnostic flagged it directly —
`[STATE-CHANGE:SPECIFICITY] GENERIC distinctive-tokens-in-event=0/0 ⚠ THEME-COLLAPSE`. So this is a
landed move, but a genuinely thinner, more abstract one than Attempt 2's.

**4. Does the corrected gate pass for substantive reasons, not a loophole?** The gate did NOT pass
this draw. Whether that's the *right* call is genuinely unclear, which is the honest finding here:
- The **lane-content check** correctly reflects its own current rules — "gives a false public
  account" / "tells the assembly... only" never triggers `signalRx`, `executesRx`, or
  `withholdActionRx`; none of those patterns were built to recognize deception-as-concealment
  phrasing, only object-based or "without naming/revealing what" phrasing. This is a genuinely NEW
  vocabulary-completeness gap in the same family as the last two fixes — not a loophole being
  exploited, but also not proof the underlying problem is fully closed.
- The **generic check** independently found no aftermath/procedure vocabulary anywhere either
  (confirmed by inspecting every widened field directly: none contain tribunal/inquiry/hearing/
  summons/procedur*/ruling/verdict/sentence/investigation/aftermath/consequences/recriminations).
  `aftermath_obligations` describes real consequences in plain prose ("Seren's family visibly
  withdraws support") but never in the check's vocabulary — a real, separate instance of the same
  "content is there, vocabulary isn't" pattern, this time hitting the generic check rather than the
  lane check.
- The **posture-echo check** is a third, unrelated, pre-existing check (never touched by any fix
  this session) that fired on a two-word shared phrase ("let the") — a bigram this short is a
  plausible false-positive risk for that check's design, but this was not investigated further; it
  is outside this pass's scope.

**5-6. Not reached.** The author never ran; no prose, no continuity/LI-presence/end-choice
evidence.

## Honest classification

**Not proof the fix was wrong, and not proof the branch is broken — a third real draw exposed a
third real gap in the same family.** The fixes made this session (lane field-widening, `executesRx`
corroboration, `withholdActionRx`, `procedur\w*` stemming) were built against Attempt 2's specific
real phrasing and proved themselves against it (16/16, including that exact real reply as a GREEN
fixture) — they were never claimed to cover every possible way a model can phrase "she took a
concealment action." This draw confirms that: a new phrasing (active false statement, no named
object, no "conceal"-family word, no "without naming what" wrapper) still isn't recognized by
either check, and — independently — this specific draw's content is thinner/more generic than
Attempt 2's, and a separate, untouched check (posture-echo) also fired on what may be a short-bigram
false positive. All three are real, honestly distinct observations; none should be collapsed into
one story.

## Cost

$0.00500405 spent (1 physical request of 8 allowed), well under the $0.45 ceiling.

## Artifacts

- `_scene2_repair_replay_sample_out/run_1790037379926.jsonl` — full raw request/response log.
- `report_temptation.json`, `console_tail_temptation.txt`, `partial_tracked_calls_temptation.json`
  — this (third) attempt's outputs. Attempts 1 and 2's summary files were preserved beforehand as
  `*_temptation_attempt1.*` / `*_temptation_attempt2.*` — no prior record lost.

## Status

Per the standing "no follow-up retries if it fails" rule, this run concludes here. No further
retry on Temptation, Silence, or Confession this pass. Images remain untouched. Any further
vocabulary-completeness work on `lirael_defensive_path` (or a look at the posture-echo check's
short-bigram behavior) would need separate authorization.
