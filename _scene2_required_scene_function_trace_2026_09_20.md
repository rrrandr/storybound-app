# Required Scene Function — Trace and Fix (2026-09-20)

Roman, after retry 5: "Retry 5 proves the planner-function gate works live and saves author spend,
but it also proves model strength alone is not the fix... The planner should not be free to choose
'what happens next' from raw player text. It should be given a required scene-function frame first,
then asked how the player posture changes the route through that frame."

## 1. What scene-function/issue-skeleton data already existed, and where it entered the planner

Traced against real code: `STARTER_PLANS.starter_first_sacrifice.scenes[n=2]` already carried
`exitState` ("RESOLVED: the words came true... NEW PROBLEM: Lirael's standing is at risk and the
cost is still uncounted"), `requiredTruth`, `decision_axis`, `decision_consequence`, `vectors`
(player-branch affordances), and `aftermathTruths` — all of which already reached the planner's
OPEN ROW prompt (`app.js` ~99513+, confirmed by five real retries' dispatch logs). The seed's own
`worldTruths` (confirmed reaching the planner since root cause C) even name the sanctioned lanes
explicitly: "Early scenes may carry accusation, preliminary review, political pressure,
investigation, concealment, or flight — never the convened inquiry itself."

So the DATA existed. What was missing: none of it was framed as a REQUIRED JOB the planner must
instantiate before reading the reader's posture. `exitState` is a terse, passive one-line target
sitting among a dozen other context lines; `worldTruths` is passive background canon, not an
actionable instruction for THIS scene specifically. Five real planner attempts, across two models
(ministral ×4, Grok ×1), each independently derived the scene's central event from the reader's raw
Fate-Card/Say-Do TEXT instead — one invented a literal ritual-burning (directly contradicting
worldTruths); the rest stayed inside the same immediate confrontation the aftermath truths already
establish, restating or lightly paraphrasing the posture rather than translating it into a distinct
event serving the seed's own mapped direction.

## 2-4. The fix: REQUIRED SCENE FUNCTION frame, rendered before posture

**New field, `STARTER_PLANS.starter_first_sacrifice.scenes[n=2].sceneFunction`** (`app.js`
~128722) — not new canon, a REQUIREMENT restated from this same row's own `exitState` plus the
seed's own worldTruths-sanctioned lanes: "This scene must land the AFTERMATH of Julian's public
accusation and the Dohkar's authority claim: real institutional/procedural pressure (preliminary
review, political pressure, or the opening steps toward investigation — NOT the convened formal
inquiry itself, reserved for later) and/or social fallout (family reaction, her standing visibly at
risk), moving concretely toward the exitState's own 'NEW PROBLEM.' It must NOT simply extend or
re-stage the same immediate ritual/interrogation moment the aftermath truths already establish."

**Carried through the effective-row builder** (`_effectiveSceneRow`'s OPEN ROW branch, `app.js`
~199818+): `sceneFunction: row.sceneFunction || null` — generic, inert for any scene without the
field declared.

**Rendered in the planner prompt** (`app.js` ~99683+), as a new block positioned BEFORE the reader's
posture: `"REQUIRED SCENE FUNCTION (HARD — instantiate this FIRST; the reader's posture below
modulates HOW you enter it, it does NOT replace it): " + sceneFunction`. The READER'S SAY/DO line
itself is reframed: "this is the reader's ANGLE into the required scene function above: defiance,
seduction, evasion, appeal to procedure, counter-accusation, etc. It is NOT the source of the
scene's central event." The REGISTER block gained the same reframing: "it is NEVER a substitute for
the required scene function: do not build state_change by paraphrasing or restating this text."

**New required JSON output keys**, requested only when `sceneFunction` is declared:
`scene_function_instantiated` (which lane of the required function this state_change realizes) and
`aftermath_obligations` (the concrete NEW aftermath/procedure/fallout content this scene commits to,
distinct from the pre-existing `aftermath` status-echo object).

## 5. New reject-only check: posture-echo detection

Retry 5's real Grok plan proved a plan can pass the EXISTING aftermath-vocabulary check's opposite
failure mode by a DIFFERENT route: rather than lacking aftermath signal from being generically
vague, it can closely paraphrase the reader's raw text ("I want you to burn for me..." → "she wants
Julian to burn for her...") — a distinct, separately-diagnosable problem from "no aftermath
vocabulary present," worth its own explicit check and its own reported reason.

`_postureEchoBigram(postureText, plannerText)` (`app.js`, next to `_detectPlannerFunctionGap`):
conservative, generic, no starter-specific vocabulary — finds any 2-word window from the reader's
raw Say/Do text that also appears in the planner's own tactical_move/event/forces_choice text,
provided at least one of the two words is not a common function word (so purely-generic overlaps
like "as the" never count). Folded into `_detectPlannerFunctionGap` as a second, independent
rejection reason alongside the existing aftermath-vocabulary check — either firing is sufficient to
reject, and both are reported when both apply (retry 5's real plan fails both).

## Proof

14/14, new `_scene2_required_scene_function_control.mjs`:
- RED:ECHO — retry 5's real posture + real planner output (read verbatim from its persisted log) is
  rejected, citing a real shared bigram containing "burn," alongside the pre-existing aftermath-
  absence reason (both real problems present, both reported).
- GREEN — a synthetic procedure-lane plan sharing no phrase with the same real posture is not
  rejected.
- GENERIC — the echo check is inert without posture data; no false rejection.
- FRAME/SCHEMA — the real, live planner dispatch (same Boundary/Say-Do reproduction as every prior
  control) now carries the REQUIRED SCENE FUNCTION block, verbatim, positioned before READER'S
  SAY/DO, and the JSON schema request includes both new keys.
- COEXIST — root cause C's WORLD TRUTHS, Finding 2's RECENT OAS EXCHANGE, and Finding 1's
  IMMUTABLE AFTERMATH (mouth-band) all still render correctly alongside the new block.

All 8 pre-existing controls re-run green (104/104 total across the full suite after this addition).

## Status

Dry, committed, generic (the mechanism is inert for any scene without a declared `sceneFunction` —
not First-Sacrifice-specific plumbing, though First Sacrifice's scene 2 is currently the only row
that declares one). No provider or image calls made in this pass. The Planner Function Gate,
worldTruths, OAS history, mouth-band continuity, and the Grok-primary planner policy are all
unchanged and confirmed coexisting. Retry sheet updated to its eighth revision — the next retry, if
and when authorized, would be the first real test of whether a required-function frame changes what
either model chooses as the scene's central event.
