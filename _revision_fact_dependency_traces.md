# Fact-dependency traces — the four revision-creating outcomes

> **Read-only trace.** No outcome re-scoped, re-ranked or rewritten. No coverage rerun. No code, no calls,
> no push. **No outcome below is approvable as drafted** — every one has at least one blocker.

---

# 0. Approved and amended (Roman, 2026-09-28)

### Populations — APPROVED

| id | content | members |
|---|---|---|
| `population.assembly` | the collective crowd of First Favored family and guests | **excludes** `pc:lirael`, `named:seren`, `named:julian`, `role:first_sacrifice_presiding_dohkar` |
| `population.scene_present` | that collective **plus** those four named present people | all five refs |

**No headcount is canon.** The seed supplies no exact count (`131083` says *"roughly two dozen"*, a prose
approximation), so the "~two dozen" line in the audit's proposal is **dropped** rather than stored.

**At seal, each population expands through its declared rule** into the exact scene roster / collective
reference that outcome uses. The rule is stored; the expansion is performed. **This is scope, not privilege**
— there is still no invoker filter anywhere, and any population containing Lirael reaches her.

### The revision model — AMENDED

A revision must declare **both** closed sets:

| | |
|---|---|
| `ceases[]` | prior fact refs that no longer govern active canon |
| `establishes[]` | **replacement facts that now do govern it** |

> **No author or planner may infer the replacement state from an absence.** Ceasing
> `interrogation_interrupted` does **not** establish *"the ceremony replayed without interrogation."* That
> must be an explicit declared fact, along with every causal companion required for active canon to stay
> coherent.

---

# 1. Two findings that block all four traces

## 1a. Three of the four target facts are **compound**, and ceasing one atomically widens by implication

The declared `aftermathTruths` are not atomic propositions. They are paragraphs asserting several things at
once. Ceasing such an id ceases **every clause in it** — including clauses the outcome never meant to touch.

That is precisely what **D2 forbids**: *a rupture may not widen target, proposition or effect by implication.*

| fact | clauses it actually asserts |
|---|---|
| `the_answer_institutional` | ① the Answer belongs to the Institution · ② Julian is its caretaker · ③ **Lirael holds it only for the questioning** |
| `inquiry_authority_claimed` | ① the Dohkar asserted the rite and ruling are his · ② he named a formal inquiry (a Chayr and two Dohkars) as the venue · ③ **Julian agreed and publicly claimed authority to convene and preside** |
| `interrogation_interrupted` | ① Julian questioned Lirael before the assembly · ② the Dohkar interrupted it as grossly inappropriate · ③ **only then did her choice (run in shame or remain) arise** |

**Required before any revision outcome is authorable: a decomposition pass** giving each clause its own fact
ref, so a revision can cease clause ③ without ceasing ① and ②. **Owed work, not done here** — it is seed
authoring, and it is your call whether to decompose the seed's ids or to declare clause-level refs alongside
them.

## 1b. A lane id is not a fact ref

`unm.proceeding_unmade` declares `ceases: ['dohkar_preliminary_review']`. That id is a **lane** — an
objective template with a `label`, `signalRx`, `objectiveActor` and `pressureSource`. It is not a committed
fact and cannot be ceased.

**There is no declared fact id for "a review of the Sacrificiant's conduct has been demanded."** The matrix
predicate `reviewPending` reads a state the seed never gave an id. **One must be declared before this outcome
can cease anything.**

---

# 2. `unm.time_gives_way` — ask-class `undo`

| | |
|---|---|
| **ceases** | `interrogation_interrupted` — **but see §1a**: this also ceases the Dohkar's interruption and the origin of her run/remain choice |
| **establishes** *(all new, all require approval)* | `interrogation_never_occurred` — *Julian did not question Lirael before the assembly; no such questioning took place in active canon.*<br>`rite_concluded_unquestioned` — *the rite reached its conclusion with no questioning of the Sacrificiant's guide.* |
| **causal companions — REQUIRED** | **①** the Dohkar's interruption ceases with the questioning — coherent, and must be **stated**, not left to follow.<br>**②** Lirael's run/remain choice — **BLOCKER, see below.** |
| **deliberately unchanged, stated not assumed** | `twist_manifested` — the wish still twisted; it does not depend on the interrogation.<br>`inquiry_authority_claimed` — the Dohkar's assertion and Julian's claim answer *the twist*, not the questioning, so they stand. |
| **must remain OPEN** | whether any First Favored's alignment sense registers the bend · what Julian does in a world where he never asked · whether the reader-only knowledge is ever confirmed in-story |

### BLOCKER — an undeclared companion

`interrogation_interrupted` ends: *"**Only then did her choice** (run in shame or remain) **arise.**"*

Cease the questioning and that choice has no cause. But **the choice has no declared fact id anywhere** — it
is narrated inside the same paragraph and nowhere else. Under the amended model the revision cannot name what
it must name.

**Two ways out, both editorial:** declare a fact for the choice (and for whichever branch was taken), or
establish a replacement that supersedes it outright — *"no choice to run or remain arose"* — which is a
materially different scene and **must be chosen deliberately, not defaulted into.**

---

# 3. `unm.proceeding_unmade` — ask-class `stop` · rank 10

| | |
|---|---|
| **ceases** | **INVALID AS DRAFTED** — names the lane `dohkar_preliminary_review` (§1b). Requires a declared fact for "a review has been demanded". |
| **establishes** *(provisional)* | `no_review_demanded` — *no review of the Sacrificiant's conduct has been called for before the assembly.* |
| **causal companions** | `inquiry_authority_claimed` clause ① survives — the Dohkar's assertion that the ruling is his is **not** the same act as demanding a review, and must be stated as surviving. |
| **must remain OPEN** | whether the matter reaches procedure by another route · what the Dohkar makes of a demand he no longer made |

### ~~BLOCKER — this may orphan the Issue's own arc gate~~ — **WITHDRAWN 2026-09-28**

> **This finding was overstated and is withdrawn.** `deferral_reason_key` is not part of the gate:
> `_checkArcConstraint` (app.js:206425–206430) turns solely on
> `_isStoryEventCommitted('inquiry_opened')`, and returns `reason_key` only on the failure path as
> explanatory copy. **No Issue-1 gate depends on the scene-2 review demand.** The route to the late spine
> runs through Julian's offstage demand and row 4, and survives this outcome intact. Full trace:
> `_proceeding_unmade_trace.md`. The original wording is kept below for the record.

The `the_open` arcConstraint is `locked`, unlocked by `inquiry_opened`, with
`deferral_reason_key: 'preliminary_process_before_formal_inquiry'`. The declared reason the inquiry is
deferred is that **preliminary process comes first.**

Unmake the preliminary process at rank 10 — the highest-favor, **zero-cost** outcome in the set, selected
whenever a player says *"make it stop"* with a review pending — and the path to row 14's convening loses the
step the constraint names.

**This is the trace earning its keep.** The outcome reads as clean and costless in the approval sheet, and it
may quietly remove the Issue's route to its own late spine. **Either** an explicit `establishes[]` fact must
supply an alternative route to formal process, **or** the arc constraint's deferral reason must be
re-examined, **or** this outcome is not authorable at rank 10 with no cost. **Your call; I am not making it
inside a trace.**

---

# 4. `unm.custody_severed` — ask-class `silence`

| | |
|---|---|
| **ceases** | `the_answer_institutional` — **compound (§1a)**; the intended target is clause ① only |
| **establishes** *(new)* | `answer_custody_vacant` — *no institution and no person holds a claim on the Answer.* |
| **causal companions — REQUIRED** | **clause ②** Julian as caretaker: a caretaker of an unowned object is undefined — either ceased explicitly or re-established.<br>**clause ③** *"Lirael holds it only for the questioning"* — **the dangerous one.** |
| **must remain OPEN** | who reaches for it first · whether the Institution disputes the vacancy |

### BLOCKER — the silent grant hiding in clause ③

Ceasing the compound fact removes the clause that **bounds Lirael's possession**. Nothing then states that her
holding is limited — and an author reading active canon would find her holding the Answer with no bound on it.

**That is a substantially larger grant than the outcome claims to make, arrived at by absence.** It is exactly
what the amended model forbids, and the drafted outcome would have shipped it invisibly.

**Required:** the closed set must state explicitly either *"Lirael's holding remains bounded to the
questioning"* or *"Lirael holds the Answer unbounded"* — and if the second, the rank must be re-derived,
because acquiring the Institution's relic outright is not a rank-6 package.

---

# 5. `unm.standing_dissolved` — ask-class `authority`

| | |
|---|---|
| **ceases** | `inquiry_authority_claimed` — **compound (§1a)**; the intended target is clause ③ only (Julian's claim) |
| **establishes** *(new)* | `provast_standing_void` — *Julian holds no standing to convene or preside over any ruling on Lirael's conduct.* |
| **causal companions — REQUIRED** | **clause ①** the Dohkar's assertion that the rite and ruling are his — the outcome intends this to **survive**; ceasing the compound id destroys it.<br>**clause ②** the named venue (a Chayr and two Dohkars) — likewise. |
| **must remain OPEN** | who claims the vacancy · whether Julian contests as himself rather than as the office · whether the Dohkar's authority widens to fill it |

### BLOCKER — the drafted cease is three times wider than the drafted effect

The entry's own text says his standing is void and *"the presiding Dohkar's own assertion over the rite"* is
unchanged. **The declared `ceases[]` contradicts that**, because the id carries all three clauses. As drafted
the outcome would also erase the Dohkar's claim and the named inquiry venue — and erasing the venue reaches
into row 14, which needs a constituted panel.

**A textbook D2 violation, in my own draft**: widening the proposition by implication. Only decomposition
fixes it.

---

# 6. Summary, and one defect found outside the four

| outcome | ceases valid? | establishes drafted? | blocker |
|---|---|---|---|
| `unm.time_gives_way` | compound | now drafted | undeclared run/remain companion |
| `unm.proceeding_unmade` | **no — lane id** | now drafted | may orphan the arc's route to `inquiry_opened` |
| `unm.custody_severed` | compound | now drafted | clause ③ silently unbounds Lirael's holding |
| `unm.standing_dissolved` | compound | now drafted | cease is 3× wider than the intended effect |

**None of the four is approvable as drafted.** Two prerequisites are shared: **decompose the compound
aftermath truths**, and **declare a fact id for the review demand.**

### Found while establishing the fact namespace, outside this pass's scope

**`mem.exact.seren_forgets_price` names a proposition that does not exist.** There is no `price_identified`
anywhere in the source. The scene's own `requiredTruth` says *"**The price has not yet been named**"* — so in
the opening there is no such fact to forget.

It is one of the six exact readings, it has been carried through every packet since the feasibility audit, and
**it is unauthorable in the opening as written.** Recorded here because the fact-ref integrity check that
found it is the same one these traces run; not fixed in this pass.

---

# 7. Owed, in order

1. **Decompose** the three compound aftermath truths into clause-level fact refs *(seed authoring — yours)*.
2. **Declare** a fact id for the review demand.
3. **Resolve** the four blockers above, each of which is an editorial choice, not a mechanical fix.
4. **Resolve** `mem.exact.seren_forgets_price`.
5. Only then: re-scope the ✦ rosters through the approved populations, re-rank, and re-run coverage.
