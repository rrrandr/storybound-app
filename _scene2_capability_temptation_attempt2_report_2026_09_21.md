# Scene 2 Capability Sample: Temptation, Attempt 2 (2026-09-21, after the lane-semantics fix)

## Classification (updated 2026-09-21, after the lane-check field-widening fix)

**This was not a story/branch failure. It was the gate being too lexical again**, the same class of
issue the Reversal gate-seam fix closed. The planner produced a genuinely valid, landed defensive
action ("Lirael folds the torn mouth-band into her sash without naming what she lost," corroborated
by `event_slots.action`/`exit_state`) — the model did its job correctly. The gate rejected it
because both its checks read too narrow a slice of the planner's own contract and too narrow a
vocabulary list, not because the content was thin. Fixed dry, see
`_scene2_lirael_defensive_path_lane_semantics_trace_2026_09_21.md`'s addendum for the full
diagnosis and fix; proven against this exact real reply as a new GREEN fixture in
`_scene2_lirael_defensive_path_lane_semantics_control.mjs` (16/16).

**Correction to the original diagnosis below**: the "Root cause" section below states the rejection
came from the lane-content check alone. That was incomplete — the actual gate message (recovered
from the persisted console log during the fix) shows the rejection was **compound**: the generic
aftermath-vocabulary check ALSO failed, on a separate stemming gap ("procedural" vs "procedure," the
same class of gap as "concealment"/"conceal"). Both gaps are now fixed. Temptation was NOT re-run
this pass — the section below remains the original, honest, unedited record of that draw and its
(initially incomplete) diagnosis.

Authorized scope: re-run Temptation under the fixed `lirael_defensive_path` lane, `--slot=temptation`
only (no Silence/Confession), all standing gates/fixes active, $0.45/8-request ceiling, no
follow-up retry within this card. Attempt 1 (`_scene2_capability_temptation_report_2026_09_21.md`)
is preserved unedited as the honest original record.

## Result: the fix WORKED on content — the model produced a real landed action, not hesitation — but a DIFFERENT, narrower gap blocked it

Real cost: $0.01100215 (1 physical request). The author never ran. **This is genuinely different
from Attempt 1** — not a repeat of the hesitation problem. It is a new, narrower finding: a
vocabulary-completeness gap in the lane's `signalRx`, not a content-quality problem.

## Evaluation against the six authorized questions

**1. Objective actor Lirael?** Yes: `"local_objective_actor": "Lirael"`.

**2. Chosen lane `lirael_defensive_path`?** Yes, exactly.

**3. Did the actual content instantiate a landed defensive move?** **Yes — and clearly.**
`state_change`: "Lirael folds the torn mouth-band into her sash without naming what she lost."
`event_slots.action`: "folds the torn mouth-band into her sash." This is a concrete, specific,
external, observable physical action with a specific object (the already-established torn
mouth-band) — exactly the kind of "landed move" the fix was built to require. It is not hesitation,
not an internal weighing, not abstract secrecy.

**4. Did it avoid hesitation / silence / private resolve / abstract concealment?** Yes, cleanly.
Nothing in this reply resembles Attempt 1's "opens her mouth then closes it," and the
`hesitationRx` diagnostic did NOT fire this time (confirmed — the rejection reason carries no
hesitation note), because there genuinely is no hesitation here to detect.

**5-6. Not reached.** The author never ran; no prose, no continuity/LI-presence/end-choice
evidence.

## Root cause of THIS rejection (diagnosed, not fixed — no fix authorized this pass)

The lane's `signalRx` requires one of a fixed vocabulary list (`conceal(s|ed|ing)`, an active-voice
"concealment" phrase, `submits to procedure`, `demands terms`, etc.) to appear in the narrow
`tactical_move`/`event`/`forces_choice` text. This reply's `tactical_move` says "Lirael **executes**
a concrete defensive concealment..." — "executes" is not on the lane's whitelist of verbs that
license the noun "concealment" (`commits to`/`chooses`/`turns to`/`moves to`), so this active,
legitimate usage didn't match. And the reply's actual *state_change* — the concrete mouth-band
action — never uses the word "conceal" at all; it just describes the action directly, in natural
prose. This is the SAME class of limitation every vocabulary-matching regex check has: it can only
recognize the SPECIFIC words it was given, not the underlying meaning. Two concrete candidate
fixes for a future pass: (a) add "executes" (and similar verbs — "performs," "carries out") to the
concealment verb whitelist; (b) extend the lane-content check to also read `event_slots.action`
(the model's own structured description of what actually happened), mirroring how the GENERIC
check was already widened to read `event_slots` after the Reversal gate-seam finding. Neither is
actioned in this pass — not authorized, and this report's job is to observe and report, not fix.

## Cost

$0.01100215 spent (1 physical request of 8 allowed), well under the $0.45 ceiling.

## Artifacts

- `_scene2_repair_replay_sample_out/run_1790035049042.jsonl` — full raw request/response log.
- `report_temptation.json`, `console_tail_temptation.txt`,
  `partial_tracked_calls_temptation.json` — this (second) attempt's outputs. Attempt 1's summary
  files were preserved beforehand as `*_temptation_attempt1.*` — the first attempt's record is not
  lost.

## Honest classification

A genuinely positive, if incomplete, result: the lane-semantics fix demonstrably changed the
model's behavior on a real draw — it stopped producing hesitation and produced a concrete,
specific, landed physical action instead, exactly answering the concern the fix was built for.
What blocked it this time is a narrower, different limitation: the gate's fixed vocabulary list
doesn't yet cover every way a model can phrase "she took a concealment action" in natural prose.
This is real progress, not a regression, and not a repeat of Attempt 1's failure mode.

## Status

Per the standing "no follow-up retries if it fails" rule, this run concludes here. No further
retry on Temptation, Silence, or Confession. Images remain untouched.
