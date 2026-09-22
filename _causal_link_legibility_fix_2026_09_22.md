# Causal-Link Legibility: Author-Side Fix (2026-09-22)

Roman, after Silence attempt 1's mechanically-clean-but-craft-failed result: "The planner appears
to have carried the intended Silence frame... The failure is in the authored beats: the procedure
happens after the silence, but the prose does not make it legible that it happens because of the
silence." Instruction: commit the run report first (done — `_silence_attempt1_2026_09_22.md`,
commit `21e6a6af`), then dry-diagnose and fix the AUTHOR-side contract, not the planner. Trace
whether the author prompt currently carries a causal-legibility obligation; if not, add a generic
(not First-Sacrifice-only, not Silence-only) directive for consequence-driving non-action; add a
lightweight diagnostic only if it can be structural and honest, never a brittle "because"/"since"
regex; prove against Silence attempt 1 as red fixture, plus a green fixture without explicit
causal wording. No provider calls, no retry, no prose edits.

## 1. Comparing the planner fields against the author request body and final beats

Silence attempt 1's real planner reply correctly carried the causal frame at the structured level:
`state_change_precondition`: "The assembly holds charged silence after Julian's public claim with
no procedural move yet." → `state_change`: "The presiding Dohkar names a preliminary review date
and its terms before the assembly disperses." The real authored beats did not: beats 0-1 establish
the silence, beats 4/6/10 (the Dohkar's dialogue) are purely procedural, and no single beat ever
mentions both.

## 2. Did the author prompt carry a causal-legibility obligation? No.

Traced the actual planner→author delivery channel: `state._scenePlotContract.stateChange`,
rendered by `_buildPlotContractDirective` (`public/app.js`), called from both the literary and CG
author prompt roots (confirmed 3 call sites, including the CG system-prompt builder). This is the
ONLY structured channel — a full-body read of the CG screenplay author's own ~31k-line user-prompt
builder (`_buildCGScreenplayUserPrompt`) confirmed it never references `tactical_move`,
`state_change`, `aftermath_obligations`, or any story-specific `eventFrame` text directly; whatever
`_buildPlotContractDirective` delivers is genuinely everything the author receives about WHAT
happened and WHY.

Before this fix, `_buildPlotContractDirective` delivered `precondition` ("BEFORE"), `event` ("THE
EVENT — stage THIS EXACT event..."), and `forces_choice`, but never instructed the author to make a
causal link (vs. mere sequence) legible when the event is framed as a consequence of a preceding
non-action. This is exactly the gap Roman named.

## 3-4. The fix — generic, not First-Sacrifice-only, not Silence-only

Two new top-level, pure, testable functions in `public/app.js` (placed immediately after
`_buildPlotContractDirective`'s own window export, confirmed reachable at script-load time, not
nested inside a per-generation closure — learned from the earlier `buildColloquialismGuardDirective`
scoping mistake this same day):

- **`_causalLinkPlanTrigger(sc)`** — reads ONLY `sc.precondition` (the accepted plan's own
  generic stateChange field), checking for non-action vocabulary (silence, withheld, refuse,
  restraint, conceal, non-answer, remains/stays silent, does not speak/answer, holds tongue —
  small, non-exhaustive, matching the user's own named categories). When it fires,
  `_buildPlotContractDirective` injects a new HARD `CAUSAL LEGIBILITY` directive line immediately
  after "THE EVENT": dramatize the response as landing BECAUSE of the non-action, not merely AFTER
  it; explicitly states the reader must feel the causal thread "even without the word 'because.'"

- **`_causalLinkBeatsCoOccurrence(beats, sc)`** — diagnostic-only (never rejects, never rewrites),
  wired into the existing PC PROXY ACTION VALIDATOR area as a new, independent log-only check.
  Checks whether ANY single authored beat's text contains BOTH a non-action term and a small,
  generic institutional/social-response term (review, hearing, ruling, orders, sanction, etc.).
  Logs `[CG:CAUSAL-LINK:OK]` / `[CG:CAUSAL-LINK:WEAK]`, silent when not applicable (most scenes
  aren't framed around a non-action at all).

### Why precondition-only (found during dry proof, not assumed up front)

An earlier draft scanned `precondition + event + tactical_move` together and false-triggered on
Temptation attempt 11's own real, already-proven-good plan: its `tactical_move` reads "...
concealing her personal stake in the wish from the Dohkar and assembly" — matching non-action
vocabulary, but that concealment is the MANNER of Lirael's own landed action, not a preceding
non-action a separate event responds to. `precondition` is structurally different: the app's own
planner prompt defines it as "the ONE fact that is FALSE / not-yet-true when the scene begins" —
always the standing "before" condition the event resolves. Restricting detection to precondition
asks the right question ("is the condition this scene answers a non-action?") without tripping on
an action verb that happens to share vocabulary with withholding. This refinement was caught by the
control's own no-false-positive check (Section C below), not assumed correct in advance.

### Why diagnostic-only, not reject

No retry path exists after a full paid CG author call to reject into (unlike the pre-author
planner-side lane gate, which does retry once) — a reject gate here would only discard money with
no recourse. The co-occurrence check is also an honest necessary-but-not-sufficient proxy: presence
doesn't prove dramatized causation, only that the two threads weren't kept entirely separate.
Matches this codebase's `feedback_validators_never_write` convention and the precedent set by the
existing (also diagnostic-only) PC PROXY ACTION VALIDATOR.

## 5. Explicitly not a "because"/"since" regex

Neither the detector nor the diagnostic ever look for causal connective words in the model's own
output. The generation-time directive explicitly tells the model the connection should be legible
"even without the word 'because'" — rewarding blocking/imagery/timing-based causation, not a bare
inserted connector.

## 6-7. Proof — `_cg_causal_link_legibility_control.mjs`, 21/21, fully dry

- **A (RED)** — Silence attempt 1's own real, captured `state_change_precondition` triggers the
  detector (`"silence"`); its own real, captured authored beats FAIL co-occurrence — reproduces
  the real diagnosed failure exactly, no synthetic substitute.
- **B (WIRING)** — the real `_buildPlotContractDirective()`, built from Silence attempt 1's real
  stateChange, now contains the new CAUSAL LEGIBILITY block, source-traced (not paraphrase-matched).
- **C (NO FALSE POSITIVE)** — Temptation attempt 11's real stateChange does NOT trigger the
  detector; its directive does NOT contain the CAUSAL LEGIBILITY block; the rest of the block
  (THE EVENT line) is unaffected — proves this doesn't fire indiscriminately, and specifically
  proves the precondition-only refinement holds against real production data.
- **D (GREEN fixture, no explicit causal wording)** — a synthetic beat ("The magistrate watches
  the silence stretch, then speaks: a formal ruling, issued into the very quiet she left him.")
  pairs a non-action term and a response term in the SAME beat, with zero "because"/"since"
  anywhere in the fixture, and PASSES.
- **E (Genericity)** — a synthetic scene using a different world, different lane id, "restraint"
  instead of "silence," "sanctions" instead of "review" — no Fatelands or Silence-specific
  vocabulary anywhere — still triggers the identical mechanism and scores correctly both bound and
  unbound versions.
- **F (Anti-gaming)** — a beat set with ONLY non-action vocabulary (no response term anywhere), and
  a separate set with ONLY response vocabulary (no non-action term anywhere), both correctly fail
  co-occurrence — the check requires genuine same-beat pairing, not a scene-wide OR.
- **G (Edge cases)** — null/empty stateChange, null/empty beats, and a plain landed-action scene
  (correctly marked not-applicable, not scored) all handled without throwing.

## Full regression — zero collateral damage

- `_cg_causal_link_legibility_control.mjs`: 21/21 (new).
- `_relational_obligation_contract_control.mjs`: 47/47, unaffected.
- `_planner_function_gate_diagnosis_control.mjs`: attempts 6/9/10 unaffected.
- `_cg_proxy_world_guard_control.mjs`: 15/15, unaffected.
- `_scene2_aftermath_lane_control.mjs`: 22/22, unaffected.
- `_scene2_planner_function_gate_control.mjs`: 10/10, unaffected.
- `_scene2_lirael_defensive_path_lane_semantics_control.mjs`: 22/22, unaffected.
- `_continuity_spine_dry.mjs`: 69/80, identical 11 pre-existing failing test names (S6, N1, R2, G3,
  R2d, G2, G6, R3, R5, R5b, R6a), no new failures — including `C1` (the CG screenplay system prompt
  executed-builder check), confirming the `_buildPlotContractDirective` change did not disturb the
  CG author prompt-build path.

## What this does NOT do

- Does not edit Silence attempt 1's generated scene or its preserved artifacts.
- Does not retry Silence or make any provider call.
- Does not claim the co-occurrence diagnostic proves genuine dramaturgical causation — explicitly
  documented as a coarse, necessary-but-not-sufficient proxy, log-only, never a reject gate.
- Does not touch the planner's own prompt/schema — this is entirely an author-side (post-acceptance
  delivery) fix, per the explicit instruction not to fix the planner.
- Does not claim this is validated live — the directive change has not yet been exercised against a
  real paid dispatch; that is the natural next authorized step (a Silence retry), not taken here.

## Status

Dry, uncommitted at time of writing. No provider or image calls. No candidate prose edits. Cache-
buster bumped (`?v=20260922k-causal-link-legibility`).
