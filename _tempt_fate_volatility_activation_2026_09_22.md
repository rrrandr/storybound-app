# Tempt Fate CG volatility/imprint activation — dry-fix

2026-09-22. Roman: "Start by making sure Tempt Fate actually creates the volatility/imprint window
that its aftermath system expects... dry-fix that next... No paid calls, no prose generation, no
image work... No live Tempt Fate sample until activation is dry-proven." Also: "I'm sure all this
Tempt Fate stuff was wired in eons ago check the code to be sure I remember doing this multiple
times already" — see §1 for what that re-verification found.

## 0. Re-verification before touching anything

Ran `git log -i --grep` across the whole history before assuming the prior pass's static read was
right. Two real hits, both checked directly against their diffs:

- `f1c33f6a` ("Tempt Fate volatility window," 2026-04-04) — this is a **different, unrelated
  system**: an image-rendering "distortion" model (`_gnRenderState.fateDistortion`,
  `applyTemptFate`, transformation/causal/environmental types, shadow anchors). Confirmed dead in
  the prior pass (F8) — exposed on `window`, never called. This is very likely the source of the
  "I built this before" memory: the name matches, the system is real and was genuinely built, it
  just isn't the same mechanism as `state.volatility_window`.
- `6c6c752a` ("full CG fate wiring," 2026-05-18) — **this is the real one.** Commit message: "Post-
  scene cleanup mirrors literary: **volatility-window taper** + aftermath setup + per-scene
  petition reset." Confirmed via `git show` that this commit added exactly the taper/aftermath-
  decay mirror (what's now `_cgTemptFateAftermathCleanup`'s steps 1-4) — and confirmed, via an
  AST-based (acorn) enclosing-function lookup rather than fragile indentation grepping, that the
  code which actually CREATES/activates a tempt-sourced `state.volatility_window` lived only
  inline inside the literary game-loop's `submitBtn` click handler (an anonymous function spanning
  ~12,000 lines), never mirrored into the CG side.

So: Roman's memory is correct — extensive, real CG fate wiring work was done, more than once. The
specific piece that was never finished is narrow: the ACTIVATION half of the lifecycle specifically
(saturation increment + volatility-window creation), not the whole system.

**Why CG never reaches the literary activation code under normal operation**: a deliberate
"WRONG-ENGINE GUARD" (`app.js` ~302779) returns early from the literary submit handler on a staged
(CG) Book — comment: "on a staged (CG) Book the literary Submit must never start a literary
continuation." The one documented exception (`state._stagedAwaitingProse`) is logged elsewhere as a
bug-recovery fallback ("STAGED:INTERCEPT-MISS... forcing the staged routing as a recovery"), not a
designed activation path — confirmed by reading its own surrounding log language, not assumed.

## 1. Literary path trace (unchanged behavior, now delegated to a shared function)

- **Creation**: was inline in the literary submit handler; now `_updateTemptFateSaturationAndVolatility()`
  (`app.js` ~70187), called from the literary handler at its original location (~306766).
- **Saturation bump**: `state.fate_saturation += (0.2 + consecutive_tempt_fate_count*0.05)`, invocation-gated.
- **Duration / 2-scene fading**: `state.volatility_window = {active:true, severity, remaining_scenes, source:'tempt', wishText}`;
  `remaining_scenes` set by severity (`<0.5→1, <0.8→2, else→3`). Separately, a decay block (literary,
  untouched, ~306782) decrements `remaining_scenes` each non-invocation turn; at 0, tapers (severity
  halved, +1 scene) if `severity>0.2`, else closes and seeds `state._temptAftermathScenes = 2`.
- **Where future prompts read it**: `buildWorldLawDirective()` (`app.js` ~75669) — reads
  `state.tempt_fate_invoked_this_turn`, `state.volatility_window`, `state._temptAftermathScenes` to
  emit the WORLD LAW/severity-band directive while active, or the IMPRINT/FADING directive during
  aftermath.

## 2. CG path trace, before this pass

- **Committed**: `_advanceStagedScene` → `_completeStagedSceneFromScreenplay` (`app.js` ~232360),
  the real CG turn-commit function, confirmed exposed on `window` and confirmed (by reading
  `_advanceStagedScene`'s full body) to be the ONLY thing it calls for scene completion.
- **Activation**: exhaustively confirmed ABSENT. A full line-by-line search of
  `_completeStagedSceneFromScreenplay`'s entire body found no assignment to `state.fate_saturation`
  and no creation of a tempt-sourced `state.volatility_window` — only the taper/decay mirror added
  by `6c6c752a`, gated behind `state.volatility_window.active`, which nothing in the CG path had
  ever set true for Tempt.
- **Future prompts**: `_buildCGTemptDirective()` (`app.js` ~225806) wraps `buildWorldLawDirective()`
  directly — so once the window IS active, CG's directive delivery already worked correctly (proven
  in the prior pass's control). The gap was entirely upstream of delivery: the window was never
  being created in the first place.

## 3. The fix

Two small, behavior-preserving extractions, no new logic beyond wiring the CG call site correctly:

1. **`_updateTemptFateSaturationAndVolatility()`** (`app.js` ~70187, exposed on `window`) — the
   literary activation block, extracted verbatim (byte-for-byte logic, only reformatted as a
   function body). The literary call site now reads `_updateTemptFateSaturationAndVolatility();`
   in place of the old inline block — unchanged behavior, confirmed by control §7.
2. **`_cgTemptFateAftermathCleanup()`** (`app.js` ~232369, exposed on `window`) — the CG post-scene
   fate-cleanup block, extracted verbatim from inside `_completeStagedSceneFromScreenplay` (pure
   extraction, so it's directly callable from a dry control without touching that function's other
   ~700 lines, which may dispatch real network calls elsewhere). `_completeStagedSceneFromScreenplay`
   now calls this one line in its place. **New step 0, prepended**: calls the shared
   `_updateTemptFateSaturationAndVolatility()` BEFORE `state.tempt_fate_invoked_this_turn` /
   `state.temptFateWish` are captured and reset for the next turn — this is the actual fix.
3. **Off-by-one guard, added to the CG taper condition**: CG's existing (2026-05-18) taper logic
   decremented `remaining_scenes` unconditionally whenever the window was active, with no check for
   whether the window was JUST created THIS turn — unlike literary, which already guards this with
   `!state.tempt_fate_invoked_this_turn`. Without an equivalent guard, wiring in activation would
   have made a freshly-created window lose one scene of its duration immediately, on its own
   activation turn. Added `&& !_temptInvokedThisTurn` to CG's taper condition (using the already-
   captured local, since `state.tempt_fate_invoked_this_turn` itself is reset to `false` one line
   earlier in the same function) — mirrors literary's own guard exactly. Confirmed by control §3.

Both new functions are top-level (siblings of `_completeStagedSceneFromScreenplay`, not nested
inside it), confirmed via the same AST-based lookup used in §0 — necessary for them to be reachable
across the literary/CG call sites and for direct dry-control testability.

## 4. Proof (`_tempt_fate_volatility_activation_control.mjs`, 18/18)

Real, unmodified exposed functions (`_cgTemptFateAftermathCleanup`,
`_updateTemptFateSaturationAndVolatility`, `_buildCGTemptDirective`), real browser, fail-closed
network gate, zero `/api/**` traffic logged beyond ordinary page load — genuinely zero paid calls.

1. A CG Tempt invocation (`state.tempt_fate_invoked_this_turn = true` +
   `state.temptFateWish = 'kill Julian'`, then the real `_cgTemptFateAftermathCleanup()`) activates
   `state.volatility_window` (`active:true`, `source:'tempt'`, real severity/remaining_scenes,
   wishText captured), and correctly resets the invocation flag/wish afterward.
2. `state.fate_saturation` rises from 0.
3. The activation turn itself is not also decremented (off-by-one guard confirmed).
4. Walking the real state machine forward turn-by-turn (calling the real
   `_cgTemptFateAftermathCleanup`/`_buildCGTemptDirective` repeatedly, no reimplementation): at
   least one continuation scene while the window is open receives the WORLD LAW directive; the
   FADING aftermath directive does fire; the imprint window fully closes and the directive returns
   empty by the end of the walk. See §5 for the one thing this walk surfaced that did NOT pass as
   originally worded.
5. Ordinary Say/Do (no Tempt invocation) leaves the window inactive and saturation non-rising.
6. A Petition-sourced window already active is left alone by Tempt's activation step (only fires
   when `tempt_fate_invoked_this_turn` is true) — its own taper still runs normally.
7. Calling the shared function directly (the literary code path) produces the identical activation
   shape as the CG path — same function, same output.

## 5. NEW FINDING this pass, pre-existing in BOTH literary and CG, not introduced by this fix —
flagged, not silently fixed

Walking the full lifecycle end-to-end for the first time (control §4) surfaced that the **aftermath
IMPRINT phase never actually fires, in either path** — not a CG-specific regression, a pre-existing
defect this pass's control is simply the first thing to exercise thoroughly enough to catch.

**Mechanism**: the volatility-window-close step and the aftermath-decay step are two separate,
sequential `if` blocks within the same per-turn cleanup, not mutually exclusive. On the turn the
window closes, it seeds `state._temptAftermathScenes = 2` — and the very next check in the SAME
call sees the (now-inactive) window and immediately decrements the counter to 1, before any
directive is ever built from it. `buildWorldLawDirective()`'s IMPRINT branch requires the counter
to read exactly `2` (`isFirst = state._temptAftermathScenes === 2`) — since it's already 1 by the
time a directive is next built, the player only ever sees the FADING framing. Confirmed present
verbatim in the untouched literary decay block (`app.js` ~306774-306813, not touched this pass) —
this is not something the CG-activation fix introduced.

**Impact**: a quality/narrative-design miss (Roman's own earlier design note — "mass delusion /
rogue wish" framing should acknowledge-then-fade in two stages — currently only fades), not a
safety or canon-integrity issue. The aftermath mechanism does still fire, still bounds, still
expires on schedule; it just skips its first beat.

**Not fixed in this pass** — per the adjacent-defect-is-a-separate-decision discipline: this is a
newly-discovered, cross-cutting (both paths) issue outside what was asked ("dry-fix Tempt Fate
volatility/imprint activation for CG continuations"), and item 5 of the instruction explicitly asks
that adjacent issues be recorded as follow-ups rather than folded in silently. Recommended fix (not
applied): make the two blocks mutually exclusive — skip the aftermath-decay check on the same
call where the window just closed (an `else` off the window-closing branch, or an
"activation-turn"-style guard analogous to the ones already used twice in this exact file for
precisely this class of off-by-one). Small, same shape as the fix already applied in §3, affects
literary and CG identically since both would go through the same shared functions after this pass.

## 6. Regression

`_relational_obligation_contract_control.mjs` 47/47 · `_planner_function_gate_diagnosis_control.mjs`
unaffected · `_cg_proxy_world_guard_control.mjs` 15/15 · `_cg_causal_link_legibility_control.mjs`
25/25 · `_confession_frame_confessing_party_control.mjs` 16/16 · `_scene2_aftermath_lane_control.mjs`
22/22 · `_scene2_planner_function_gate_control.mjs` 10/10 ·
`_scene2_lirael_defensive_path_lane_semantics_control.mjs` 22/22 (no flake this run) ·
`_saydo_safety_gate_control.mjs` 24/24 · `_saydo_wallbreak_gibberish_cluster_control.mjs` 32/32 ·
`_petition_identity_rewrite_gate_control.mjs` 23/23 · `_tempt_fate_canon_rupture_control.mjs` 20/20
· `_continuity_spine_dry.mjs` (80-check baseline) — result appended to the commit body once the
background run completes (expected unchanged: 69 passed / 11 pre-existing-failed).

## 7. What this pass does NOT do

- Does not fix the pre-existing IMPRINT-skip bug (§5) — flagged for Roman's decision.
- Does not touch premise-protection entries (F5) or the cataclysmic-regex inflection gap (F6) from
  the prior pass — out of scope per instruction item 5.
- No live Tempt Fate sample, no paid calls, no prose generation, no image work.
- Does not change Petition Fate (already closed) or the dead image-rendering distortion subsystem
  (§0, unrelated system).
