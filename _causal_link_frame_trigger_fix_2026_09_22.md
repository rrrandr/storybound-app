# Causal-Link Trigger Retune: Frame/Lane-Based, Not Field-Scanning (2026-09-22)

Roman, after Silence attempt 2 exposed the precondition-only trigger as too narrow: "That's a good
catch, and it means the fix was too surgically scoped to the exact attempt 1 shape... The next fix
should not simply scan every field for 'silence,' though. That would reopen the Temptation false
positive. The safer rule is: use the accepted plan's lane/frame context plus fields that describe
the cause of the event, not fields that describe the event's manner. For Silence specifically, if
the resolved lane/frame itself says the Dohkar breaks charged silence, then the causal-legibility
directive should fire even if the planner's precondition field says 'no review date has been
announced.'" Instruction: commit attempt 2 first (done — `_silence_attempt2_2026_09_22.md`, commit
`832fee33`), then dry-fix the trigger to read resolved lane/event-frame metadata first, precondition
as corroboration only, preserve the Temptation no-false-positive fixture, prove against both Silence
attempts as red, Temptation as green, plus a generic non-First-Sacrifice fixture. No provider calls,
no prose edits, no retry.

## Diagnosis preserved from the authorization message

1. Silence attempt 2 did not test the CAUSAL LEGIBILITY directive — the directive never fired.
2. The accepted plan still clearly described a silence-driven scene in `tactical_move`
   ("Dohkar breaks charged silence..."), `posture_read` ("sustained defiant silence"), and
   `li_pressure_actor` — only `state_change_precondition` lacked trigger vocabulary this run
   ("No preliminary review date or terms have been announced after Julian's claim").
3. The precondition-only trigger was too narrow for natural planner phrasing variance.

## The fix — resolved lane/event-frame first, precondition as fallback only

Traced the app's own pre-existing, already-generic lane-resolution mechanism:
`_effectiveSceneRow(state, sceneNum)` → the starter's plan row for this scene → passed to
`_resolveStarterEventFrame(row, state)`, which reads `state._intimateInterruption.selectedSlot`
(the reader's actual card choice) against the row's `eventFrameBySlot`/`defaultEventFrame` and
returns `{ laneId, eventFrame, sourceSlot, lane }`. This is the SAME mechanism the planner's own
prompt and the pre-author lane-instantiation gate already use (2 pre-existing call sites) — not new
machinery, and already generic across any starter that declares this data.

`_causalLinkFrameTrigger(s)` now resolves this frame and classifies its `eventFrame` TEXT via a new
pure function, `_causalLinkFrameTextTrigger(text)`. This is the PRIMARY signal in
`_causalLinkPlanTrigger(sc, s)`; `sc.precondition` is checked only as a fallback, when no frame
resolves at all (a starter without the lane system, or a custom/no-card submission).

### The frame's own text is not automatically safe either — checked, not assumed

Before trusting frame text as primary, re-checked it against Temptation attempt 11's real,
already-proven-good lane definition: `eventFrameBySlot.temptation.eventFrame` reads "...she
actively **CONCEALS** a SPECIFIC fact, object, or admission..." — non-action vocabulary again, in
the exact field this fix now reads first. A bare vocabulary scan of frame text would have reopened
the false positive already closed once. Directly compared both real texts:

- Silence's real frame: "...**IS WHAT PROMPTS** the presiding Dohkar to break it procedurally..."
- Temptation's real frame: no `prompts`/`causes`/`triggers`/`provokes`/`in response to` anywhere.

So `_causalLinkFrameTextTrigger` requires BOTH a non-action term AND an explicit causal-structure
connector phrase in the SAME text. This is checking the starter designer's own small, finite,
deliberately-authored lane text — not a live model's freeform output — so a connector requirement
here is a materially different (and much less brittle) bar than the "no because/since in the
model's own prose" rule that still governs the separate authored-beats diagnostic
(`_causalLinkBeatsCoOccurrence`, logic unchanged this pass, now threaded the same `s` param).

## Proof — `_cg_causal_link_legibility_control.mjs`, 25/25, fully dry, mostly against REAL live state

Rewrote the control to exercise the REAL resolution chain end-to-end wherever possible — setting
`window.state._starterId`/`_intimateInterruption.selectedSlot` exactly as the live pipeline does,
not hand-built fixture objects standing in for it:

- **A (RED, end-to-end)** — Silence, resolved through the real live First-Sacrifice starter data,
  triggers. Silence attempt 2's own real precondition, checked in isolation with frame resolution
  suppressed, does NOT trigger on its own (proves the frame is doing the real work, not a quiet
  precondition match). The full real call, `_causalLinkPlanTrigger(sc, state)` with live state
  resolving Silence's frame, now triggers using attempt 2's real stateChange.
- **B (WIRING)** — the real `_buildPlotContractDirective()`, built with attempt 2's real stateChange
  and live state resolving Silence's frame, contains CAUSAL LEGIBILITY.
- **C (NO FALSE POSITIVE, end-to-end, all 4 other real slots)** — temptation/confession/boundary/
  reversal, each resolved through the identical live mechanism, do NOT trigger. Confession and
  Boundary happen to share Silence's own or an adjacent lane but correctly don't trigger, because
  THEIR OWN real eventFrame text isn't framed around a non-action.
- **D (GREEN beat fixture)** — same-beat co-occurrence passes with zero explicit causal wording
  (unchanged from the prior pass).
- **E (Genericity, two independent layers)** — a synthetic non-Fatelands row/state proves
  `_resolveStarterEventFrame` itself (pre-existing, unmodified) is generic; a synthetic
  council/tribunal-world frame TEXT (zero shared vocabulary with Fatelands) proves the NEW
  classifier fires correctly; a synthetic frame using non-action vocabulary as manner-only (no
  connector) in that same unrelated world correctly does not fire — proving the connector gate
  generalizes, not that it happens to work only for these two specific Fatelands lanes.
- **F (Fallback)** — when no frame resolves at all, precondition alone still governs (preserves the
  prior fix's own proof).
- **G (Anti-gaming)** — non-action-only or response-only beats never satisfy co-occurrence.
- **H (Edge cases)** — no throw anywhere in the chain on null/empty/missing input.

One real test-isolation bug caught and fixed during drafting (not a code bug): an early draft of
check A passed `null` as the state argument expecting it to suppress frame resolution — but
`_causalLinkFrameTrigger`'s `s = s || window.state` fallback means `null` instead falls back to the
live `window.state`, which still carried Silence context from the assertion just above in the same
section. Fixed by passing an explicit non-resolving object (`{ _starterId: null }`) instead.

## Full regression — zero collateral damage

- `_cg_causal_link_legibility_control.mjs`: 25/25 (retuned).
- `_relational_obligation_contract_control.mjs`: 47/47, unaffected.
- `_planner_function_gate_diagnosis_control.mjs`: attempts 6/9/10 unaffected.
- `_cg_proxy_world_guard_control.mjs`: 15/15, unaffected.
- `_scene2_aftermath_lane_control.mjs`: 22/22, unaffected.
- `_scene2_planner_function_gate_control.mjs`: 10/10, unaffected.
- `_scene2_lirael_defensive_path_lane_semantics_control.mjs`: 22/22 (one transient `page.goto`
  timeout on first run, matching the established known-flaky pattern from earlier this session;
  server confirmed responsive via direct curl; retry passed clean).
- `_continuity_spine_dry.mjs`: 69/80, identical 11 pre-existing failing test names, no new failures.

## What this does NOT do

- Does not edit either Silence attempt's generated scene or preserved artifacts.
- Does not retry Silence again or make any provider call.
- Does not claim this is validated live — the retuned trigger has not yet been exercised against a
  real paid dispatch. That is the natural next authorized step, not taken here.
- Does not change `_causalLinkBeatsCoOccurrence`'s own matching logic (still diagnostic-only,
  still same-beat co-occurrence, still not a because/since check) — only threaded the new optional
  `s` parameter through to `_causalLinkPlanTrigger`.

## Status

Dry, uncommitted at time of writing. No provider or image calls. No candidate prose edits. Cache-
buster bumped (`?v=20260922l-causal-link-frame-trigger`).
