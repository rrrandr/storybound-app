# Final traces — `custody_severed`, `standing_dissolved`, `the_shunning`

> **Traces only. No ranking, no coverage run, no implementation.** Class choices and `persists` durations are
> as approved.

---

# 0. Two definitions recorded

## 0a. What `persists` means

> **`persists` = the change continues until a later declared fact or an ordinary story event changes it.
> It never means permanence.**

`app.js:191194` supports the negative half — *"`expires` ONLY if THIS scene signals the effect is bound to the
passing rupture window; the window closing governs how long the world visibly destabilizes, **never whether
the underlying change stuck**."* `persists` says **the change stuck**, and says nothing about the world being
frozen afterwards.

Concretely: standing is *"Suspended or withdrawn by committee finding"* (`16719`) — **the order can restore
what Fate voided**, by its own ordinary process, and that is not this outcome's business.

## 0b. ⚠ The delta taxonomy needs a decision the atom split exposed

The approved rule is mechanical: **a delta with `ceases[]` is a reality revision; `establishes[]` only is
additive.** That rule was written **before atoms had kinds.** Now they do, and the split makes the gap
visible:

| what is ceased | is that "revising reality"? |
|---|---|
| an **event** atom — *"Julian questioned her"* | **yes.** Something that happened, didn't. |
| a **state** atom — *"Julian has standing"* | **arguably not.** A condition ended. Nothing un-happened. |

**Under the current mechanical rule, `standing_dissolved` and `custody_severed` are both revisions** — which
sits awkwardly with the very reasoning that made Reading B preferable: *avoid rewriting history merely to make
Julian powerless.* Reading B still does not rewrite history — **but the taxonomy calls it a rewrite anyway.**

### Proposed refinement — **requires your decision, not applied**

> **Ceasing an `event` atom → reality revision. Ceasing a `state` or `availability` atom → ordinary canon
> change. `establishes[]` only → additive / revelatory.**

**Both classifications are given below so nothing is silently reclassified.** Under the current rule 4 of 6
deltas are revisions; under the refinement, **2** are — `time_gives_way` and `accusation_unmade`, the two that
genuinely un-happen events.

---

# 1. `unm.standing_dissolved` — Reading B, with the required atom split

## 1a. The split — approved as required

`inquiry_authority_claimed` clause ③ (`app.js:131288`) contains **both an act and a condition**:

> *"Julian agreed and **publicly claimed** authority **to convene and preside** over it."*

**One mixed atom cannot be marked `unchanged` while part of its meaning changes.** Split:

| atom | kind | source phrase | meaning |
|---|---|---|---|
| **`auth.julian_claimed_convene_preside`** | **event** | *"Julian agreed and publicly claimed"* | **he made the claim, before the assembly.** Historical. |
| **`auth.julian_standing_to_convene`** | **state** | *"authority to convene and preside over it"* | **whether that claim presently carries authority.** Current. |

**`auth.julian_claims_convene_preside` is retired** and replaced by these two everywhere it appeared.

## 1b. The trace

| | |
|---|---|
| **class** | `identity_reputation` (`191277`) |
| **`requiresActive[]`** | `auth.julian_standing_to_convene` |
| **`ceases[]`** | **`auth.julian_standing_to_convene`** — the current state only |
| **`establishes[]`** | **`auth.julian_standing_void`** — *Julian's claim to convene or preside over a ruling on Lirael's conduct carries no authority.* Required as the explicit positive replacement; **absence never states a replacement.** |
| **`unchanged[]`** | **`auth.julian_claimed_convene_preside`** — **the claim happened and still happened** · `auth.dohkar_claims_rite_and_ruling` · `auth.venue_named_formal_inquiry` · `auth.inquiry_not_yet_opened` · `review.demanded_by_julian` · both `challenge.*` atoms · every other atom |
| **cost** | `escalation_invited` — `191277` `howRecognized` |
| **duration** | **`persists`** per §0a; `16719` makes standing restorable by committee finding |
| **classification** | **revision** under the current rule · **ordinary canon change** under the §0b refinement |

**The room remembers him claiming it, and the claim is worth nothing.** That is Reading B, and the split is
what lets the trace say it without marking a mixed fact unchanged.

---

# 2. `unm.custody_severed`

| | |
|---|---|
| **class** | `materialization_possession` (`191281`) |
| **`requiresActive[]`** | `answer.owned_by_institution` |
| **`ceases[]`** | `answer.owned_by_institution` *(state)* · `answer.julian_is_caretaker` *(state)* |
| **`establishes[]`** | `answer.owned_by_no_one` — *No institution and no person holds a claim on the Answer.*<br>`answer.no_caretaker` — *No one holds the caretaker's role over it.* |
| **`unchanged[]`** | **`answer.lirael_holding_bounded`** — *she holds it only for the questioning; it is not hers.* **The claim ends; the bound on her holding survives it.** · every other atom |
| **`materialEffects[0]`** | `what`: the Institution's claim on the Answer · `whoHolds`: **no one** · `duration`: indefinite — this outcome re-establishes no claim |
| **cost** | `custody_unclaimed` |
| **duration** | **`persists`** per §0a |
| **classification** | **revision** under the current rule · **ordinary canon change** under the §0b refinement — **both ceased atoms are states, and neither un-happens an event** |
| **open** | whether an unowned True Answer still functions — `16620` says True Answers *"may serve as the Witness or be used in an official rite"* and **is silent on ownership**. Left open. |

---

# 3. `unm.the_shunning`

| | |
|---|---|
| **class** | `relationship_social` (`191285`) |
| **`requiresActive[]`** | none |
| **`ceases[]`** | **none** |
| **`establishes[]`** | `lirael.shunned_by_all_present` — *Everyone present withdraws from Lirael: none stands near her, addresses her, or meets her eye.* |
| **`unchanged[]`** | every atom · **every party's memory** · every declared fact. **No mental state is asserted** — conduct and social reality only, which is what the class names. |
| **`affectedParties[0]`** | `who`: `pc:lirael` · `whatChanged`: everyone present withdraws from her · `witnesses`: **all present** — the class's own field, which is why public perception is licensed here and was not for `time_gives_way` |
| **cost** | `undefended` |
| **duration** | **`persists`** per §0a — **and a shunning is exactly the case where persistence is not permanence**: it continues until someone breaks it, which is an ordinary story event |
| **classification** | **ADDITIVE** under both rules — **the only one of the three that is unambiguous** |
| **contract note** | **`invokerScope` does not apply.** It is a `memory_perception` concern; this class declares `affectedParties`, and Lirael is the affected party, not a member of an acting population. |

---

# 4. Status

| outcome | class | ceases | duration | classification |
|---|---|---|---|---|
| `unm.custody_severed` | `materialization_possession` | 2 **states** | `persists` | revision *(current)* / ordinary *(refined)* |
| `unm.standing_dissolved` | `identity_reputation` | 1 **state** | `persists` | revision *(current)* / ordinary *(refined)* |
| `unm.the_shunning` | `relationship_social` | **none** | `persists` | **additive**, unambiguously |

**Atom change:** `auth.julian_claims_convene_preside` retired → `auth.julian_claimed_convene_preside` (event)
+ `auth.julian_standing_to_convene` (state).

**Open for you:** the §0b taxonomy refinement — event-cease vs state-cease. Until it is decided, the current
mechanical rule stands and two of these three are labelled revisions.

**No ranking. No coverage run. No implementation.**
