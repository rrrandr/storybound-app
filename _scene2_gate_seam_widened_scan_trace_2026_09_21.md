# Gate Seam Fix — Widened Generic Aftermath Scan (2026-09-21)

Roman, after the Reversal sample: "This sounds like a stale generic check is now fighting the more
precise lane system... the old aftermath-vocabulary scan should either look at the full planner
contract or defer to the lane-specific check... I would not remove the old check entirely, because
it still catches 'procedural-sounding label, empty content' failures. But it needs to be aware of
the richer schema." Dry work only, no provider calls, no image calls, no branch retry, no forks.

## 1. What Reversal actually showed

`_validateLocalObjective` accepted the plan (`local_objective_actor: "Julian"`). The Planner
Function Gate's lane-content check accepted it too (`chosen_aftermath_lane:
"julian_jurisdiction_challenge"`, and the reply's `tactical_move` genuinely contains
"jurisdiction," matching that lane's own `signalRx`). The plan was rejected anyway by a THIRD,
older, independent check inside the same gate: the generic `_SCENE_AFTERMATH_VOCAB_RX` scan, built
earlier this session before the lane/actor/pressure-source system existed. That scan only ever read
`tactical_move`, `state_change` (the event), and `forces_choice` — and none of those three fields
in Reversal's real reply happened to contain any of its specific vocabulary
(`tribunal|inquiry|hearing|summons|convene|procedure|ruling|verdict|sentence|investigation|
aftermath|consequences|recriminations`). The one word that WOULD have satisfied it — "ruling" —
appeared in `state_change_precondition` ("Julian has not yet challenged the presiding Dohkar's
authority over the ruling on Lirael's conduct") and in `event_slots.exit_state` ("Julian now claims
authority to rule on Lirael's conduct instead of the Dohkar") — two real, load-bearing fields of
the SAME accepted planner contract that this one check simply never read.

## 2. Fix — widen the generic scan's input, leave everything else unchanged

Two changes, both in `public/app.js`:

### `aftermath_obligations` is now carried into `stateChange`

It was already requested in the planner's schema ("the concrete aftermath/procedure/fallout
content this scene commits to delivering") but never parsed into the `_stateChange` object
`_detectPlannerFunctionGap` receives — genuinely discarded, not just unused by this one check.
Added as `stateChange.aftermathObligations`.

### `_detectPlannerFunctionGap`'s generic check reads a wider (but still bounded) field set

A new `extendedCombined` variable — used ONLY by the generic `_SCENE_AFTERMATH_VOCAB_RX` check —
adds `sc.precondition`, `sc.aftermathObligations`, `sc.slots.action`, and `sc.slots.exitState` to
the existing `tactical_move`/`event`/`forces_choice` text. The **lane-content check** and the
**posture-echo check** are completely unchanged — they still read only the original, narrow
`combined` (the planner's actual proposed event), never the wider text. A plan cannot satisfy
either of those by padding out `precondition` or `aftermath_obligations`.

**Deliberately excluded**: `chosen_aftermath_lane` (just an id string, not prose) and
`scene_function_instantiated` (requested in the schema but — as before — never carried into
`stateChange` at all). This is not an oversight: retry 11's own real finding, earlier this session,
was specifically that `scene_function_instantiated` can carry rich aftermath vocabulary
("institutional pressure via the Dohkar's public assertion of authority...") while the underlying
event stays inert inside the same ritual moment. Including it in the widened scan would reopen
exactly the gap the whole lane system was built to close. Per Roman's instruction: "I would not
remove the old check entirely, because it still catches 'procedural-sounding label, empty content'
failures" — that protection survives specifically BECAUSE this one field stays excluded.

## 3. Proof — 7/7, new `_scene2_gate_seam_widened_scan_control.mjs`

- **GREEN** — the real Reversal reply (reconstructed verbatim from its persisted log, now carrying
  `precondition`/`event_slots`/`aftermath_obligations`) is no longer rejected.
- **RED-A** — retry 11's real, pre-lane-system reply is still rejected — a clean no-regression
  proof using real historical data that predates every field this fix newly reads.
- **RED-B** — a synthetic "label only" plan: a valid lane declared, but real, non-empty (not
  merely absent) prose in every field — narrow and widened alike — that never uses either check's
  vocabulary. Still rejected, by the generic check. (Using empty strings here would have tripped
  the gate's own separate, pre-existing "nothing to judge" early-return instead of exercising
  either real check — the fixture deliberately avoids that to test the right thing.)
- **RED-C** — the same plan, but with aftermath vocabulary added to a field the gate is
  deliberately NOT told to read (simulating `scene_function_instantiated`). Still rejected — proves
  the exclusion is structural and effective, not accidental.
- **COEXIST** — a plan with generic vocabulary present ONLY in `aftermath_obligations` (so the
  now-widened generic check accepts it) but whose declared lane's own content signal never appears
  in the narrow `tactical_move`/`event`/`forces_choice` text is STILL rejected — by the
  lane-content check specifically, proving the widening did not also, even accidentally, widen or
  weaken that separate, unchanged check.

Full pre-existing control suite re-ran green with zero regressions.

## 4. What this does NOT do

- Does not re-run Reversal live — no branch retry was authorized alongside this fix. Reversal's
  original report is preserved with its honest original record, plus a classification note at the
  top pointing to this fix.
- Does not touch `_validateLocalObjective`.
- Does not weaken the lane-content check or the posture-echo check in any way — both still read
  exactly the same narrow text as before this pass.
- Does not authorize Temptation — still paused per the standing two-card plan, pending Reversal
  being clean under the corrected gate.

## Status

Dry, committed, generic. No provider or image calls. No branch retry. A future retry on Reversal
(separately authorized) would be the first real test of whether the fixed gate, given a fresh
planner draw, lets a correctly-instantiated jurisdiction-challenge plan actually reach the author.
