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

# 1. The Issue 1 **opening** coverage matrix, completed

> ## Scope — DECLARED (Roman, 2026-09-28), closing Flag A
> **This matrix governs the Issue 1 OPENING phase only.** The alternative — one permissive table across all
> of Issue 1 — was rejected on the reasoning that it blurs distinct story phases together, and specifically
> **not** retained for producing a larger coverage number. **Late Issue 1 needs its own declared phase matrix
> and its own outcome set**, to be built separately; nothing in this packet models it.

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

## 1a-bis. Two of the seven are opening-phase **invariants**, not variables

The seed pins two predicates for every opening state (excerpts in §6.5):

| predicate | pinned to | seed basis |
|---|---|---|
| `inquiryOpened` | **false** | *"Early scenes may carry accusation, preliminary review… **never the convened inquiry itself**"*; *"The inquiry is NOT yet opened (that is a later scene)."* |
| `interrogationOccurred` | **true** | `interrogation_interrupted` is an `aftermathTruth` — *"has **ALREADY** questioned Lirael… Not re-staged."* |

So the opening domain is **not** 2⁷ = 128. It is **2⁵ = 32 reachable states** over the five free predicates
(`accusationMade`, `reviewPending`, `custodyRevealed`, `assemblyStaged`, `jurisdictionChallengeMade`); the
other 96 of the 128 violate an invariant and cannot occur in this phase. Both invariants stay *declared
predicates* rather than being deleted, because the late-Issue-1 matrix will need them as live variables.

2⁷ = 128 raw cells over the full predicate set; **32 reachable** once the invariants apply.

## 1b. Declared invalid cells

Invalidity is **declared**, never inferred, so the gate cannot pass by shrinking its own domain. Four
ordering rules from the plan's own sequence:

| rule | invalid when | seed support | verdict |
|---|---|---|---|
| **I1** | `inquiryOpened ∧ ¬accusationMade` | none for *this* ordering | **WITHDRAWN** — §6.1 |
| **I2** | `jurisdictionChallengeMade ∧ ¬interrogationOccurred` | the seed says the opposite | **WITHDRAWN** — §6.2 |
| **I3** | `jurisdictionChallengeMade ∧ ¬accusationMade` | ~~label + reversal frame~~ — the charge is **Julian's interrogation**, an opening invariant | ⛔ **WITHDRAWN 2026-09-28** — `_i3_withdrawal.md` |
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

> **Flag A — RESOLVED (Roman, 2026-09-28): opening-scoped.** The §6.5 pin therefore **applies**, and the
> reading that produced 72 cells is discarded despite being the larger number.

**One consequence to state plainly: I4 becomes vacuous in this phase.** With `inquiryOpened` invariantly
false, `reviewPending ∧ inquiryOpened` can never hold, so I4 excludes **0** of the 32 reachable states. It
is not withdrawn — its evidence (§6.4) is the strongest in the packet — but it does no work here and must be
carried forward to the late-Issue-1 matrix, where both terms vary and it becomes load-bearing.

> ### ⛔ SUPERSEDED 2026-09-28 — I3 withdrawn
> I3 was upheld on the reading that a jurisdiction challenge presupposes **the family's** charge. It does
> not: the seed calls Julian's interrogation *"an accusation through desirability"* (131286) and the family
> lane speaks of redirecting the confrontation *"from **Julian's** accusation"* (131490). That charge is an
> opening invariant, so **I3 excluded no valid state** — it would have made the matrix "covered" by excluding
> a real scene.
>
> **There are now ZERO live exclusions. Valid opening cells: 32.** The domain is defined entirely by its two
> invariants. **All prior coverage figures are stale.** Original claim below, superseded.

~~**`I3` is the only live exclusion in the opening matrix**, removing 8 of 32. **Valid opening cells: 24.**~~

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

## 1e. Coverage check — opening-scoped, mechanical, reported separately from approval

Run: `node _fs_coverage_check.mjs` (pure enumeration; no page, no provider, no model).
**Coverage is not approval.** Every entry counted is proposed editorial canon awaiting your decision; a cell
counts as covered when some drafted outcome is eligible in it, approved or not.

```
scope       : Issue 1 OPENING only (Flag A resolved 2026-09-28)
invariants  : inquiryOpened=false, interrogationOccurred=true  (seed-pinned, §6.5)
free preds  : 5 → 32 reachable opening states
  I3 LIVE    removes 8
  I4 VACUOUS removes 0   (retained for the late matrix)

VALID CELLS : 24
COVERED     : 24 / 24
UNCOVERED   : 0
```

| rank | outcome | cells | sole cover for | |
|---|---|---|---|---|
| 10 | `unm.band_unremarked` | 8 | — | |
| 9 | `unm.witness_dispersal` | 12 | — | |
| 8 | `unm.procedural_delay` | 12 | — | |
| 5 | `unm.restriction_unnamed` | 4 | **1** | *phase extension* |
| 7 | `unm.julian_standing_questioned` | 16 | **1** | |
| 6 | `unm.custody_unraised` | 12 | **1** | |

**Excluded:** `unm.adverse_event_deferred` (rank 4) — its eligibility ("some adverse row scheduled and
unheld") is not expressible in these predicates, which model one adverse row. It can only *add* coverage, so
24/24 is a floor.

### Reading the result honestly

- **The opening matrix now closes: 24 of 24.** The gap `A··IC·J` found in the previous run is covered, and
  `unm.restriction_unnamed` is its **sole** cover — the phase extension was load-bearing, not cosmetic.
- **Three entries each hold exactly one cell alone.** The set has no redundancy at its edges: removing any of
  `unm.restriction_unnamed`, `unm.julian_standing_questioned` or `unm.custody_unraised` reopens a hole.
- **Two reach-numbers shrank for a structural reason, not an authoring one.** `unm.witness_dispersal`
  (`assemblyStaged ∧ ¬inquiryOpened`) and `unm.julian_standing_questioned`
  (`interrogationOccurred ∧ ¬jurisdictionChallengeMade`) each carry a conjunct that the invariants make
  constantly true. Within this phase they reduce to `assemblyStaged` and `¬jurisdictionChallengeMade`. Their
  eligibility text is **left as written**, because those conjuncts become live again in the late matrix.
- **The domain shrank by 75%, from 128 nominal to 32 reachable.** That is the cost of the scope decision and
  it was accepted knowingly: a smaller, phase-true domain over a larger permissive one.

### What this does *not* claim

The coverage gate is **not** claimed to pass. Full coverage by unapproved drafts is coverage, not a gate.
What is now established is narrower and worth stating exactly: *given* the declared opening scope, the
declared invariants, and I3 as the single live exclusion, the six drafted opening entries leave no reachable
opening state without an eligible outcome. Approval of those entries remains outstanding.

**Still owed, and explicitly out of scope here:** the late-Issue-1 phase matrix and its outcome set,
including the four §2 entries, which this packet drafts but does not place in a domain.

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

### `unm.restriction_unnamed` — rank 5

> **Re-ranked from 8 (2026-09-28).** It was drafted tied with `unm.procedural_delay`; the tie was rejected,
> because two eligible outcomes at one rank means favor stops deciding and a seeded tie-break decides instead.
> Compared as complete packages the two differ on two declared fields — durability (`bounded` vs `persists`)
> and how much adverse material reaches the world — with no compensating advantage, so they take distinct
> ranks. Full comparison in `_first_sacrifice_opening_approval_sheet.md` §2a. **Eligibility, facts, affected
> and unchanged sets, cost and wording anchors are all unchanged by the re-rank.**

- **Serves:** *"I wish they'd leave me alone"*, *"let me out of this"*. Unanchored.
- **Eligibility:** U1 with the restrictions live — `accusationMade ∧ jurisdictionChallengeMade ∧
  custodyRevealed`. **Consumed once.**
- **Package:** the Dohkar names the investigation but **does not name the restrictions** aloud this scene, so
  she is not publicly bound in front of witnesses. Real relief, narrower than rank 9 because the restrictions
  still exist — they are simply unspoken here.
- **Affected:** the public record (`world_fact`: the restrictions are not stated in this scene).
- **Unchanged:** every party's knowledge; **the restrictions themselves remain in force** — stated explicitly
  so no later scene reads this as their removal. This outcome does **not** imply the restrictions were
  **lifted, named, accepted, or understood by any non-participant**. Nobody outside the exchange learns
  anything; no party consents to anything; silence about a restriction is not agreement to it, and a
  restriction that goes unspoken is neither softened nor negotiated.
- **Durable:** `world_fact`, `bounded` to this scene.
- **Open:** when the restrictions are named, and before whom.
- **Intrinsic cost:** none.
- **Stance:** `stance.dohkar.formal_hardening`.
- **Phase:** **opening and late Issue 1** — extended to the opening 2026-09-28, see below.

> #### Phase extension to the opening — what changed, and what did not
> **Changed: nothing but the phase in which this entry may be selected.** Its eligibility *predicate* is
> untouched — `accusationMade ∧ jurisdictionChallengeMade ∧ custodyRevealed` already holds in the gap cell
> `A··IC·J`, so no term was added, widened, or relaxed to reach it. Its declared facts, affected parties,
> durability, intrinsic cost (none), rank (**8**) and wording anchors are all unchanged.
>
> **Why "the restriction remains unspoken" is compatible with the opening's hard limits.** The limits in
> `dohkar_preliminary_review` (§6.4) are prohibitions on *naming*: do not name who convenes the review, its
> date, its terms, The Open, a Chayr, or "two Dohkars". This outcome's entire content is that the restriction
> is **not named aloud in this scene**. It does not merely avoid tripping the limits — it is the same
> restraint the limits impose, turned into the player's relief. The opening may carry procedural pressure
> without constituting a proceeding; an unspoken restriction is pressure that has not yet been constituted.
>
> **What it must never become.** Because the relief is silence rather than removal, the authored prose may
> not let that silence read as resolution. The restriction is in force, unaltered, and the scene ends with it
> still owed.

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

This is the one rule with explicit, repeated, unambiguous seed backing — and I never proposed it.

**Now applied.** Flag A was resolved opening-scoped on 2026-09-28, which is the condition under which this
rule is correct. Both pins are declared in §1a-bis as opening-phase **invariants** rather than folded into
the invalid-cell rules, so that the late-Issue-1 matrix can restore them as free variables without having to
unpick an exclusion. Applying them cut the reachable domain from 128 nominal states to 32.

---

# 5. Revised authoring volume, and what needs approval

| unit | count | status |
|---|---|---|
| propositions (id-keyed) | 6 existing **+ 4 proposed** = **10** | §3 |
| matrix predicates | **7** | §1a |
| declared invalid-cell rules | **2 upheld** (I1, I2 withdrawn); **1 live** in this phase | §1b, §6 |
| opening-phase invariants | **2** (`inquiryOpened`, `interrogationOccurred`) | §1a-bis |
| valid cells — **Issue 1 opening** | **24** of 32 reachable (60 was wrong) | §1b, §1e |
| Tempt exact readings | 6 | prior packet |
| Tempt ambiguous, ranked | 5 | prior packet |
| twists / refusals (exact only) | 2 | prior packet |
| unmoored outcomes — opening | 6 | prior packet |
| **unmoored outcomes — late Issue 1** | **4 proposed**, 1 also opening-eligible | §2 |
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
| **A** | **Opening-scoped.** The §6.5 invariants apply; the 72-cell Issue-1 reading is discarded, explicitly not retained for its larger coverage number. I4 is vacuous in this phase and carried forward. `unm.restriction_unnamed` extended to the opening by **phase only** — predicate, facts, cost, rank and anchors unchanged. | resolved 2026-09-28 |
| **B** | U2 valid and covered. `unm.hearer_unnamed` is mechanically confirmed as its sole cover (§1e). | resolved 2026-09-28 |
| **C** | `antagonist_hardened` is a player cost; the package ranks low. Good drama ≠ favorable to Lirael. | resolved 2026-09-28 |
| **D** | Authorship stays separate from manner. | resolved 2026-09-28 |
| **E** | Yes — the Chayr acts on parties (row 14 reads Julian's answer back to him), so `stance.chayr.record_read_back` is added, **late-Issue-1 only**. | resolved 2026-09-28 |
| **F** | `stance.assembly.turning` stays out. The only seed text pairing the assembly with "turned" is the wish's literal fulfilment, not a change of allegiance. | resolved 2026-09-28 |

## Not claimed

- **The coverage gate is not claimed to pass.** The mechanical check has been run opening-scoped (§1e) and
  closes at **24/24**, but that is **coverage by unapproved drafts**, which is not a gate. Approval of the
  entries is what would turn it into one. All six flags are now resolved; none of the content is.
- **The late-Issue-1 phase matrix does not exist.** Its predicates, invariants, invalid-cell rules and
  outcome domain are unwritten. The four §2 entries are drafted but sit in no declared domain, and I4 is
  parked waiting for it. This is the next editorial unit, not a loose end in this one.
- Nothing here is implemented, wired, or reachable by a player.
- Stage 3 remains unbuilt, and whether to build it is still the decision this volume informs.
