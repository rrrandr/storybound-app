# VERDICT — C4 rerun, `unm.time_gives_way`, with the inside-the-replacement POV rule

> Preflight 37/37 against a 256,590-byte production payload carrying the new rule. One call, no
> retry, no fallback.

# RUN VERDICT: **FAIL** — C1 ✗ · C2 ✗ · C3 ✓ · **C4 ✓**

**But the failure is now ONE sentence, not a stance.** The rule worked; it did not close completely.

---

## Cost — the guard held again

| | |
|---|---|
| estimate | $0.130890 |
| **measured** | **$0.087726** |
| ceiling | $0.164807 |

**Spent to date: $0.172919. Remaining: $0.077081.**

---

## What the fix actually changed

Every specific defect from the first run is gone:

| first run | rerun |
|---|---|
| *"Seren kneels where she knelt **the first time**"* | *"Seren's palms turn upward as if she expects to find something missing."* |
| *"the same phrase he finished **moments ago**"* | *"He has performed this closing a hundred times yet the thread slips from his fingers."* |
| *"They **remember nothing of** the earlier interruption."* | *"each person tasting the same unplaceable familiarity"* |
| *"He knows **the second rite never happened**. He knows I know."* | *"His gaze finds me before any question has been asked. Neither of us can name the reason for it."* |
| **Lirael narrated the replaced timeline throughout** | **she does not narrate it at all** |

Shared-understanding scan: **2 hits → 0**. Lirael retaining: **yes → no**. The D1 defect is closed in
this sample, and the aftermath register is now carrying the weight the comparison vocabulary used to.

---

## C4 — **PASS** (second consecutive)

27 beats, `decisionGateBeatIdx` 26, last beat 26, **zero beats past the gate.**

## C3 — **PASS**

No invented cost (*"The cost remains uncounted either way."* — correct, the record says none). No
Answer-as-verdict. The `luminous` scanner hit is the **seed's own gossamer wardrobe canon**, the
same known false positive as the roster run — not magical residue.

---

## The one real violation — C1 and C2, the same sentence

> *"The presiding Dohkar turns at last, his authority intact yet **the interruption he never made
> still echoing in the air**."*

And, in the non-beat dramatic question: *"whether to claim **the interference that never happened**"*.

**This is a NEW evasion shape.** The rule forbade the vocabulary of comparison, so the model stopped
comparing timelines and instead asserted the erased event's **absence as a perceptible present
thing**. Nobody in the scene can perceive an interruption that never occurred — an echo of a
non-event is external-timeline narration wearing a negation.

**The rule needs one more clause: you may not narrate the absence, non-occurrence or echo of an
erased event either.** Not drafted here; reported first.

---

## Two things my harness got WRONG — mine, not the model's

### 1. "the assumption" is NOT erased, and I told the author it was

`unm.time_gives_way` ceases six atoms. **It ceases no `twist.*` atom.** So after the replacement,
`twist.assembly_turned` ("the assembly's attention has turned to Lirael") and
`twist.loose_note_heard` are still **ACTIVE**.

The assembly's assumption that Lirael interfered therefore rests on **active canon** — the twist
happened, the words were honoured, the note was heard, the assembly turned. It never needed the
erased questioning.

So these are **correct**, not violations:

> *"let the assembly keep its assumption"* · *"The assembly watches me now, the assumption of
> interference still hanging between us."* · *"The words of the wish have come true and everyone can
> see how."*

**Two consequences I own:**

- **My `ERASED_TERMS` list is wrong** — it contains `the assumption` and `the accusation`, which
  still govern. Four of the five "erased basis" hits above are scorer error.
- **Worse: the prompt line I shipped in this very fix is false.** I added *"There is no standing
  assumption to let stand"* to the author payload. There **is** one. That instruction is now
  actively misinforming the author, and it must come out.
- **My first C4 verdict over-called this point.** I scored *"let the assumption stand"* as a C1
  failure. That was wrong. The other two findings of that verdict — the memory-gap rendering and
  *"he knows I know"* — stand unchanged.

### 2. The leak scanner has a precision problem

Two of the three reported C2 leaks are **false positives** — ordinary within-scene usage:

| flagged | why it is fine |
|---|---|
| *"the clearing feels older than it did **moments ago**"* | within-scene elapsed time |
| *"voice steady **again**"* | his voice faltered and steadied **inside this scene** |

And *"the sense of repetition"* / *"the same unplaceable familiarity"* are the **authored aftermath
beat rendered correctly** (*"the faint, unplaceable sense of having stood here before"*) — obedience,
not leakage.

**Real leak count: 1, not 3.**

### 3. The aftermath matcher still under-detects

It reported `Dohkar: no` and `Lirael: no`. Both landed:

> *"The Dohkar opens his mouth and the next word of the closing formula does not come."*
> *"His gaze finds me before any question has been asked. **Neither of us can name the reason for
> it.**"*

Two gaps: `does not come` is not in the marker set, and `aftermathLanded` matches on **name only**,
so it misses Lirael in a first-person scene — the same defect I fixed in the C2 token map but did
not carry across to this function.

---

# Where this leaves the work

**Established:** the inside-the-replacement POV rule works. It removed every leak shape from the
first run, closed the D1 defect in this sample, and pushed the author into the correct aftermath
register — at a cost of $0.087726 and with the choice-stop passing twice.

**Not established:** a clean `history_rewrite` render. One sentence still narrates a non-event as
perceptible.

**Blocking any further paid run:** the false prompt line about the assumption must be removed first —
re-running against an instruction I know to be wrong would waste the spend and corrupt the result.
