# Invariant Language Specification

**Status:** DRAFT / prototype for review. This must be frozen (and the verifier calibrated against it) **before** Phase 0 of the [Invariant-Gated Serialization design](./invariant-gated-serialization-design.md). Determining semantic satisfaction *is* the hard part of the project; this doc pins it down so telemetry isn't measuring a moving target.

---

## 1. What a narrative invariant is

A **narrative invariant** is a single irreversible truth that must become true in the story for destiny to advance — stated so a third party reading only the prose can decide whether it happened. It is **not** a prose event and **not** a preferred realization (that's the [soft objective](./invariant-gated-serialization-design.md#3a-hard-invariants-vs-soft-objectives-first-class-distinction)).

```
invariant := {
  statement:     "<subject> irreversibly <state-change> [through <required-modality>]",
  precondition:  "<the 'before' — what is still true when the scene opens>",
  test:          "<a yes/no question a reader can answer from the prose alone>",
  anchor:        "external" | "external+internal",   // see §3 — how the truth is witnessed
  reversibility: "irreversible",                     // invariants are always irreversible (else not destiny)
  required_modality: "<load-bearing constraint, or null>"  // e.g. "public", "witnessed by X", "on the record"
}
```

The five defining properties (a valid invariant has all five):
1. **Irreversible** — asserts a permanent change ("permanently", "irreversibly"). A reversible state is not a destiny anchor.
2. **Testable** — reduces to a single yes/no the verifier and a human can both answer from the prose.
3. **Precondition-bearing** — names the "before" so satisfaction = precondition-was-true-then-became-false. (Prevents "was already true" false positives.)
4. **Externally anchored** — see §3.
5. **Single truth** — one change, not a compound ("A and B and C" → split into separate invariants).

---

## 2. Satisfaction levels (what gates, what doesn't)

| status | meaning | gates serialization? | closes the invariant? | records consequence? |
|---|---|---|---|---|
| **SATISFIED** | the truth is now unambiguously true on the page | **yes** | **yes** | **yes** |
| **PARTIAL** | begun / gestured / one-directional but not irreversibly complete | **no** | no (stays pending) | no |
| **UNSATISFIED** | did not become true | no | no (stays pending) | no |

Only **SATISFIED** advances destiny. PARTIAL is real and tracked (telemetry), but a half-broken trust that could still recover is not yet a destiny fact — the story must complete it. This is the whole point: **no assumption becomes canonical until its invariant is actually, irreversibly true.**

---

## 3. Answering the hard questions (the load-bearing decisions)

These are proposals for review — the exact calls here define the entire system.

**Q: Can an internal realization count?**
Default **NO** for gating. Serialization is a contract about shared narrative reality; a truth only the protagonist privately felt is too fragile to build future scenes on (and un-verifiable from a third-person read). An invariant may set `anchor: "external+internal"` **only if** it names an *observable proxy* ("she stops defending him to others", "she moves his key off her ring") — the interior change must leave an external trace the verifier can see. Pure interiority → at most PARTIAL.

**Q: Is public humiliation / public evidence required?**
Only if the invariant's `required_modality` says so. The planner must make load-bearing constraints **explicit**: "loses trust **through undeniable public evidence**" requires a public, external act; "loses trust" alone may be satisfied privately (given an external anchor per above). The verifier enforces exactly the modality the invariant names — no more, no less. Ambiguity here is a *planner* defect, caught in generation validation.

**Q: Does physical separation satisfy "loses trust"?**
**No** — the test checks the *specific* truth, not a correlate. Separation may be *evidence toward* trust loss but does not *constitute* it. Satisfaction requires the stated change itself. (This is the single most common false-positive trap: correlates that "feel like" the invariant.)

**Q: Can an invariant be partially satisfied?**
Yes → PARTIAL (§2). PARTIAL never gates and never closes. A trust fracture "begun" this scene stays pending; a later scene must make it irreversible for it to become canonical. Repeated PARTIAL on the same invariant is a starvation signal (design §12.1).

**Q: What about a substitution (the author realized a *different* irreversible event)?**
Judge it against the invariant, not the planned realization: does the substituted event make the *invariant* true? "Rowan confesses" vs planned "the crowd finds the forged vows" → both SATISFIED (`matched_via: author_substitution`, `substitution_preserves_invariant: true`). "Quinn injures her hand" → UNSATISFIED + `branch_risk: competing_branch`. **Author freedom is protected; destiny is protected; only the collision of the two is flagged.**

---

## 4. Worked examples

**Well-formed invariant (SATISFIABLE many ways):**
```
statement: "Quinn irreversibly loses trust in Rowan through an undeniable public act."
precondition: "Quinn still extends Rowan private trust; no public breach has occurred."
test: "Has a public, external act made it irreversibly true that Quinn no longer trusts Rowan?"
required_modality: "public"
anchor: "external"
```
- Scene: *the assembled court hears Rowan name Quinn's secret to the Warden; she stops mid-sentence and will not look at him again.* → **SATISFIED** (public, external, irreversible; matched_via=planned or substitution).
- Scene: *Quinn privately suspects Rowan and says nothing.* → **UNSATISFIED** (not public, not irreversible, internal-only).
- Scene: *the two are assigned to separate wings of the keep.* → **UNSATISFIED** (separation ≠ trust loss — a correlate).
- Scene: *Quinn flinches when Rowan reaches for her, a first crack.* → **PARTIAL** (begun, not irreversible).

**Mal-formed invariants (rejected at generation):**
- `"The blood oath is revealed."` → an *event*, not an irreversible truth about a character/world state. (This is the current bug's DNA.) Rewrite: *what must the reveal make permanently true?*
- `"Quinn and Rowan grow closer and the Warden is exposed and the vow breaks."` → compound; split into three.
- `"Quinn feels betrayed."` → internal-only, no external anchor, reversible. Rewrite with an observable proxy + irreversibility.
- `"The tension increases."` → not testable, not irreversible.

---

## 5. The verifier prompt (draft — to be calibrated in §6)

```
SYSTEM: You are the INVARIANT verifier for a serialized interactive story. Given a NARRATIVE
INVARIANT (an irreversible truth that must become true for the story's destiny to advance) with
its PRECONDITION, TEST, and REQUIRED MODALITY, plus the SCENE PROSE that was rendered, decide ONE
thing: is the invariant now IRREVERSIBLY TRUE on the page, satisfying its test and its required
modality? Judge the TRUTH, not any particular wording — the author may realize it any way. A
DIFFERENT irreversible event counts ONLY if it makes THIS invariant true. Correlates that merely
suggest the truth (e.g. physical separation for "loses trust") do NOT count. Internal-only changes
with no external trace do NOT count (unless the invariant's anchor permits an observable proxy that
is present). Output STRICT JSON:
{ "invariant_status":"SATISFIED|PARTIAL|UNSATISFIED",
  "realization":"<1 sentence: how it became true, or why not>",
  "matched_via":"planned_realization|author_substitution|none",
  "substitution_preserves_invariant": true|false|null,
  "branch_risk":"none|competing_branch" }
```

Model/plumbing: `/api/chatgpt-proxy` gpt-4o-mini, `jsonMode`, temp 0.1 — same as the existing commit verifier, run alongside it.

---

## 6. Calibration protocol (the gate to Phase 0)

Before any telemetry:
1. Assemble **~15–20 hand-labeled `(invariant, scene-prose)` pairs** spanning: clean-satisfied, satisfied-via-substitution, partial, unsatisfied, correlate-trap (separation/internal-only), competing-branch.
2. Run the §5 verifier on them; compare to human labels.
3. Iterate the prompt until **agreement ≥ ~90%** on `invariant_status` and correct `substitution_preserves_invariant` on the substitution cases.
4. **Freeze** the prompt + this spec. *Then* Phase 0 (shadow) begins — its telemetry now has stable meaning.

The pairs double as the regression suite for every later prompt change.

---

## 7. Open questions for review

- **Anchor default:** is "external-only gates; interiority needs an observable proxy" the right call, or too strict for a romance engine where interior shifts matter? (I lean strict-for-gating, generous-for-soft-objectives.)
- **PARTIAL half-life:** how many PARTIAL scenes before starvation escalation (design §12.1)?
- **Invariant granularity:** one hard invariant per milestone, or may a milestone carry 2–3 (e.g. a crisis that must break trust *and* expose the vow)? (Leaning: one hard invariant per milestone; compound arcs = multiple milestones.)
- **Who authors the invariants** — the same A-plot generator (retrained prompt) or a dedicated pass? (Leaning: same generator, rewritten §3 prompt, to keep it one call.)
