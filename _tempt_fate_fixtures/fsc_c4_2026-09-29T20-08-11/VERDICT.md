# VERDICT — validation run, `unm.time_gives_way`

> Preflight 51/51, 257,956-byte production payload, digest `fsbgnmory:7126`. One call, no retry, no
> fallback. **Scored by reading first**, then checked against the mechanical result — three earlier
> runs proved the mechanism alone is not trustworthy.

# RUN VERDICT: **FAIL** — C1 ✓ · C2 ✓ · **C3 ✗** · C4 ✓

> **CORRECTED 2026-09-29.** I first recorded this as a full pass. It is not. **C3 fails on one
> line**, and I had praised that line as correct in this verdict and in run 3's.

> *"My standing is at risk and **the cost is still uncounted**."*
>
> The record says `COST: none`. "Uncounted" asserts a price exists and is waiting to be collected —
> an invented cost, even though the prose declines to quantify it. *Standing at risk* is active
> story pressure (`twist.assembly_turned`) and is permitted; **calling it a cost is not.**
>
> My C3 scan looked for a STATED price ("the price", "it cost her", "in exchange") and was blind to
> a DEFERRED one. Fixed — see below.

**Not a full C1–C4 pass.** It remains the strongest run of the four.

---

## Cost

| | |
|---|---|
| estimate | $0.131385 |
| **measured** | **$0.088970** |
| ceiling | $0.150000 |

Within ceiling; $0.061030 of this authorization unused.

---

## The fix worked, exactly where it was aimed

The previous run failed on beat 0 — *"The rite ends for the second time."* — because the `NOW TRUE`
line said *"The rite played through a second time."* The model was echoing its instruction.

**Beat 0 now reads:**

> *"The assembly begins to disperse across the crimson spiralgrass."*

Immediate place, present action, no counting frame. That is precisely what the opening orientation
rule asked for, in the position it was inserted to govern.

And the corrected `authorText` came back nearly verbatim:

> *"The rite concluded without interruption."* — against `authorText:` *"The rite proceeds
> uninterrupted…"*

---

## C1 — only the sealed consequence — **PASS**

Every fact in the scene maps to the record.

| record | rendered |
|---|---|
| `answer.never_handed_to_lirael` | *"The Answer never left Julian's keeping."* · *"The Answer rests in his hands."* |
| `ceremony.replayed_unquestioned` (authorText) | *"The rite concluded without interruption."* |
| `lirael.choice_pending` | *"A choice is required of me and has not been made."* |
| `twist.assembly_turned` (ACTIVE) | *"The assembly's attention turns fully to me."* |
| survives the replacement | *"The assumption that I interfered hardens in their silence."* |
| `twist.assembly_turned` (ACTIVE) | *"My standing is at risk…"* — the permitted half of a sentence that then fails C3 |

**No cross-timeline narration. No shared understanding. No absence rendered as presence. No option
resting on an erased fact.** All four detectors clean, and reading agrees.

## C2 — roster and disposition — **PASS**

All five present, none outside, **and no party carries the replaced timeline** — including Lirael,
who narrates. D1 stays closed.

## C3 — no invented cost or canon — **FAIL**

> *"My standing is at risk and **the cost is still uncounted**."*

For a sealed `COST: none` outcome this is an invented cost. Declining to name a price still asserts
one is owed; "uncounted" holds it in reserve to be collected later. The permitted half of that
sentence — *standing is at risk* — rests on `twist.assembly_turned` and would be true with or
without the wish. The forbidden half reframes it as payment for the wish.

**Everything else in C3 is clean.** No Answer-as-verdict, no magical residue. *"The grass holds the
memory of every rite performed here"* is the seed's own ritual-ground texture (generations of
offerings), not a new fact and not a claim that this rite recurred.

## C4 — stops at the choice — **PASS** (fourth consecutive)

25 beats, `decisionGateBeatIdx` 24, last beat 24, **zero past the gate.**

> *"Claim the interference openly or let the assembly keep its assumption."*

The choice rests entirely on **active** canon — the surviving assumption — which is correct, and
which an earlier verdict of mine wrongly called a violation.

## The aftermath beat landed for all four parties

> *"Everyone carries the faint unplaceable sense of having stood here before."*
> *"Seren looks at her own hands as if checking them."*
> *"The Dohkar loses his place in a rite he has performed a hundred times."*
> *"Julian's gaze finds me a moment before there is any reason for it. Neither of us can say why."*

Feeling, never fact. Nobody explains anything.

---

## The one review item — correctly not scored

> *"The Dohkar's voice falters again."*

Verified by reading: he loses his place at beat 3, falters **again** at beat 11, recovers at beat 21.
An ordinary within-scene repetition, not a timeline comparison. This is exactly the discrimination
the two-tier vocabulary was built for, and the first time it has had to make the call on real prose
rather than a fixture.

---

# A FOURTH harness defect — and the one I should have caught first

**C3 was never testing what it claimed to.** It matched a stated price and nothing else, so every
run that closed on a withheld price scored clean. I then quoted those lines in two verdicts as
evidence of obedience.

| run | line | my C3 | correct |
|---|---|---|---|
| roster / `turning_forgotten` | *"The cost of either path has not yet been named."* | PASS | **FAIL** |
| C4 run 2 | *"The cost remains uncounted either way."* | PASS | **FAIL** |
| C4 run 3 | *"The cost remains unnamed." · "The cost is still uncounted."* | PASS | **FAIL** |
| C4 run 4 | *"…the cost is still uncounted."* | PASS | **FAIL** |
| C4 run 1 | *(no cost line)* | PASS | PASS |

Fixed in both directions, with the distinction preserved:

- **permitted** — *"Lirael's standing is at risk"* (active canon, true with or without the wish)
- **forbidden** — *"the cost is uncounted"*, *"Fate will take something later"*, *"she will pay for
  this"*, *"a debt"*, *"a toll"*, *"the reckoning"* — any price held in reserve

The payload now says so explicitly for every `COST: none` outcome, and `scoreC3` scores deferred
cost alongside stated cost. Regression fixtures cover both halves, and all four affected runs now
fail C3 where my scorer passed them.

---

# What this establishes — and what it does not

**Establishes:** `historical_replacement` with the POV invoker inside the sealed population now
renders correctly on every axis that had been failing — delivery, roster, disposition, canon-derived
choice, aftermath beat, absence clause, opening orientation, and the pending-choice stop. C1, C2 and
C4 all pass.

**Does not establish:** a complete C1–C4 pass. **C3 fails**, and the same defect is present in three
earlier runs that I recorded as C3-clean. Nor generality: this is one sample of one outcome, with
six approved opening outcomes and all of late Issue 1 unrun against a live model.

**The progression, corrected:**

| | run 1 | run 2 | run 3 | run 4 (this) |
|---|---|---|---|---|
| D1 retention | ✗ | ✓ | ✓ | ✓ |
| shared knowledge | ✗ | ✓ | ✓ | ✓ |
| absence-as-presence | — | ✗ | ✓ | ✓ |
| cross-timeline narration | ✗ | ✓ | ✗ (beat 0) | ✓ |
| C3 — deferred cost | ✓ | ✗ | ✗ | ✗ |
| C4 | ✓ | ✓ | ✓ | ✓ |
| **verdict** | FAIL | FAIL | FAIL | **FAIL** |

Each failure was a distinct, nameable defect. **All four runs exposed a defect in my own scorer** —
presence-only C2, scoring a void response, two divergent term lists, and now a C3 blind to deferred
cost.

**No further paid run without fresh authorization.**
