# Pre-registered pass criteria — first paid live run of the opening compiler

> **Registered 2026-09-29, BEFORE any provider call.** No run is authorized by this document.
> The verdict is fixed here so it cannot drift after the output is read.

**What is being tested:** whether the author **obeys a compiled consequence**. Not whether the pipeline
holds — that is proven locally (slice 80/80, lifecycle 55/55, all-outcomes 171/171).

**What is NOT being tested:** prose quality, pacing, voice, or whether the outcome is good drama. A scene may
be poor and still pass; a scene may be excellent and fail.

---

# The four criteria — all four must hold

### C1 — Renders only the sealed consequence
The scene delivers the compiled outcome **and no other Tempt effect.** No second grant, no partial
substitution, no "and also" consequence the compiler did not select.

| verdict | |
|---|---|
| **PASS** | every Tempt-attributable change in the prose maps to the sealed record |
| **FAIL** | any Tempt-attributable change that is not in it |

### C2 — Respects its exact roster and scope
The parties affected are **exactly** the frozen roster. **Mechanically checkable**, and checked that way:
for a memory outcome, every roster member's state is consistent with the declared disposition, and **no
non-member is affected.**

| verdict | |
|---|---|
| **PASS** | affected set == frozen roster |
| **FAIL** | any widening (a non-member affected) **or** any silent narrowing (a member skipped) |

> **`pc:lirael` is the specific thing to check.** Where `invokerScope: in_population`, she must be affected
> like every other member. **A scene that quietly spares her fails C2** — that is the exact defect D1 exists
> to prevent, and the one the model is most likely to reintroduce on instinct.

### C3 — Adds no cost and no canon fact
The scene asserts **no cost** the record does not carry, and **no world fact** the delta does not establish.

| verdict | |
|---|---|
| **PASS** | costs and established facts in the prose ⊆ the sealed record |
| **FAIL** | any invented price, penalty, or new standing fact |

> For a costless outcome the prompt says *"COST: none — do not invent one."* **A scene that supplies a price
> anyway fails C3**, however apt the price is.

### C4 — Stops at `choice_pending` when required
For an outcome that opens a pending choice, the scene **ends on the renewed choice** and authors nothing past
it — no reaction, no aftermath, no closing line implying which way she went.

| verdict | |
|---|---|
| **PASS** | the scene reaches the choice and stops |
| **FAIL** | any consequence, reaction, or implication past the choice |
| **n/a** | outcomes that open no pending choice |

---

# Run shape, so C4 is actually exercised

**At least two outcomes**, chosen so all four criteria are reachable:

| | outcome | exercises |
|---|---|---|
| 1 | **`unm.time_gives_way`** | C1–C4, including the `in_population` roster with Lirael and the pending-choice stop |
| 2 | **`unm.the_turning_forgotten`** | C1–C3 with a **narrow** roster — the crowd only — where the four named must be left untouched |

**Together they test both directions of C2**: one where Lirael must be affected, one where four named
characters must not be.

---

# Scoring discipline

- **C2 is scored mechanically first** — roster membership against the prose — before any reading judgement.
- **C1 and C3 are scored against the sealed record only.** The record is the specification; the prose is the
  claim being checked. Not the other way round.
- **Any criterion failing is a FAIL for the run.** There is no partial pass, and no "good enough given the
  prose quality."
- **Record the verdict before discussing the writing.**

---

# Conditions

**No run is authorized here.** A paid run requires an explicit per-run authorization with a ceiling, and this
document does not constitute one. Post-prose extraction and automatic commitment stay disabled for the run —
the compiled consequence is the specification, and nothing the model returns commits anything.
