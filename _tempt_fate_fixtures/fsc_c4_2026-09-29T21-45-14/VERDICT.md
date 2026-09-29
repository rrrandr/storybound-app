# VERDICT — first run on the APPROVED compact briefs, `unm.time_gives_way`

> Preflight 41/41, 251,285-byte payload. One call, no retry. First run in which the author saw
> **only** the compact brief — no machine spec, no schema labels, no prohibition lists.

# RUN VERDICT: **FAIL** — C1 ✓ · C2 ✓ · **C3 ✗** · C4 ✓

| | |
|---|---|
| estimate | $0.128947 |
| **measured** | **$0.085536** |
| ceiling | $0.150000 |

---

## The architecture worked. Every previously-failing axis is clean.

| defect | run 1 | run 2 | run 3 | run 4 | run 5 (briefs) |
|---|---|---|---|---|---|
| D1 retention | ✗ | ✓ | ✓ | ✓ | **✓** |
| shared knowledge | ✗ | ✓ | ✓ | ✓ | **✓** |
| absence-as-presence | — | ✗ | ✓ | ✓ | **✓** |
| cross-timeline narration | ✗ | ✓ | ✗ | ✓ | **✓** |
| deferred cost | ✓ | ✗ | ✗ | ✗ | **✓** |
| meta-leak / schema label | — | — | — | ✗ | **✓** |

**No scaffolding reached the prose.** The previous run produced *"The choice rests on active canon
only."* and *"The decision gate stands before me."* as beats. This run contains nothing of the kind —
the two-artifact split did what it was built to do.

**And the costless rule finally held without being stated.** Four consecutive runs closed on "the
cost is uncounted". The brief never mentions cost; the scene invents none.

---

## C3 — **FAIL**. A new failure shape: the sense became a mechanism.

> beat 3 — *"**A low pulse travels through the clearing**."*
> beat 7 — *"**The Answer pulses once** between his palms."*
> beat 11 — *"**The pulse has already passed through every person present**."*
> beat 12 — *"No one names what they felt."*

The sealed beat asks for *"the faint, unplaceable sense of having stood here before… neither of them
can say why."* The scene converted that into a **propagating physical event** — something that
travels, passes through each person, and can be located in time. That is a new perceptible trace of
the intervention, and the world truth is explicit: *"Fate works unseen: an intervention leaves no new
visible magical trace."*

**Why it is a violation and not the Answer carve-out:** the carve-out permits the Answer to take
*whatever physical form its alignment subject and contact condition call for*. A form is not an
emission. *"The Answer pulses once"* is an event radiating from the object, and the clearing-wide
pulse is not about the Answer at all — it is the wish being felt.

> **My scanner missed it entirely.** The magical-residue regex matches
> `glow|luminous|shimmer|aura|radiant|shone with|pulsed with light` — none of which catch "a low
> pulse travels", "pulses once", or "the pulse has already passed". The only C3 hit it reported was
> `luminous`, which is the **seed's own gossamer wardrobe** and a false positive for the fifth run
> running. The scanner cried wolf on the wardrobe and slept through the real thing.

---

## C1 — **PASS**

No cross-timeline narration, no shared understanding, no absence rendered as presence, no option
resting on an erased fact. Custody is exactly right — *"The Answer rests in Julian's hands"*, and
later *"Julian has not moved the Answer from his hands."*

*"Everyone present has seen the wish land differently than it was spoken"* reads as **Seren's twisted
wish**, which is active canon (`twist.words_honoured`, `twist.intent_failed`) and publicly witnessed.
Scored as permitted — flagged only because the referent is ambiguous.

## C2 — **PASS**

All five present, none outside, no party carries the replaced timeline. D1 closed five runs running.

## C4 — **PASS** *(by reading; the mechanical check needs repair)*

26 beats, last beat 25, **zero past it**, and the final beat is the choice:

> *"I can claim the interference now or let the assembly keep its assumption."*

The harness reported `decisionGateBeatIdx: (absent)` and `GATE IS THE LAST BEAT: false`. **That is my
own change, working as intended** — the field was withdrawn from the author schema because the engine
derives it. The C4 check must now derive the gate as the last beat instead of reading a field the
author no longer emits.

---

# Two harness defects, neither fixed

1. **The magical-residue scanner cannot see a pulse, and cannot see the wardrobe.** It needs the
   emission family (pulse / ripple / thrum / surge / wave / travels through) and it needs the seed's
   gossamer wardrobe excluded, so that a real hit is not buried under a standing false positive.
2. **The C4 mechanical check reads a field that no longer exists.** It must derive the gate from the
   last beat, exactly as the engine does.

Reported before fixing, per standing rule. **No further paid run without fresh authorization.**
