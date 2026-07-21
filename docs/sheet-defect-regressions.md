# One-Shot Sheet: Defect-Distribution Regressions (2026-07-21)

The point at which the architectural question — **is the one-shot 2×2 sheet a downstream-REPAIR
problem or an upstream-PREVENTION problem?** — was answered with data, not intuition.

## Method

Fixed a single validated scene (Fatelands / Gloamwater, a tentacled-Kwisheen Many-Tide ambush),
ran its screenplay once to capture a plan, then **re-rendered the same one-shot sheet N≈8 times**
per pass to isolate *render* variance (harness: `_sheet_defect_batch.js`). Defects hand-classified
by eye into `{class, locality: localized|structural, repairable}`.

> Caveat: eyeball classification, one scene, N≈8 — counts are directional (±2), not precise. The
> next infra step is a rough **auto-classifier** so future passes are objective and cheap; the
> manual method is now the limiting reagent.

## Dashboard (structural : localized defects, ~28–32 quadrants/pass)

```
R1  Structural  ████████████████████  ~22      Localized  ███       ~3
R2  Structural  ██████                ~6       Localized  █████     ~5
R3  Structural  ███                   ~3       Localized  ████      ~4
                └── species failures: 0 throughout ──┘
```

- **R1 → R2:** wholesale collapse (~22→~6) from burst-scoping, buoyancy-ref, burst-label scrub.
- **R2 → R3:** a *class* collapse — the whole instruction-text-leak category eliminated by one
  guard (after burst-label→phase-label whack-a-mole confirmed it was a class, not instances).

## What the data shows

1. **Upstream conditioning removes failure CLASSES wholesale**, observed independently twice
   (species anchor; then the text-leak class). Far higher leverage than incremental repair.
2. **Structural drains INTO localized residual** as it falls — upstream work manufactures the
   downstream loop's future workload.
3. **The species anatomy anchor generalises:** 0 species failures across all 3 passes.

## Fixes shipped (upstream)

- **Species anatomy anchor** into the sheet (`_stageASpeciesAnchors` / `_resolveSoloAnchor`) — THE
  fix for "Kwisheen rendered as human"; the sheet had only attached region *setting* refs.
- **Canonical assets** into the sheet (`_resolveCanonicalAssets`): wish-burst emblem (outcome-
  driven), sacrifice stain, manta cloak, **buoyancy float ref** (attached explicitly, high-priority
  — was budget-cut and figures planted on the seabed).
- **Burst scoping** (per-quadrant: burst only on Transformation/Consequence) + **dominance clamp**
  (≤~⅓ panel, side-graphic, never a standalone emblem) — was bleeding sheet-wide and dominating.
- **Text-leak guards:** scrub the letterable phrase from the burst label, then a **class-level**
  "draw none of these instruction-words" guard.
- **Cast & continuity lock** (roster, no duplication/twins, hair-length + wardrobe + same-location),
  **living-world** marine-life directive, **Kwisheen anti-monster face**, **Ender Bond style anchor**.

## Verdict + next milestone

High-leverage upstream classes are **harvested** (species, text-class, burst-scope+clamp, buoyancy);
residual ~3 structural is instance-level polish with no new class to collapse. Per the transition
criterion (not a ratio threshold): **the next dollar now buys more downstream than upstream.**

**Next milestone (different hypothesis, clean start):**
1. A rough **auto-classifier** first — makes every future frontier-read objective/cheap.
2. Then the per-quadrant **verify/repair + face-master-as-continuity-state** loop — now justified,
   because the residual is finally the *localized* kind it repairs, no longer swamped by structural
   noise. (Face-master doubles as the state that lets a failed quadrant regenerate while matching its
   clean siblings.)

**Principle:** eliminate a failure class upstream > repair its symptoms downstream; use regression
data to locate the frontier where downstream ROI overtakes upstream.

Related: `project_sheet_production_layer`, `project_staged_validation_architecture`,
`project_quadrant_sheet_primitive`.
