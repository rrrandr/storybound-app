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
| **Repair economics** | Is the proposed repair worth its cost? | ✅ Component 3 |

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

## Component 3 — REPAIR ECONOMICS ✅ (built, validated offline)

The third axis, and the first planner component that is **pure computation** — no model call, no image.
Economics is optimization, not perception: a deterministic cost-benefit over Components 1+2.

> `gain = severity-value × confidence-multiplier` · `cost = method-price × expected-retries (incl. re-verify)`
> · `worth = gain ≥ cost`. Localized → Klein (cheap); structural → regen (~8×). Klein that exhausts its
> retry budget escalates to regen **only if** regen would itself pay off for that defect.

**The decisive property — the worth-threshold is COST-DEPENDENT** (so economics can't be folded into
confidence+severity): at identical `conf=high, sev=medium`, a **localized** defect is worth a Klein
(gain 6 ≥ cost 3.1 → repair) while a **structural** one is not worth a regen (gain 6 < cost 11.3 → skip).
Same evidence, opposite decision, because the repair costs differ. Economics also *independently* confirms
the severity gate (garbled neon skipped by both), and adds cost-aware escalation (high-sev Klein → escalate
to regen on failure; medium-sev Klein → give up). It is the FINAL gate: an action that clears
confidence×severity but isn't cost-justified is downgraded to `surface·uneconomical`.

**Model vs. Policy — a category line.** Up through the verifier, every result was *falsifiable* (does
two-channel beat one-channel? does corroboration separate stable from unstable?). The planner's *structure*
is still architecture, but the **numbers** are **policy** — product decisions, not properties of the world.
So the code separates them: a stable `worth = f(confidence, impact, repair_cost)` **MODEL**, and a
`POLICY` block (`policy-v0-placeholder`) of provisional constants — severity weights, method costs, retry
budgets, fail-probabilities — that **will change** with real API pricing, measured latency, telemetry, and
observed repair success rates. Freeze the formula; never the numbers. *(The localized-vs-structural
counterexample already sufficiently demonstrates economics is a distinct axis; the specific `20/6/1` weights
do not need — and should not get — that same "validated" status.)*

**Deferred 4th input — repair success probability.** A Klein that succeeds 95 % ≠ one that succeeds 12 %,
so eventually `expected_gain = impact × confidence × P(success)`. Not built — it awaits *measured* per-method
success rates, which only exist once the execution + verification loop is running. Recorded, not implemented.

Implementation: `_repair_planner.mjs` `economics(class, confidence, severity)` (MODEL + POLICY separated);
offline demo `_econ_demo.mjs`.

---

### Status: the planner's DECISION MODEL is complete — not "the planner."

The architecture now knows **what** is wrong (verifier), **whether** it's real (confidence), **whether** the
reader cares (impact), and **whether** it's worth spending on (economics). What remains is **execution** —
defining what a valid repair *is*, carrying it out, and proving it worked against the frozen verifier. That
is the boundary between decision-making and action, and a deliberate pause point.

## Three vision roles — one responsibility each

Vision appears three times in the system, each answering a *different* question. Keeping them separate is
what prevents the frozen verifier from bloating into a "vision Swiss-army knife" and preserves replaceability.

| Role | Question | Frozen? | Replaceable without reopening Benchmark A? |
|---|---|---|---|
| **Verifier** (oracle) | "What defects exist?" | ✅ v1.0 | no — it *is* the acceptance criterion |
| **Localization** | "Where is *this* defect?" | no | yes (box → segmentation → SAM → …) |
| **Execution** | "Modify *only* this region." | no | yes (Klein → any inpainter/regen) |

## Remaining phases (ordered — the contract comes BEFORE localization)

1. **Repair Contract** ✅ — written: [`repair-contract.md`](./repair-contract.md). Defines "fixed" (the frozen
   verifier agrees the defect is gone AND nothing new broke), the non-regression/rollback safety invariant (a
   repair can never make the sheet worse), collateral bounds (Klein in-region; regen preserves sibling
   continuity), style-drift tolerance, and exhaustion → escalate-if-worth → surface. Model/policy separated,
   same as the planner.
2. **Localization** ✅ — `_localizer.mjs` `localize(imgPath, defect)`. Panel index → quadrant (deterministic);
   a spatial vision call (Gemini `box_2d`, its own tool — NOT the frozen verifier) returns a tight box around
   the element named in the defect `note`; feather margin + clamp to the panel produce the Klein mask.
   **Validated on Benchmark A (visual, cropped + eyeballed):** boxes land precisely on the element (PHASE
   caption, DANIEL neon, each malformed hand), in-panel, tight (3.8–6.2% of panel area) — the *minimal region*
   objective met. (Transient call flakiness handled by retry.)
3. **Execution** ⏳ (next) — **STATELESS**, per this design contract:
   `RepairAttempt { input_image, mask, repair_instruction } → candidate_image`.
   Execution knows **nothing** of confidence, severity, economics, or retry count — those are the planner's.
   It simply produces the best candidate it can from its inputs (Klein inpaint within the mask; regen for
   structural). Stateless = maximally reusable and trivially testable, and it keeps **all** policy in the
   planner. And **execution is an OPTIMIZATION problem, not a correctness one** — correctness is already
   fixed by the Repair Contract; execution only tries to satisfy it *efficiently*, free to tune mask
   expansion / prompt wording / negative prompts / feather radius / model choice / retry ordering **without
   touching the acceptance criterion**. Telemetry: log `mask_area_percent` (from localization) on every
   attempt — a leading indicator of Klein success/retries.
4. **Verification** — re-run the **same frozen verifier** on the repaired panel: confirm the defect cleared,
   no new defect, and unrelated defects preserved (contract §1). The closed loop — the repair system checks
   its own work against the unchanging oracle. `detect → decide → repair → verify`.

## Deferred to Verifier v2 (NOT now)

The verifier could emit **canonical defect identities** — `ANATOMY_HAND_FINGERS`, `TEXT_CHARACTER_NAME`,
`TEXT_CAPTION`, `SPECIES_MORPHOLOGY`, `CONTINUITY_DUPLICATE` — instead of only coarse classes (`anatomy`,
`text-leak`). Same minimal philosophy (still only semantic evidence), just a richer vocabulary that gives the
planner finer routing. This is a **Verifier v2** change: it bumps the version and reopens the Benchmark A
validation, so it waits until a concrete routing need demands it — not speculatively.

Related: `verifier-contract.md`, `benchmark-A.md`, `measurement-discipline.md`, `image-quality-spec.md`.
