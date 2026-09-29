# Final traces · gap authoring · opening coverage

> **Approval-ready. No implementation, no provider calls, no new architecture notes.**

---

# 1. `unm.time_gives_way` — ask `undo` — FINAL

| field | detail |
|---|---|
| class | `history_rewrite` (`191271`) |
| `temporalOperation` | **`historical_replacement`** |
| `requiresActive[]` | `interr.julian_questioned_lirael` — an opening invariant |
| duration | `persists` |
| **cost** | **NONE.** Approved costless; `world_bent_in_public` is blocked and may not be reinstated by paraphrase. |

### `ceases[]`
`interr.julian_questioned_lirael` · `interr.dohkar_interrupted` · `interr.choice_arose` ·
`lirael.scene1_disposition` · **`answer.handed_to_lirael`** · **`answer.lirael_authorized_to_hold`**

> ### The Answer companions — found by applying the current custody canon
> `answer.handed_to_lirael` exists **for the questioning**. If the questioning never occurred, **the handoff
> has no occasion**, and the authorization derived from it has no source. **Both must be named**, or the
> revision leaves Lirael holding a relic she was handed for an event that did not happen.
>
> **This is new to the final trace.** Earlier drafts predate the custody canon and did not carry it.

### `establishes[]`
| field | detail |
|---|---|
| `interr.no_questioning_occurred` | Julian did not question Lirael before the assembly. |
| `interr.no_interruption_occurred` | The presiding Dohkar interrupted nothing. |
| `ceremony.replayed_unquestioned` | The rite played through a second time, and no questioning of the Sacrificiant's guide occurred in it. |
| `answer.never_handed_to_lirael` | The Answer was not placed in Lirael's hands. It remained with Julian throughout. |
| `lirael.choice_pending` | A choice is required of Lirael and has not been made. |

**`priorHistoryReplaced`** *(required by the class)*: *history was — Julian questioned Lirael before the
assembly, the Dohkar interrupted it, a choice arose from it, and the Answer was in her hands for it. History
now is — the rite concluded with no questioning of the guide, the Answer never left Julian's keeping, and the
choice before Lirael is open and unmade.*

**`survivingContradictions`**: empty.

### `memoryEffects[]`
`not_retained` on `interr.julian_questioned_lirael` across **`population.scene_present`**, expanded to its
sealed roster — **`pc:lirael` included, `invokerScope: in_population`, no invoker filter** (D1).
Plus `{ pc:lirael, lirael.scene1_disposition, not_retained }`.

### `unchanged[]`
**`answer.entrusted_to_julian`** — **office-bound; a history rewrite of a scene event does not reach it** ·
every `twist.*` · every `auth.*` · every `review.*` · `answer.owned_by_institution` · `answer.instance_identity`

### Open
The renewed choice's value · what Julian does in a world where he never asked · whether the Answer's absence
from her hands is itself remarked on.

---

# 2. `unm.standing_dissolved` — ask `authority` — FINAL

| field | detail |
|---|---|
| class | `identity_reputation` (`191277`) |
| `temporalOperation` | **`current_state_transition`** |
| `requiresActive[]` | `auth.julian_standing_to_convene` — an opening invariant |
| duration | `persists` — **and persistence is not permanence**: `16719` makes standing restorable by committee finding, which is the order's business, not this outcome's |
| cost | `escalation_invited` |

### `ceases[]`
`auth.julian_standing_to_convene` — **alone**

### `establishes[]`
`auth.julian_standing_void` — *Julian's claim to convene or preside over a ruling on Lirael's conduct carries
no authority.*

### `unchanged[]`
| field | detail |
|---|---|
| `auth.julian_claimed_convene_preside` | **the claim happened and still happened** — the room remembers it |
| **`answer.entrusted_to_julian`** | **stated explicitly.** Entrustment is bound to **the office**; standing to convene a particular ruling is **not the office**. *"His standing is void"* may never be read as *"his charge is vacant."* |
| `auth.dohkar_claims_rite_and_ruling` · `auth.venue_named_formal_inquiry` · `auth.inquiry_not_yet_opened` | — |
| `review.demanded_by_julian` · both `challenge.*` atoms · every other atom | — |

### `recognitionChanges[0]`
`who`: `named:julian` · `howRecognized`: no longer recognised as competent to convene or preside over a ruling
on Lirael's conduct · `recordsChanged`: the order's record of his standing for this matter.

### Superseded assumptions removed
The retired mixed atom `auth.julian_claims_convene_preside` and the `history_rewrite` reading (Reading A) are
**not preserved as alternatives.** Reading B is the trace.

---

# 3. `unm.the_shunning` — ask `solitude` — FINAL

| field | detail |
|---|---|
| class | `relationship_social` (`191285`) |
| `temporalOperation` | **`additive_canon_change`** |
| `requiresActive[]` | none |
| duration | `persists` — **the clearest case of persistence not being permanence**: it continues until someone breaks it, which is an ordinary story event |
| cost | `undefended` |

### `ceases[]`
**none**

### `establishes[]`
`lirael.shunned_by_all_present` — *The assembly, Seren, Julian and the presiding Dohkar withdraw from
Lirael: none stands near her, addresses her, or meets her eye.*

**Withdrawing roster — sealed, and explicitly not `population.scene_present`:**
`the_assembly` · `named:seren` · `named:julian` · `role:first_sacrifice_presiding_dohkar`

> **`pc:lirael` is excluded as the OBJECT of the withdrawal, not as an exempted party.** She is the person
> withdrawn *from*; **no one withdraws from themselves.** This is **structural role logic** — the outcome
> has two roles, and she occupies the other one. **It is not an invoker exemption**, and it creates no
> precedent for removing a party from a population they belong to. `invokerScope` does not apply to
> `relationship_social` at all.

### `affectedParties[0]`
`who`: `pc:lirael` · `whatChanged`: everyone present withdraws from her · `witnesses`: **all present** — the
class's own field, which is why public perception is licensed here and was not for `time_gives_way`.

### `unchanged[]`
Every atom · **every party's memory** · **`answer.entrusted_to_julian`, `answer.handed_to_lirael` and
`answer.lirael_authorized_to_hold`** — a social withdrawal is not a custody event.

### Open — one concrete interaction, recorded
**When her authorization lapses, the Answer is Julian's to have back — and everyone present has withdrawn from
her.** Who approaches her to take it, and at what cost to themselves, is **open**. Nothing may infer that the
shunning prevents the retrieval, or that the retrieval breaks the shunning.

### Contract note
**`invokerScope` does not apply.** It is a `memory_perception` concern; this class declares `affectedParties`,
and Lirael is the affected party, not a member of an acting population.

---

# 4. Gap 1 — pre-accusation `escape`

## 4a. Carrier audit, before drafting

**What is she asking to be out from under, when no family accusation exists?** The procedural frame already
closing around her conduct. Candidate carriers:

| candidate | verdict |
|---|---|
| cease `interr.julian_questioned_lirael` | ⛔ **that is `undo`'s target.** Answering `escape` with it answers a different sentence (T4). |
| the Answer establishes something exculpating | ⛔ **forbidden.** It may not establish guilt, truth, causation or responsibility for the twist. |
| cease **`auth.dohkar_claims_rite_and_ruling`** | ✅ **supported.** `history_rewrite` (`191271`); the assertion is a declared atom; it is what makes her conduct a thing anyone may rule on. |

**`auth.dohkar_claims_rite_and_ruling` is an opening invariant** — a clause of the `inquiry_authority_claimed`
aftermath truth — so it is active in **every** reachable opening state.

## 4b. `unm.the_claim_unmade` — ask `escape` — PROPOSED

| field | detail |
|---|---|
| class | `history_rewrite` (`191271`) |
| `temporalOperation` | **`historical_replacement`** |
| `requiresActive[]` | `auth.dohkar_claims_rite_and_ruling` — invariant |
| **`requiresInactive[]`** | **`accusation.family_accused`** — **gate approved 2026-09-29.** This is the **pre-accusation** escape answer; `unm.the_accusation_unmade` is the active-family-accusation answer. **They are never ranked or tie-broken against each other**, because they are never both eligible. |
| duration | `persists` |
| cost | **none supported, and none invented** |

**Therefore:** the presiding Dohkar never asserted that the rite and the ruling on the Sacrificiant's conduct
were his. **No one has claimed the right to rule on what she did.**

### `ceases[]` — with its companions named
`auth.dohkar_claims_rite_and_ruling` · **`auth.venue_named_formal_inquiry`** *(he named it in the same breath;
it cannot survive the assertion it depended on)* · **`auth.julian_claimed_convene_preside`** *("Julian
**agreed**" — there is nothing to agree to)*

### `establishes[]`
| field | detail |
|---|---|
| `auth.no_claim_to_rule` | No authority has asserted a claim to rule on the Sacrificiant's conduct. |
| `auth.no_venue_named` | No venue has been named for any such proceeding. |

**`priorHistoryReplaced`**: *history was — the presiding Dohkar asserted the rite and the ruling were his,
named a formal inquiry as the venue, and Julian agreed and claimed authority to convene it. History now is —
no claim to rule on her conduct was made, and no venue was named.*
**`survivingContradictions`**: empty.

### `unchanged[]` — **the arc survives, and this is why**
| field | detail |
|---|---|
| **`review.demanded_by_julian`** | **untouched — so row 4's notice and investigation still arrive.** |
| `auth.inquiry_not_yet_opened` | — |
| every `twist.*`, `interr.*`, `answer.*` atom | including **`answer.entrusted_to_julian`** |
| **`accusation.family_demanded_remedy`** | **if a remedy was demanded, that demand stands.** It is a separate atom and can be active without an accusation. |
| ~~`accusation.family_accused`~~ | **cannot arise here** — `requiresInactive` makes this outcome ineligible whenever it is active |

**Row 14 is unaffected:** *"The panel is constituted **HERE for the first time**; nothing earlier may have
convened it"* — it needs no earlier naming, and explicitly forbids one.

### Open
Who claims the ruling instead, and when · whether the Dohkar reaches for an authority he never asserted ·
**whether Julian later makes a claim or an agreement of his own.**

---

# 5. Gap 2 — `silence`

## 5a. Carrier audit, before drafting

**The ask is to keep a subject from being raised.** Under the custody canon the subject is **whose the Answer
is** — she is visibly holding a relic that is not hers.

| candidate | verdict |
|---|---|
| stop the relic responding | ⛔ **no carrier**; inventing a capability |
| cease Julian's entrustment | ⛔ **office-bound**; this is why `custody_severed` was withdrawn |
| the Answer shows something favorable | ⛔ **forbidden** — and it speaks only to present alignment anyway |
| **make the custody facts unrememberable** | ✅ **supported.** `memory_perception` (`191220`), disposition **`forgot`** from the closed enum, `targetPopulation.kind: collective`. **A subject nobody recalls cannot be raised.** |

**The facts themselves are untouched.** This is the MEMORY channel — `answer.entrusted_to_julian` and
`answer.owned_by_institution` **continue to govern canon**. Nothing about entrustment changes.

## 5b. `unm.the_custody_unremembered` — ask `silence` — PROPOSED

| field | detail |
|---|---|
| class | `memory_perception` (`191220`) |
| delta | **none.** A memory outcome is not a canonical delta; no `temporalOperation` applies. |
| `requiresActive[]` | `answer.owned_by_institution` · `answer.entrusted_to_julian` — both opening invariants |
| duration | `persists` |
| cost | **`she_forgets_whose_it_is`** — a **knowledge loss**, not a predicted action. See §5d. |

**Therefore:** no one in that clearing can remember **whose the Answer is**. It is in Lirael's hands, and
**the question *whose is this* cannot be asked** — not because anyone decided to let it go, but because the
fact that would prompt it is gone from them.

**The question *why did he hand it over* is untouched and remains askable**, since they still remember the
handoff. **The silence covers ownership and entrustment, and nothing else.**

> *(This line was lost in an earlier section splice and is restored here in its corrected form — the
> version it replaces wrongly said "the question of why simply does not arise", which §5b-iii contradicts.)*

### 5b-i. The exact atomic facts forgotten — **two, named**

| atom | what each party loses |
|---|---|
| **`answer.owned_by_institution`** | that the Answer belongs to the Institution |
| **`answer.entrusted_to_julian`** | that this instance is entrusted to Julian by virtue of his office |

**Disposition: `forgot`**, from the closed enum (`191238`). **No other atom is targeted.**

### 5b-ii. The sealed affected roster

`population.scene_present`, expanded through its declared rule **at seal** and frozen into the record:

| party ref | note |
|---|---|
| `the_assembly` | the crowd of First Favored family and guests — a **collective** entry |
| `named:seren` | — |
| `named:julian` | — |
| `role:first_sacrifice_presiding_dohkar` | — |
| **`pc:lirael`** | **`invokerScope: in_population`** |

**Why Lirael is affected — one basis, and only one:**

> **The sealed population includes Lirael; therefore she receives the same memory effect as every other
> member. No invoker exemption applies.**

**That is the whole justification.** Membership in the declared population is the basis. D1 **removes an
automatic exemption** — it does **not** create a second rule that adds a party whenever an ask would
otherwise be ineffective.

> ### ⚠ Corrected 2026-09-29 — this was written as "two independent reasons"
> The second was that the ask fails to silence the subject if she retains the knowledge. **Recording that as
> an independent targeting basis was wrong.** It would make effectiveness a route by which a party can be
> added to an outcome's reach — a general exception this design has no rule for, and a way for any future
> outcome to self-target by arguing it would not otherwise work.

**Effectiveness remains editorial rationale for the population choice, not a targeting basis.** It is why
`population.scene_present` was chosen over `population.assembly` when the outcome was authored: the narrower
crowd leaves parties who could still raise the subject. **The choice of population is an authoring decision.
Who is inside the chosen population is not.**

### 5b-iii. What remains known, and what remains governing

| remains **known** to everyone | detail |
|---|---|
| `answer.handed_to_lirael` | **they remember the act.** Julian placed it in her hands before the assembly. |
| `answer.lirael_authorized_to_hold` | **they remember she holds it for the questioning, and that the authorization lapses when the questioning ends.** |
| `answer.instance_identity` | it is still this Answer |
| every `twist.*`, `interr.*`, `auth.*`, `review.*` atom | untouched |

| remains **governing**, though unremembered | detail |
|---|---|
| `answer.owned_by_institution` | **title is unchanged.** The Institution still owns it. |
| `answer.entrusted_to_julian` | **the entrustment is unchanged.** It is office-bound, and no memory effect reaches it. |

> **The silence is partial, and the limit is authored rather than hidden.** They remember that Julian handed
> her something and that she holds it for the questioning. **What none of them can recall is whose it is.**
> A question about *why he handed it over* remains askable; the question *whose is this* does not.

### 5c. What this outcome does NOT do

**It does not touch the facts.** Ownership and entrustment continue to govern canon. **Nothing about Julian's
charge changes** — that is the error `unm.custody_severed` was withdrawn for.

**The authorization still lapses on its own declared term** when the questioning ends, **and everyone present
still remembers that it does** — so the memory effect cannot quietly extend her holding.

### 5d. "She may act as though it is hers" — **an OPEN QUESTION**

> **Classified explicitly, because the phrase cannot do hidden canonical work.**

| classification | verdict |
|---|---|
| an authored immediate consequence? | **No.** |
| a permitted future possibility? | **Not asserted here.** |
| **an open question?** | **Yes — this, and only this.** |

**The memory effect authors a knowledge gap and nothing else.** Lirael does not know the Answer is the
Institution's, or that it is Julian's charge.

**Any action she takes, and any social consequence that follows, must be explicitly authored elsewhere.**
Nothing in this outcome licenses a later scene to have her claim it, carry it away, or be treated as having
done so. **Nothing may be inferred from the gap** — not that she will act on it, and not that she will not.

**The cost is the knowledge gap itself**, which is why it is named `she_forgets_whose_it_is` and not
`she_acts_as_though_it_is_hers`. **The first is what the grant does. The second would be a consequence the
grant has not authored.**

### Open
What happens when the authorization lapses and no one present recalls whose it is · whether Julian, who also
forgets, still reaches for it · whether anyone asks why he handed it to her.

---

# 6. Intentional product gaps

**None.** Both asks audited in §4 and §5 have supported carriers, and both are drafted. **No gap is recorded,
and nothing is left as an implied backlog.**

*(Recorded for completeness: `unm.the_answer_speaks` and `unm.witness_scattered` remain blocked, and
`unm.custody_severed` withdrawn — but their ask-classes are covered by the entries above, so no ask is
unserved.)*
