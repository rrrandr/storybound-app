# Continuation Capability Retry — Future Authorization Sheet (2026-09-20, third revision)

**Not authorized. Not run. No provider or image call has been made preparing this sheet.** This
describes a proposed, separate, later paid operation for when you choose to authorize it.

This revision reflects both root causes now fixed and dry-proven — see
`_scene2_capability_test_root_causes_2026_09_20.md` for the full trace of each.

## What this is testing

Not "does Scene 2 read well" — that question is closed (no) and doesn't need re-asking on the same
sample. This tests whether the **generic continuation generator** (same pipeline, same player
decision, no hand-authoring) can now produce a Scene 2 that clears `_detectSceneAdequacyFailure`
with both fixes in place — i.e. whether the generator is *capable* of full-scene adequacy once it
actually receives the facts it needs to honor and the pacing room the scene actually calls for.

## What changed since the sample that failed

- **Root cause A (author contradicted binding planner facts):** `state._scenePlotContract` now
  carries `aftermathTruths`/`reservedConstraints`; `_buildPlotContractDirective` renders them as a
  "WORLD FACTS... HARD — BINDING" block in the author's own prompt. Proven 8/8,
  `_planner_author_contract_authority_control.mjs`.
- **Root cause B (CG/GN pacing stuck at setup-pace ST1, capping the scene under ~1000 words):**
  `_buildCGScreenplayUserPrompt` now overrides density to a purpose-built `CONT_AFTERMATH` mode
  (no length ceiling; explicitly asks for aftermath, institutional/social process, dialogue,
  interiority, and a new forward choice) whenever a continuation scene carries real committed
  aftermath/reserved data — local to this one prompt, `state.storyturn` itself untouched. Proven
  12/12, `_cg_continuation_pacing_control.mjs`.
- **Disclosed, NOT fixed:** beat-`kind` diversity (the real sample used zero `exposition`/
  `dialogue` beats despite the schema defining both) has no reject-only check yet — a real gap,
  documented, not addressed in this pass.

## Scope

- Same mechanism as every prior replay this session: reuse the already-paid, persisted real OAS
  turn-reply, Fate-Card, and scaffold content via the zero-cost stub-lane replay
  (`_scene2_repair_replay_sample.mjs`'s pattern) — real spend starts only at the planner/author
  call, same as before.
- Same player decision (Boundary card, the same real Say/Do) — this is a capability retry on the
  SAME causal input, not a new player branch.
- New gate: after the real author call settles, run `_detectSceneAdequacyFailure` on the result
  (dry, zero additional cost) before calling it usable. Fails → preserved as a second failed
  capability sample, not shipped, not patched.
- If this retry ALSO fails, that is real evidence a third cause remains (a strong candidate: the
  disclosed beat-kind-diversity gap above) — reported honestly either way, not concealed.

## Cost ceiling (estimate, based on the measured real cost of the prior full generation)

The prior real Scene 2 generation cost $0.105269 total (planner $0.0006, author $0.087, plus two
adjacent non-tiered calls — emotional-gravity audit and image-style extraction — that fire
regardless of scene quality and aren't part of this test). Proposed ceiling, unchanged:

| Phase | Ceiling (USD) | Physical requests |
|---|---|---|
| scene2-planner (unchanged) | $0.05 | ≤2 |
| scene2-author (unchanged) | $0.40 | ≤2 |
| **Total** | **$0.45** | **≤8** |

Adequacy re-validation is dry (`_detectSceneAdequacyFailure`) — $0 additional.

## What this would (and would not) prove

Would prove: whether the generator, with both root causes fixed, can produce an adequate Scene 2
on a fresh attempt.

Would not prove: that Scenes 3-10 are adequate; that the same standard holds for a different
player branch; that beat-kind diversity (undisclosed-and-unfixed) is actually satisfied — that
still requires a human read even if the automated checks pass.

## Status

Both root causes fixed and dry-proven (see above). Requirements documented
(`_continuation_scene_adequacy_requirements_2026_09_20.md`,
`_scene2_capability_test_root_causes_2026_09_20.md`). No provider or image calls made preparing
this sheet. Awaiting explicit authorization before running this retry.
