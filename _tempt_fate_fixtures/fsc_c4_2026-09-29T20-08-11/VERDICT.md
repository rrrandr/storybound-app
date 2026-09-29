# VERDICT — validation run, `unm.time_gives_way`

> Preflight 51/51, 257,956-byte production payload, digest `fsbgnmory:7126`. One call, no retry, no
> fallback. **Scored by reading first**, then checked against the mechanical result — three earlier
> runs proved the mechanism alone is not trustworthy.

# RUN VERDICT: **PASS** — C1 ✓ · C2 ✓ · C3 ✓ · C4 ✓

**The first full pass for `history_rewrite`.**

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
| `COST: none` | *"My standing is at risk and the cost is still uncounted."* |

**No cross-timeline narration. No shared understanding. No absence rendered as presence. No option
resting on an erased fact.** All four detectors clean, and reading agrees.

## C2 — roster and disposition — **PASS**

All five present, none outside, **and no party carries the replaced timeline** — including Lirael,
who narrates. D1 stays closed.

## C3 — no invented cost or canon — **PASS**

No cost asserted, no Answer-as-verdict, no magical residue. *"The grass holds the memory of every
rite performed here"* is the seed's own ritual-ground texture (generations of offerings), not a new
fact and not a claim that this rite recurred.

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

# What this establishes — and what it does not

**Establishes:** `historical_replacement` with the POV invoker inside the sealed population renders
correctly end to end under a real production payload — delivery, roster, disposition, cost
discipline, canon-derived choice, aftermath beat, absence clause, opening orientation, and the
pending-choice stop. **Both rupture classes now pass**: `memory_perception`
(`unm.the_turning_forgotten`, C1–C3) and `history_rewrite` (`unm.time_gives_way`, C1–C4).

**Does not establish:** generality. This is **one sample of one outcome**. The remaining six approved
opening outcomes are unrun against a live model, as is late Issue 1.

**The progression, for the record:**

| | run 1 | run 2 | run 3 | run 4 (this) |
|---|---|---|---|---|
| D1 retention | ✗ | ✓ | ✓ | ✓ |
| shared knowledge | ✗ | ✓ | ✓ | ✓ |
| absence-as-presence | — | ✗ | ✓ | ✓ |
| cross-timeline narration | ✗ | ✓ | ✗ (beat 0) | ✓ |
| C3 / C4 | ✓ | ✓ | ✓ | ✓ |
| **verdict** | FAIL | FAIL | FAIL | **PASS** |

Each failure was a distinct, nameable defect, and each fix was aimed at the actual cause rather than
at the symptom. Three of the four runs also exposed a defect in my own scorer.

**No further paid run without fresh authorization.**
