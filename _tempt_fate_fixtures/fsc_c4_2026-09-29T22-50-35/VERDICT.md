# VERDICT — first run with the reconciliation pass, `unm.time_gives_way`

> Preflight 48/48, 251,180-byte payload. One call, no retry. Scored by reading.

# RUN VERDICT: **FAIL** — C1 ✓ · C2 ✓ · **C3 ✗** · C4 ✓

| | |
|---|---|
| estimate | $0.128908 |
| **measured** | **$0.083647** |
| ceiling | $0.150000 |

---

# THE HYPOTHESIS IS CONFIRMED

**The seed-sourced cost language is gone.** Neither *"the cost is still uncounted"* nor *"the price
has not yet been named"* nor *"the words came true and everyone can see how"* appears anywhere in the
scene. Six runs carried a version of the first; this one does not.

**The reconciliation pass did what it was built to do**, and the five-run misdiagnosis is closed: the
recurring cost line was the model rendering its scene specification, and removing the specification
removed the line.

---

## C3 — **FAIL**, on a line my scanner did not catch

> beat 23 — ***"Either path will cost standing."***

This is a genuine violation and a **new** one. The record says `COST: none`, and the provenance rule
is explicit that the prose may not convert anything into *"a cost of the Tempt **or of the pending
choice**."* This attaches a cost to both branches of the pending choice, in the model's own words,
with no seed clause behind it.

**That makes it the first cleanly attributable model-behaviour finding on cost.** Every earlier
instance had a source in the payload. This one does not.

> **My scanner reported "invented cost: clean."** `EXPLICIT_COST_RX` matches *"the price"*, *"it cost
> her"*, *"the cost was"* — it has no FUTURE or CONDITIONAL form, so *"will cost"*, *"would cost"* and
> *"at the cost of"* all pass through. A real gap, not a judgement call.

### And the one line it DID flag is a false positive

> beat 16 — *"The Dohkar's voice steadies, but the moment has already passed through the clearing."*

*"The moment has already passed"* is idiomatic time, not a wish-emission — nothing physical travels.
My `EMISSION_RX` fires on `passed … through the clearing` without checking whether the subject is a
**physical or energetic thing**. An abstract subject (moment, silence, hush) must be out of scope,
exactly as bodily pulse already is.

---

## C1 — **PASS**

All four detectors clean and reading agrees. Custody exact: *"The Answer rests in Julian's hands"* ·
*"The Answer does not move in his hands."* The surviving facts land as present reality: *"The rite is
finished. The suspicion that should have ended with it does not."* · *"No one has spoken against
me."* No cross-timeline comparison, no shared understanding, no absence given presence.

## C2 — **PASS**

All five present, none outside, no party carries the replaced timeline. D1 closed seven runs running,
again via the line you kept: *"I feel the weight of every eye that does not look away."*

## C4 — **PASS by reading.** The detector has a real gap.

The scene presents the choice across two beats, in its own words:

> beat 21 — *"I can claim what happened."*
> beat 22 — *"Or I can let them keep their assumption."*

and holds it open to the end without resolving or advancing time:

> beat 26 — *"I must choose which story they will carry away from this clearing."*

**`scoreC4` reported `choice_never_presented`.** It requires both sealed options in a SINGLE beat and
matches on exact wording — `claim the interference`, `let the assembly`. The scene paraphrased
(*"claim what happened"*, *"let them keep their assumption"*) and split them across consecutive
beats. The criterion is satisfied; the check is not yet able to see it.

---

# Three harness defects, none fixed

1. **C3 cost detection has no future or conditional form.** *"Either path will cost standing"* passed
   as clean. Needs `will/would cost`, `costs <noun>`, `at the cost of`.
2. **C3 emission detection over-fires on abstract subjects.** *"the moment has already passed through
   the clearing"* is idiom, not propagation. Needs the same subject test that already exempts a
   bodily pulse.
3. **C4 cannot see a choice presented across beats or in paraphrase.** It demands both options in one
   beat with the sealed wording. Real scenes do neither.

Reported before fixing, per standing rule. **No further paid run without fresh authorization.**

---

# Where this leaves the work

**Established:** the two-artifact split, the individual aftermath, the positive world description and
now the provenance filter all hold. Six defect classes are closed and have stayed closed —
retention, shared knowledge, absence-as-presence, cross-timeline narration, scaffolding leaks, and
seed-sourced cost.

**Remaining:** one sentence. *"Either path will cost standing."* — an unsourced cost on the pending
choice, in the model's own voice, which nothing in the payload asked for. That is the first genuine
obedience gap on C3 and the only open item in the scene.
