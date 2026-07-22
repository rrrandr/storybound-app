# CG Repair Planner (milestone 2)

Consumes the frozen [`Verifier v1.0`](./verifier-contract.md) output and decides **what to do** with each
defect. The verifier owns *semantic evidence*; the planner owns *execution metadata*.

```
VerifierOutput {defects:[{class,panel,note}]}   ← frozen, minimal
        │
        ▼
   Repair Planner  (this milestone — evolves freely without reopening the perception benchmark)
        │
        ▼
RepairDecision {defect, confidence, severity, location, repair_method, corroboration_required}
```

## Component 1 — CONFIDENCE via corroboration ✅ (built, validated on Benchmark A)

Confidence **cannot** be computed in perception — adding a `confidence` field to the verifier perturbed
detection (see verifier-contract "empirical law"). So it is computed here, downstream, by **corroboration**:

> Run the frozen verifier **N times**; a defect's **agreement across runs** is its confidence.
> `high ≥ 0.75N` · `medium ≥ 0.4N` · `low` otherwise.

This turns the verifier's characterized non-determinism into the trust signal — blatant defects appear every
run (high), borderline ones flicker (low/medium) — *without touching perception*.

**Validated (N=4, Benchmark A):**
- A2 `PHASE`×4 → **high** (4/4); A4 malformed hands p2/p4 → **high**; A3 `DANIEL` + stable hands → **high**.
- A3's wobbling hand (the characterized 2↔3 instance) → **medium** (`2/4`) → *corroborate*, NOT auto-fire.
  The proof the mechanism works: stable defects auto-repair, the flickering one is held for corroboration.
- A1 clean — no false auto-repairs.

Policy: `high → auto-repair` · `medium → corroborate` · `low → ignore/surface`.
Implementation: `_repair_planner.mjs` `planRepairs(imgPath, scene, N)`.

## Component 2 — SEVERITY / priority ⏳ (next; motivated by a concrete case)

Corroboration answers *"is this defect really there?"* — **not** *"is it worth repairing?"* Benchmark A
surfaced the gap directly: on A3, the garbled background neon (`DWOOOSE`, `ONEANS`, `NEOL DIES`) came back
**high-confidence** (it is reliably present) — but auto-Kleining garbled city set-dressing wastes a repair
call, whereas the equally-high-confidence `DANIEL` name-leak genuinely warrants a fix.

> **The auto-repair gate = confidence AND severity.** Confidence and severity are orthogonal; a defect must
> clear both to earn an automatic Klein/regen. High-confidence + low-severity → skip or surface, don't spend.

Severity is a planner judgment (how much a defect degrades the reader experience / how visible it is),
distinct from perception. Design open: derive from class + note, or a dedicated severity pass.

## Later components

- **Repair method** — localized → Klein inpaint (`text-leak`, `anatomy`, `expression`, background-add);
  structural → regenerate the panel conditioned on clean siblings (`species`, `continuity`, dominating
  `burst`, `buoyancy`, barren `background`). Class→method table lives in `_repair_planner.mjs`.
- **Structured location** — derive Klein's bounding region from `note` (± a targeted localization query).
- **Klein / regen execution**; **cost model**; **re-verify after repair** (run the frozen verifier on the
  repaired panel to confirm the defect cleared without introducing a new one).

Related: `verifier-contract.md`, `benchmark-A.md`, `measurement-discipline.md`, `image-quality-spec.md`.
