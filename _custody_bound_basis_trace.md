# Focused trace — the active basis of Lirael's holding after `custody_severed`

> **One trace only. No ranking, no coverage run, no implementation.**

---

# 1. The problem, stated exactly

`answer.lirael_holding_bounded` reads *"Lirael holds it only for the questioning. **It is not hers.**"*

**Its basis is the Institution's title** — *"it is not hers"* is only meaningful against *"it belongs to the
Institution."* `unm.custody_severed` ends that title. **So listing the bound `unchanged` relies on a claim the
same delta just ceased**, and leaves *"still not hers"* as either an unexplained leftover or — worse — a
concealed grant, since nothing would then say what she may not do.

**The prior trace was wrong to list it unchanged.** Corrected here.

---

# 2. The active basis, source-backed

> **`app.js:131288` / `130927`** — *"**The presiding Dohkar asserted that the rite and the ruling on the
> Sacrificiant's conduct are his**."*

**This is `auth.dohkar_claims_rite_and_ruling`, and `unm.custody_severed` does not touch it.** It is authority
over **the proceeding**, not over the object — so it survives the end of title intact, and it is the one
standing that remains attached to the occasion in which Lirael holds the Answer.

**Supporting texture** (`app.js:231567`): *"**Custody rules**, ritual veiling, distance and an official chain
of authentication make substitution nearly impossible to prove."*

> ⚠ **Cited as adjacent, not exact.** That line describes custody discipline in **formal examinations**; this
> is an accusatory questioning. It establishes that this world **has** procedural custody independent of
> title — it does not by itself reach this occasion. **The load is carried by `131288`**, which does.

---

# 3. The correction — the bound is **re-founded**, not preserved

**Form chosen: establish a new explicit constraint** (your option 1). The old bound ceases with the title that
grounded it; a new one is established on the proceeding.

| | |
|---|---|
| **`ceases[]`** | `answer.owned_by_institution` · `answer.julian_is_caretaker` · **`answer.lirael_holding_bounded`** — *added; its basis is gone and it may not be carried over* |
| **`establishes[]`** | `answer.owned_by_no_one` — *No institution and no person holds title to the Answer.*<br>`answer.no_caretaker` — *No one holds the caretaker's charge over it.*<br>**`answer.holding_bound_to_proceeding`** — *Lirael holds the Answer only for the questioning now before the assembly. The presiding Dohkar's authority over the rite and over the ruling on the Sacrificiant's conduct governs her holding for its duration. It is not hers.* |

**`temporalOperation` is unchanged: `current_state_transition`.** Title ends now; the questioning is still
running; the Dohkar's authority still stands. **No history is replaced** — the Institution *did* hold it, and
Julian *was* its caretaker.

---

# 4. Who has standing, and exactly what she may do

## Standing

| | |
|---|---|
| **title to the Answer** | **no one** |
| **caretaker's charge** | **no one** |
| **authority over the proceeding in which she holds it** | **the presiding Dohkar** — `auth.dohkar_claims_rite_and_ruling`, unchanged |

**Nobody owns it and someone still governs what happens in the room.** Those are different kinds of standing,
and only the second survives.

## What Lirael may do from this moment

| may | |
|---|---|
| **hold it for the duration of the questioning** | the occasion the Dohkar's authority covers |
| **use it as the questioning requires** | unchanged from before |

| may not | |
|---|---|
| **claim it** | *"It is not hers"* is re-established, on the new basis |
| **carry it away** | outside the proceeding nothing licenses her holding |
| **use it outside the questioning** | same |

## Open — **and stated, not left implied**

> **When the questioning ends, her holding ends — and there is no one to relinquish it to.** No institution
> holds title; no caretaker holds charge; the Dohkar's authority covers the proceeding, not the keeping of a
> relic.

**This outcome does not answer it, and says so.** An unowned True Answer in the hands of a woman whose right
to hold it expires with the sentence being spoken is a **real, authored open question** — not a gap left by
sloppy bookkeeping. **Nothing may infer an answer from the silence**; a later scene must author one.

---

# 5. The cost, re-stated precisely

`custody_unclaimed` stands, with its meaning sharpened: **no one holds title or the caretaker's charge.** It
does **not** mean nobody is present or that the room is unsupervised — the Dohkar's authority over the
proceeding is intact. **What is unwatched is the relic, not the scene.**

---

# 6. Status

| | |
|---|---|
| `answer.lirael_holding_bounded` | **no longer listed unchanged** — it ceases with its basis |
| replacement | **`answer.holding_bound_to_proceeding`**, founded on `auth.dohkar_claims_rite_and_ruling` |
| standing | **title: no one · caretaker: no one · the proceeding: the presiding Dohkar** |
| what she may do | stated positively and negatively in §4 |
| the unanswered question | **authored as open**, not implied |
| `temporalOperation` | **`current_state_transition`**, unchanged |

**No ranking. No coverage run. No implementation.**
