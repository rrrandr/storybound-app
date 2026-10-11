# Ten-scene writing evaluation — run_2026-10-10T13-32-11-777Z

**Labelling corrected:** the nine generated passages are story **Scenes 2–10**. The OAS entrance is
Scene 1. An earlier version of this file numbered them 1–9, which made every comparison against the
previous run misleading.

The runner halted deliberately at `_isLastSceneOfIssue()=false at position 9 of 10` and generated
**no** eleventh scene.

## Spend

receipted $1.1011401 + retained unresolved $0.0604049 = **$1.1615450** this run, 69 calls.
Cumulative **$8.7428530 of $9.25**; available **$0.5071470**. Several `ministral-8b` calls ended
DISPATCHED-NO-RESPONSE and are retained as unmeasured exposure, not written off.

## THE ROOT CAUSE: delivered events never become committed facts

Every later planner request carries `COMMITTED WORLD STATE: []`. The console says why, once per
scene, for all nine:

```
[SLOT-CHECK]        scene=3 PASS evidence[pre=Y actor=Y action=Y target=Y exit=Y]
[SLOT-EVIDENCE]     scene=3 exit_ev=""While the inquiry proceeds you will remain under supervision.""
[STATE-TRANSITION]  PLANNED_EXIT="Lirael is now under formal investigation with stated restrictions"
                    ACTUAL_EXIT="Lirael is under formal investigation with restrictions and supervision"
                    MATCH=FAIL
[PENDING] state_change prop:3:3 status=DELIVERED :: DELIVERED but its evidence is not a verbatim
                    quote from the prose — not committed
[ROLLBACK] transition=rejected scene=3 delivery=MISSED → replan from unchanged CommittedState
                    (pendingIntent kept)
```

The verifier says DELIVERED. The slot check PASSES on all five slots with a quote that **is**
verbatim in the prose. The per-proposal `evidence` string is a paraphrase, so the commit is refused,
the transition rolls back, and the event is forwarded as *pending intent* — in a world state that
never changes. That is the stall engine, and it explains the repetition far better than word count:
the planner is repeatedly told its prior events are still undelivered, so it keeps proposing them.

**The quote check is not the defect and has not been weakened.** The verifier prompt already demands
a verbatim substring twice over — "never a paraphrase and never an inference", "a DELIVERED with no
verbatim quote is treated as NOT delivered" — and `ministral-8b-2512` does not comply. No prompt gap
to close.

### The repair, and its limits

The same verifier reply already contains a quote that verifies: the scene's `slots_check`
`exit_state_evidence`. The per-proposal path now falls back to it — exactly as
`precondition_evidence` has always fallen back to the shared slots check — still mechanically
verified verbatim against the prose, and **only when the scene has a single proposal**, so a shared
quote can never be mis-attributed between competing ones. Nothing is fabricated and nothing is
promoted on a paraphrase.

A refusal with no verbatim quote anywhere is now reported as **`evidence_unverifiable`** —
"UNVERIFIED DELIVERY, not a finding that the event did not happen" — so the two are distinguishable
downstream instead of both arriving as "missed".

`_evidence_path_control.mjs`: 9/9, including the measured Scene 3 case committing, a two-proposal
scene refusing the shared quote, a fabricated quote still refused, and a verbatim per-proposal quote
still committing on its own.

## The repeated denial is NOT the same cause — withdrawn

I claimed the duplicate denial was explained by the commit failure. The assigned events say
otherwise:

```
[EVENT-SLOTS] scene=8 actor="Julian" action="tightens fingers around wrist" target="Lirael's wrist"
[EVENT-SLOTS] scene=9 actor="Julian" action="denies involvement" target="the murmur about the wish"
```

Story Scene 9's assigned event was the **wrist grip**, not a denial. The denial
(`JULIAN: "I had no part in its turning."`) appeared in that scene as **unassigned prose** the
author volunteered ahead of its schedule. Committing the wrist-grip event would therefore NOT have
registered the denial as a delivered milestone, so the commit repair does not address this.

The accurate statement: nothing tracks a milestone-relevant event the author puts on the page
before its assignment, so the scheduler assigned a *first* denial in Scene 10 for something the
reader had already read in Scene 9. That is a separate defect and is **not fixed here**.

## Length is still a requirement

Separate from the withdrawn "factor of six": two runs averaging 224 then 150 words are too short,
and a ceiling alone never said what a finished scene is. A **SCENE BUDGET of 700-1000 words** now
sits beside the unchanged ceiling — a writing budget for the whole scene, explicitly **not** a beat
count, sentence minimum, or reason to add beats. It also says what the words are for: consequential
interaction (what one person does to another and what it costs, what is said and what the saying
changes, a decision taken and acted on) and **not** further description of stillness, of someone
watching, of a room emptying, or of a choice felt but not made. A scene well under budget is named
as UNDERDEVELOPED — its moments too thin, not too few.

**The output allowance accommodates it.** Measured from the run's own 9 scene-author calls:
`maxTokens=8000`, `outTok` 3102-3597, of which `reasoningTok` 554-1458, leaving ~1644-2998 of
visible output for ~150 words of prose plus the per-beat metadata. Adding 550-850 words of prose
costs roughly another 750-1150 tokens, so the worst observed case lands near 5300 of 8000. No change
needed, and none made.

## Prose: what the sentence statistics do and do not show

| story scene | words | narration mean | clause-level |
|---|---|---|---|
| 2 | 181 | 19.6 | 100% |
| 3 | 171 | 13.6 | 33% |
| 4 | 134 | 10.1 | 22% |
| 5 | 189 | 17.7 | 90% |
| 6 | 96 | 9.1 | 50% |
| 7 | 151 | 12.0 | 50% |
| 8 | 208 | 20.8 | 90% |
| 9 | 99 | 8.1 | 11% |
| 10 | 118 | 11.0 | 30% |

**Correction to the length claim.** The mean fell from roughly **224 to 150 words** across the two
full runs — not from 1000 to 150. The ~1000-word figure is a **ceiling, a maximum, not a target**,
and `SCENE COVERAGE` remained in the prompt throughout, so coverage pressure was not absent.
"Underwritten by a factor of six" treated a maximum as an obligation and is withdrawn. **No beat
floor and no word minimum should be added on the strength of this report.**

**And the statistics are not a literary verdict.** Scenes 2, 5 and 8 score well because their
sentences carry clauses — but they suspend the same moment rather than developing it: Julian's
stillness, his "unmoving gravity", the witnesses departing, and a choice left unmade recur through
all three. Scene 8 is the clearest case: 208 words, 90% clause-level, and its content is the
clearing emptying while nobody decides anything. Longer sentences did not produce development.

Closing formulae, story scenes 8 and 9:

```
8: I stand between the path the witnesses took and the spellbinder's unmoving gravity.
9: I stand between the path the witnesses took and Julian's unmoving gravity.
```

**Concrete continuity error:** Seren **rises** in story Scene 7 ("Seren rises, her small face
unreadable.") and in Scene 8 "Seren remains kneeling, small and composed."

Verbatim dialogue reuse: `JULIAN: "This matter concerns me as well."` in story scenes 4 and 7 (and
unquoted in Scene 2 — three times in nine passages); `JULIAN: "I had no part in its turning."` in
scenes 9 and 10. Story Scene 10 restates Scene 9 in substance, though exact-paragraph overlap is
only 9%.

Dialogue attribution was **correct** throughout: speaker lines render properly and the
`kind="narration", speaker=null` failure did not recur. That defect stays open; one clean run is
not a fix.

## Verdict

**Ten accepted records, not a coherent ten-scene story.** The machinery held. The story did not
advance because the world never changed: nine scenes of delivered events, nothing committed.

Next work, grounded in the above and **not started**:
1. Confirm, on the next authorized run, that committed facts are now non-empty — the repair above
   is proven at the adjudicator, not yet end to end.
2. The milestone scheduler re-assigning an event already on the page.
3. The closing-choice formula and the suspended-moment repetition — a craft problem, not a length
   problem.

Separate, preserved, not folded in: `[LEDGER:CLIPPED]` (315 characters removed from a committed
record) and the issue-boundary counter defect. The remaining $0.5071470 is **not** being spent on a
partial run.
