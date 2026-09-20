# Continuation Capability Retry — Future Authorization Sheet (2026-09-20, fifth revision)

**Not authorized. Not run. No provider or image call has been made preparing this sheet.** This
describes a proposed, separate, later paid operation for when you choose to authorize it.

This revision follows retry #3 (real, run — see `_scene2_capability_retry3_report_2026_09_20.md`,
**corrected**: not a prose-quality near-miss, a real continuity/canon FAILED) and the dry trace and
fixes it prompted — see `_scene2_skeleton_handoff_trace2_2026_09_20.md`. Six fixes are now in place
and dry-proven across three passes, not three.

## What this is testing

Not "does Scene 2 read well" — closed, three times, no. This would be retry #4: whether the
**generic continuation generator** (same pipeline, same player decision, no hand-authoring) can
produce a Scene 2 that clears `_detectSceneAdequacyFailure` — now including the two new continuity/
canon checks — with all six fixes in place. Three real attempts have failed on the identical causal
input; a fourth is evidence about this specific generation, never a guarantee, and never a
substitute for a human read even if every automated check passes.

## What changed since the sample that failed

- **Root cause A** (author contradicted binding planner facts) — `state._scenePlotContract` carries
  `aftermathTruths`/`reservedConstraints`, rendered as a "WORLD FACTS... HARD — BINDING" block.
  Proven 8/8, `_planner_author_contract_authority_control.mjs`.
- **Root cause B** (CG/GN pacing stuck at setup-pace ST1) — `_buildCGScreenplayUserPrompt` overrides
  density to `CONT_AFTERMATH` for continuation scenes with real committed aftermath. Proven 12/12,
  `_cg_continuation_pacing_control.mjs`.
- **Root cause C** (the open-row planner invented an ungrounded event before it saw canon) — the
  planner prompt now includes the seed's `worldTruths` plus explicit register framing (Say/Do is
  posture, never literal instruction), both before the planner derives its event. Proven 13/13,
  `_openrow_planner_worldtruths_control.mjs`.
- **Finding 1 / harness fix** — real production already wires Scene 1's canonical end-state (mouth-
  band torn away, "not re-staged" obligations) to the planner via `state._bakedEmitted`
  (`_hydrateBakedStoryState`, called when the baked opening displays). The REPLAY SCRIPT used for
  all three retries never reproduced that hydration step, so retries 1-3 tested an artificially
  impoverished prompt on this axis. `_scene2_repair_replay_sample.mjs` now sets
  `state._bakedEmitted` the same way production does.
- **Finding 2 / planner fix** — the live OAS exchange (what was actually said in the flirty back-
  and-forth) never reached the Scene 2 planner, in the harness OR real production. The planner now
  reads the real, already-existing `state._oasSceneSnapshots` archive (built by
  `_resolveIntimacyScene` before it nulls `intimacyDialogue`) and renders a "RECENT OAS EXCHANGE"
  block before the reader's Say/Do line.
- **Finding 3 / Fate-card fix** — `orchestration-client.js`'s Fate-card generators had zero
  worldTruths/canon channel, confirmed by direct trace — how "burn for me, as the First-Favored did
  for the old gods" reached the player as a card option in a world with no gods, only Fate (a known,
  previously-disclosed, not-yet-wired canon fact). Both fate-preview prompt builders now carry a
  static "FATELANDS HAS NO GOD, ONLY FATE" ban, matching the existing Glass House lexical-guard
  precedent.
- **New reject-only detectors**, folded into `_detectSceneAdequacyFailure`: `STARTER_COSMOLOGY_BANS`
  (flags religious vocabulary in a Fatelands-set scene or Fate-card text) and
  `STARTER_ESTABLISHED_OBJECT_STATES` (flags a scene's opening beats restaging an
  already-established object-removal as if new — First Sacrifice's mouth-band, sourced from the same
  canonical data Finding 1 traces). Both generic, per-starter, inert without registered data.
- **Disclosed, NOT fixed:** beat-`kind` diversity (secondary gap, unchanged) and retread-detection
  for the pre-OAS accusation (addressed at the prompt level via Findings 1-2, not as a new detector
  — judging semantic "retreading" isn't reliably regex-doable; see the trace doc for why).

Proven 15/15, `_scene2_continuity_canon_control.mjs` (RED:MOUTHBAND — retry-3's real beats flagged;
RED:COSMOLOGY — the real leaked card text flagged; GREEN — a clean synthetic scene on the same
posture clears everything; GENERIC — both mechanisms inert for an unregistered starter; PROMPT:OAS —
the real dispatch now carries RECENT OAS EXCHANGE + IMMUTABLE AFTERMATH together; HARNESS — the
replay script fix confirmed). All four prior controls re-run green (8/8, 12/12, 13/13, 11/11).

## Scope

- Same mechanism as every prior replay: reuse the already-paid, persisted real OAS turn-reply,
  Fate-Card, and scaffold content via the zero-cost stub-lane replay — real spend starts only at the
  planner/author call.
- Same player decision (Boundary card, the same real Say/Do) — a capability retry on the SAME
  causal input, not a new player branch.
- New gate: after the real author call settles, run `_detectSceneAdequacyFailure` (now including the
  continuity/canon checks) on the result before calling it usable. Fails → preserved as a fourth
  failed capability sample, not shipped, not patched.
- Judge event selection AND continuity/canon FIRST (does it avoid literalizing posture text, choose
  a worldTruths-sanctioned lane, avoid restaging an already-established object state, avoid
  cosmology leakage, carry the live OAS exchange forward); prose quality only after those hold.
- If this retry ALSO fails, that is real evidence a further cause remains (beat-kind diversity is
  the standing candidate) — reported honestly either way, not concealed.

## Cost ceiling (estimate, based on the measured real cost of the prior full generation)

Retry #3's real, measured total was $0.127971 (planner $0.0008, author $0.0838, emotional-gravity
audit $0.0006, image-style extraction $0.0428 — the latter two fire regardless of scene quality and
aren't part of this test). Proposed ceiling, unchanged, already proven to hold with margin:

| Phase | Ceiling (USD) | Physical requests |
|---|---|---|
| scene2-planner (unchanged) | $0.05 | ≤2 |
| scene2-author (unchanged) | $0.40 | ≤2 |
| **Total** | **$0.45** | **≤8** |

Adequacy re-validation is dry (`_detectSceneAdequacyFailure`) — $0 additional.

## What this would (and would not) prove

Would prove: whether the generator, with root causes A/B/C and Findings 1-3 all fixed, can produce a
continuity-correct, canon-correct, adequate Scene 2 on a fresh attempt.

Would not prove: that Scenes 3-10 are adequate; that the same standard holds for a different player
branch; that beat-kind diversity or semantic retreading (neither encoded as a reject-only check) are
actually satisfied — those still require a human read even if every automated check passes. Three
real attempts have already failed on the same causal input.

## Status

Six fixes in place and dry-proven (root causes A/B/C, Findings 1-3). Requirements and traces
documented (`_continuation_scene_adequacy_requirements_2026_09_20.md`,
`_scene2_capability_test_root_causes_2026_09_20.md`, `_scene2_skeleton_handoff_trace_2026_09_20.md`,
`_scene2_skeleton_handoff_trace2_2026_09_20.md`). Three real capability samples on record, all
FAILED, most recent correctly classified as a continuity/canon failure, not a prose near-miss
(`_scene2_capability_retry3_report_2026_09_20.md`). No provider or image calls made preparing this
sheet. Awaiting explicit authorization before running a fourth retry.
