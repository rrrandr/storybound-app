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

## Component 2 — SEVERITY / priority ✅ (built, validated on Benchmark A)

Corroboration answers *"is this defect really there?"* — **not** *"is it worth repairing?"* Severity is a
separate, downstream **prioritizer**: one batched call per sheet that rates each *already-confirmed* defect
(it never re-detects, so it can't perturb the frozen verifier). Rated `high` (reader instantly sees it broken
— a caption/label, a name-as-signage, a tangled focal hand, a duplicated figure), `medium`, or `low` (easily
missed / plausibly real set-dressing — garbled unreadable city neon, a minor background-hand nick).

**The auto-repair gate = confidence AND severity** (orthogonal axes). Final action:

| | severity high/med | severity low |
|---|---|---|
| **confidence high** | auto-repair | **surface** (don't spend) |
| **confidence medium** | corroborate | surface |
| **confidence low** | ignore | ignore |

**Validated (N=4, Benchmark A) — the decisive test:** on A3, `DANIEL` and the garbled neon `DWOOOSE` /
`ONEANS` / `NEOL DIES` all came back at **identical `conf=high, agree=4/4`** — Component 1 could not separate
them. Severity did: `DANIEL` → **high → auto-repair**; garbled neon → **low → surface**. That proves severity
*discriminates within a class at fixed confidence* — a genuinely different axis, not re-derived confidence.
Net: 3 wasted Klein calls/sheet avoided while the real name-leak is still fixed. A2 PHASE captions →
high/high → auto-repair; A3/A4 malformed hands → high/high → auto-repair; A1 clean.

Implementation: `_repair_planner.mjs` `scoreSeverity()` + `decide(confidence, severity)`.

## Later components

- **Repair method** — localized → Klein inpaint (`text-leak`, `anatomy`, `expression`, background-add);
  structural → regenerate the panel conditioned on clean siblings (`species`, `continuity`, dominating
  `burst`, `buoyancy`, barren `background`). Class→method table lives in `_repair_planner.mjs`.
- **Structured location** — derive Klein's bounding region from `note` (± a targeted localization query).
- **Klein / regen execution**; **cost model**; **re-verify after repair** (run the frozen verifier on the
  repaired panel to confirm the defect cleared without introducing a new one).

Related: `verifier-contract.md`, `benchmark-A.md`, `measurement-discipline.md`, `image-quality-spec.md`.
