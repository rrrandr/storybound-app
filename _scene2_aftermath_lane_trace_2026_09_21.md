# Aftermath Lane Menu (2026-09-21)

Roman, after retry 11: "The planner is now: getting the scene function; filling the schema
correctly; being checked by the right gates; failing cheaply before author spend... The planner
model is the thing still not doing the creative jump: it can label 'procedural pressure,' but it
keeps staging the same ritual moment... Change the Scene 2 planner contract from 'invent an
aftermath event' to 'choose and instantiate an aftermath lane.'" Dry work only, no provider calls,
no live retry.

## 1. Real gap this closes

Retry 11 (clean environment, reserved-schema fix confirmed live) still produced:

- `state_change`: "Julian crosses the circle and stands before Lirael, naming himself the one she
  lost." — the SAME in-ritual confrontation beat as the scene's opening.
- `tactical_move`: "convert the Dohkar's authority claim into visible procedural pressure..." —
  aftermath VOCABULARY, no aftermath CONTENT.
- `scene_function_instantiated` (self-report): "institutional pressure via the Dohkar's public
  assertion of authority..." — a compliant-sounding label over non-compliant content.

The Planner Function Gate correctly rejected it on the pre-existing generic aftermath-vocabulary
check, but that check is a single blunt signal (regex over the combined text) — it does not verify
that a SPECIFIC, concrete aftermath event actually happened. A planner given total freedom to
"instantiate the required scene function" can satisfy that freedom by relabeling the same event.

## 2. Fix — a constrained lane menu, not hand-authored prose

`STARTER_PLANS.starter_first_sacrifice.scenes[2]` (`public/app.js`) now declares `aftermathLanes`:
five lanes, each `{ id, label, signalRx }`, grounded in this row's own `exitState` and the seed's
own worldTruths-sanctioned lanes ("accusation, preliminary review, political pressure,
investigation, concealment, or flight"):

1. `dohkar_preliminary_review` — the Dohkar sets a preliminary review/hearing date or terms.
2. `family_accusation` — Seren's family publicly accuses Lirael or demands remedy.
3. `julian_jurisdiction_challenge` — Julian challenges jurisdiction or reframes politically.
4. `lirael_constrained` — Lirael is ordered separated, watched, or constrained pending inquiry.
5. `lirael_defensive_path` — Lirael submits to procedure, gathers proof, conceals, flees,
   counter-accuses, or forces a procedural bind.

This is not new canon and not hand-authored Scene 2 prose — it is a constrained event menu the
planner chooses FROM, the same way `sceneFunction` already frames what the scene must accomplish.
`signalRx` is what the gate checks the planner's own proposed content against — a lane id alone is
not proof of compliance.

### Prompt (`_generateLiteraryPlotContract`, `public/app.js`)

- A new REQUIRED AFTERMATH LANE MENU block, rendered right after REQUIRED SCENE FUNCTION, states
  this REPLACES "invent any aftermath event," lists all 5 lanes, and explicitly says staying inside
  the ritual moment under borrowed vocabulary is not a valid instantiation.
- Two new required JSON keys (only requested when the row declares lanes): `chosen_aftermath_lane`
  (must be one of the listed ids) and `lane_posture_modulation` (one sentence: how the reader's
  posture changes HOW the chosen lane plays out).
- REGISTER line lightly extended to also forbid the posture from choosing WHICH lane.

### Gate (`_detectPlannerFunctionGap`, `public/app.js`)

Two new, independent, reject-only checks — both inert when `opts.aftermathLanes` is absent (any
scene/starter without a declared menu is unaffected):

1. **No chosen lane** — `chosen_aftermath_lane` missing, empty, or not one of the declared ids →
   rejected.
2. **Label without content** — a valid lane IS declared, but the lane's own `signalRx` does not
   match the planner's actual `tactical_move`/`event`/`forces_choice` text → rejected. This is the
   check that directly closes retry 11's real gap: a declared label is not enough; the content
   must actually move.

The pre-existing generic aftermath-vocabulary check and posture-echo check are unchanged and still
run alongside these.

### Plumbing

`_effectiveSceneRow`'s OPEN ROW branch carries `aftermathLanes` through. The planner reply's
`chosen_aftermath_lane`/`lane_posture_modulation` are parsed into `_stateChange` (as
`chosenAftermathLane`/`lanePostureModulation`) alongside the existing fields. The gate call site
(the CG advance flow) passes `_oeRow.aftermathLanes` — the SAME `_oeRow` the OPEN ROW GATE already
resolves, no second lookup.

`_validateLocalObjective` is untouched — this is entirely a Planner Function Gate change, not a
structural-validator change, per the same discipline established for the reserved-schema fix.

## 3. Proof — 22/22, new `_scene2_aftermath_lane_control.mjs`

- **SETUP** — the real First Sacrifice scene 2 row resolves with all 5 declared lane ids.
- **RED-A** — retry 11's real stateChange (no `chosen_aftermath_lane` at all — the field predates
  this fix) is rejected: no chosen lane declared.
- **RED-B** — the SAME real content, with a synthetic `chosen_aftermath_lane: 'dohkar_preliminary_
  review'` added (a model that complies with the new field but still produces the old ritual-moment
  content), is STILL rejected — the declared lane's signal does not match the actual content. This
  is the check that specifically proves the mechanism reads content, not the label.
- **GREEN** — a synthetic plan that both declares an allowed lane and actually instantiates it (the
  Dohkar sets a real hearing date, moved off the ritual floor) is accepted.
- **ABSENCE** — a scene with no declared lane menu shows no lane-related rejection reason.
- **PROMPT** — the real, live planner dispatch carries the REQUIRED AFTERMATH LANE MENU block, all
  5 lane ids, and both new required JSON keys.
- **COEXIST** — REQUIRED SCENE FUNCTION, the reserved/aftermath schema block, WORLD TRUTHS, RECENT
  OAS EXCHANGE, and IMMUTABLE AFTERMATH (mouth-band) all still render.
- **FULL-FLOW** — with the real pipeline stubbed to return retry 11's real (pre-fix) reply on every
  attempt, the author is NEVER dispatched (zero calls at max_tokens 8000) and the pipeline ends
  resumable — the same real capability gap, now caught generically through the full CG flow.

Full pre-existing suite (11 controls, including the reserved-schema and tier-log cross-check
controls) re-ran green with zero regressions.

## Status

Dry, committed, generic (starter-specific lane CONTENT, generic CHECK mechanism). No provider or
image calls. `_validateLocalObjective` untouched. No live retry run in this pass. A future retry
would be the first real test of whether the planner, given a concrete menu instead of open
freedom, actually selects a compliant lane and produces content that matches it.
