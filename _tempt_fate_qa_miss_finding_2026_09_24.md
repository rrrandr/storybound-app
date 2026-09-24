# Why the QA layer did not flag the 18-beat, suspended-mood rupture scene

Dry, 2026-09-24. Evidence: `_tempt_fate_qa_miss_diagnostic.mjs` (10/10 findings confirmed), which
runs the **real exported production detectors** against the **real retained paid scene**. No
reimplementation, no simulation, zero provider dispatches.

## Headline: the QA layer never ran. It is not wired into production.

| detector | production call sites |
|---|---|
| `_detectSceneAdequacyFailure` | **0** |
| `_detectLIPresenceFloor` | **0** |
| `_detectLIPresenceDominance` | 1 — inside `_repairLIPresenceBeats`, itself documented as *"Never invoked automatically"* |

All three are defined, exported onto `window`, and referenced elsewhere **only in comments**. Read
from disk, excluding definitions, exports and comment lines, there are no callers.

This is not a detector that missed a defect. It is a detector that was never asked.

**And it would have caught this scene.** Run by hand against the retained output:

```
verdict: FAILED
reason: "no aftermath/procedure/consequence-movement signal found anywhere in the scene —
         reads as a single extended reaction beat, not scene progression"
```

So the scene *was* inadequate by the project's own standard, on an axis nobody had noticed — and
nothing in the pipeline asked the question.

### How it came to be orphaned

`_detectPlannerFunctionGap` (2026-09-20) moved the aftermath-vocabulary check **pre-dispatch**, so a
doomed plan never reaches the author. Its own comment says so: *"only THEN did
`_detectSceneAdequacyFailure` catch it. This gate runs the same aftermath-vocabulary check against
the planner's OWN proposed event, before sysPrompt is even built."* The pre-dispatch gate was added;
the post-generation detector was left behind rather than retired or re-wired. The paid run confirms
the gate ran and waived only the lane requirement, as designed:

```
[CG:PLANNER-GATE] lane requirement waived — active Tempt rupture outranks the scheduled frame
```

The waiver is correctly scoped to the lane branch. It is not the cause here.

## The two specific misses

### 1. Beat count — 18 delivered against floors of 18 / 22 / 30-38

**No validator anywhere enforces a beat floor.** A scan of every exported `_detect*` / `_validate*` /
`_score*` / `_check*` function for a numeric floor applied to a beats array returns empty.

The prompt states the requirement three times, including *"A scene under ~18 beats is a FAILURE"* and
*"Undershooting the beat count is the #1 CG miss — do not do it."* A named #1 failure mode with zero
structural enforcement is exactly the gap that produced this scene.

### 2. Suspended-mood ending — the rule exists, and is mood-blind

`_detectSceneAdequacyFailure` fails an ending only when `suspensionHit && !movementHit`. On this
scene's final five beats:

```
suspensionVocabPresent: true      ← "Julian waits without moving"
movementVerbPresent:    true      ← "I could speak now and claim what I did"
→ ending check PASSES
```

`_SCENE_MOVEMENT_VERB_RX` contains `\bspeaks?\b`. The beat that satisfied "completed forward
movement" is a **hypothetical the protagonist explicitly does not act on** — the next beat is *"Or I
could let the forgetting stand"*, and the scene closes on *"The choice is mine to name or bury."*

So even if the detector had been wired, this ending would have passed. The movement test has no
modality awareness: `could speak`, `might turn`, `would leave` all read as completed action.

## 3. Cold romantic gravity — the floor is a one-line floor

`_detectLIPresenceFloor` passes: `liPresent: true, hasDialogue: true, flagged: false`. Julian appears
in **3 of 18 beats**, and the qualifying dialogue is one four-word line:

```
[narration] Julian has not moved, yet his gaze finds mine across the clearing.
[dialogue]  "The question stands."
[narration] Julian waits without moving.
```

Note `hasAnchoredBeat: false` — he has no *felt reaction* beat at all; he clears the floor purely on
having spoken once. Two of his three beats explicitly describe him **not moving**. The floor is
satisfied by presence, not by warmth, which is the correct scope for a floor — but it means nothing
in the QA layer can currently distinguish a present-but-inert LI from an engaged one.

## What this changes

The density investigation concluded the cause was model-side. That stands, but it was the wrong
question to stop on. The more actionable finding is that **the project's own quality checks are not
connected to the pipeline that produces the quality**, so this class of miss is invisible by
construction — under rupture *and* on every ordinary continuation.

Recommended, all dry and all cheaper than any paid run:

1. **Wire `_detectSceneAdequacyFailure`** into the post-generation path, or formally retire it if the
   pre-dispatch gate is meant to supersede it. Right now it is neither.
2. **Add a beat-count floor** as a real check, sourced from the same target the prompt states.
3. **Make the movement test modality-aware** — exclude `could/might/would/may + verb` from counting
   as completed forward movement.
4. **Consider an LI warmth axis** distinct from the presence floor. Not a floor violation; a
   separate quality signal.

None of this needs a paid call, and doing (1)–(3) first means the *next* paid run is measured by
something, instead of being read by eye.
