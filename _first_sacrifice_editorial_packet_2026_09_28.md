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

| rule | invalid when | seed support | verdict |
|---|---|---|---|
| **I1** | `inquiryOpened ∧ ¬accusationMade` | none for *this* ordering | **WITHDRAWN** — §6.1 |
| **I2** | `jurisdictionChallengeMade ∧ ¬interrogationOccurred` | the seed says the opposite | **WITHDRAWN** — §6.2 |
| **I3** | `jurisdictionChallengeMade ∧ ¬accusationMade` | `julian_jurisdiction_challenge` label + reversal frame | **UPHELD** — §6.3 |
| **I4** | `reviewPending ∧ inquiryOpened` | `dohkar_preliminary_review` HARD LIMITS + `deferral_reason_key` | **UPHELD** — §6.4 |

**I asked for evidence and two of my four rules did not survive it.** §6 gives the exact excerpt for each.
I1 was a plausible ordering I never found stated; I2 is contradicted by the seed, which fixes the
interrogation as *already complete* before the scene opens. Both are withdrawn rather than rewritten.

The evidence also produced a rule I had not proposed, **stronger than I1 and I4 together** — the seed pins
`inquiryOpened` false and `interrogationOccurred` true for every opening state (§6.5). Whether that pin
applies depends on the matrix's scope, which the packet has never actually declared:

| reading | rules in force | valid cells |
|---|---|---|
| **1 — one matrix across Issue 1** | I3, I4 | **72** of 128 |
| **2 — matrix scoped to the opening**, as §1's title says | I3, I4, and the §6.5 pin | **24** of 128 |

So the headline number is not 60 under either reading. 60 was arithmetic over two rules that do not hold.

> **Flag A (open, and now the only one) — which scope does this matrix govern?** Reading 2 follows §1's own
> title and the seed's explicit "early scenes … never the convened inquiry itself"; it also makes the four
> late outcomes of §2 out-of-scope here, which is consistent with their being late. Reading 1 keeps one
> matrix for all of Issue 1 and lets the late entries do real work in it. §1e reports coverage for both.

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

> **Flag B — RESOLVED (Roman, 2026-09-28): U2 is valid and stays covered.** Original wording kept below.
> **Flag B — U2 needs a ruling.** Either author it as reachable (covered below) or add an ordering rule I5
> making interrogation mandatory before accusation. I have covered it rather than assumed it away.

## 1e. Coverage check — mechanical, and reported separately from approval

Run: `node _fs_coverage_check.mjs` (pure enumeration; no page, no provider). **Coverage is not approval.**
Every entry counted below is a draft awaiting your decision; a cell counts as covered when some drafted
outcome is eligible in it, regardless of whether that draft is approved.

**Excluded from both runs:** `unm.adverse_event_deferred` (rank 4). Its eligibility — "some adverse row
scheduled and unheld" — is not expressible in these seven predicates, which model only one adverse row
(`reviewPending`). Including it could only *add* coverage, so both figures are floors.

### Reading 1 — one matrix across Issue 1 (I3 + I4) — **72 valid cells**

| | |
|---|---|
| covered | **72 / 72** |
| uncovered | **0** |

Per-outcome reach, and where an outcome is the *only* eligible one:

| rank | outcome | cells | sole cover for |
|---|---|---|---|
| 10 | `unm.band_unremarked` | 24 | 3 |
| 9 | `unm.witness_dispersal` | 24 | — |
| 9 | `unm.record_order_unread` | 8 | — |
| 8 | `unm.procedural_delay` | 24 | 1 |
| 8 | `unm.restriction_unnamed` | 12 | — |
| 7 | `unm.julian_standing_questioned` | 24 | — |
| 6 | `unm.custody_unraised` | 36 | 4 |
| 6 | `unm.hearer_unnamed` | 16 | 3 |
| 5 | `unm.absent_accuser_noted` | 12 | — |

No entry is dead, and four carry cells nothing else reaches — including `unm.hearer_unnamed`, which
confirms Flag B's resolution mechanically: U2 is not merely valid, it is **only** reachable through that
entry.

### Reading 2 — matrix scoped to the opening (I3 + I4 + the §6.5 pin) — **24 valid cells**

Only the six opening-set entries are in scope; the four §2 entries are late by construction.

| | |
|---|---|
| covered | **23 / 24** |
| uncovered | **1** |

The single gap, in predicate order `A I R I C A J`:

| cell | reading |
|---|---|
| `A··IC·J` | accusation made · interrogation occurred · custody revealed · jurisdiction challenged · no assembly staged · no review pending |

**This gap is real and closable without new authoring.** Both `unm.restriction_unnamed` (rank 8) and
`unm.hearer_unnamed` (rank 6) are eligible in it; both are currently filed as late-Issue-1. Of the two,
`unm.restriction_unnamed` is the one compatible with the opening's HARD LIMITS — its whole content is that
the restriction is *not* named, which is exactly what §6.4's excerpt forbids naming early. **Proposed, not
applied:** if you take Reading 2, reclassify `unm.restriction_unnamed` to the opening set and the opening
matrix closes at 24/24.

### What this does *not* claim

The gate does not pass, because passing is not mine to declare. Under either reading the drafted entries
cover the domain (Reading 2 after one reclassification), but every entry, rank, stance and proposition id in
this packet is still **proposed editorial canon** awaiting approval. Full coverage by unapproved drafts is
coverage, not a gate.

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
> **Flag C — RESOLVED (Roman, 2026-09-28): `antagonist_hardened` is a player COST, and this package ranks
> low.** Hardening Julian is good drama, and good drama is not the same as favorable to Lirael. The player
> spent Fortune and the world answered by making her principal antagonist harder to move; that is a price,
> and rank must price it. It is not reclassified as a benefit on the strength of being interesting.
>
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
2. **`demand_authorship` ≠ the manner of the demand.** *(Flag D — RESOLVED, Roman 2026-09-28: keep the
   split. Merging them would let one wish buy both the fact and its reading.)* That he did not come himself is *not* part of this
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
| **`stance.chayr.record_read_back`** | same | `escalating` | he reads a party's own earlier answer back to them and lets it stand |

> **Flag E — RESOLVED (Roman, 2026-09-28): yes, the Chayr can respond to drastic turns, so he gets a second
> profile.** The seed stages him acting, not merely presiding: row 14 carries the beat *"The Chayr reads
> Julian's own earlier answer back to him without comment"* with the Chayr as `actor` and Julian as
> `target`. A party who can do that to Julian can do it to Lirael, so `indifferent` alone was too thin.
> **Scope limit, from the same seed text:** both Chayr profiles are **late-Issue-1 only**. He is `REPORTED`
> (not present) in row 5, `IN_PERSON` from row 14, and `dohkar_preliminary_review` forbids early scenes
> from so much as *naming* "a Chayr". Neither profile may be selected in an opening-scene turn.

**Changed from the feasibility draft:** `stance.assembly.turning` (escalating) is **dropped** and
`stance.chayr.procedural` added, because the Chayr is staged from row 14 and had no profile at all — a real
gap — while a second assembly stance was speculative.

> **Flag E — `stance.chayr.procedural` is `indifferent`**, which the ordinary grammar forbids under the
> `drastic` class. That is deliberate: a Chayr who is *unmoved* is the point of the character. If you want the
> Chayr to be reachable in drastic turns, it needs a second, non-indifferent profile.
>
> **Flag F — RESOLVED (Roman, 2026-09-28): `stance.assembly.turning` stays out; the seed does not support
> it.** I checked the one place the seed puts "the assembly" and "turned" in the same sentence — the
> `twist_manifested` aftermath truth: *"the literal words were honoured (the whole assembly turned to look
> at Lirael)"*. That is a head-turn, the wish's literal fulfilment, not a change of allegiance. The only
> other authored reaction is `dohkar_preliminary_review`'s *"and the assembly registers it"* — registering
> is not turning. The assembly keeps `guarded` until seed text gives the crowd a side.
>
> **Flag F (original wording) — dropping `stance.assembly.turning`** leaves the assembly with only `guarded`. If a scene needs a
> crowd that turns on her, that profile has to come back.

---

---

# 6. Evidence appendix for the invalid-cell rules (I1–I4)

Every excerpt below is verbatim from `public/app.js`, with its line. Each rule gets: the excerpt, the
**state transition it forbids**, and a verdict. I did not silently accept or rewrite any of the four.

## 6.1 I1 — `inquiryOpened ∧ ¬accusationMade` — **WITHDRAWN, no supporting excerpt**

I claimed the inquiry answers the accusation and so cannot precede it. Searching the seed for that ordering,
what I actually found orders the inquiry against the **preliminary process**, never against the accusation:

> `the_open` arcConstraint, lines 131137–131138:
> `unlock_condition: { type: 'committed_event_id', event_id: 'inquiry_opened' }`
> `deferral_reason_key: 'preliminary_process_before_formal_inquiry'`

**Forbidden transition (as claimed):** `⟨am:F⟩ → ⟨am:F, io:T⟩` — opening an inquiry with no charge on record.

**Verdict: WITHDRAWN.** The reason key names *preliminary process* as the predecessor, not *accusation*. The
seed's own ordering chain is preliminary-process → formal-inquiry. I have no predicate for "a review was
demanded and has since been superseded" — `reviewPending` means scheduled-and-unheld — so the supported
rule **cannot be expressed in the current seven predicates at all**. Reinstating it needs an eighth
predicate (`reviewDemanded`), which is a separate editorial decision. I am not adding one silently.

## 6.2 I2 — `jurisdictionChallengeMade ∧ ¬interrogationOccurred` — **WITHDRAWN, seed says the opposite**

> `aftermathTruths`, lines 131281–131286. The list's own header: *"structured seed ids for what is ALREADY
> TRUE at the top of this scene. The planner must return 'kept' for each; an objective that reverses one is
> rejected."*
> `interrogation_interrupted`: *"Julian, the Provast, has **ALREADY** questioned Lirael before the assembly
> — intimately, as an accusation through desirability — and the presiding Dohkar interrupted it as grossly
> inappropriate. Only then did her choice (run in shame or remain) arise. **Not re-staged.**"*

And the challenge's own reversal frame explicitly **separates** itself from the questioning:

> Line 131489: *"…reframing the accusation as his own to answer rather than Lirael's — a real jurisdictional
> contest over authority, **not another question put to Lirael**."*

**Forbidden transition (as claimed):** `⟨int:F⟩ → ⟨int:F, jcm:T⟩` — Julian contesting jurisdiction before
questioning her.

**Verdict: WITHDRAWN, twice over.** First, the rule is *vacuous*: `interrogationOccurred` is a fixed
aftermath truth, so `¬interrogationOccurred` never obtains and the rule excludes nothing real. Second, the
rule's stated rationale — that the challenge is *over the questioning he began* — is contradicted: the seed
frames the challenge as about the **accusation and who may rule**, pointedly not about the questioning.

## 6.3 I3 — `jurisdictionChallengeMade ∧ ¬accusationMade` — **UPHELD**

> Line 131356, `julian_jurisdiction_challenge` label: *"Julian challenges jurisdiction, **reframes the
> accusation** politically, or contests who has authority to rule."*
> Line 131489, its reversal event frame: *"Julian challenges the presiding Dohkar's jurisdiction,
> **reframing the accusation as his own to answer rather than Lirael's** — a real jurisdictional contest
> over authority."*

**Forbidden transition:** `⟨am:F⟩ → ⟨am:F, jcm:T⟩` — a jurisdiction challenge entering the record while no
accusation is on it.

**Verdict: UPHELD.** Both authored descriptions define the lane by its object, and that object is *the
accusation*. "Reframes the accusation" and "as his own to answer rather than Lirael's" are unintelligible
with nothing charged. This is close to definitional, not an inferred ordering. Removes 32 cells.

## 6.4 I4 — `reviewPending ∧ inquiryOpened` — **UPHELD, strongest evidence in the packet**

> Line 131354, `dohkar_preliminary_review` label: *"**HARD LIMITS, because the seed reserves the formal
> inquiry for LATE Issue 1**: do NOT name who convenes it, do NOT give a date or a timeframe, do NOT name The
> Open, a Chayr, or \"two Dohkars\", and do NOT set terms. **A preliminary review may be DEMANDED here; it
> may not be CONVENED, SCHEDULED, or CONSTITUTED.**"*
> Line 131652, row 14: *"THE INQUIRY CONVENES… The panel is constituted HERE for the first time; **nothing
> earlier may have convened it**."*
> Plus `deferral_reason_key: 'preliminary_process_before_formal_inquiry'` (§6.1).

**Forbidden transition:** `⟨rp:T⟩ → ⟨rp:T, io:T⟩` and `⟨io:T⟩ → ⟨io:T, rp:T⟩` — in either direction, a
pending preliminary review coexisting on the record with a constituted inquiry.

**Verdict: UPHELD.** The seed states the supersession directly and twice, in capitals, and enforces it with a
landmark lock. Removes 32 cells.

## 6.5 The rule the evidence produced that I had not proposed

Two excerpts already quoted pin two predicates to constants **for the opening**:

> Line 130927, world truth "LIRAEL'S FORMAL INQUIRY — WHERE AND WHEN": *"It is NOT yet convened, and its
> convening is LATE-ISSUE-1 content, not an early scene's. **Early scenes may carry accusation, preliminary
> review, political pressure, investigation, concealment, or flight — never the convened inquiry itself**,
> and never a scene staged at The Open before that point."*
> Line 131288, `inquiry_authority_claimed`: *"**The inquiry is NOT yet opened (that is a later scene).**"*
> Line 131286, `interrogation_interrupted`: *"has **ALREADY** questioned Lirael… **Not re-staged.**"*

**Forbidden transitions:** any opening state with `inquiryOpened:T`; any opening state with
`interrogationOccurred:F`.

This is the one rule with explicit, repeated, unambiguous seed backing — and I never proposed it. It is
**not applied by default**, because applying it silently would answer Flag A by fiat: it is only correct if
the matrix is opening-scoped. That is the decision now in front of you, and §1e prices both answers.

---

# 5. Revised authoring volume, and what needs approval

| unit | count | status |
|---|---|---|
| propositions (id-keyed) | 6 existing **+ 4 proposed** = **10** | §3 |
| matrix predicates | **7** | §1a |
| declared invalid-cell rules | **2 upheld** (I1, I2 withdrawn) | §1b, §6 |
| valid cells | **72** (Reading 1) or **24** (Reading 2) — 60 was wrong | §1b, §1e |
| Tempt exact readings | 6 | prior packet |
| Tempt ambiguous, ranked | 5 | prior packet |
| twists / refusals (exact only) | 2 | prior packet |
| unmoored outcomes — opening | 6 | prior packet |
| **unmoored outcomes — late Issue 1** | **4 proposed** | §2 |
| eligibility rules | 10 (one per unmoored outcome) | §2 + prior |
| **party-stance profiles** | **9 proposed** (+1 Chayr, Flag E) | §4 |
| causal mechanisms | 1 (`witness_present`) | prior packet |
| ordinary `boundary` readings + fallback | 6 | prior packet |
| scope lexicon anchors | ~12 | prior packet |
| **total authored entries** | **~72** | ~9 reusable engine-wide |

**~72, up from ~60.** The rise is honest: the late set is four outcomes rather than the two I guessed, the
Chayr now needs two profiles nobody had counted, and the valid-cell count grew once enumerated instead of
estimated. Note the direction of the correction on cells: withdrawing I1 and I2 **enlarged** the domain to 72
under Reading 1. The estimate did not merely firm up; it was wrong in both the count and the rules under it.

## Decisions needed from you

| flag | decision | status |
|---|---|---|
| **A** | I1–I4 audited against seed text in §6: **I1 and I2 withdrawn, I3 and I4 upheld.** The evidence produced a stronger, unproposed rule (§6.5) whose applicability turns on one question I cannot answer from the seed: **does this matrix govern the opening only, or all of Issue 1?** | **OPEN — the one remaining item** |
| **B** | U2 valid and covered. `unm.hearer_unnamed` is mechanically confirmed as its sole cover (§1e). | resolved 2026-09-28 |
| **C** | `antagonist_hardened` is a player cost; the package ranks low. Good drama ≠ favorable to Lirael. | resolved 2026-09-28 |
| **D** | Authorship stays separate from manner. | resolved 2026-09-28 |
| **E** | Yes — the Chayr acts on parties (row 14 reads Julian's answer back to him), so `stance.chayr.record_read_back` is added, **late-Issue-1 only**. | resolved 2026-09-28 |
| **F** | `stance.assembly.turning` stays out. The only seed text pairing the assembly with "turned" is the wish's literal fulfilment, not a change of allegiance. | resolved 2026-09-28 |

## Not claimed

- **The coverage gate is not claimed to pass**, though the mechanical check has now been run (§1e) and the
  drafted entries do cover the domain: 72/72 under Reading 1, 23/24 under Reading 2 with a named single-entry
  fix. That is **coverage by unapproved drafts**, which is not a gate. Approval of the entries, and an answer
  to Flag A, are what would turn it into one.
- Nothing here is implemented, wired, or reachable by a player.
- Stage 3 remains unbuilt, and whether to build it is still the decision this volume informs.
