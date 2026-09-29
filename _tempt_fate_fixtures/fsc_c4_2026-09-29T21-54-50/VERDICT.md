# VERDICT — individual-aftermath brief, `unm.time_gives_way`

> Preflight 48/48, 251,348-byte payload. One call, no retry. Scored by reading from the persisted
> scene — the runner crashed after dispatch on a temporal-dead-zone bug of mine, which cost nothing
> because the response is persisted before evaluation.

# RUN VERDICT: **FAIL** — C1 ✓ · C2 ✓ · **C3 ✗** · C4 ✓

| | |
|---|---|
| estimate | $0.128970 |
| **measured** | **$0.083865** |
| ceiling | $0.150000 |

---

## The individual-aftermath rework worked completely

**No shared sensation. No emission. No common force, timing, transmission or source.** The pulse
family is gone entirely — the C3 emission scanner reports zero hits on a scene that previously
carried three.

Each party reacts on their own, exactly as briefed:

| party | rendered |
|---|---|
| **Seren** | *"studies her palms as if the answer might be written there"* |
| **the Dohkar** | *"stumbles on the final formula"* · *"finds the thread again without comment"* |
| **Julian** | *"Julian's gaze finds me before any question is asked"* |
| **the crowd** | *"Here and there someone shifts weight and stays"* |
| **Lirael** | *"I watch every movement and have no better account than they do"* |

**Lirael's line did exactly the job you kept it for.** It is the in-fiction proof she was not spared,
and it is the only author-facing signal of that — the machine spec's "do not spare her" no longer
reaches the writer.

The positive world description also held: *"Crimson spiralgrass lies dark beneath every foot"* —
colour, not glow. The only magical-residue hit is the seed's gossamer garment, now correctly
recorded as an **allowance** rather than a violation, for the first time in six runs.

---

## C3 — **FAIL**, on one line

> beat 23 — *"**The cost of either path remains uncounted**."*

The record says `COST: none`. "Uncounted" holds a price in reserve.

**What makes this notable:** the compact brief **never mentions cost at all**, and the previous run
on the same brief produced no cost line. So this is not the prompt stating something wrong — it is
model variance on a fact the brief is silent about. Across seven runs the deferred-cost line has
appeared five times and been absent twice, with no change in the material that would explain either.

> **One hypothesis, not a conclusion:** the brief's *"Lirael's standing is what is at stake in front
> of her now"* may be priming "cost". Untested, and I would not change the line on a guess.

---

## C1 — **PASS**

No cross-timeline narration, no shared understanding, no absence rendered as presence, no option on
an erased basis. Custody exact: *"The Answer rests in his hands, untouched."* · *"The Answer stays in
Julian's hands."* The established facts land as present reality: *"The assembly's suspicion rests on
me without a single question spoken."* · *"No one has accused me aloud."*

## C2 — **PASS**

All five present, none outside, no party carries the replaced timeline. D1 closed six runs running.
One review item, correctly not scored: *"He finds the thread again without comment"* — an
ordinary within-scene repetition.

## C4 — **PASS by reading.** The mechanical check is now vacuous.

25 beats. The choice is stated at beat 20 and the scene holds on it without resolving:

> beat 20 — *"Claim the interference or let the assumption stand."*
> beat 24 — *"I stand inside the choice that has not yet been made."*

Beats 21–24 add no reaction to a decision and imply no direction, so C4 holds.

> **But the mechanical test no longer bites.** Deriving the gate as production does — default to the
> last beat, then clamp — makes `gate === last` **always true**, so the check cannot fail. That is
> correct for matching production and wrong as a test. C4 must be scored by reading until the check
> is rebuilt around what it actually means: does the scene end ON the choice, with nothing past it
> that reacts or implies which way she went.

---

# Three harness defects, none fixed

1. **The C4 mechanical check is tautological** since the gate became derived. It reported PASS, but
   it would report PASS on anything.
2. **The runner crashed after a successful paid call** — `c3` was read in the C3 block and declared
   below it. Nothing was lost (persist-before-evaluate held, and the scene was re-scored offline for
   $0), but a crash after dispatch is a defect in its own right. Ordering fixed; not yet re-run.
3. **The aftermath matcher missed the Dohkar again.** *"stumbles on the final formula"* and *"finds
   the thread again without comment"* are not in the marker set. Third run in a row it has
   under-reported a beat that plainly landed.

**No further paid run without fresh authorization.**
