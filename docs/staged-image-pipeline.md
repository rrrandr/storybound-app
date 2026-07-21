# Staged Image-Validation Pipeline (Phase 1 — GRADUATED 2026-07-19)

## The principle

Image generation follows a **staged validation** architecture, mirroring the prose pipeline:
inexpensive **structural** representations are generated and verified **before** expensive rendering.
Structural defects **regenerate upstream** (while still line art); only localized **cosmetic** defects
are **repaired downstream** (Klein). Get the structure right cheaply, then pay to make it beautiful.

```
intent → [Structural Pass ON] line-art sketch
   → STRUCTURAL verify (blocking) → regen-loop(feedback, ceiling 3)
   → [approved structure] → colorize (structure + palette locked)
   → colorize-contract recheck → recolorize once
   → COSMETIC verify → routing layer → Klein (with identity card)
   ······ else fall back to a one-shot render
```

## Stages & components (all in `public/app.js` unless noted)

| Stage | Function(s) | Notes |
|---|---|---|
| Structural sketch | `_genStructuralLineArt` | B&W blocking blueprint; **NO-TEXT contract** (Fate Xs/broken-stars exempted) |
| Structural verify | `_verifyPanelAnatomy(…, {mode:'structural'})` + `api/verify-anatomy.js` | representation-aware: `_structuralIdentitySpec()` gives topology INVARIANTS, not counts |
| Regen loop | `_structuralRegenLoop({generate,verify,maxAttempts:3})` | hard ceiling + **accumulate-all-violations**; feedback = verifier `reason` (teacher) |
| Colorize | `_styleTransferRevealPanel` | i2i-conditioned on the approved sketch ("structure is locked"); `_structuralColorDesc` supplies canon palette |
| Contract recheck | in `_structuralPassRender` | a structural defect in the final = colorize broke contract → recolorize once, else report |
| Cosmetic verify | `_verifyPanelAnatomy(…, {mode:'cosmetic'})` | never re-flags structure |
| Routing | `_routeRepairStrategy` + `_REPAIR_STRATEGY` table | `regenerate | recolorize | klein | report`, **decoupled from `defect_type`** |
| Repair | `_repairStagedAnatomyKlein` | only `klein`-routed defects repaint; branches for species/face/body-plan/gender/weapon/wardrobe/eye/skin/jewelry/sacrifice/burst |
| Identity card | `_canonicalReferenceFor` + `_resolveSceneEntity` | see subsystem below |
| Orchestration | `_renderStagedPhaseImage` (generate site ~182760) | wires the Structural Pass; falls back to one-shot |

### Verifier modes (a *verification* concern — what to judge at this stage)
- **structural** — figure count / species / body-plan / gross limbs / blocking. Judges blocking, not beauty. Lenient on line-art detail.
- **cosmetic** — colour / eye / skin / jewelry / weapon / wardrobe / burst / stain. Assumes structure already approved.
- **full** — legacy single-stage (default when the Structural Pass is off).
Server-side mode-filter drops out-of-mode boxed defects so a cosmetic defect can't trigger a sketch regen (and vice-versa).

### Routing strategy (a *routing* concern — which tool fixes it) — orthogonal to mode
Structural (species/body_plan/gender/extra_person) → **regenerate**; a structural defect the colorize
introduced → **recolorize once**; localized (weapon/wardrobe/eye/skin/jewelry/face/…) → **klein**;
pose/expression/camera/composition/lighting → **report** (never a repair job). Flip a table entry to
re-route without touching the verifier taxonomy (e.g. if a future editor gains topology-repair).

## Identity-card subsystem (repair conditioning)

Klein repairs are conditioned on an **authoritative identity card** — a canonical image of *who* the
character is — framed as "**maintain this character's identity while repairing only the masked region**",
NOT "make it look like this". Resolution keeps **vision responsible for *what*** is in the frame and
**orchestration for *who*** it is:

1. **Entity resolver** `_resolveSceneEntity(defectChar, bbox, canonChars)` — maps the verifier's defect
   entity (often a generic species like "Kwisheen") to the actual character via **name → species → blocking**
   (bbox side vs the character's authored `position`). Vision says "a Kwisheen on the right"; orchestration says "Syl".
2. **Reference resolver** `_canonicalReferenceFor(name)` — source priority: (1) the leads' locked
   **face-masters** (`state.pcFaceMasterUrl` / `state.liFaceMasterUrl[liId]` — the casting library EXCLUDES
   the PC/LI); (2) **Casting Library** harvested crop (recurring NPCs; `_castingResolveAnchor`); (3) canonical
   reveal anchor. Emits a birth-to-use diagnostic `[ID-CARD] requested/resolved/source`.

## Health metrics (emitted by the benchmark)
- **Structural entropy** — structural defects the colorize introduced (0 = clean). *Only ever a MEASURED
  number; "unknown" when the sketch was unresolved — never assume 0.*
- **Repair avoidance rate** — panels needing no repair (retry/recolorize/Klein). The number we optimize down.
- **Identity-card availability** — repairs with a usable card / repair sites. The identity subsystem's health metric.

## Kill-switches (default state)
`window._structuralPass` (**OFF** — opt-in until latency work), `window._structuralPassRecheck` (on),
`window._canonRepair` (on), `window._kleinCanonRef` (on), `window._stagedAnatomyRepair` (on).

## Test taxonomy — mechanism vs system (keep BOTH; they answer different questions)

- **Mechanism tests** — controlled, isolate ONE variable, cheap/deterministic. Prove *does X work*.
  - `_surgical_idcard_ab.js` — the CANONICAL proof that identity conditioning improves a repair:
    same drifted-Kesh source + same mask, repaired card-OFF vs card-ON. Generic-red → canonical Kesh; identity, not pose.
  - `_sketch_conditioning_probe.js` — colorize preserves approved structure (≈0 entropy) across stress regimes.
  - `_routing_logic_probe`, `_canon_logic_probe`, entity/resolver probes — $0 logic checks.
- **System tests** — messy, non-deterministic, validate ORCHESTRATION end-to-end. Prove *does the production pipeline hold*.
  - `_e2e_scene.js` — full Scene-1 through the real generator; emits the structural-pass dashboard.
  - `_identity_bench.js` — the identity-persistence A/B; the **regression test** for identity-card
    **availability / usage / no-regression** (NOT for drift magnitude — the card acts on small localized
    repairs, so a few-panel A/B is structurally unable to show dramatic before/after; that's the surgical test's job).

Do not replace one category with the other. A benchmark should answer the questions it can reliably answer.

## Graduation record (Phase 1)

```
Identity-card subsystem
  Mechanism            ✓ proven by surgical A/B (_surgical_idcard_ab)
  Production availability ✓ proven by integration benchmark (0% → 100% after face-master + entity resolver)
  Safety (over-constrain) ✓ none — identity transfers, pose/framing/expression do not
  Performance          ✓ acceptable (cost ~+5%, latency neutral/-9%)
  Regression suite     ✓ established (_identity_bench.js as availability regression)
```

Status: **experimental → production architecture.** The identity card is default-ON.
