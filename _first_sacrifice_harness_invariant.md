# First Sacrifice Harness Invariant (Roman, 2026-09-16 corrective pass)

Checkable facts every harness/test touching `starter_first_sacrifice` MUST assert or respect.
Violating any of these without explicitly labeling itself an "isolated-mode test" (per
`_mode_matrix.md`) is a structural error in the harness, not a missing feature in the app.

## The invariant, as assertions

1. **`window.STARTER_STORIES.find(d => d.id === 'starter_first_sacrifice').render_mode === 'staged_story_mode'`.**
   Confirmed live, `_cg_ground_truth_census.mjs`, both runs.

2. **First Sacrifice's Scene 1 is BAKED — fixed, pre-written, never AI-generated.** No harness may
   expect, count, or require an `OPENING_PLANNER` or literary `AUTHOR` call for First Sacrifice's
   Scene 1. A harness that observes zero such calls for First Sacrifice's real launch is CORRECT,
   not broken. Evidence: `_unlockBakedGenesis()` (`public/app.js` ~136381) calls
   `handleBeginStory()` with `state._bakedSetupOnly = true`; its own docblock states this mode
   "builds the Bibles / R-plot / A-plot / spine / sysPrompt, and returns **before authoring
   anything**." Ground-truth census confirms: 0 `OPENING_PLANNER`, 0 `AUTHOR` calls, real launch,
   no mode override, 0 UNDECLARED blocks.

3. **The reader sees Scene 1's text BEFORE the Genesis/setup call chain even starts.** The baked
   text mounts at the "Read" step (shelf → zoom → baked mount), which precedes
   `#bakedOASEnterBtn` → `#buGoBtn` (the click that triggers `_unlockBakedGenesis`/
   `handleBeginStory(setup-only)`). No model call in the setup chain can block prose visibility —
   it is structurally impossible, the prose is already on screen.

4. **The real per-launch model-call roles for First Sacrifice are: `CG_SCAFFOLD` (1),
   `OAS_DIALOGUE` (1), and up to ~36 individual mouth-state `IMAGE` calls** (see manifest below;
   the true baseline may be far lower on a warm cache — see caching section). A harness asserting
   `PAIR_BOND`/`R_PLOT`/`WOUND_LI_INTEGRATION_AUDIT`/`PC_BODY_BIBLE`/`LI_BODY_BIBLE` fire for First
   Sacrifice is testing Tier 0's suppression of those roles (which remains real and valid — see
   `_first_sacrifice_editorial_scene1` project notes), not First Sacrifice's genuine content-
   delivery mechanism.

5. **`_buildCGScreenplayUserPrompt`/`_buildCGScreenplaySystemPrompt` did NOT fire in this launch.**
   Their actual trigger condition for First Sacrifice is UNRESOLVED — flagged open, not asserted
   either way.

6. **A harness driving First Sacrifice via `window.handleBeginStory()` called directly (not
   through `#buGoBtn`/`_unlockBakedGenesis`) is testing a DIFFERENT invocation mode** —
   `_bakedSetupOnly` will not be set, and the harness may observe `OPENING_PLANNER`/`AUTHOR` firing
   when the real app never would. This is the second, independent reason
   `_scene1_call_census.mjs`'s historical "2 calls" result does not describe First Sacrifice.

## Caching semantics affecting any future manifest claim

- Mouth-state images: **cache key = `_liMouthFeatureKey(description, gender)`** — a coarse
  signature keyed on the LI's description/gender/distinguishing features, NOT per-story or
  per-reader. Cache layers: (a) `localStorage['sb_mouth_db']`, per-browser, 32-entry LRU; (b)
  Supabase `mouth_bank` table keyed by `feature_key` — genuinely **cross-reader shared**. Since
  First Sacrifice's Julian has a fixed, unchanging description, the FIRST real reader ever to open
  this story's OAS is the only one who should hit a full cold-cache 36-call bill; subsequent
  readers hit `_hydrateMouthFromRemote` and should see this number drop toward zero. A fresh
  Playwright context (no localStorage, no real Supabase row) is a worst-case cold-cache probe, not
  representative of steady-state cost.
- No equivalent caching was found for `CG_SCAFFOLD` or `OAS_DIALOGUE` in this pass — both appear to
  regenerate per real story-instance launch (not investigated to the same depth; flagged, not
  asserted).
