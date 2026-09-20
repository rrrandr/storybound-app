# Scene 2 — LI Presence Repair — Future Authorization Sheet (2026-09-20)

**Not authorized. Not run. No provider or image call has been made preparing this sheet.** This
describes a proposed, separate, later paid operation for when you choose to authorize it.

## Scope

Rewrite ONLY the 4 beats `_detectLIPresenceDominance` flagged in the real sample
(`_scene2_repair_replay_sample_out/scene2_raw_response.txt`, idx 7, 11, 16, 22 — 4 of 26 beats,
~15% of the scene). Everything else in the screenplay object is preserved byte-for-byte:

- the planner's local objective (unchanged — this is a prose-layer repair, not a re-plan)
- the assembly's collective-only status (no beat outside the flagged 4 is touched, so the
  collective-presence constraint cannot regress)
- the final forced choice (`forces_choice`/`branch_a`/`branch_b`, and `decisionGateBeatIdx: 25`)
- every other beat, all `phases`, all `panels`, `visualState` — untouched

## Proposed mechanism — reuses existing, proven infrastructure

Modeled directly on `_repairViaMistral` (app.js:136688) — this codebase's existing bounded
prose-repair pattern: "a precise line editor, NOT an author... fix ONLY those gaps with the
SMALLEST possible change," dispatched via the same `_authorFullScenePolicy` tiered chain (Grok
primary → `ministral-8b-2512` admission-gated fallback → `gpt-4o` terminal) already used for the
real Scene 2 author call and for every other bounded repair in this codebase. Not a new provider
policy — the same one, aimed at 4 specific beat indices instead of free prose.

The repair prompt would supply: the flagged beat text, 1-2 neighboring beats for continuity,
`visualState.li_expression` ("intense_focused") and the phase-level `li_position`/posture data
already declared for Julian in this same real response, and the instruction to make each flagged
beat carry a felt anchor (face, voice, posture, gesture, proximity, restraint, desire, anger,
control, or vulnerability) while preserving whatever register (stillness, silence, motion,
speech) the beat already implies — never mandating dialogue or activity. Output: replacement text
for exactly those 4 beat indices, nothing else, re-validated with `_detectLIPresenceDominance`
before acceptance (reject-only — if the rewrite doesn't clear the detector, it doesn't ship).

## Cost ceiling (estimate, not measured)

The real full-scene author call cost $0.0870534 on a ~57K-token prompt (nearly the entire scene
context, world canon, and character bibles) + ~6.3K output tokens. A targeted 4-beat repair needs
only the flagged beats + immediate context + a short instruction, not the full scene-authoring
context — order of magnitude smaller. Proposed ceiling, pending your review:

| Phase | Ceiling (USD) | Physical requests |
|---|---|---|
| LI-presence repair (Grok primary / ministral-8b fallback / gpt-4o terminal) | $0.05 | ≤2 |
| Re-validation (dry, no cost — `_detectLIPresenceDominance` runs locally) | $0.00 | 0 |
| **Total** | **$0.05** | **≤2** |

No images. No OAS/Fate-Card/scaffold/planner/full-author recharge — this reuses the already-paid
real Scene 2 sample as its base, touching only the 4 flagged beats.

## Status

Detector built and proven dry (9/9, `_li_presence_dominance_repair_control.mjs`). This sheet is
prepared for your review only. Awaiting explicit authorization before any repair call is run —
and per your stated priority, before any Scene 2 image spend either way.
