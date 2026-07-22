# CG Repair Planner (milestone 2)

Consumes the frozen [`Verifier v1.0`](./verifier-contract.md) output and decides **what to do** with each
defect. The verifier owns *semantic evidence*; the planner owns *execution metadata*.

```
Verifier (frozen)
      ↓
Planner  ──►  Repair Contract  ──►  Localization  ──►  Execution  ──►  Verification
      │                                                                     │
      └── VerifierOutput {defects:[{class,panel,note}]} ← frozen, minimal   │
          RepairDecision {defect, confidence, impact, economics, action}    │
                                                                            ▼
                                          re-run the SAME frozen verifier on the repaired panel
```

The verifier **never changes**; everything downstream can. That stable invariant is what lets the system
evolve safely.

## The planner reasons over THREE orthogonal axes

| Axis | Question | Status |
|---|---|---|
| **Confidence** | Does the defect really exist? | ✅ Component 1 |
| **Impact** (severity) | Does the reader care? | ✅ Component 2 |
| **Repair economics** | Is the proposed repair worth its cost? | ⏳ Component 3 |

Confidence and impact gate *whether* to act; economics governs *how* (and whether the expected quality gain
beats the cost). Economics is an optimization problem, not a perception one — it weighs API cost, latency,
retry probability, and expected quality improvement, and it's where Klein-vs-regen escalation is decided.

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

## Remaining phases (ordered — the contract comes BEFORE localization)

**Component 3 — Repair economics** (the third axis): API cost, latency, retry probability, expected quality
improvement; decides Klein-vs-regen escalation and whether a repair's expected gain beats its cost.

Then, in order:

1. **Repair Contract** — the *rules of a valid repair*, defined BEFORE localization/execution so those can't
   evolve in inconsistent directions. It answers: What constitutes a *successful* Klein repair? May Klein
   modify neighboring pixels? May it change composition? May it introduce stylistic drift? What is the retry
   budget? When do we escalate Klein → regeneration? (Class→method default table lives in
   `_repair_planner.mjs`: localized → Klein inpaint; structural → conditioned regen.)
2. **Localization** — derive Klein's bounding region from the defect `note` (± a targeted localization query).
3. **Execution** — perform the repair on the auto-repair set per the contract.
4. **Verification** — re-run the **same frozen verifier** on the repaired panel: confirm the defect cleared
   AND no new defect appeared. The closed loop — the repair system checks its own work against a stable
   standard. `detect → decide → repair → verify`, with the verifier as the unchanging invariant.

## Deferred to Verifier v2 (NOT now)

The verifier could emit **canonical defect identities** — `ANATOMY_HAND_FINGERS`, `TEXT_CHARACTER_NAME`,
`TEXT_CAPTION`, `SPECIES_MORPHOLOGY`, `CONTINUITY_DUPLICATE` — instead of only coarse classes (`anatomy`,
`text-leak`). Same minimal philosophy (still only semantic evidence), just a richer vocabulary that gives the
planner finer routing. This is a **Verifier v2** change: it bumps the version and reopens the Benchmark A
validation, so it waits until a concrete routing need demands it — not speculatively.

Related: `verifier-contract.md`, `benchmark-A.md`, `measurement-discipline.md`, `image-quality-spec.md`.
