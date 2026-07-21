# Image Quality Specification (Storybound CG)

> **IQS v1.0** · 2026-07-21 · status: active
>
> This is a **versioned measurement standard**, not just documentation. When a clause is added, removed, or
> redefined (e.g. redefining acceptable burst dominance), bump the version — you are not editing history,
> you are minting a *new standard*. Every benchmark run records the full tuple it was measured under:
> ```
> Benchmark A v1   |   IQS v1.0   |   Classifier prompt: v1.0   |   Model: gemini-2.5-flash
> ```
> Measurements are only comparable **within** a fixed (fixtures × IQS × prompt × model) tuple. If any one
> changes, counts before and after measure the *instrument/standard change*, not the *renderer* — see "Two
> independent validations" below.

The **single source of truth** for CG image acceptance. Both the **verifier** ("does this violate the
spec?") and the **repair planner** ("which violated clauses can this repair method address?") derive from
this one document — so they cannot drift apart.

```
                 Image Quality Specification
                            │
         ┌──────────────────┴──────────────────┐
         ▼                                      ▼
     Verifier                            Repair planner
 "does this violate?"          "which violated clauses can I fix,
                                and by what method (edit vs regen)?"
```

## The one question

For any imperfection, the acceptance question is **not** "is this artistically perfect?" — it is:

> **"Would this image be REGENERATED or REPAIRED in production?"**

If no, it is **not a defect**. Storybound is deliberately tolerant of artistic and stylistic variation.
Discovered empirically (2026-07-21): a naive "art critique" standard over-reported ~10× and inverted the
signal; the production-regeneration threshold is what makes the measurement usable. See
`docs/sheet-defect-regressions.md`.

## HARD invariants — a violation is a defect

These are **world-agnostic**. The per-scene *expected content* (who/where/what) is a parameter supplied
per scene; the invariants below judge the render against it.

| Clause | Violation | Typical locality | Repair method |
|---|---|---|---|
| **species** | a character rendered as the WRONG species vs. its canon (a human where a non-human belongs; a non-human missing its defining anatomy entirely — e.g. a Kwisheen with NO tentacles while undisguised) | localized→structural | regen (or heavy edit) |
| **identity / continuity** | the SAME character duplicated ("twins"); or a character's FACE / HAIR-STYLE / BUILD / CLOTHING / COLOUR changing between panels; or a weapon/prop changing shape or vanishing | structural (twins) / localized (one face) | face-master-conditioned regen / in-place edit |
| **sfx match** | a sound-effect word for an action NOT depicted ("THUD" with no impact; "KLANG" with no blades meeting) | localized | edit (remove/replace the word) |
| **stray text** | ANY word/label lettered into the art that is not a valid, action-matched SFX (titles, phase names, captions, reference-emblem headers) | localized | edit (remove) |
| **effect correctness** | a canon graphic effect wrong: wrong form/colour (a twisted-wish burst must be RED, jagged, with X's; a clean wish GOLD stars), or present where it shouldn't be, or dominating/filling a panel, or drawn as a standalone emblem | localized→structural | edit / regen |
| **expression legibility** | a blank / wooden / mannequin face on a character in an emotional beat — the emotion the beat requires is unreadable | localized | face edit |
| **physical plausibility** | figures ignoring the scene's physics (underwater: standing planted on the seabed instead of floating; any: floating with no support where gravity applies) | structural (pose) | regen |
| **populated world** | a dead, empty background where the world should have life/detail — missing bystanders, wildlife (fish/schools), flora, structures, celestial bodies, weather where they belong | localized (add) → structural (barren comp) | in-place add / regen |
| **story-critical element** | a named/required object, character, or beat-defining element missing from a panel that needs it | localized→structural | edit / regen |

## SOFT invariants — NEVER a defect on their own (canon-tolerant)

Reporting any of these alone is a **false positive**. They would not trigger a regeneration.

- **Count tolerances** — e.g. tentacle count ("about six … the exact number is not important"); number of
  background extras. Never flag ±1–2.
- Minor hair variation, clothing folds, small anatomy asymmetry.
- Stylization, dramatic posing, line-art quirks, brush/hatching texture.
- Composition preference (a framing that *works* but isn't the one you'd have chosen).

*(The species anti-correlation bug — "8 tentacles instead of 6" filed under `species`, rising as species
quality improved — came entirely from treating a SOFT count as a HARD clause. See the regressions doc.)*

## Locality & repair method (how the repair planner reads a violation)

- **localized** — a bounded region an in-place edit (Klein/inpaint) can fix without regenerating the panel:
  one face, one weapon, one SFX word, one added background element. Cheap.
- **structural** — affects the whole panel or the generation itself (twins, a planted figure, a dominating
  burst, a barren composition): needs a **regeneration**. On a sheet, a structural failure in one quadrant
  is regenerated *conditioned on the clean sibling quadrants* (face-master as continuity state) so the fix
  matches the rest of the sheet.

## Validation status of the measurement layer

- **Provisionally validated** against this spec on the underwater-Kwisheen regression family (R1–R3):
  species false-positives 13–24 → 0; over-report 50–64 → 3–6; trend reproduced 6 → 5 → 3; failure classes
  align with the engineering that changed between passes.
- **Cross-domain probe PASSED (First Favored / land):** on a deliberately orthogonal domain — different
  creature (bipedal, no tentacles), setting (forest), and physics (gravity) — the classifier emitted **0
  species false-flags** (did not demand tentacles), **0 buoyancy false-flags** (did not demand floating),
  and still caught the real text-leaks. It judged against the *scene context*, not the underwater examples
  baked in the prompt tail. This is the strong falsification: it removed the very cues that caused the
  original false positives and answered correctly.
- **The target is agreement with THIS specification, not with a human's eyeball** — a human labeler who
  isn't applying the production standard is not ground truth.

### Two independent validations still open (do not conflate them)

1. **Instrument determinism** — freeze (IQS × prompt × model × parser), run the *same images* N times, and
   confirm the counts hold. Tests: *does the same instrument give the same measurement?* This is the gate to
   trusting a magnitude. **(Not yet passed — probe built: `_classifier_determinism.mjs`.)**
2. **Version sensitivity** — deliberately vary prompt v1→v2→v3 and measure how far the counts move. This is
   a *feature* of specification evolution, not a runtime flaw. You don't freeze prompt development forever;
   you just require every run *within a benchmark campaign* to share one version.

> ⚠️ **What was shown vs. what was claimed.** The R2/R3 count shift (5/3 → 0) followed a prompt
> *restructure* — that is evidence of **version sensitivity** (#2), *not* of run-to-run instability (#1).
> They are different hypotheses needing different experiments; #1 has not been run to completion.

### Benchmark A — the permanent regression suite for the instrument itself

A tiny, **frozen-forever** set of representative sheets spanning distinct visual domains. Whenever the IQS
or the classifier prompt changes, re-run Benchmark A: it is the control that separates "the images changed"
from "the instrument changed." Composition and status: `docs/benchmark-A.md`.

Related: `project_sheet_production_layer`, `docs/sheet-defect-regressions.md`, `docs/benchmark-A.md`,
`project_staged_validation_architecture`.
