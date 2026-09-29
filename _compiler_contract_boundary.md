# Design-boundary correction — compiler contract vs extractor report contract

> **Boundary and mapping only. Both candidates stay blocked. No re-ranking, no coverage run, no
> implementation.** Automatic extraction remains disabled.

---

# 1. The boundary

## 1a. Two contracts, two purposes

| | **extractor report contract** (`app.js:191194–191292`) | **compiler / ledger contract** (native, to be defined) |
|---|---|---|
| **when** | **after** prose exists | **before** prose is written |
| **who writes it** | a model, reading a delivered scene | the compiler, from an authored outcome |
| **what it says** | *what this scene appears to have done* | *what this outcome commits the scene to do* |
| **status** | **automatic extraction disabled**; the schema is retained as a reading contract | the authoring source of truth |

## 1b. The rule

> **No report-only required field becomes a compiler obligation by default.** The compiler contract may
> **deliberately reuse** a primitive enum or effect type, and **each reuse must be justified individually.**
> Reuse is never inherited by proximity.

## 1c. The organising principle that decides most cases

**Report fields that measure the gap between what was asked and what was delivered have no pre-author
meaning — because before prose there is no gap.**

`scopeMatch`, `unaccountedParties`, `evidenceQuote`, `memoryAbsent`, `suspicionFromResidue` all exist to let a
reader say *how close the scene came* and *what the text proves*. **A pre-author fact has nothing to be close
to and no text to quote.** Those fields are reading instruments, not authoring vocabulary.

## 1d. What I did wrong, stated plainly

I proposed adding `not_targeted_by_population` and `population_membership` **to the extractor enum**. That is
migration by accretion: it grows a retrospective reading contract to carry authoring semantics it was never
designed for, and it ties the compiler's correctness to a schema whose own automatic use is disabled.
**Withdrawn.** The compiler gets its own field, and a mapping is declared for the day extraction returns.

---

# 2. Deliberate reuse — justified one at a time

| primitive | reused? | justification |
|---|---|---|
| **rupture classes** (`memory_perception`, `history_rewrite`, `identity_reputation`, `materialization_possession`, `relationship_social`, `other`) | **YES** | This is the **world's capability taxonomy**, not a reading instrument. It answers *what kinds of change exist here*, which is the same question before and after prose. Reused as **vocabulary**, never as obligation. |
| **disposition enum** (`forgot · retained · partial · suspects · resisted · exempt · absent`) | **YES** | A closed list of **effect kinds**. Authoring needs the same kinds it will be checked against, and closure is the property that stopped `incoherent`. |
| **`durability`** (`expires \| persists \| uncertain`) | **YES** | Duration is a required causal step in the mechanism-first rule. The enum is a property of the effect, not of the reading. |
| **`targetPopulation.kind`** | **PARTIAL** | `collective`, `named_subset`, `self`, `other_declared` reused. **`all_present_except_invoker` is REJECTED** — it encodes the withdrawn invoker default in its name. The compiler expands **sealed rosters** instead. |
| **`scopeMatch`** | **NO** | Measures delivered against requested. **A pre-author fact is the request.** |
| **`unaccountedParties`** | **NO** | Records who the reader could not resolve. The compiler resolves everyone at seal by construction. |
| **`evidenceQuote`** | **NO** | Requires prose to quote. None exists yet. |
| **`memoryAbsent`**, **`suspicionFromResidue`** | **NO** | Observations about what a delivered scene showed. **See §3.** |
| **`invokerExemption`** | **NO** | Replaced natively — see §2a. |

## 2a. The native invoker field

```
invokerScope: "in_population" | "not_in_population" | "exempted_by_grant"
```

| value | meaning |
|---|---|
| `in_population` | the sealed roster contains the invoker; **she takes the literal effect** |
| `not_in_population` | the roster does not contain her; **not spared — never in scope** |
| `exempted_by_grant` | the roster contains her **and the authored outcome explicitly exempts her** |

**Three states, no overloading.** Exemption means exemption; scope means scope. The legacy schema conflated
them because it only ever had to *report* an outcome, where the distinction is invisible.

**Declared mapping, for if extraction is re-enabled** — a translation at the boundary, not a schema change:

| compiler | → report |
|---|---|
| `in_population` | `status: targeted` |
| `not_in_population` | `status: exempt` *(lossy — the report cannot distinguish scope from sparing)* |
| `exempted_by_grant` | `status: exempt` |

**The lossiness is the point.** It is a known limitation of the older contract, recorded here rather than
fixed by growing it.

---

# 3. `unm.the_turning_forgotten` — the residue cost is **REMOVED**

**Schema legality was not semantic support, and I treated it as such.**

`suspicionFromResidue` is legal on a collective entry — the validator requires the boolean and 191238 names
collectives explicitly. **That establishes it can be reported. It does not establish that an authored outcome
may commit the crowd to suspicion.**

### What the catalog actually licenses for `memory_perception`

> **Editing what parties know**, with a declared `targetPopulation` and a disposition from the closed enum.

**That is the whole licence.** `suspicionFromResidue` is not an effect the class grants; it is an observation a
reader may make about a delivered scene. **The catalog does not support authoring it as a designed cost**, so
it is removed rather than retained on legality.

### A mechanical point that settles it independently

**`disposition` is singular per party.** The collective's disposition is `forgot`. The enum also contains
`suspects` — a *different* disposition, not an addition to one. **An outcome cannot author the crowd as both
`forgot` and suspicious**; it must choose, and this outcome chose forgetting.

### Result

**`unm.the_turning_forgotten` is a costless crowd-memory change.**

The crowd forgets that the assembly turned to look at her. Nothing else is claimed. **A costless outcome is
permitted and is not a weaker one** — `unm.dohkar_demand_unmade` and `unm.the_accusation_unmade` are both
costless, and the limits in §A5 of the candidate (she is still present, the twist stays known, the four named
retain everything) do the work a cost was reaching for.

---

# 4. `unm.the_accusation_unmade` — the three lists, confirmed

## 4a. `ceases[]`

| atom | condition |
|---|---|
| **`accusation.family_accused`** | always — the selected public-accusation atom |
| **the jurisdiction-challenge atom** | **only when active** |

> ### ⚠ Correction — I named the wrong atom for the companion
> The prior draft named **`auth.julian_claims_convene_preside`**. **That is a different fact**: it is Julian's
> claim, from `inquiry_authority_claimed`, to convene and preside over the formal inquiry. The **jurisdiction
> challenge** is a separate event produced by the `julian_jurisdiction_challenge` lane (131356). I conflated
> them.
>
> ### ⚠ And the challenge lane is disjunctive too
> `131356`: *"Julian **challenges jurisdiction**, **reframes the accusation politically**, or **contests who
> has authority to rule**."* **Three disjuncts, one lane** — the same defect the family lane had.
>
> **RESOLVED 2026-09-28** in `_jurisdiction_lane_atomization.md`. The lane atomizes into **two** atoms, not
> three: `challenge.jurisdiction_contested` (the frame fuses "challenges jurisdiction" and "contests who has
> authority" into *"a real jurisdictional contest over authority"*) and
> `challenge.answerability_shifted_to_julian`. *"Politically"* has no authored meaning anywhere and is not
> atomized.
>
> **Neither depends on `accusation.family_accused`**, so **no conditional companion is required.** The
> challenge contests the **Dohkar's** jurisdiction, and the answerability shift rests on **Julian's**
> accusation — an opening invariant. **My guess that I3 held for the lane as framed was wrong; see §6 of that
> note.**

## 4b. `establishes[]`

| fact | text |
|---|---|
| **`accusation.family_never_accused`** | *At that event, Seren's family — and no other party with standing — publicly accused Lirael of responsibility for the twisted wish. No such accusation was made.* |
| `survivingContradictions` | **empty**, permitted (191274): no memory is edited and nothing was set in motion by an accusation that did not occur |

## 4c. `unchanged[]` — stated, never inferred

| | |
|---|---|
| **`accusation.family_demanded_remedy`** | **survives in full.** If remedy was demanded, it still is. **No one says she did it, and they still want paying.** |
| **the family's grievance** | untouched. `history_rewrite` ceases events, not minds — they lost what they lost and believe what they believe. **No atom exists for it**, and none is minted; this records what the delta does not reach. |
| **named minds** | Seren, Julian, the presiding Dohkar, Lirael — **no memory effect whatsoever.** This is not a `memory_perception` outcome. |
| **`review.demanded_by_julian`** | untouched, so **row 4's notice and investigation still arrive.** |
| also unchanged | every `twist.*` · every `interr.*` · every `answer.*` · every `auth.*` · `review.demanded_by_dohkar` · `lirael.scene1_disposition` |

---

# 5. Status

| | |
|---|---|
| extractor→compiler migration by accretion | **withdrawn**; native contract and declared mapping instead (§2) |
| `unm.the_turning_forgotten` | **blocked.** Cost removed; now a costless crowd-memory change. |
| `unm.the_accusation_unmade` | **blocked.** Three lists confirmed; **companion atom misidentified and corrected**, and the challenge lane needs its own split. |
| new open item | split `julian_jurisdiction_challenge` into per-disjunct atoms |
| `escape`, pre-accusation | still uncovered |

**No re-ranking. No coverage run. No implementation.**
