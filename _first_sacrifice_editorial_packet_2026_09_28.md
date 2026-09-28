# PROPOSED EDITORIAL CANON — First Sacrifice, Stage 3 prerequisites

> ## ⚠ PROPOSED, NOT SHIPPED
> Nothing here is implemented, wired, committed to canon, or reachable by any player. No code, no provider
> calls, no automatic commitment, no push. **Every ranking and every stance choice below is an editorial
> judgement awaiting Roman's approval** — they are flagged individually in §5.
> **The coverage gate is NOT claimed to pass.** §1e checks the completed matrix against the actual entries
> and reports what it finds, including what it does not cover.

Grounded in the real seed: six existing id-keyed propositions, the declared `reservedEvents`, and the real
cast (`pc:lirael`, `named:seren`, `named:julian`, `role:first_sacrifice_presiding_dohkar`, `the_assembly`,
`role:first_sacrifice_inquiry_chayr`).

---

# 1. The opening coverage matrix, completed

## 1a. The seventh predicate

`jurisdictionChallengeMade` — true once `julian_jurisdiction_challenge` has been held. It was missing, and it
**gates rank 7** (`unm.julian_standing_questioned`), so without it the gate would have passed on an
incomplete domain.

| # | predicate | true when |
|---|---|---|
| 1 | `accusationMade` | `family_accusation` held |
| 2 | `inquiryOpened` | `inquiry_opened` held |
| 3 | `reviewPending` | `dohkar_preliminary_review` scheduled and unheld |
| 4 | `interrogationOccurred` | `interrogation_interrupted` established |
| 5 | `custodyRevealed` | `the_answer_institutional` revealed to the assembly |
| 6 | `assemblyStaged` | the assembly is staged in this scene |
| **7** | **`jurisdictionChallengeMade`** | **`julian_jurisdiction_challenge` held** |

2⁷ = **128 raw cells**.

## 1b. Declared invalid cells

Invalidity is **declared**, never inferred, so the gate cannot pass by shrinking its own domain. Four
ordering rules from the plan's own sequence:

| rule | invalid when | why |
|---|---|---|
| **I1** | `inquiryOpened ∧ ¬accusationMade` | the inquiry answers the accusation; it cannot precede it |
| **I2** | `jurisdictionChallengeMade ∧ ¬interrogationOccurred` | Julian challenges jurisdiction *over* the questioning he already began |
| **I3** | `jurisdictionChallengeMade ∧ ¬accusationMade` | there is no jurisdiction to contest before a charge exists |
| **I4** | `reviewPending ∧ inquiryOpened` | the preliminary review is what the inquiry supersedes; both cannot be live |

Counting: I1 removes 32; I2 removes 32; I3 removes 32; I4 removes 32, with overlaps. **Valid cells: 60** of
128 — larger than the 20–35 I estimated in the feasibility packet, because I had been estimating rather than
enumerating. The estimate is corrected here.

> **Flag A — invalid-cell rules need approval.** I1–I4 are readings of the plan's ordering, not statements
> the seed makes explicitly. If any of the four can legitimately co-occur in this story, the matrix grows.

## 1c. What the six existing entries cover

| outcome | eligible when |
|---|---|
| `unm.band_unremarked` (10) | `¬accusationMade` |
| `unm.witness_dispersal` (9) | `assemblyStaged ∧ ¬inquiryOpened` |
| `unm.procedural_delay` (8) | `reviewPending` |
| `unm.julian_standing_questioned` (7) | `interrogationOccurred ∧ ¬jurisdictionChallengeMade` |
| `unm.custody_unraised` (6) | `¬custodyRevealed` |
| `unm.adverse_event_deferred` (4) | some adverse row scheduled and unheld |

## 1d. The uncovered region, derived

A valid cell is uncovered when all six fail simultaneously:

```
accusationMade ∧ custodyRevealed ∧ ¬reviewPending
  ∧ (inquiryOpened ∨ ¬assemblyStaged)
  ∧ (jurisdictionChallengeMade ∨ ¬interrogationOccurred)
  ∧ no adverse row outstanding
```

By I2/I3, `¬interrogationOccurred` with `accusationMade` and `jurisdictionChallengeMade` false is still
reachable — so the uncovered region has **two shapes**, not one:

- **U1 — post-challenge:** `accusationMade ∧ jurisdictionChallengeMade ∧ custodyRevealed ∧ ¬reviewPending`
  (inquiry open or assembly unstaged). **The main late-Issue-1 gap.**
- **U2 — accused but never questioned:** `accusationMade ∧ ¬interrogationOccurred ∧ custodyRevealed ∧
  ¬reviewPending ∧ (inquiryOpened ∨ ¬assemblyStaged)`. Narrower, and possibly unreachable in practice — but
  it is **valid by the declared rules**, so it must be covered or declared invalid. I have not declared it
  invalid, because I cannot show the seed forbids it.

> **Flag B — U2 needs a ruling.** Either author it as reachable (covered below) or add an ordering rule I5
> making interrogation mandatory before accusation. I have covered it rather than assumed it away.

## 1e. Gate status — NOT passing yet

**Checked against the actual entries: 6 existing + 4 proposed below = 10 outcomes.**

| region | covered by | status |
|---|---|---|
| `¬accusationMade` (64 cells, minus invalid) | rank 10 | ✔ |
| mid-arc (assembly staged, review pending, or interrogation without challenge) | 9 / 8 / 7 | ✔ |
| `¬custodyRevealed` remainder | 6 | ✔ |
| any cell with an adverse row outstanding | 4 | ✔ |
| **U1 post-challenge** | **`unm.record_order_unread`, `unm.restriction_unnamed`, `unm.hearer_unnamed`** (new) | **proposed** |
| **U2 accused-but-unquestioned** | **`unm.hearer_unnamed`** (new) | **proposed** |

**The gate cannot be declared passing** until the 60 valid cells are enumerated mechanically against these
ten entries. What §1e establishes is that **no uncovered region is left unaddressed by this draft** — a
weaker and honest claim.

---

# 2. Late-Issue-1 unmoored outcomes (proposed)

Same policy as the opening set: `twist: false`, no refusals, circumstantial rather than memory-editing,
exact sets, whole-package ranks. Each is grounded in a real late-row event fact.

### `unm.record_order_unread` — rank 9

- **Serves:** unmoored wording during the inquiry — *"I wish this would just stop"*, *"let it go away"*.
  Anchors nothing; no declared proposition, no scope form.
- **Eligibility:** U1 — `accusationMade ∧ jurisdictionChallengeMade ∧ inquiryOpened ∧ ¬reviewPending`.
  **Consumed once.**
- **Package:** the inquiry reads the record in the order it was filed, so the moved record is **not reached
  this session**. Strong for her — the thing Julian did to reorder it does not land — and costs nothing now.
- **Affected:** the inquiry's reading order (`world_fact`: the reordered record is not reached this session).
- **Unchanged (exact):** Lirael, Seren, Julian, the presiding Dohkar, the inquiry Chayr, the_assembly — every
  party's knowledge and stance.
- **Durable:** `world_fact`, `persists` for this session of the inquiry only.
- **Open:** whether the record is reached at the next session; whether anyone notices the order held.
- **Intrinsic cost:** none.
- **Stance:** `stance.chayr.procedural` on the inquiry Chayr.
- **Mechanism:** none required — no non-participant's interior state is asserted.

### `unm.restriction_unnamed` — rank 8

- **Serves:** *"I wish they'd leave me alone"*, *"let me out of this"*. Unanchored.
- **Eligibility:** U1 with the restrictions live — `accusationMade ∧ jurisdictionChallengeMade ∧
  custodyRevealed`. **Consumed once.**
- **Package:** the Dohkar names the investigation but **does not name the restrictions** aloud this scene, so
  she is not publicly bound in front of witnesses. Real relief, narrower than rank 9 because the restrictions
  still exist — they are simply unspoken here.
- **Affected:** the public record (`world_fact`: the restrictions are not stated in this scene).
- **Unchanged:** every party's knowledge; **the restrictions themselves remain in force** — stated explicitly
  so no later scene reads this as their removal.
- **Durable:** `world_fact`, `bounded` to this scene.
- **Open:** when the restrictions are named, and before whom.
- **Intrinsic cost:** none.
- **Stance:** `stance.dohkar.formal_hardening`.

### `unm.hearer_unnamed` — rank 6

- **Serves:** unanchored wording where nothing procedural is yet live — *"I wish none of this were happening"*.
- **Eligibility:** **U1 and U2 both** — `accusationMade ∧ custodyRevealed ∧ ¬reviewPending`, with or without
  the challenge or the interrogation. **This is the entry that closes U2.** Consumed once.
- **Package:** the notice is served but **who will hear it is still not said** — grounded directly in the seed's
  own fact, *"does not say who will hear it"*. Small: it defers identification, changes nothing material.
- **Affected:** the proceeding (`world_fact`: the hearer remains unnamed in this scene).
- **Unchanged:** every party; the investigation itself; the restrictions.
- **Durable:** `world_fact`, `bounded`.
- **Open:** who will hear it; whether Julian is among them.
- **Intrinsic cost:** none.
- **Stance:** `stance.dohkar.formal_hardening`.

### `unm.absent_accuser_noted` — rank 5

- **Serves:** unanchored wording after she learns Julian demanded the review — *"I wish he'd just say it to my
  face"*. **Note:** this phrasing *anchors Julian*, so it would usually take an exact reading; it falls here
  only when no exact reading matches.
- **Eligibility:** `accusationMade ∧ interrogationOccurred ∧ jurisdictionChallengeMade`. **Consumed once.**
- **Package:** that the demand was made **without his coming to say it** is entered as a noted fact of the
  proceeding — grounded in *"he did not come to say it to her himself"*. Favorable, because it is a procedural
  irregularity on the record. Costs: it **hardens him**, and the record now contains something he will have to
  answer.
- **Affected:** the proceeding's record (`world_fact`: the manner of the demand is noted).
- **Unchanged:** **Julian's knowledge, intention, feeling and future action — all untouched**, which is the
  whole point of ranking this below a cost-free outcome.
- **Durable:** `world_fact`, `persists`.
- **Open:** whether he answers for it; whether the Chayr treats it as material.
- **Intrinsic cost:** `antagonist_hardened` — `stance.julian.institutional_correction` becomes the live stance.
- **Stance:** `stance.julian.institutional_correction`.
- **Mechanism:** none. The note is a fact of the record, not a claim about what Julian thinks.

> **Flag C — the rank order 9 > 8 > 6 > 5 is my editorial judgement**, and the whole-package rule makes two
> of these arguable. `unm.absent_accuser_noted` has arguably the **strongest headline** (an irregularity
> naming her accuser) but is ranked lowest because `antagonist_hardened` is a real cost in Issue 1. If you
> read a hardened Julian as *desirable* drama rather than a cost to the player, it moves up — and that is a
> story judgement, not a mechanical one.

---

# 3. Four new proposition ids (proposed)

Each is deliberately **narrow**: the definition states exactly what is lost, so no outcome can widen it by
synonymy. Each names the seed text it is drawn from.

| id | definition — exactly this and nothing adjacent | drawn from |
|---|---|---|
| `notice_served` | that Lirael's **conduct at the rite is under investigation** has been formally served on her. **Not** who will hear it, **not** what the restrictions are, **not** the outcome. | *"serves Lirael notice that her conduct at the rite is under investigation"* |
| `restrictions_named` | the **two named restrictions** — she may not supervise a rite, she may not leave the Veilwood. **Not** the investigation's existence, **not** its duration, **not** any further restriction. | *"names the restrictions she must keep while it runs — she may not supervise a rite, and she may not leave the Veilwood"* |
| `demand_authorship` | that **Julian** is the one who demanded the review of her conduct. **Not** why, **not** that he avoided saying so, **not** anything about the review's content. | *"Lirael learns that Julian demanded a review of her conduct"* |
| `record_reordered` | that **a record was moved out of the order the inquiry would have read it in**. **Not** which record, **not** who moved it, **not** why. | *"Julian moves a record out of the order the inquiry would have read it in"* |

**Two anti-synonymy rules for these four:**

1. **`notice_served` ≠ `restrictions_named`.** A wish that anchors "the investigation" reaches the first only.
   The restrictions are a separate fact with a separate id, even though the same speech delivers both.
2. **`demand_authorship` ≠ the manner of the demand.** That he did not come himself is *not* part of this
   proposition; it is the subject of `unm.absent_accuser_noted`'s `world_fact`, deliberately kept out of the id
   so a memory wish targeting authorship cannot also erase the discourtesy.

> **Flag D — id boundaries need approval**, particularly rule 2. Splitting authorship from manner is the
> narrower and safer reading; merging them would let one wish do more, which may be better play.

---

# 4. Eight party-specific stance profiles (proposed)

Authored because deriving a stance from cast identity is forbidden — a Dohkar hardening and Julian
withdrawing are **two different story facts about two different people**. Referenced by id from outcomes and
readings; the planner selects among referenced profiles only.

| id | party | stance value | what it declares |
|---|---|---|---|
| `stance.dohkar.formal_hardening` | `role:first_sacrifice_presiding_dohkar` | `resistant` | he retreats into the rite's order; procedure tightens around her |
| `stance.dohkar.authority_asserted` | same | `escalating` | he states the ruling is his to make |
| `stance.julian.watchful_withdrawal` | `named:julian` | `withdrawn` | he stops speaking and keeps watching |
| `stance.julian.institutional_correction` | same | `resistant` | he answers as the Provast, not as himself |
| `stance.seren.appeal` | `named:seren` | `receptive` | she pleads, still carrying her own loss |
| `stance.seren.shame_silence` | same | `withdrawn` | she will not look up |
| `stance.assembly.murmur` | `the_assembly` | `guarded` | collective unease with no single speaker |
| `stance.chayr.procedural` | `role:first_sacrifice_inquiry_chayr` | `indifferent` | the Chayr treats her as a matter before it, not a person |

**Changed from the feasibility draft:** `stance.assembly.turning` (escalating) is **dropped** and
`stance.chayr.procedural` added, because the Chayr is staged from row 14 and had no profile at all — a real
gap — while a second assembly stance was speculative.

> **Flag E — `stance.chayr.procedural` is `indifferent`**, which the ordinary grammar forbids under the
> `drastic` class. That is deliberate: a Chayr who is *unmoved* is the point of the character. If you want the
> Chayr to be reachable in drastic turns, it needs a second, non-indifferent profile.
>
> **Flag F — dropping `stance.assembly.turning`** leaves the assembly with only `guarded`. If a scene needs a
> crowd that turns on her, that profile has to come back.

---

# 5. Revised authoring volume, and what needs approval

| unit | count | status |
|---|---|---|
| propositions (id-keyed) | 6 existing **+ 4 proposed** = **10** | §3 |
| matrix predicates | **7** | §1a |
| declared invalid-cell rules | **4** | §1b |
| valid cells | **60** (was estimated 20–35) | §1b |
| Tempt exact readings | 6 | prior packet |
| Tempt ambiguous, ranked | 5 | prior packet |
| twists / refusals (exact only) | 2 | prior packet |
| unmoored outcomes — opening | 6 | prior packet |
| **unmoored outcomes — late Issue 1** | **4 proposed** | §2 |
| eligibility rules | 10 (one per unmoored outcome) | §2 + prior |
| **party-stance profiles** | **8 proposed** | §4 |
| causal mechanisms | 1 (`witness_present`) | prior packet |
| ordinary `boundary` readings + fallback | 6 | prior packet |
| scope lexicon anchors | ~12 | prior packet |
| **total authored entries** | **~71** | ~9 reusable engine-wide |

**~71, up from ~60.** The rise is honest: the late set is four outcomes rather than the two I guessed, the
Chayr needed a profile nobody had counted, and the valid-cell count nearly doubled once enumerated instead of
estimated.

## Decisions needed from you

| flag | decision |
|---|---|
| **A** | Are invalid-cell rules I1–I4 correct readings of the plan's ordering? If any pair can co-occur, the matrix grows. |
| **B** | Is U2 (accused but never questioned) reachable? I covered it rather than assume it away; declaring it invalid instead removes one outcome's justification. |
| **C** | Is `unm.absent_accuser_noted` correctly ranked **lowest**? It has the strongest headline and a real cost. A hardened Julian may be desirable drama rather than a player cost — your call, not a mechanical one. |
| **D** | Are the id boundaries right, especially splitting `demand_authorship` from the *manner* of the demand? Merging them lets one wish do more. |
| **E** | Should the Chayr have a second, non-`indifferent` profile so drastic turns can reach it? |
| **F** | Should `stance.assembly.turning` come back for scenes where the crowd turns? |

## Not claimed

- **The coverage gate is not claimed to pass.** §1e shows no uncovered region is unaddressed by this draft;
  mechanical enumeration of all 60 valid cells against the ten entries has not been run.
- Nothing here is implemented, wired, or reachable by a player.
- Stage 3 remains unbuilt, and whether to build it is still the decision this volume informs.
