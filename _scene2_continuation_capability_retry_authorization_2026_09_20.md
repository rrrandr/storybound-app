# Continuation Capability Retry — Future Authorization Sheet (2026-09-20)

**Not authorized. Not run. No provider or image call has been made preparing this sheet.** This
describes a proposed, separate, later paid operation for when you choose to authorize it.

## What this is testing

Not "does Scene 2 read well" — that question is closed (no) and doesn't need re-asking on the same
sample. This tests whether the **generic continuation generator** (same pipeline, same player
decision, no hand-authoring) can now produce a Scene 2 that clears
`_detectSceneAdequacyFailure` — i.e. whether the generator is *capable* of full-scene adequacy, not
whether this one sample can be patched into shape.

## Scope

- Same mechanism as every prior replay this session: reuse the already-paid, persisted real OAS
  turn-reply, Fate-Card, and scaffold content via the zero-cost stub-lane replay
  (`_scene2_repair_replay_sample.mjs`'s pattern) — real spend starts only at the planner/author
  call, same as before.
- Same player decision (Boundary card, the same real Say/Do) — this is a capability retry on the
  SAME causal input, not a new player branch. (A future, separate test could also vary the
  player's decision to confirm branch flexibility for real, not just in the dry control's synthetic
  fixtures — not proposed here.)
- **No prompt changes proposed in this sheet.** The planner/author prompts are unchanged from the
  run that produced the failed sample — this retry tests whether the SAME generation process
  produces an adequate result on a fresh attempt (real generations vary run to run), before
  considering whether the prompt itself needs to change to reliably steer toward adequacy. If this
  retry ALSO fails `_detectSceneAdequacyFailure`, that is real evidence the prompt itself needs
  work — a separate decision, reported honestly either way.
- New gate: after the real author call settles, run `_detectSceneAdequacyFailure` on the result
  (dry, zero additional cost) before calling it usable. Fails → preserved as a second failed
  capability sample, not shipped, not patched.

## Cost ceiling (estimate, based on the measured real cost of the prior full generation)

The prior real Scene 2 generation cost $0.105269 total (planner $0.0006, author $0.087, plus two
adjacent non-tiered calls — emotional-gravity audit and image-style extraction — that fire
regardless of scene quality and aren't part of this test). Proposed ceiling:

| Phase | Ceiling (USD) | Physical requests |
|---|---|---|
| scene2-planner (unchanged) | $0.05 | ≤2 |
| scene2-author (unchanged) | $0.40 | ≤2 |
| **Total** | **$0.45** | **≤8** (unchanged from prior authorizations) |

Adequacy re-validation is dry (`_detectSceneAdequacyFailure`) — $0 additional.

## What this would (and would not) prove

Would prove: whether the existing generator, unmodified, can produce an adequate Scene 2 on a
fresh attempt — the first real data point on whether this is a prompt problem or a
one-off-generation problem.

Would not prove: that Scenes 3-10 are adequate (a separate, later capability question); that the
SAME adequacy standard holds for a different player branch (not tested here); that density/
consequence-depth/object-continuity-staging (the three documented-but-not-automated requirements)
are actually satisfied — those still require a human read, same as this time.

## Status

`_detectSceneAdequacyFailure` built and proven dry (9/9,
`_scene2_continuation_adequacy_control.mjs`). Requirements documented
(`_continuation_scene_adequacy_requirements_2026_09_20.md`). No provider or image calls made
preparing this sheet. Awaiting explicit authorization before running this retry.
