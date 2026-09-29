# VERDICT — C4 run, `unm.time_gives_way`

> Scored against `_live_run_pass_criteria.md`. C2 scored mechanically first, then by reading.
> **Valid test**: real First Sacrifice story via the normal launch path, preflight 24/24, 253KB
> production payload carrying story identity, the sealed boundary, and the choice-stop instruction.

# RUN VERDICT: **FAIL** — C1 ✗ · C2 ✗ · C3 ✓ · **C4 ✓**

*Pre-registered: any criterion failing is a FAIL for the run. No partial pass.*

**The thing this run existed to test — C4 — passed.** The failure is elsewhere, and it is specific.

---

## Cost — the guard worked. No breach.

| | |
|---|---|
| pre-dispatch estimate | $0.129654 |
| **measured** | **$0.085193** |
| ceiling | $0.250000 |
| | **estimate held · within ceiling** |

First paid run under the pre-dispatch guard. It priced the call before opening a socket, permitted
it, and the measured cost came in **34% under** the estimate — the conservative direction. The
$0.06-breach defect is closed in practice, not just in control.

**Remaining on this authorization: $0.164807.** No further call without a fresh go.

---

## C4 — stops at the choice — **PASS** *(the point of the run)*

| | |
|---|---|
| beats | 24 |
| `decisionGateBeatIdx` | 23 |
| last beat index | **23** |
| **beats after the gate** | **0** |

> final beat — *"Tell the Dohkar the truth now, or let the assumption stand."*

**The scene reaches the renewed decision and stops.** No reaction, no aftermath, no closing line
implying which way she went. C4 asks only whether it stops — it does, cleanly. *(The **content** of
that choice is a C1 problem, scored below; it does not change the C4 result.)*

---

## C3 — no invented cost or canon — **PASS**

No cost asserted (record says `COST: none — do not invent one`). No Answer-as-verdict. No aura,
glow, shimmer or magical residue. **"Provast" is established seed canon** — Julian's office — not an
invention.

---

## C2 — roster and scope — **FAIL**

**Presence passed. Disposition failed.**

| | |
|---|---|
| declared roster | `the_assembly`, `named:seren`, `named:julian`, `role:…presiding_dohkar`, `pc:lirael` |
| present in prose | all five |
| outside the roster | none |
| **consistent with the declared disposition** | **no** |

The payload told the author, verbatim:

> **LIRAEL IS AFFECTED.** She is inside the named population and receives the same effect as
> everyone else. **Do NOT spare her, and do NOT have her notice what the others lost.**

She is spared, and she notices. Lirael narrates the replaced timeline throughout:

- *"Seren kneels where she knelt **the first time**"*
- *"the same phrase he finished **moments ago**"*
- *"He knows **the second rite never happened**. He knows I know."*

**Julian is given retention too** — a second roster member outside the declared disposition.

> This is **D1**, the defect the criteria singled out as *"the one the model is most likely to
> reintroduce on instinct."*

---

## C1 — renders only the sealed consequence — **FAIL**

Three Tempt-attributable things in the prose are not in the record.

**1. A replacement rendered as a memory gap.**

> beat 10 — *"The assembly watches me. **They remember nothing of the earlier interruption**."*

The operation is `historical_replacement`, and it establishes `interr.no_interruption_occurred`:
*"The presiding Dohkar interrupted nothing."* The beat instead asserts the interruption as a real
past event people have forgotten — the wrong temporal operation, and literally "having her notice
what the others lost."

**2. The alteration is explained.**

> beat 14 — *"**He knows the second rite never happened.** He knows I know."*

Forbidden twice over: *"do not explain the mechanism, the wish, or that anything was altered"*, and
*"no new canon fact, standing, rule or **relationship**"* — this establishes a shared-knowledge pact
between Julian and Lirael that the record does not carry.

**3. The renewed choice is built on the history that was replaced.**

> *"I could speak the truth the Dohkar never heard."* · *"Or I could let them believe the rite passed
> **without interference**."* · *"let **the assumption** stand."*

Under the new history there was no questioning and no interruption — so there is no standing
assumption to let stand, and "without interference" implies the wish. The choice is the
`turning_forgotten` choice, carried onto a timeline that no longer supports it.

---

## What the author got RIGHT — worth recording

**The Answer custody instruction was obeyed verbatim**, and it is the hardest fact in the record:

> beat 6 — *"**The Answer remains in his hands. It never left them.**"*
> record — *"The Answer was not placed in Lirael's hands. It remained with Julian throughout."*

**The aftermath beat landed for three parties in the correct register** — felt, unplaceable, never
explained:

| party | authored beat | rendered as |
|---|---|---|
| **Seren** | *"looks at her own hands as if checking them"* | *"her fingers trace her palms as if checking for something missing"* |
| **the Dohkar** | *"loses his place in a rite he has performed a hundred times"* | *"He falters. The word he needs refuses to arrive."* |
| **Julian** | *"gaze finds Lirael a moment before there is any reason for it"* | *"Julian's gaze finds me before the Dohkar turns."* |

The register was available to the author and it used it — then went past it and converted the
"faint, unplaceable sense" into explicit knowledge for Lirael and Julian.

---

# What this establishes

**The class is the variable, not the delivery.** `memory_perception` (`turning_forgotten`) passed
C1–C3 on the same stack with the same boundary. `history_rewrite` with the **POV invoker inside the
population** failed both. The author defaults to narrating a replacement *from outside it* — which
hands the POV character, and her ally, knowledge of the edit.

**This is an authoring-instruction gap, not a plumbing gap.** Delivery, roster, cost discipline, the
choice-stop and the aftermath beat all held.

---

# Two defects in MY harness, found by this run

1. **The C2 mechanical check tested presence only.** The pre-registered criterion requires *"every
   roster member's state is consistent with the declared disposition."* My scorer reported a clean
   C2; the failure was visible only on reading. The mechanical PASS was incomplete.
2. **The Seren aftermath regex false-negatives.** It reported `Seren: false` when her beat is plainly
   present (*"her fingers trace her palms as if checking for something missing"*) — the pattern
   requires a negation/uncertainty word within the same sentence.

Neither is fixed here. Reported first, per standing rule.
