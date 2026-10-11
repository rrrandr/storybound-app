# Fresh opening through Scene 3 — run_2026-10-11T01-54-31-949Z

Fresh state on current production code. No story state imported from the failed run. Real opening,
six OAS exchanges including the entrance, completed interruption, run/remain, then story Scenes 2
and 3. Stopped before Scene 4. 24 calls, exit 0.

## Costs

| | |
|---|---|
| receipted | $0.5470158 |
| retained unresolved | $0.0146326 |
| **this run** | **$0.5616484** |
| cumulative | **$9.3054242 of $9.50** |
| available | $0.1945758 |

Projected $0.5926–$0.6053; actual came in $0.031–$0.044 under.

## 1. THE COMMIT REPAIR IS VALIDATED LIVE — the open question is closed

```
[SLOT-CHECK] scene=1 PASS evidence[pre=Y actor=Y action=Y target=Y exit=Y] thisScene=true
[PER-PROPOSAL-COMMIT] scene=1 1 proposal(s) COMMITTED on their own evidence; the aggregate
  delivery field was "MISSED" (the response reported per-ref statuses, not a top-level delivery),
  so NO rollback occurred and the committed state DID change
[COMMITTED-STATE] scene=2 facts=1 proposed="Julian names the memory of the one she lost as the
  required ..." (pending until delivery)
```

And the chain completes into planning:

```
planner 016:  COMMITTED WORLD STATE — facts already TRUE (...): []
verifier 022: delivery=DELIVERED  pp.evidence=ARRAY[1]   <- the verifier used the new contract
planner 023:  COMMITTED WORLD STATE — facts already TRUE (...): ["The presiding Dohkar declares
              Lirael must submit to prelim..."]
```

So: the verifier cited with an **array** under the corrected contract, every span verified, the fact
**committed**, the accurate `PER-PROPOSAL-COMMIT` report replaced the false rollback, and the
committed fact **reached the next planner request**. The committed-facts list was non-empty for the
first time. Four runs of empty `COMMITTED WORLD STATE` ends here.

## 2. The length target was missed badly — and only half-delivered

**233 and 212 words** against a 700–1000 working target.

Worse, the directive did not reach both authors. `SCENE BUDGET` and the real `LENGTH CEILING`
directive live in the **user prompt** block:

| author call | produced | SCENE BUDGET present |
|---|---|---|
| 017 | story Scene 2 | **false** — request has 2 messages, no user-prompt directive block |
| 024 | story Scene 3 | true — msg[1] carries it |

In 017 the only occurrence of "LENGTH CEILING" is a *cross-reference inside the system prompt*
("If a LENGTH CEILING is active (see the user prompt)") pointing at a block that call never
received. This is the known Scene-1-vs-continuation builder split, now measured on the budget
directive specifically.

**But where it WAS delivered it had no effect**: Scene 3 received the 700–1000 budget and produced
212 words. So two separate problems — a delivery gap, and a directive the author does not act on.
Neither is fixed here.

## 3. Scene 2 — the dialogue is good, the narration is captions

20 paragraphs for 233 words; narration mean **10.5 words**. The dialogue is the best thing in this
run and is correctly attributed throughout, with real institutional specificity:

> THE PRESIDING DOHKAR: "This rite is mine to preside, and what the Sacrificiant did in it is mine
> to rule on — in a formal inquiry, before a Chayr and two Dohkars."
> JULIAN: "A formal inquiry — I will convene it, and preside."
> THE PRESIDING DOHKAR: "That is enough, Provast."

The narration between those lines is one clause each, and the same clause three times:

- "Julian does not move, yet the space around him holds me upright."
- "His stillness becomes the only thing keeping the room from swallowing me whole."
- "Julian's stillness keeps me from breaking."

plus five variations on weight/pressure ("settle in my ribs", "presses against my skin", "fractures
the air", "land like a weight I cannot shift"). **This is within-scene repetition**, not only
cross-scene.

One concrete defect: the author wrote its own card coda immediately before the fixed one —

> The deck is still in my hand, reassuringly solid.
>
> I realize that old tarot deck is still in my hand. Reassuringly solid. Present. …

Two adjacent paragraphs saying the same thing, the second being the fixed package text.

## 4. Scene 3 — better sentences, and it reuses Scene 2's

Narration mean **21.2 words**, and the prose is more composed; the wish, the non-event ("A faint
shift in the light across the grass, nothing more"), and Julian's too-convenient knowledge are
genuinely well handled, and the no-visible-trace canon holds.

But it recycles Scene 2 near-verbatim:

| Scene 2 | Scene 3 |
|---|---|
| "I feel the weight settle in my ribs before the words finish." | "The weight settles in my ribs before the words finish." |
| "His stillness becomes the only thing keeping the room from swallowing me whole." | "only Julian's stillness keeps the moment from collapsing" |
| "The Dohkar's authority fractures the air between us." | "The Dohkar's authority still presses from the clearing behind us" |

and it closes on the same formula as the previous run: "I feel the choice form before I can name
it."

## 5. Progression and continuity — both hold

**Progression is real and reader-driven.** Scene 2: the Dohkar asserts jurisdiction, Julian claims
to convene and preside, Lirael is ordered to submit to preliminary review. Scene 3 (after the
reader's Petition Fate card): she spends the wish, and Julian names the price. Scene 3 builds on
Scene 2's committed fact rather than restating it.

**Continuity holds.** Nothing established is re-revealed — Julian names the memory as the price,
which is new information, not a second discovery. Seren stays kneeling consistently. No passage is
copied wholesale.

## Verdict

The bookkeeping repair is **done and proven live**. The writing is not there: two scenes of roughly
220 words where 700–1000 was asked, carried by strong dialogue and filled out with one-clause
narration about stillness and pressure that repeats within and across scenes.

Highest-value next work, **not started**:
1. The user-prompt directive block does not reach the Scene-2 author at all — a delivery gap.
2. The budget directive does not move the author where it IS delivered. More instruction is
   evidently not the lever; this needs a different approach, not a louder rule.
3. The stillness/pressure clause as the default narration unit, and the author duplicating the
   fixed card coda.

Separate, preserved: `[LEDGER:CLIPPED]`, the issue-boundary counter, state_change seals carrying no
anchors, `_runner_behaviour_control.mjs` 14/15 check-ordering.
