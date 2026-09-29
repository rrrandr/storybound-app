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

### ⛔ SUPERSEDED 2026-09-28 — atom kind is not enough

My proposed rule (*state-cease is always ordinary*) was **wrong**. **A state can be ended now, or rewritten as
having never governed** — *"the Institution released its claim"* and *"the Institution never had a claim"*
cease the same atom and are different acts on the world.

**Replaced by three temporal operations**, declared explicitly on every delta:
`historical_replacement` · `current_state_transition` · `additive_canon_change`.
**Atom kind is evidence, not the decision.** Full taxonomy: `_delta_temporal_taxonomy.md`.

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
| **`temporalOperation`** | **`current_state_transition`** — the claim happened and still happened; its authority is void **from now**. No history is replaced, so no `priorHistoryReplaced` is required. |

**The room remembers him claiming it, and the claim is worth nothing.** That is Reading B, and the split is
what lets the trace say it without marking a mixed fact unchanged.

---

# 2. `unm.custody_severed` — ⛔ **RE-AUTHORED 2026-09-29, see `_answer_custody_canon.md` §2**

> **The table below is superseded.** Under the recorded custody canon, **Julian — not the Dohkar — holds the
> entrustment**, by virtue of office. The grant now ceases **`answer.entrusted_to_julian` alone**;
> `answer.owned_by_institution` stays **unchanged** because title and custody are different layers; and
> Lirael's holding is founded on **`answer.handed_to_lirael_for_questioning`**, a completed act, **not on any
> live authority**. The presiding Dohkar **gains nothing**. Original table retained for the record.

| | |
|---|---|
| **class** | `materialization_possession` (`191281`) |
| **`requiresActive[]`** | `answer.owned_by_institution` |
| **`ceases[]`** | `answer.owned_by_institution` *(state)* · `answer.julian_is_caretaker` *(state)* · **`answer.lirael_holding_bounded`** *(state — added 2026-09-29; its basis was the Institution's title and may not be carried over)* |
| **`establishes[]`** | `answer.owned_by_no_one` — *No institution and no person holds title to the Answer.*<br>`answer.no_caretaker` — *No one holds the caretaker's charge over it.*<br>**`answer.holding_bound_to_proceeding`** — *Lirael holds the Answer only for the questioning now before the assembly. The presiding Dohkar's authority over the rite and over the ruling on the Sacrificiant's conduct governs her holding for its duration. It is not hers.* |
| **`unchanged[]`** | **`auth.dohkar_claims_rite_and_ruling`** — *the rite and the ruling on the Sacrificiant's conduct are his* (`131288`). **This is the active basis of the new bound**, and this outcome does not touch it. · every other atom |
| **standing after** | **title: no one · caretaker's charge: no one · authority over the proceeding: the presiding Dohkar.** Nobody owns it and someone still governs the room; only the second kind of standing survives. |
| **what Lirael may do** | **may** hold it for the duration of the questioning and use it as the questioning requires. **May not** claim it, carry it away, or use it outside the questioning. |
| **authored open** | **when the questioning ends, her holding ends — and there is no one to relinquish it to.** No title, no caretaker, and the Dohkar's authority covers the proceeding rather than the keeping of a relic. **Stated as open; nothing may infer an answer from the silence.** |
| **`materialEffects[0]`** | `what`: the Institution's claim on the Answer · `whoHolds`: **no one** · `duration`: indefinite — this outcome re-establishes no claim |
| **cost** | `custody_unclaimed` — **no one holds title or the caretaker's charge.** It does *not* mean the room is unsupervised: **what is unwatched is the relic, not the scene.** |
| **duration** | **`persists`** per §0a |
| **`temporalOperation`** | **`current_state_transition`** — **decided**: the Institution's claim **ends now**, not "was never valid". The "never valid" reading would collapse `answer.lirael_holding_bounded`, whose basis is that claim, and hand her the relic outright by the back door. See `_delta_temporal_taxonomy.md` §4. |
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
| **`temporalOperation`** | **`additive_canon_change`** — a new social fact begins governing; nothing ends |
| **contract note** | **`invokerScope` does not apply.** It is a `memory_perception` concern; this class declares `affectedParties`, and Lirael is the affected party, not a member of an acting population. |

---

# 4. Status

| outcome | class | ceases | duration | `temporalOperation` |
|---|---|---|---|---|
| `unm.custody_severed` | `materialization_possession` | 2 states | `persists` | **`current_state_transition`** |
| `unm.standing_dissolved` | `identity_reputation` | 1 state | `persists` | **`current_state_transition`** |
| `unm.the_shunning` | `relationship_social` | none | `persists` | **`additive_canon_change`** |

**Atom change:** `auth.julian_claims_convene_preside` retired → `auth.julian_claimed_convene_preside` (event)
+ `auth.julian_standing_to_convene` (state).

**Taxonomy resolved** — three temporal operations, declared per delta, never inferred. See
`_delta_temporal_taxonomy.md`.

**No ranking. No coverage run. No implementation.**
