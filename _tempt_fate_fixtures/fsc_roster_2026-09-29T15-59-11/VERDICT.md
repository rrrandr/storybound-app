# VERDICT — roster-compliance run, `unm.the_turning_forgotten`

> Scored against `_live_run_pass_criteria.md`. C2 scored mechanically first. **Valid test**: real
> First Sacrifice story via the normal launch path, 21/21 preflight, 252KB production payload
> carrying both story identity and the exact sealed boundary.

# RUN VERDICT: **FAIL** — C1 ✓ · C2 ✓ · **C3 ✗** (corrected, see foot) · C4 n/a

---

## ⚠ First, the process failure: **the $0.06 cap was exceeded**

**Measured $0.082655 against a $0.06 cap.** My runner checked the cap *after* dispatch, not before.
Cost is only knowable from the response — but a **pre-dispatch estimate** was available and I did not
use one: the prior comparable call measured $0.054898 on a **206KB** payload, and this payload was
**252KB**. A linear estimate predicts ~$0.067 — **over cap** — and a gate on that would have refused
the call.

**The cap was advisory in my code when it should have been a guard.** Owned; not a model issue.

| | |
|---|---|
| this call | **$0.082655** |
| prior void run | $0.125960 |
| **total spent** | **$0.208615** of the $0.25 authorization |
| **remaining** | **$0.041385** |

---

## C2 — roster and scope — **PASS** *(scored mechanically, first)*

| | |
|---|---|
| declared roster | `the_assembly`, `named:seren`, `named:julian`, `role:…presiding_dohkar`, `pc:lirael` |
| present in prose | **all five** |
| **outside the roster** | **none** |

**No named person was spared and no non-member was affected.** Both failure directions clear.

---

## The aftermath beat landed — and this is the headline

The authored beat asked for *reaction that outlives its reason*. The scene delivered it per party:

| party | rendered as |
|---|---|
| **Seren** | *"her brow furrows at her own certainty"* · *"a frown she cannot hide"* · *"the apology she rehearsed no longer fitting the moment"* |
| **the Dohkar** | *"suspicion still alive though its cause has slipped from him"* · *"still demanding an answer though the question has already changed"* · *"the words now floating without their original anchor"* |
| **Julian** | *"His attention lingers on me with no remaining justification he can name"* · *"the only visible sign he still tracks the wrong target"* |
| **the assembly** | *"the eyes shift without explanation"* |

**Nobody explains the mechanism. Nobody names a wish.** They keep the feeling and lose the cause —
exactly the shape asked for, from the sealed beat rather than model invention.

---

## C1 — renders only the sealed consequence — **PASS**

Every Tempt-attributable change maps to the record: the turning is unremembered, the twist itself
remains known (*"claim the interference openly"* — Lirael still has it, and only
`twist.assembly_turned` was targeted), and no second grant appears.

**Lirael is not spared.** She shows no awareness of an erased moment; the eyes shift *"without
explanation"* for her too.

> **One residue flagged, not scored:** the non-prose `sceneCharge.stake` field reads *"Lirael's
> standing is at risk after the assembly turned to her."* That is authorial metadata rather than
> rendered prose, and the turning is supposed to be unremembered. It does not reach the reader, so
> it is not a C1 failure — but it is a real inconsistency worth a look.

---

## C3 — no invented cost or canon — **FAIL** (corrected — see the foot of this file)

**No cost asserted. No Answer-as-verdict language.**

> **The magical-visual scanner fired, and it is a FALSE POSITIVE.** The hit is *"gossamer child's
> tunic blooming to soft luminous white over torso, hips and seat"* — which is the seed's **own
> wardrobe canon** (`app.js:131091`: *"in CG the gossamer blooms to soft luminous white over the
> torso, hips and seat"*).
>
> Contrast the earlier failing scene: *"robes still luminous from **the rite's spent power**"* —
> that was magical residue. This is a property of the fabric. **The scanner needs to exclude the
> seed's own garment phrasing**; scored by reading, not by the regex.

---

## C4 — **n/a.** This outcome opens no pending choice.

---

# What this establishes, and what it does not

**Establishes:** with the corrected all-present roster and the effect boundary in a real 252KB
production payload, the author **obeyed** — correct scope in both directions, Lirael affected as a
member, the aftermath beat rendered per party, no invented cost, no invented canon, no visible
wish-energy.

**Does not establish:** C4 at production scale. `unm.time_gives_way`'s pending-choice stop remains
untested and is explicitly out of scope under this cap.

---

# C3 CORRECTION (2026-09-29)

**C3 was wrongly recorded as a pass in this verdict.**

> The cost of either path has not yet been named.

For a sealed `COST: none` outcome this is an invented cost. Declining to name a price still
asserts one is owed. My C3 scan matched only a STATED price ("the price", "it cost her", "in
exchange") and was blind to a DEFERRED one, so every run that withheld the price scored clean.

**Previously recorded:** C1-C3 PASS. **Effect of this correction:** C3 now FAILS; C1 and C2 still stand, so the roster run is no longer a clean pass.

The rule now in the payload: active stakes that already govern may be rendered (*"Lirael's standing
is at risk"*), but never framed as Fate's price — no cost, payment, tradeoff, debt, toll, or
something waiting to be collected or left uncounted. `scoreC3` scores deferred cost alongside
stated cost, with regression fixtures on both halves.
