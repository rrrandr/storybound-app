# VERDICT — C4 rerun, `unm.time_gives_way`, with the inside-the-replacement POV rule

> Preflight 37/37 against a 256,590-byte production payload carrying the new rule. One call, no
> retry, no fallback. **Final, after the scorer corrections** — the first pass of this verdict
> contained two harness errors of my own, now fixed and folded in below.

# RUN VERDICT: **FAIL** — C1 ✗ · C2 ✗ · **C3 ✓** · **C4 ✓**

**C3 and C4 passed. The earlier D1 retention and shared-knowledge failures are FIXED. C1 and C2 fail
for exactly one reason: the erased interruption was rendered as a present "echo."**

---

## Cost

| | |
|---|---|
| estimate | $0.130890 |
| **measured** | **$0.087726** |
| ceiling | $0.164807 |

Guard held; within ceiling. **Spent to date $0.172919 · remaining $0.077081.**

---

## C4 — **PASS** (second consecutive)

27 beats, `decisionGateBeatIdx` 26, last beat 26, **zero beats past the gate.** The scene reaches the
renewed decision and stops.

## C3 — **PASS**

No invented cost — *"The cost remains uncounted either way."* is exactly right against `COST: none`.
No Answer-as-verdict. The `luminous` scanner hit is the **seed's own gossamer wardrobe canon**, the
same known false positive as the roster run.

---

## FIXED by the POV rule — the whole of the first run's failure

| first run | rerun |
|---|---|
| *"Seren kneels where she knelt **the first time**"* | *"Seren's palms turn upward as if she expects to find something missing."* |
| *"the same phrase he finished **moments ago**"* | *"He has performed this closing a hundred times yet the thread slips from his fingers."* |
| *"They **remember nothing of** the earlier interruption."* | *"each person tasting the same unplaceable familiarity"* |
| *"He knows **the second rite never happened**. He knows I know."* | *"His gaze finds me before any question has been asked. Neither of us can name the reason for it."* |
| **Lirael narrated the replaced timeline throughout** | **she does not narrate it at all** |

Mechanically, re-scored with the corrected scorer:

| | run 1 | run 2 |
|---|---|---|
| cross-timeline comparison | present | **0** |
| shared understanding | 2 hits | **0** |
| Lirael retaining (D1) | **yes** | **no** |

**D1 is closed in this sample.** The aftermath register now carries the weight the comparison
vocabulary used to.

---

## The one remaining violation — C1 and C2

> beat — *"The presiding Dohkar turns at last, his authority intact yet **the interruption he never
> made still echoing in the air**."*
>
> dramatic question — *"whether to claim **the interference that never happened**"*

**Denied the vocabulary of comparison, the author asserted the erased event's ABSENCE as something
physically present.** A non-event leaves nothing to echo, hang or linger. Two sentences carry it;
nothing else in the scene does.

**Fixed forward**: the boundary now carries an explicit absence clause, and the scorer detects the
shape (`absenceAsPresence`). Not yet re-tested against the model.

---

## Two harness errors — mine, both corrected

### 1. "The assumption" is active canon, and I told the author otherwise

`unm.time_gives_way` ceases **no `twist.*` atom**, so `twist.assembly_turned` and
`twist.loose_note_heard` survive the replacement. The assembly's assumption that Lirael interfered
rests on active canon. These lines are **correct**, not violations:

> *"let the assembly keep its assumption"* · *"The assembly watches me now, the assumption of
> interference still hanging between us."* · *"The words of the wish have come true and everyone can
> see how."*

- `ERASED_TERMS` no longer contains `the assumption` or `the accusation`.
- **The false prompt line I shipped — *"There is no standing assumption to let stand"* — has been
  removed.** The payload now states the opposite: facts not listed as ceased remain fully available
  to the choice, and a standing assumption resting on active facts may remain and be addressed.
- The first C4 verdict has been annotated with the same withdrawal.

*(`"the interruption"` remains a correctly-scored erased term — `interr.dohkar_interrupted` really is
ceased.)*

### 2. The leak scanner over-fired

Two of three reported leaks were ordinary within-scene wording: *"the clearing feels older than it
did **moments ago**"* and *"voice steady **again**"*. The vocabulary is now two-tier — unambiguous
cross-timeline phrasing is scored, ambiguous temporal words are surfaced for review only (still
forbidden to the author, never scored). **Real leak count: 2 absence-as-presence sentences, and
nothing else.**

### 3. Aftermath matching was name-only

It reported `Dohkar: no` and `Lirael: no` on beats that both landed. Role-aware and first-person
matching is now carried across from the C2 token map; all four parties are recognized:

| party | rendered |
|---|---|
| **Seren** | *"her palms turn upward as if she expects to find something missing"* |
| **the Dohkar** | *"the next word of the closing formula does not come"* |
| **Julian** | *"He only watches the space between us as if it holds the missing thread."* |
| **Lirael** | *"Neither of us can name the reason for it."* |

---

# Where this leaves the work

**Established:** the inside-the-replacement POV rule works. It removed every leak shape from the
first run, closed D1, produced zero shared-knowledge hits, and held C3 and C4 — for $0.087726.

**Not established:** a clean `history_rewrite` render. Two sentences still give a non-event a
physical effect.

**No further paid call without new authorization.**
