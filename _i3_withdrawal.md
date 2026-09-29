# I3 withdrawn — opening matrix structural correction

> **Structural-domain correction only. No re-ranking. No coverage claim. No implementation.**

---

# 1. Withdrawn

**I3** — *`jurisdictionChallengeMade ∧ ¬accusationMade` is invalid* — **is withdrawn as unsupported.**

It was upheld on the reading that a jurisdiction challenge presupposes **the family's** charge. That reading
was wrong.

> **`app.js:131286`, `interrogation_interrupted`:** *"Julian, the Provast, has ALREADY questioned Lirael
> before the assembly — intimately, **as an accusation through desirability**."*
>
> **`app.js:131490`, the family lane's own frame:** the family's demand *"redirect[s] the confrontation **from
> Julian's accusation** to a new formal complaint."*

**A jurisdiction challenge can rest on Julian's already-active accusatory interrogation even when the family
never publicly accuses Lirael.** That interrogation is an **opening invariant**, so a charge is present in
every reachable opening state and I3 excluded **no valid state**.

> **Keeping it would have made the matrix "covered" by excluding a real story state** — a room where Julian
> has questioned her, the Provast contests who may rule, and her ward's family has said nothing at all. That
> is not an impossible state. It is a scene.

---

# 2. The recomputed opening domain

```
invariants     : inquiryOpened=false, interrogationOccurred=true (seed-pinned)
free predicates: 5  →  32 reachable opening states

I1  WITHDRAWN   not live  — unsupported; the seed orders the inquiry against preliminary process
I2  WITHDRAWN   not live  — vacuous and contradicted; interrogationOccurred is an aftermath truth
I3  WITHDRAWN   not live  — a challenge rests on Julian's interrogation-as-accusation
I4  RETAINED    not live  — vacuous here; carried forward to the late matrix

LIVE EXCLUSIONS : 0
VALID CELLS     : 32 of 32
```

## The structural result

**The opening domain is now defined entirely by its two invariants. No invalid-cell rule excludes anything in
this phase.**

All four declared rules are either withdrawn or vacuous:

| | |
|---|---|
| **I1, I2, I3** | withdrawn as unsupported |
| **I4** | **retained and still evidence-backed** — the seed's *"may be DEMANDED … may not be CONVENED"* — but **vacuous while `inquiryOpened` is invariantly false.** It becomes load-bearing in the late matrix, where both its terms vary. |

**Of the four ordering rules this matrix was built on, none constrains the opening.** What shapes the domain
is the pair of seed-pinned invariants, and nothing else.

---

# 3. The eight cells restored

All eight share `jurisdictionChallengeMade` true and `accusationMade` false — **the challenge has been made
and the family has not spoken.**

| cell `AIRICAJ` | also set |
|---|---|
| `···I··J` | nothing else |
| `··RI··J` | reviewPending |
| `···IC·J` | custodyRevealed |
| `··RIC·J` | reviewPending + custodyRevealed |
| `···I·AJ` | assemblyStaged |
| `··RI·AJ` | reviewPending + assemblyStaged |
| `···ICAJ` | custodyRevealed + assemblyStaged |
| `··RICAJ` | reviewPending + custodyRevealed + assemblyStaged |

**24 → 32.**

---

# 4. Every prior coverage result is STALE

| result | status |
|---|---|
| **24 / 24** (opening, states only) | ⛔ **STALE** — the domain is 32 |
| **168 / 168** (states × ask-classes) | ⛔ **STALE** — that domain becomes 32 × 7 = **224 pairs** |
| **72 / 72**, **23 / 24** (earlier readings) | ⛔ stale already, doubly so now |

**No new coverage figure is computed or claimed in this pass.** The eight restored cells have not been
checked against any outcome, and three outcomes are blocked or withdrawn besides.

`_fs_coverage_check.mjs` has been reduced to a **state-domain calculator** — it no longer computes coverage at
all, so a stale figure cannot be produced by running it out of habit.

---

# 5. `unm.the_accusation_unmade` — trace unchanged by this pass

**Confirmed, and unaffected:**

- **No conditional challenge companion is required.** `challenge.jurisdiction_contested` contests the
  **presiding Dohkar's** jurisdiction, not any accusation.
- **Both challenge atoms remain in `unchanged[]`** — `challenge.jurisdiction_contested` and
  `challenge.answerability_shifted_to_julian` — **because their active charge survives through Julian's
  interrogation**, which this outcome does not touch.
- `auth.julian_claims_convene_preside` likewise unchanged and distinct.

**The same fact that withdraws I3 is the fact that keeps those atoms standing.** Julian's
interrogation-as-accusation is the charge underneath both, and erasing the family's accusation reaches
neither.

---

# 6. Status

| | |
|---|---|
| I3 | **withdrawn** |
| opening valid cells | **32** (was 24) |
| live exclusions | **0** — the domain is its invariants |
| coverage | **not claimed**; all prior figures stale |
| `unm.the_accusation_unmade` | trace confirmed, still **blocked** pending approval |

**No re-ranking. No coverage claim. No implementation.**
