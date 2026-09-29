# Editorial approvals · and cited class/duration drafts for the remaining three

> **Approvals recorded in the proposed packet only. No implementation, no ranking, no coverage run.**

---

# Part 1 — Approvals (Roman, 2026-09-28)

## A1. Native compiler contract — **APPROVED**

The compiler/ledger contract is the authoring source of truth, including **`invokerScope:
`in_population` | `not_in_population` | `exempted_by_grant``.

**The extractor report contract remains separate and legacy-read-only for this design.** No report-only
required field becomes a compiler obligation. Reuse is justified primitive by primitive
(`_compiler_contract_boundary.md` §2).

## A2. The source-backed atom set — **APPROVED**

`population.assembly` · `population.scene_present` · the `twist.*`, `interr.*`, `answer.*`, `auth.*` atoms ·
`lirael.scene1_disposition` (sealed player-choice fact) · `review.demanded_by_dohkar` ·
`review.demanded_by_julian` · `review.convened` (locked) · `accusation.family_accused` ·
`accusation.family_demanded_remedy` · `challenge.jurisdiction_contested` ·
`challenge.answerability_shifted_to_julian`.

Bundles remain **unceaseable views**.

## A3. `unm.the_turning_forgotten` — **APPROVED** as the Fate-chosen `unseen` interpretation

| | |
|---|---|
| cost | **none** |
| roster | sealed `population.assembly` |
| effect | the crowd forgets **`twist.assembly_turned` only** |
| explicitly not | no residue suspicion · **no physical invisibility** · **no effect on named non-members** |
| `invokerScope` | `not_in_population` — Lirael is not in the crowd, and that is scope, not sparing |

## A4. `unm.the_accusation_unmade` — **APPROVED** as the Fate-chosen `escape` interpretation

**Only when `accusation.family_accused` is active.**

| | |
|---|---|
| cost | **none** |
| `ceases[]` | `accusation.family_accused` — **no conditional companion** |
| `establishes[]` | `accusation.family_never_accused`; `survivingContradictions` empty |
| `unchanged[]` | **`accusation.family_demanded_remedy`** · the family's grievance · **all named minds** · `review.demanded_by_julian` · both `challenge.*` atoms · `auth.julian_claims_convene_preside` |
| coverage | **no claim for pre-accusation `escape`** — it stays uncovered |

## A5. `unm.time_gives_way` — **no intrinsic cost**

**Approved to ship costless unless a later source-backed class mechanism supplies one. No substitute is to be
invented.**

> **The complete authored package is the history revision and the genuinely renewed, unconstrained player
> choice.** That is the price and the point: she loses the interrogation, she loses her own prior decision,
> and she chooses again without knowing what she chose before.

**Recorded as a standing prohibition:** `world_bent_in_public` is not to be reinstated by paraphrase, and no
replacement cost may be authored for this outcome without a cited class mechanism.

---

# Part 2 — Cited class/duration drafts for the remaining three

**Mechanism-first table beside each. No ranks.**

---

## B1. `unm.custody_severed` — proposed class **`materialization_possession`**

### Citation table

| causal step | citation | verdict |
|---|---|---|
| **class** | `191281` — `materialEffects: { what, whoHolds, duration }`, *"what now exists or **changed hands**"* | **fits** — `the_answer_institutional` is entirely possession language: the Answer **belongs to** the Institution, Julian is its **caretaker**, Lirael **holds** it |
| **target** | `answer.owned_by_institution`, `answer.julian_is_caretaker` | declared atoms |
| **scope** | one object, one claim | — |
| **duration** | `191281` **mandatory `duration` field**; `191194` `durability` *"`expires` ONLY if THIS scene signals the effect is bound to the passing rupture window"* | **`persists`** |
| **cost** | `custody_unclaimed` — entailment of no owner, not a separate capability | supported |
| **prevents** | `231567` — custody rules, ritual veiling, official chain of authentication | **none forbid severance** |

### Why not the alternatives
- **`history_rewrite`** — ownership is a **standing state**, not an event; the seed gives no acquisition event
  to unmake.
- **`identity_reputation`** — would make it a story about how **Julian** is recognised. The outcome is about
  **the object's claim**, and the caretaker's role ends as an entailment, not as the subject.

### What the class choice fixes
**`materialization_possession` carries a mandatory `duration` field** — so the missing duration is not an
oversight the draft has to remember, it is a field the class will not validate without.

| field | value |
|---|---|
| `materialEffects[0].what` | the Answer — the Institution's claim on it |
| `.whoHolds` | **no one.** No institution and no person holds a claim. |
| `.duration` | indefinite — **this outcome re-establishes no claim**; whether one is ever re-established is open |
| `durability.status` | **`persists`** — nothing binds it to the rupture window |

**Open:** whether an unowned True Answer still *functions* — `16620` says True Answers *"may serve as the
Witness or be used in an official rite"* and **says nothing about ownership being required.** Left open, not
assumed either way.

---

## B2. `unm.standing_dissolved` — proposed class **`identity_reputation`** · **and the class changes the delta**

### Citation table

| causal step | citation | verdict |
|---|---|---|
| **class** | `191277` — `recognitionChanges: { who, howRecognized, recordsChanged }` | **fits exactly** |
| **world support** | `16719` — standing is *"REVOCABLE TRUST … the present right to grant, supervise a rite, examine, … hold office"*; **"THE ORDER NEUTRALISES ENEMIES BY WITHDRAWING STANDING"** | **withdrawal of standing is this world's canonical operation** |
| **target** | Julian's standing to convene or preside over a ruling on Lirael's conduct | — |
| **duration** | `16719` — standing is *"Suspended or withdrawn by committee finding"*, so it is **restorable by the order's own process** | **`persists`**, with a note |
| **cost** | `escalation_invited` — `191277` `howRecognized` is *"how others now recognise, name or treat them"*; faction reaction at `231346` | supported |
| **prevents** | none found; row 14 (`131651`) compatible — the panel convenes and Julian is its **target** | clear |

### ⚠ The class choice changes the delta kind — raised, not silently applied

Two readings, and they are not the same outcome:

| | reading A — `history_rewrite` | reading B — `identity_reputation` |
|---|---|---|
| what happens | **he never made the claim** | **he made it, and can no longer make good on it** |
| delta | `ceases: [auth.julian_claims_convene_preside]` → **a revision** | `establishes: [auth.julian_standing_void]` only → **an additive canon change** |
| the room | nobody ever heard him claim it | **everyone remembers him claiming it, and it is now worthless** |

**Recommended: reading B.** It is the better fit for the cited class, it matches the outcome's own prose
(*"not doubted — **void**"*), and it is the more dramatic: a public claim everyone witnessed, publicly
emptied. It also **stops being a reality revision**, which keeps revisions rare.

**Consequence if approved:** `auth.julian_claims_convene_preside` moves from `ceases[]` to `unchanged[]` —
the claim stands as a historical act — and the delta becomes additive.

| field | value |
|---|---|
| `recognitionChanges[0].who` | `named:julian` |
| `.howRecognized` | he is no longer recognised as competent to convene or preside over a ruling on Lirael's conduct |
| `.recordsChanged` | the order's record of his standing for this matter |
| `durability.status` | **`persists`** — *and persistence is not permanence*: `16719` makes standing restorable by committee finding, which is **the order's business, not this outcome's** |

---

## B3. `unm.the_shunning` — proposed class **`relationship_social`**

### Citation table

| causal step | citation | verdict |
|---|---|---|
| **class** | `191285` — `affectedParties: { who, whatChanged, witnesses }`, *"how the **relationship or social reality** changed"* | **fits** |
| **world support** | `231513` — this order corrects by **social means**: refusal is *"DIVIDED, SPEAKING CROOKED"*, remedied by *"REALIGNMENT: supervision, correction, **months of it**"* | social withdrawal is this culture's punitive mode |
| **target** | `lirael.shunned_by_all_present` | renamed atom, approved |
| **witnesses** | `191285` `witnesses` field — *"who saw or now assumes it"* | **everyone present**; public perception is licensed **here** (unlike `history_rewrite`) |
| **duration** | `191194` — `expires` only if bound to the rupture window; `231513` gives social correction a natural span (*"months of it"*) | **`persists`** |
| **cost** | `undefended` — entailment of the same withdrawal | supported |
| **prevents** | none. **No mental state is asserted** — conduct and social reality only, which is what the class names. | clear |

| field | value |
|---|---|
| `affectedParties[0].who` | `pc:lirael` — **she is the party whose social reality changed** |
| `.whatChanged` | everyone present withdraws from her: none stands near her, addresses her, or meets her eye |
| `.witnesses` | all present — it is a public act, not a private one |
| `durability.status` | **`persists`** — not bound to the rupture window. **Persistence is not permanence**; a shunning remains subject to ordinary social change, and this outcome does not decree otherwise. |

### One contract note this draft surfaces

**`invokerScope` has no meaning here.** It is a **`memory_perception`** concern — it exists because that class
declares a `targetPopulation`. `relationship_social` declares `affectedParties`, and Lirael is the *affected
party*, not a member of an acting population.

> **`invokerScope` must not be applied universally across classes.** Recorded so it is not carried into
> classes that have no population to be in or out of.

---

# Part 3 — Status

| outcome | class | duration | delta kind | state |
|---|---|---|---|---|
| `unm.custody_severed` | `materialization_possession` | `persists` | revision | **proposed** |
| `unm.standing_dissolved` | `identity_reputation` | `persists` | **additive** if reading B approved | **proposed**, one decision |
| `unm.the_shunning` | `relationship_social` | `persists` | additive | **proposed** |

**Approved this pass:** the native compiler contract, the atom set, `the_turning_forgotten`,
`the_accusation_unmade`, and `time_gives_way` as costless.

**No implementation, no ranking, no coverage run.**
