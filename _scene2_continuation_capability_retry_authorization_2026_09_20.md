# Continuation Capability Retry — Future Authorization Sheet (2026-09-20, fourth revision)

**Not authorized. Not run. No provider or image call has been made preparing this sheet.** This
describes a proposed, separate, later paid operation for when you choose to authorize it.

This revision follows retry #2 (real, run, FAILED adequacy — see
`_scene2_capability_retry2_report_2026_09_20.md`) and a further dry trace it prompted — see
`_scene2_skeleton_handoff_trace_2026_09_20.md`. Three fixes are now in place and dry-proven, not
two. The third supersedes "beat-kind diversity" as the primary remaining suspect.

## What this is testing

Not "does Scene 2 read well" — that question is closed (no, twice) and doesn't need re-asking on
the same sample. This would be retry #3: whether the **generic continuation generator** (same
pipeline, same player decision, no hand-authoring) can now produce a Scene 2 that clears
`_detectSceneAdequacyFailure` with all three fixes in place — i.e. whether the generator is
*capable* of full-scene adequacy once it actually receives the facts it needs to honor (including
canon, now reaching the planner before it invents an event), the pacing room the scene calls for,
and an explicit warning against literalizing intimate/rhetorical posture text.

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
- **Root cause C (retry #2 traced this — the planner invented an ungrounded, canon-violating event
  before it ever saw canon):** the open-row scene-spine planner (the one that invents the scene's
  single binding EVENT, which the author is then HARD-bound to dramatize) never received the seed's
  `worldTruths`, and nothing told it that Fate-Card dialogue is emotional/rhetorical register, not a
  literal event instruction. Retry #2's real planner call, given only the reader's Fate-Card line
  "I want you to burn for me, as the First-Favored did for the old gods," invented "Julian ignites
  the pyre beneath Lirael's feet" — directly contradicting an existing worldTruth ("no responsive
  ceremonial fire") and skipping the SAME worldTruths' own explicit guidance for what this scene may
  carry ("preliminary review, political pressure, investigation, concealment, or flight"). This is
  why the scene looped on ritual-burn pressure instead of advancing — the author was faithfully
  dramatizing an event that was never grounded in the mapped skeleton to begin with. Fixed: the
  planner's prompt now includes the seed's worldTruths (sourced the same way the author's builder
  already does) plus explicit register framing, both inserted BEFORE the planner derives its event.
  Proven 13/13, `_openrow_planner_worldtruths_control.mjs`. Full trace:
  `_scene2_skeleton_handoff_trace_2026_09_20.md`.
- **Disclosed, NOT fixed, demoted from primary suspect:** beat-`kind` diversity (the real samples
  used zero `exposition`/`dialogue` beats despite the schema defining both) remains a real,
  secondary gap — a scene starved for dialogue has no vehicle to deliver consequence even once it
  has room and grounding to. No reject-only check exists for it yet.

## Scope

- Same mechanism as every prior replay this session: reuse the already-paid, persisted real OAS
  turn-reply, Fate-Card, and scaffold content via the zero-cost stub-lane replay
  (`_scene2_repair_replay_sample.mjs`'s pattern) — real spend starts only at the planner/author
  call, same as before.
- Same player decision (Boundary card, the same real Say/Do) — this is a capability retry on the
  SAME causal input, not a new player branch.
- New gate: after the real author call settles, run `_detectSceneAdequacyFailure` on the result
  (dry, zero additional cost) before calling it usable. Fails → preserved as a third failed
  capability sample, not shipped, not patched.
- If this retry ALSO fails, that is real evidence a fourth cause remains (a strong candidate: the
  disclosed beat-kind-diversity gap above, now the most-suspected remaining gap) — reported honestly
  either way, not concealed.

## Cost ceiling (estimate, based on the measured real cost of the prior full generation)

Retry #2's real, measured total was $0.120416 (planner $0.00056, author $0.08054, emotional-gravity
audit $0.00063, image-style extraction $0.03868 — the latter two fire regardless of scene quality
and aren't part of this test). Proposed ceiling, unchanged, already proven to hold with margin:

| Phase | Ceiling (USD) | Physical requests |
|---|---|---|
| scene2-planner (unchanged) | $0.05 | ≤2 |
| scene2-author (unchanged) | $0.40 | ≤2 |
| **Total** | **$0.45** | **≤8** |

Adequacy re-validation is dry (`_detectSceneAdequacyFailure`) — $0 additional.

## What this would (and would not) prove

Would prove: whether the generator, with all three root causes fixed, can produce an adequate
Scene 2 on a fresh attempt.

Would not prove: that Scenes 3-10 are adequate; that the same standard holds for a different player
branch; that beat-kind diversity (disclosed, unfixed) is actually satisfied — that still requires a
human read even if the automated checks pass. Two real attempts have already failed on the same
causal input; a third attempt is evidence about this specific generation, not a guarantee.

## Status

All three root causes fixed and dry-proven (see above). Requirements documented
(`_continuation_scene_adequacy_requirements_2026_09_20.md`,
`_scene2_capability_test_root_causes_2026_09_20.md`,
`_scene2_skeleton_handoff_trace_2026_09_20.md`). Two real capability samples on record, both
FAILED (`_scene2_repair_replay_sample_out/run_1789884119160.jsonl`,
`run_1789930729650.jsonl` / `_scene2_capability_retry2_report_2026_09_20.md`). No provider or image
calls made preparing this sheet. Awaiting explicit authorization before running a third retry.
