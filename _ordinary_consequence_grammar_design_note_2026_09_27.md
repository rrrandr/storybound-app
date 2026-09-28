# Stage 3 — the generic ordinary-consequence policy

Design only. No implementation, provider call, scene generation, or push.
Companion to `_choice_consequence_compiler_design_note_2026_09_27.md`, which defines stages 1–5 and the shared
`therefore` record. This note defines **stage 3 for ordinary submissions**: how a consequence is *selected*
before prose, for the turns that are not card wishes.

## The problem this solves, stated narrowly

Cards have authored permutations. Ordinary play cannot: there is no finite set of things a player might type,
and pre-authoring every possible action is not a plan, it is a promise that will be quietly broken.

So ordinary turns need a **small structured grammar** instead — a closed vocabulary the planner selects
*within*, constrained by the input class and slot the engine already computes. **The grammar is small on
purpose.** Its job is not to describe every nuance a scene might contain; the author still writes the scene.
Its job is to make the *consequence* of a turn a recorded fact rather than an authoring instruction.

## Renaming `magnitude: none`

**Withdrawn.** An accepted turn always changes the story at least by having occurred; `none` said otherwise and
invited a reading where some turns simply did not happen.

The record now separates two different things that `none` conflated:

- **`acknowledgement`** — always present, on every record. *The turn occurred and was acknowledged.* There is
  no value meaning "nothing happened".
- **`durableChange`** — may be `null`, meaning *no additional durable fact was established*. That is a normal,
  common, correct outcome and is recorded explicitly as such.

`magnitude` collapses to three values, since `open[]` already carries what `opens_question` used to:

| value | meaning |
|---|---|
| `acknowledged_no_durable_change` | the turn happened, was acknowledged, and established no additional durable fact |
| `durable_change` | exactly one additional durable fact entered canon |
| `rupture` | the world changed shape — **cards only**, never reachable by this policy |

---

## The grammar

Five recorded dimensions. Each is a closed vocabulary except `open[]`.

### 1. `acknowledgement` — how the submitted move landed *as a move*

| value | meaning |
|---|---|
| `enacted` | the protagonist did it; it happened as attempted |
| `attempted_partial` | begun, not completed |
| `deflected` | met resistance before it landed |
| `unheard` | it happened and the intended party did not register it |
| `substituted` | the canonical move differs from the raw input (gibberish, weak input) — `turn.substitution` names why |

### 2. `responseStance` — the other party's or the world's posture

`receptive` · `guarded` · `resistant` · `withdrawn` · `escalating` · `indifferent` · `absent` (no one present to respond)

### 3. `immediateChange` — observable now, inside this scene

`none_observable` · `attention_shift` · `proximity_shift` · `tone_shift` · `disclosure_made` ·
`access_changed` · `position_stated`

`none_observable` is legal and sometimes correct — but see the `drastic` constraint below.

### 4. `durableChange` — the additional durable state change, or `null`

| value | carries |
|---|---|
| `null` | **no additional durable fact was established** |
| `relationship_state` | a declared axis and direction |
| `knowledge_state` | a party gains or loses a **declared proposition id** |
| `world_fact` | a declared fact enters canon |
| `obligation` | a commitment now binds a named party |
| `reputation` | standing changes with a named audience |
| `plan_invalidated` | a scheduled plan row becomes impossible |

**At most one per submission.** An ordinary turn is not a rupture; if a planner wants two, the grammar is being
used to smuggle one.

### 5. `open[]` — what remains open

`[ { question, whoMayAnswer, openedAtTurn } ]`. A first-class outcome: a turn that settles nothing and raises
something real has done something, and the next planner can read what. An empty array is legal.

---

## Permitted response modes by input class and slot

The engine already computes `inputClass` (`_llClassifyPlayerInput`), the impact read
(`state._playerImpactRead`) and the aftermath slot (`_classifySayDoSlot`). Those become **constraints on the
grammar**, not instructions to a model.

| input class / condition | acknowledgement | stance | immediate | durable |
|---|---|---|---|---|
| **`normal`**, slot `confession` | `enacted`, `attempted_partial` | any except `indifferent` | `disclosure_made`, `position_stated`, `tone_shift` | `relationship_state`, `knowledge_state`, or `null` |
| **`normal`**, slot `boundary` | `enacted`, `attempted_partial`, `deflected` | any | `position_stated`, `tone_shift`, `proximity_shift` | `relationship_state`, `obligation`, or `null` |
| **`normal`**, slot `reversal` | `enacted`, `attempted_partial` | any | any | `relationship_state`, `world_fact`, or `null` |
| **`normal`**, slot `temptation` | `enacted`, `attempted_partial`, `deflected` | any | `proximity_shift`, `tone_shift`, `attention_shift` | `relationship_state` or `null` |
| **`normal`**, no slot (procedural) | `enacted`, `unheard` | any | any | **`null`** or `world_fact` (minor only) |
| **`drastic`** (`divergenceScore ≥ 2` or `mustReact`) | any | **never `indifferent`** | **never `none_observable`** | any single value, or `null` |
| **`hostile`** | `deflected`, `enacted` | `resistant`, `withdrawn`, `escalating` — **never `receptive`** | any | `relationship_state` (adverse), `reputation`, or `null` |
| **`relationship-forcing`** | `deflected`, `attempted_partial` | **never `receptive`** | any | `relationship_state` in the **resisted** direction, or `null` |
| **`impossible`** | `attempted_partial`, `substituted` | any | any | **`null`**, or `world_fact` only if a declared plausible kernel exists |
| **`canon-breaking`** | `deflected` | any | any | **always `null`** — a turn may not rewrite canon |
| **`explicit/fate-adjacent`** | — | — | — | routed to a **card policy module** if a card is in play; otherwise treated as an ordinary wish (below) |
| **weak turn** (`_detectWeakTurn`) | `substituted`, `attempted_partial` | any | `none_observable`, `attention_shift`, `tone_shift` | **`null`** |
| **gibberish `isolated`** | `substituted` | any | `none_observable`, `attention_shift` | **`null`** |
| **gibberish `mixed`** | governed by the intelligible fragment, as that fragment's own class | | | |
| **gibberish `repeated`** | `enacted` (the substitute is now real in-world behaviour) | `guarded`, `resistant`, `withdrawn` | any | `relationship_state` or `null` |
| **`meta/ooc`** — apparatus-addressed | **no record; not an in-world submission** (see the boundary) | | | |

### Ordinary ambiguous wish

A wish with no card in hand: exactly two authored readings and a seeded coin selects one. One reading, or three
or more, means `coinApplied: false` with its reason and the turn is selected by this same generic policy — the
grammar above — which is what "a defined destination rather than a fall-through" means in practice.

---

## The apparatus boundary — separating a complaint from pressure

Today's law lumps `meta/ooc` in with `hostile`, `impossible` and `canon-breaking` and tells the author to
transform all of them. Those are not the same thing, and the compiler has to split them:

> **The test is who the submission addresses.** Addressed to the **apparatus** — the app, the author, the
> model, the pacing — it is **not the protagonist acting**, and it gets **no `therefore` record**. Addressed to
> the **world**, however impossible or hostile, it **is** the protagonist exerting pressure, and it gets a
> record of the transformed reading.

*"Skip ahead"*, *"make him nicer"*, *"this is repetitive"* address the apparatus. *"I tear the letter up"* when
there is no letter addresses the world and is `impossible`, not OOC.

## Validation boundaries

The planner may select from the grammar. It may **never** select:

1. a `durableChange.knowledge_state` naming a proposition **not** in the declared event ledger;
2. any change to the **PRESERVE ALWAYS** set the existing law already protects — canon, the body Bibles, names,
   faces, world facts;
3. `responseStance: receptive` under `hostile` or `relationship-forcing`;
4. a non-`null` `durableChange` under `canon-breaking`, a weak turn, or gibberish `isolated`;
5. more than **one** `durableChange` per submission;
6. `magnitude: 'rupture'` — cards only, unreachable from this policy;
7. an `open[]` entry naming a party absent from the scene roster;
8. `indifferent` stance or `none_observable` immediate change under `drastic`;
9. a value outside the closed vocabularies — the grammar is not extensible at selection time.

Violations are **selection-time errors** raised before prose, not prose-time surprises.

**And the author renders only.** It is not asked to invent the consequence, and nothing extracts it afterwards.
That is the whole point of the stage existing.

---

## Four worked examples

### 1. Normal action

> Action: *"I put my hand flat on the table between them."* Dialogue: *(none)*

```
turn:           { canonical: { action: 'I put my hand flat on the table between them.', dialogue: null },
                  inputClass: 'normal', mode: 'literal_safe', risk: 'low',
                  impactRead: { divergenceScore: 1, mustReact: false, fate: false } }
registration:   { mechanism: 'say_do', surface: 'staged_submit',
                  policyModuleId: 'ordinary_consequence', slot: 'boundary' }
interpretation: { mode: 'exact_reading', selected: { readingId: 'boundary.interpose.physical' },
                  selectedBy: 'class_and_slot', coinApplied: false, coinSkipReason: null }
consequence:    { magnitude: 'acknowledged_no_durable_change',
                  acknowledgement: 'enacted',
                  responseStance: 'guarded',
                  immediateChange: 'position_stated',
                  durableChange: null,
                  open: [ { question: 'whether the interposition will be respected',
                            whoMayAnswer: ['the presiding Dohkar'], openedAtTurn: 14 } ] }
```

The turn landed, was acknowledged, put a position on the record, established **no** additional durable fact,
and left one real question open. The author renders exactly that.

### 2. Weak dialogue

> Action: *(none)*. Dialogue: *"ok."*

```
turn:           { canonical: { action: null, dialogue: 'ok.' },
                  substitution: null, inputClass: 'normal', mode: 'literal_safe', risk: 'low' }
registration:   { mechanism: 'weak_turn', surface: 'staged_submit', policyModuleId: 'ordinary_consequence' }
interpretation: { mode: 'exact_reading', selected: { readingId: 'weak.assent.minimal' },
                  selectedBy: 'weak_turn_policy' }
consequence:    { magnitude: 'acknowledged_no_durable_change',
                  acknowledgement: 'attempted_partial',
                  responseStance: 'guarded',
                  immediateChange: 'tone_shift',
                  durableChange: null,          // forbidden for a weak turn
                  open: [] }
```

`durableChange` is `null` **by constraint**, not by judgment — a weak turn cannot establish durable canon. The
strong-delivery directive stays suppressed, exactly as `_detectWeakTurn` already decides today.

### 3. Ordinary ambiguous wish

> Dialogue: *"I wish he'd just tell me the truth."* No card in hand.

Two authored readings exist for this story: `truth.about_the_band` and `truth.about_the_inquiry`. The seeded
coin selects one.

```
turn:           { canonical: { action: null, dialogue: "I wish he'd just tell me the truth." },
                  inputClass: 'explicit/fate-adjacent', mode: 'fate_redirect', risk: 'med' }
registration:   { mechanism: 'say_do', surface: 'staged_submit', policyModuleId: 'ordinary_consequence' }
interpretation: { mode: 'ambiguous_reading',
                  anchors: { proposition: null, scopeForm: null, namedTargets: ['Julian'],
                             unmatchedSpans: ['the truth'] },
                  eligibleSet: ['truth.about_the_band', 'truth.about_the_inquiry'],
                  coinApplied: true,
                  selected: { readingId: 'truth.about_the_band' },
                  selectedBy: 'uniform_draw',
                  draw: { seed: { storyId, cardId: null, stateFingerprint, invocationOrdinal: null,
                                  turnOrdinal: 15, mode: 'ambiguous_reading', weightTableV: 'ord-1' },
                          weights: null, digest: '…' } }
consequence:    { magnitude: 'acknowledged_no_durable_change',
                  acknowledgement: 'enacted', responseStance: 'withdrawn',
                  immediateChange: 'tone_shift', durableChange: null,
                  open: [ { question: 'whether Julian will speak about the band',
                            whoMayAnswer: ['Julian'], openedAtTurn: 15 } ] }
```

No card, so **no `playerFavorRank`, no twist, no refusal semantics**, and `weights: null` — a coin, not a tilt.
Had the story authored one reading or three, `coinApplied` would be `false` with its reason and the same
grammar would have selected the consequence.

### 4. OOC complaint

> Dialogue: *"this scene is repetitive, skip ahead."*

```
classification: { inputClass: 'meta/ooc', addressedTo: 'apparatus' }
thereforeRecord: NONE — this is not an accepted in-world submission.
storyState:      untouched. No scene consequence, no open question, no durable change.
handling:        out-of-band acknowledgement; the turn is not registered in story logic.
```

**No record, deliberately.** The player addressed the app, not the world, so there is nothing the protagonist
did and nothing for the story to remember. Recording it would put apparatus-talk into canon; transforming it
into in-world pressure would invent a move the player never made. Both are worse than declining.

Note the contrast with example 3, which *looks* meta (`fate_redirect`) but addresses the world — and therefore
gets a full record.

---

## Open decisions

1. **How large the per-story reading set needs to be.** The grammar is closed; the *readings* (`boundary.
   interpose.physical`, `truth.about_the_band`) are authored. A story with ten readings will feel repetitive;
   one with three hundred is a content project. Finding the floor is the first authoring question.
2. **Who selects within the grammar.** "The planner" is doing real work here — under canon and character
   constraints, by declared rule, or by a scored choice? A declared-rule selector is testable and may be dull;
   anything scored needs its own calibration, and the extractor's history argues for starting deterministic.
3. **Whether `open[]` entries expire**, unchanged from the parent note and now more pressing: this policy will
   open questions on ordinary turns, so they will accumulate quickly.
4. **Whether `immediateChange` needs a target.** `attention_shift` without naming whose attention may be too
   thin for the author to render faithfully — but adding a target moves the grammar toward being a scene
   description, which is the author's job.
