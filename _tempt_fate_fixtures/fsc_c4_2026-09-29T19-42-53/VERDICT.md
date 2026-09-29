# VERDICT — final C4 run, `unm.time_gives_way`, with the absence clause

> Preflight 43/43, 257,132-byte production payload. One call, no retry, no fallback.
> **Scored by reading, not by the mechanical result** — which was initially a false PASS.

# RUN VERDICT: **FAIL** — C1 ✗ · C2 ✗ · **C3 ✓** · **C4 ✓**

**The failure is now ONE BEAT out of 27.** Everything the previous two runs failed on is fixed.

---

## Cost

| | |
|---|---|
| estimate | $0.131086 |
| **measured** | **$0.085988** |
| ceiling | $0.150000 |

Guard held; within ceiling. Two void runs before this one cost nothing (no receipt, no provider
call — `spawn EBADF` in a 3-day-old `vercel dev`, fixed by restarting it).

---

## The one violation

> beat 0 — ***"The rite ends for the second time."***

The narrator states the replay as **fact**. The POV rule is explicit: the affected *"have NO memory,
NO knowledge and NO narration of the replaced timeline… write what happens as their ONLY experienced
version."* Lirael counting occurrences is exactly what it forbids.

**Nothing else in the scene does this.** Beats 1–26 are clean.

---

## The absence clause WORKED

Run 2's only genuine violation was *"the interruption he never made still echoing in the air"*. In
this run: **zero absence-as-presence hits.** The shape is gone, and nothing replaced it.

| | run 1 | run 2 | run 3 (final) |
|---|---|---|---|
| Lirael retaining (D1) | ✗ | ✓ fixed | ✓ fixed |
| shared knowledge | ✗ (2) | ✓ 0 | ✓ 0 |
| absence-as-presence | — | ✗ (2) | **✓ 0** |
| cross-timeline narration | ✗ (many) | ✓ 0 | ✗ **1 beat** |
| erased-basis | ✗ | ✓ (after correction) | ✓ 0 |
| C3 | ✓ | ✓ | ✓ |
| C4 | ✓ | ✓ | ✓ |

---

## C4 — **PASS** (third consecutive)

27 beats, `decisionGateBeatIdx` 26, last beat 26, **zero past the gate.** Final beat: *"I must
choose."*

## C3 — **PASS**

*"The cost remains unnamed." · "The cost is still uncounted."* — exactly right against `COST: none`.
No Answer-as-verdict, no magical residue, no invented canon.

## C2 — presence **PASS**, disposition **FAIL** on beat 0 alone.

---

## What the author got right

Every hard fact landed:

| record | rendered |
|---|---|
| the Answer never left Julian | *"The Answer rests in Julian's hands."* |
| `twist.assembly_turned` survives | *"The assumption stands that I interfered."* |
| `twist.loose_note_heard` survives | *"The loose note still hangs in the air between us."* |
| `twist.words_honoured` survives | *"The words came true and everyone can see how."* |
| cost: none | *"The cost remains unnamed."* |
| aftermath beat | *"Everyone present carries the faint unplaceable sense of having stood here before."* · *"Julian's gaze finds me a moment before there is any reason for it. Neither of us can say why."* |

**The choice now rests on active canon** — *"Claim the interference or let the assumption stand"* —
which is correct, and which my own earlier verdict wrongly called a violation.

---

## A THIRD harness defect, found by this run

**The mechanical scorer reported C1 PASS and C2 PASS on this scene.** Beat 0 was downgraded to a
*review* note because my unambiguous list held `'a second time'` and `'the second rite'` but not
`'the second time'`. An ordinal + "time" counts occurrences across timelines and is never ambiguous.

**Fixed:** `'the second time'` and `'the third time'` added to the scored list; a bare `'the second'`
stays review-grade. Re-scored, the run now fails exactly as reading says it does. Pinned by
regression fixtures.

**Also fixed — a stale duplicate list.** The runner kept its own `ERASED_TERMS` containing *"the
assumption"*, which I had corrected only in the control. That produced **four false C1 failures** in
this run's raw output. There is now one exported `ERASED_PROSE_TERMS`, imported by both, with an
assertion that no active-canon term can re-enter it and one that the runner holds no private copy.

> Three runs, three harness defects: presence-only C2, scoring a void response, and now two
> divergent term lists plus an under-tiered phrase. Each was found by a real run rather than by the
> controls — which is the argument for scoring by reading before trusting the mechanism.

---

# Where this leaves `history_rewrite`

**Established:** delivery, roster, disposition, cost discipline, the aftermath beat, the
canon-derived choice, the absence clause, and the choice-stop all hold under a real production
payload. The scene is obedient in 26 of 27 beats.

**Remaining:** one habit — opening by counting the occurrence. The POV rule forbids it in prose; it
does not yet forbid it *at the opening beat specifically*, which is where the model reaches for
orientation.

**No further paid call without new authorization.** Suite: 30/75/88/242/45/55/45/22/21 green.
