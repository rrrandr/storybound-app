# Tempt Fate IMPRINT-phase lifecycle fix

2026-09-22. Roman: "This is not just a quality nit; it's part of the Tempt Fate contract. If the
system says temporary rupture should metabolize through an imprint phase, but the first visible
phase is already FADING, the story is losing the immediate 'the world is still bruised by what
happened' beat... it should be the next dry fix before any live Tempt sample." No paid calls, no
prose generation, no image work.

## 1. The shared lifecycle, traced turn-by-turn

```
ACTIVATION (Tempt invoked)
  → state.volatility_window = {active:true, severity, remaining_scenes, source:'tempt', wishText}
  → state.fate_saturation bumped
ACTIVE-WINDOW DIRECTIVE (each subsequent turn, window still open)
  → buildWorldLawDirective() emits the WORLD LAW + severity-band block (bounded rupture, live)
WINDOW CLOSE (remaining_scenes hits 0, severity <= 0.2)
  → state.volatility_window.active = false
  → state._temptAftermathScenes = 2   (the imprint counter, freshly seeded)
  → state._temptAftermathWish = <captured wish text>
AFTERMATH DIRECTIVE BUILD (buildWorldLawDirective, reads _temptAftermathScenes)
  → === 2 → IMPRINT   ("the win holds... characters carry an emotional imprint")
  → === 1 → FADING    ("the emotional echo softens... memory collapses into doubt")
DECAY (each subsequent turn, window already closed)
  → state._temptAftermathScenes -= 1
EXPIRATION (counter hits 0)
  → state._temptAftermathScenes = 0, state._temptAftermathWish = ''
  → buildWorldLawDirective() returns '' — no more Fate framing
```

**The bug, precisely**: WINDOW CLOSE and DECAY were two separate, sequential `if` blocks inside the
SAME per-turn cleanup call, with no guard between them. On the turn the window closed, it seeded
`_temptAftermathScenes = 2` — and the DECAY block, running immediately after in that same call, saw
the (now-inactive) window and decremented the counter to 1 before any directive was ever built from
it. Confirmed present verbatim in both the untouched literary decay block (`app.js` then ~306855-
306894) and CG's independent 2026-05-18 mirror — not something the prior pass's CG-activation fix
introduced; that fix only made CG reach this pre-existing code at all.

## 2. The fix

Unified both paths' taper+decay logic (previously two independently-duplicated copies — literary's
original, and CG's 2026-05-18 mirror) into one shared function,
**`_temptFateWindowTaperAndAftermathDecay(temptInvokedThisTurn, temptWishForAftermath)`**
(`app.js` ~70253, exposed on `window`):

- Introduces a local `aftermathJustSeededThisTurn` flag, set `true` only inside the window-close
  branch that seeds the counter to 2.
- The DECAY block's condition gains `&& !aftermathJustSeededThisTurn` — so on the exact turn the
  window closes, decay is skipped entirely, leaving the freshly-seeded `2` intact for the NEXT
  directive build to read as IMPRINT. On every subsequent call (a fresh function invocation, the
  local resets to `false`), decay proceeds normally.
- Also folds in the **Petition-activation-turn skip** (`_activationTurn`-based) that literary
  already had but CG's independent copy never carried — a separate, pre-existing gap, folded in
  here rather than left to drift further now that the two copies are unified. Not a new behavior:
  it gives CG the same correctness literary already had for Petition's own scene-count precision.

Both call sites now delegate to this one function:
- **Literary** (`app.js` ~306827): `_temptFateWindowTaperAndAftermathDecay(state.tempt_fate_invoked_this_turn, state.temptFateWish)`
  — reads these live/uncaptured, matching the literary handler's own order (it doesn't reset either
  until much later, after prose generation — confirmed by locating both reset lines and their
  position relative to this call).
- **CG** (`app.js` ~232500, inside `_cgTemptFateAftermathCleanup`):
  `_temptFateWindowTaperAndAftermathDecay(_temptInvokedThisTurn, _temptWishForAftermath)` — using
  the already-captured locals from that function's own step 1 (captured before CG resets the live
  state fields, unlike literary).

**A real, confirmed timing difference between the two paths, not a bug**: literary runs
activation → taper/decay → directive-build all within the SAME turn's processing (before that
turn's own generation call), so the turn the window closes is the SAME turn IMPRINT is visible.
CG's directive build happens in a separate step BEFORE that turn's own `_cgTemptFateAftermathCleanup`
runs (cleanup prepares state for the NEXT turn's directive) — so for CG, IMPRINT becomes visible
the scene AFTER the window closes. Both orderings were traced from source (not assumed) and each
path's control below walks its own real call order faithfully rather than forcing one shared
assumption onto both.

## 3. Proof (`_tempt_fate_imprint_lifecycle_control.mjs`, 19/19)

Real, unmodified exposed functions only — `_cgTemptFateAftermathCleanup`,
`_updateTemptFateSaturationAndVolatility`, `_temptFateWindowTaperAndAftermathDecay`,
`_buildCGTemptDirective` — real browser, fail-closed network gate, zero `/api/**` traffic beyond
ordinary page load. Genuinely zero paid calls.

1. **CG full walk** (directive-before-cleanup, matching CG's real order): timeline —
   invocation → WORLD LAW (window open) → WORLD LAW (window open, tapering) → **IMPRINT** (window
   just closed, counter=2) → **FADING** (counter=1) → empty (expired). IMPRINT strictly before
   FADING; seeding turn shows the counter at exactly 2, never pre-decremented to 1.
2. **Literary full walk** (activation→decay→directive-build within the same turn, matching
   literary's real order): timeline — invocation (WORLD LAW) → WORLD LAW (tapering) →
   **IMPRINT** (same turn the window closes) → **FADING** → empty. Same ordering guarantee, correct
   relative timing for literary's own call structure.
3. Ordinary Say/Do creates no aftermath and no active window, in both paths.
4. A closing Petition-sourced window does not seed `_temptAftermathScenes` (Tempt's aftermath is
   never accidentally triggered by a different Fate mechanism's own lifecycle), in both paths.
5. Re-ran the prior pass's `_tempt_fate_volatility_activation_control.mjs` (requirement 5) — its
   IMPRINT assertion, previously INFO-only (the tool that first caught this bug), now asserts for
   real and passes: 19/19 total, confirming the CG-activation fix from the prior pass still holds
   unchanged alongside this new fix.

## 4. Regression

`_relational_obligation_contract_control.mjs` 47/47 · `_planner_function_gate_diagnosis_control.mjs`
unaffected · `_cg_proxy_world_guard_control.mjs` 15/15 · `_cg_causal_link_legibility_control.mjs`
25/25 · `_confession_frame_confessing_party_control.mjs` 16/16 · `_scene2_aftermath_lane_control.mjs`
22/22 · `_scene2_planner_function_gate_control.mjs` 10/10 ·
`_scene2_lirael_defensive_path_lane_semantics_control.mjs` 22/22 · `_saydo_safety_gate_control.mjs`
24/24 · `_saydo_wallbreak_gibberish_cluster_control.mjs` 32/32 ·
`_petition_identity_rewrite_gate_control.mjs` 23/23 · `_tempt_fate_canon_rupture_control.mjs` 20/20
· `_tempt_fate_volatility_activation_control.mjs` 19/19 (re-run per requirement 5) ·
`_continuity_spine_dry.mjs` (80-check baseline) — result appended to the commit body once the
background run completes (expected unchanged: 69 passed / 11 pre-existing-failed).

## 5. What this pass does NOT do

- No live Tempt Fate sample, no paid calls, no prose generation, no image work.
- Does not touch premise-protection entries or the cataclysmic-regex inflection gap (both still
  open follow-ups from the earlier canon-rupture trace pass).
- Does not change Petition Fate or any other Fate mechanism beyond folding CG into the same
  Petition-activation-turn skip literary already had (a correctness improvement, not new scope).
