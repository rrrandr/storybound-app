# Ten-scene writing evaluation — run_2026-10-10T13-32-11-777Z

Read in full before any change was made. Nine CG scenes plus the OAS entrance = the ten-scene
corpus; the runner halted deliberately at the known counter defect
(`_isLastSceneOfIssue()=false at position 9 of 10`) and did **not** generate an eleventh scene.

## Spend

| | |
|---|---|
| receipted this run | $1.1011401 |
| retained unresolved | $0.0604049 |
| **run total** | **$1.1615450** |
| prior exposure | $7.5813079 |
| **cumulative** | **$8.7428530 of $9.25** |
| available | $0.5071470 |

69 calls. Several `ministral-8b` calls ended DISPATCHED-NO-RESPONSE (`Request context disposed`)
and are retained as unmeasured exposure at ~$0.0009 each, not written off.

## 1. Does developed prose persist beyond Scene 2? — NO. It oscillates.

Narration paragraphs only (speaker lines excluded):

| scene | words | narration mean | developed |
|---|---|---|---|
| 1 | 181 | 19.6 | 100% |
| 2 | 171 | 13.6 | 33% |
| 3 | 134 | 10.1 | 22% |
| 4 | 189 | 17.7 | 90% |
| 5 | 96 | 9.1 | 50% |
| 6 | 151 | 12.0 | 50% |
| 7 | 208 | 20.8 | 90% |
| 8 | 99 | 8.1 | 11% |
| 9 | 118 | 11.0 | 30% |

Three scenes are genuinely written — 1, 4 and 7. Scene 1 carries real observation ("the gesture of
a man finishing a task he never wanted"); Scene 7 sustains it for ten paragraphs. Scenes 3, 5, 8
and 9 are captions. Scene 8 is the floor: 99 words, 11% developed, nine of twelve paragraphs a
single clause ("The words land too quickly." / "Julian's grip has not eased." / "The Dohkar's gaze
has not moved.").

This is better than the previous run, where 8 of 9 scenes were captioned. It is not persistence.

## 2. THE DOMINANT DEFECT — scene length collapsed

Every scene is between **10% and 21% of the ~1000-word ceiling**; the mean is **150 words**.

The pacing rewrite removed the beat-count floor and every "target" formulation, which was correct
for the contradiction it fixed — but nothing replaced the pressure to cover the scene's ground. The
author now stops at roughly a sixth of its budget. The ceiling is being honoured; the scene is not
being written. This is the single highest-value thing to address, and it is a direct and
foreseeable consequence of the previous repair.

## 3. Is dialogue correctly attributed? — YES, in this run.

Speaker lines render properly throughout: `THE PRESIDING DOHKAR:`, `JULIAN:`. The
`kind="narration", speaker=null` failure that swallowed the Dohkar's speech **did not recur**. One
qualification, stated rather than scored: Scene 7 contains no dialogue at all, and its drifting
murmur ("the wish found its own path without her price") is unattributed by design — "No one claims
them." That is a choice, not a misclassification.

The defect stays open as a known failure mode; one clean run is not a fix.

## 4. Do progression and continuity hold? — NO.

**Every scene ends on an unmade choice, in nearly the same sentence.**

```
3: The choice between accepting the restrictions or challenging his named role presses...
4: The witnesses wait. The choice between accepting his shielding contact or breaking it...
5: Accept the success the wish granted, or reject the source that made it possible.
6: The choice settles like a sealed scroll I am not permitted to open.
7: I stand between the path the witnesses took and the spellbinder's unmoving gravity.
8: I stand between the path the witnesses took and Julian's unmoving gravity.
9: Accept the denial or challenge the inconsistency in his hold.
```

Scenes 7 and 8 close on the same sentence with one noun swapped.

**Verbatim dialogue reuse across scenes** (exact paragraph matches — 2):
- `JULIAN: "This matter concerns me as well."` — scenes 3 and 6 (and Scene 1, as
  `This matter concerns me as well.` without quotes: three occurrences in nine scenes)
- `JULIAN: "I had no part in its turning."` — scenes 8 and 9

**Scene 9 restates Scene 8.** Beyond the verbatim line, both carry "The words land too quickly",
"Julian's grip has not eased", "The Dohkar's gaze has not moved" and the same closing dilemma. Only
9% of Scene 9's paragraphs match Scene 8 exactly, so this is near-duplication rather than copying —
the overlap is in substance, not characters.

**A continuity regression.** Scene 2 reveals the name outright — `JULIAN: "The one you lost was
your sister."` Scene 5 then re-reveals it as new: "A name rises from the blade, the one I lost. /
The sister I thought gone speaks through the pulse." The story discovers the same fact twice.

**Recurring furniture.** "Seren remains kneeling, composed" appears in scenes 1, 5, 6, 7 and 9;
"the clearing holds its breath" in 3 and 5; "presses against my ribs" in 4, 7 and 8.

**Nothing resolves.** The inquiry is announced (3), supervision imposed (3–4), the witnesses leave
carrying rumour (6–7), Julian denies involvement (8–9). Nine scenes in, no choice the reader made
has produced a consequence that closes.

## Verdict

**Ten accepted records, not a good ten-scene story.** The machinery held — no canon halt, no silent
planner failure, correct attribution, a complete corpus inside budget. The writing did not: the
author underwrites by a factor of six, developed prose appears in three scenes of nine, and the last
third of the story circles one unmade decision in recycled phrasing.

Highest-value next work, in order, **not started**:
1. Scene length — restore coverage pressure without reinstating a beat quota.
2. The closing-choice formula and the repetition in scenes 8–9.
3. Scene 5's re-revelation of Scene 2's fact.

Separate, preserved, not folded in: `[LEDGER:CLIPPED]` (315 characters removed from a committed
record) and the issue-boundary counter defect.
