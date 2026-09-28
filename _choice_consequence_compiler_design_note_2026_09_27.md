# Universal pre-author choice-consequence compiler

Design only. No implementation, provider call, scene generation, or push.

**Supersedes `_consequence_compiler_design_note_2026_09_27.md` as the top-level model.** That note designed a
*wish-only* therefore ledger. Wishes are not a separate kind of thing — they are the loudest case of a general
rule. The wish-only note is retained for its Tempt/Petition policy detail, which survives intact here as two
**policy modules**; its framing as the top level is discarded.

## The model

**Every accepted in-world player turn produces exactly one append-only `therefore` record, before prose is
written.** The author renders that record. Later planners consume it. Nothing infers a turn's durable
consequence from prose afterwards.

The reader never sees the ledger, never chooses a mechanic, and is never asked to adjudicate. What they see is
a story that consistently remembers what their choices changed.

---

## Inventory — what exists today

### Accepted player-turn paths

| path | entry | today's pre-author treatment |
|---|---|---|
| Literary Say/Do | `submitBtn` → literary generation | `_llPlayerInputLaw` directive |
| CG/staged Say/Do | `gnSubmitBtn` → `_advanceStagedScene(action, dialogue)` → `_completeStagedSceneFromScreenplay` | `_llPlayerInputLaw`, `_classifySayDoSlot` → `state._sayDoResolvedSlot`, `_buildStrongTurnDeliveryDirective` |
| Intimacy / OAS turn | `_handleIntimacyTurn(userSay, userDo)` | OAS turn-reply contract |
| Tempt Fate | wish text → `_recordTemptFateEvent` | Fate's-verdict prose block, `public/app.js:75601` |
| Petition Fate | `_petitionText` | same verdict block, first-petition guarantee |
| Fate/corridor card selection | multi-step card select | `_resolveStarterEventFrame` (plan-row event frame) |
| microDecision choice | in-scene decision gate | tally + the two axes |
| Weak turn | any submit | `_detectWeakTurn` → suppression of the strong-delivery rule |
| Gibberish | any submit | `_fieldGibberishState`, `_applyGibberishPolicy`, `_buildGibberishHandlingDirective` (isolated / mixed / repeated) |
| Silence / empty input | any submit | `_llClassifyPlayerInput` returns `normal / literal_safe` |
| OOC complaint, app report | `_submitFamousFateReport`, the `meta/ooc` class | routed away from story logic |

### Existing pre-author classifiers and impact directives

| mechanism | what it produces today |
|---|---|
| `_llClassifyPlayerInput(act, dia)` | `{ inputClass, mode, risk }` over eight classes: `normal`, `meta/ooc`, `hostile`, `impossible`, `canon-breaking`, `relationship-forcing`, `explicit/fate-adjacent`, `drastic` |
| `_llPlayerInputLaw(ctx)` | the **PLAYER INPUT LAW** — a prose directive telling the author how to read the turn |
| `state._playerImpactRead` | `{ divergenceScore, mustReact, fate }`, computed **before** the author runs, and already used to upgrade the class |
| `_classifySayDoSlot` | a deterministic aftermath slot (`confession` / `reversal` / `boundary` / `temptation`) |
| `_detectWeakTurn` | whether the turn carries enough content to be "visibly handled" |
| `_applyGibberishPolicy` | a three-tier substitution and its author directive |
| Fate's verdict block (`:75601`) | kernel substitution, partial leads, the first-petition guarantee |

### The finding that shapes the whole design

**This system already exists — as instructions.** `_llClassifyPlayerInput` already sorts every turn into a
class, `state._playerImpactRead` already computes divergence and must-react *before* the author runs, and
`_llPlayerInputLaw` already hands the author a policy per class. Fate's verdict logic does the same at
`:75601`. All of it is *"here is how to read this turn"* passed to a model, and none of it is recorded as a
fact anyone can later consume.

So the compiler is a **relocation, twice over**: it moves an existing classification-and-policy layer from
**instructions the author interprets** to **a record the author renders and later planners read**. The
classifiers largely stay; what changes is that their output becomes durable canon instead of prompt text.

That also explains the extractor's failure in one line: the engine already knew what the turn was, then threw
that away, wrote prose, and asked a model to read the answer back out of it.

---

## The shared `therefore` record

One schema for every mechanism. A wish is not special; it selects a different **policy module**.

```
therefore: {
  recordId, compilerV, compiledAt,
  append: true,                                   // never edited; a correction is a new record

  turn: {                                         // THE CANONICALIZED TURN that entered story logic
    raw:            { action, dialogue },         // as submitted, retained for provenance only
    canonical:      { action, dialogue },         // what story logic actually consumed
    substitution:   null | { kind, reason },      // e.g. gibberish → in-world behaviour
    inputClass, mode, risk,                       // from _llClassifyPlayerInput
    impactRead:     { divergenceScore, mustReact, fate } | null
  },

  registration: {                                 // WHO registered the turn, and HOW
    mechanism:  'say_do' | 'tempt_fate' | 'petition_fate' | 'card_select' | 'micro_decision'
              | 'intimacy_turn' | 'silence' | 'weak_turn' | 'gibberish_substitute',
    surface:    'literary_submit' | 'staged_submit' | 'oas_turn' | 'card_ui',
    policyModuleId, policyModuleV
  },

  interpretation: {                               // THE SELECTED READING
    mode:      'exact_reading' | 'ambiguous_reading',
    anchors:   { proposition, scopeForm, namedTargets, unmatchedSpans },
    selected:  { readingId, label },
    selectedBy,                                   // see policy modules
    eligibleSet, excluded: [ { id, reason } ],
    draw:      { seed: {...}, weights, digest } | null
  },

  consequence: {
    magnitude:  'none' | 'modest' | 'opens_question' | 'durable_effect' | 'rupture',
    changed:    [ { subject, whatChanged, propositionId? } ],
    open:       [ { question, whoMayAnswer } ],   // WHAT REMAINS OPEN — a first-class outcome
    unchanged:  [ { subject, reason } ],          // EXPLICIT, never implied
    durability: { status, scope, ruleId } | null,
    intrinsicCost: { sourceId, cost } | null,
    invalidatedPlans: [ { planRow, eventId, why } ]
  },

  provenance: {
    storyId, sceneUid,                            // Track A identity; null until the scene is accepted
    stateFingerprint, invocationOrdinal, turnOrdinal,
    ruleIds: [...]                                // every field traceable
  }
}
```

Three fields carry most of the design's weight:

- **`consequence.open[]`** — "what remains open" is a *recorded outcome*, not an absence. A turn that raises a
  question and settles nothing has done something real, and the next planner can read what.
- **`consequence.unchanged[]`** — explicit, always. "Nothing happened to Julian" stops being an absence a later
  reader must interpret.
- **`turn.canonical` vs `turn.raw`** — story logic consumes the canonical form; the raw form is provenance
  only. This is where gibberish substitution lives honestly.

---

## Recorded ≠ irreversible

**The design's most likely misreading.** "Every turn has a recorded consequence" is not "every turn causes a
large irreversible event." A story where every line of dialogue ruptured the world would be unplayable and
exhausting.

`magnitude` is the axis that keeps this sane, and the distribution is deliberately lopsided:

| magnitude | what it means | expected frequency |
|---|---|---|
| `none` | the turn was registered and changed nothing; recorded so the silence is deliberate | common |
| `modest` | a small, local, real change — someone's attention, posture, a door opened | **the overwhelming majority** |
| `opens_question` | a question now stands that someone may answer later; nothing settled | common |
| `durable_effect` | a lasting fact enters canon | uncommon |
| `rupture` | the world changes shape; Tempt Fate's territory | rare, and card-gated |

A `none` record is not a failure of the system; it is the system **declining to invent significance**, on the
record. That is strictly better than today, where nothing is recorded and a later planner is free to imagine
either that the turn mattered or that it did not.

---

## Policy modules

The mechanism selects the module; the module selects the reading. The schema above does not change.

| module | precise wording | ambiguous wording |
|---|---|---|
| **`tempt_fate`** | its exact declared reading | **resolves in the player's favor**: max `playerFavorRank` in the eligible set, deterministically, not a draw. Ambiguity may not reduce scope, induce refusal, or add a twist — the eligible set excludes every `twist: true`. Only `intrinsicCost` survives. |
| **`petition_fate`** | its exact declared reading | a draw **weighted toward the player**. If a twist is selected, every dimension in its authored `exploits` must be **absent from `anchors`** — a twist may act only on what the player left open, which makes "never punish a precise wish" checkable rather than aspirational. |
| **`say_do`** (ordinary wish) | its exact declared reading | **exactly two authored readings, a seeded 50/50** — see the edge case below. No `playerFavorRank`, no twist rules, no refusal semantics. There is no card, so there is no card grammar. |
| **`say_do`** (ordinary action / dialogue) | the declared reading for its slot (`_classifySayDoSlot`) | the class policy from `_llClassifyPlayerInput`, expressed as a selected reading rather than a directive |
| **`silence`** | — | a declared reading for "the protagonist did not act", typically `none` or `opens_question` |
| **`weak_turn`** | — | a declared reading for a low-content turn: `modest` at most, and the strong-delivery rule stays suppressed |
| **`gibberish_substitute`** | — | the substituted in-world behaviour is the canonical turn; the tier (isolated / mixed / repeated) selects the reading |
| **`card_select`, `micro_decision`, `intimacy_turn`** | the card's or gate's declared consequence | not applicable — these are already explicit choices |

### Edge case 1 — a Tempt tie may not decide cost or reach

A seeded tie-break among outcomes that share a `playerFavorRank` but differ in **affected set, granted
proposition, unchanged set, or intrinsic cost** would let imprecision change the player's cost through a
nominal tie. That is the same defect the policy exists to prevent, smuggled in through equality.

**Seeded tie-breaking is permitted only among outcomes equivalent on every player-relevant dimension** —
affected set, granted proposition, unchanged set, intrinsic cost. Two outcomes may differ freely in *flavour*
and still tie.

Otherwise the author must either assign **different `playerFavorRank` values**, or declare a **deterministic
tie policy that chooses the more favorable outcome** on a named dimension. An engine invariant checks this: a
Tempt tie-break whose tied members are not player-equivalent is an **authoring error, raised at
authoring/load time**, never resolved silently at compile time.

### Edge case 2 — "50/50" means exactly two readings

A uniform draw over three readings is not 50/50, and quietly generalising the probability would change the
mechanic while appearing to preserve it.

**The Say/Do ambiguity coin requires exactly two authored plausible readings.** If authoring produces fewer or
more:

- **do not generalise the probability**;
- fall through to the story's **ordinary non-wish planning path** for that turn;
- and **record that no ambiguity coin applied**, with the reason (`readings_authored: 1` or `3`). The record
  still exists — the turn still has a consequence — it simply was not selected by a coin.

That turns a thin or over-rich authoring table into a visible, diagnosable condition instead of a silent
probability change.

---

## The canon boundary

**Out of story canon entirely — no `therefore` record:**

- **OOC complaints and meta input** (`inputClass: 'meta/ooc'`): "skip ahead", "make him nicer", anything
  addressed to the author or the app. These are not the protagonist acting.
- **App reports** (`_submitFamousFateReport` and similar). Product telemetry, not fiction.

**In canon, but the substitute is what is recorded:**

- **Gibberish with a successful in-world fallback.** `turn.canonical` holds the substituted behaviour;
  `turn.raw` holds the keystrokes as provenance; `turn.substitution` names the kind and reason. **The raw
  keystrokes are never the canonical turn** and never reach the author as content — the existing three-tier
  policy already decides what the substitute is, and this records its decision.
- **Hostile / impossible / canon-breaking / relationship-forcing input.** These *are* the protagonist
  exerting pressure, and today's law already says to transform rather than refuse. The record captures the
  transformed reading, so a later planner knows what the world actually did with the attempt.

---

## Track A and Track B

**Track A stays, as the shared canonical-text foundation.** Every record binds to a scene by `sceneUid`; the
`stateFingerprint` is computed from canonical projections; a revision invalidates nothing in the ledger but is
recorded against it. Without Track A there is no stable answer to "which scene, in what state" for a record to
point at.

**Track B becomes a temporary special case, and a narrow one.** Its accepted-invocation record is precisely a
`therefore` record with `consequence.magnitude` unknown — the case where the engine registered the turn but
could not compile its consequence. Mapping:

| Track B today | in the universal system |
|---|---|
| accepted-invocation record | a `therefore` record with `interpretation.mode: 'uncompiled'` and an explicit `open[]` entry; **it is the compiler's failure mode, not a separate mechanism** |
| the unresolved-outcome directive | replaced by the compiled record's own facts, for every compiled turn |
| the fail-safe marker | **kept**, unchanged in purpose: a `therefore` record that cannot be written is the same class of problem, and the two-carrier marker already solves it |
| existing unresolved records | remain, remain non-blocking, and are never retro-compiled — they describe turns whose consequence genuinely was never decided |
| `_tfoResolveInvocationByHuman` / `_tfoDismissInvocation` | legacy records only, tooling-reachable, **never reader-reachable** |

Automatic outcome commitment **from prose** stays permanently disabled. Commitment from the compiler is a
different mechanism: it commits facts it computed itself, before any model ran.

## The author and planner contract

- **The author receives the record as established canon and renders it.** It is not asked what the turn did,
  so it cannot get that wrong, and it is not asked to self-certify anything.
- **Later planners read the same record**, not a re-reading of prose. Julian's memory state is a compiled fact
  with a rule id behind it, never an inference from a gaze.
- **No post-prose inference of durable consequence, for any mechanism.** The extractor's residual possibility
  — checking whether prose *conforms* to the record it was given — remains a separate, later, optional
  question. It is a comparison against known facts, not a source of canon.

## Open decisions

1. **Authoring volume.** The three-layer scope (global engine / per card / per story-seed) carries over
   unchanged, but this model needs authored readings for *ordinary* turns too, not just cards. The honest
   first cut is probably: rich authored sets for cards, and a small set of generic slot readings for ordinary
   Say/Do, extended per story only where a story needs it.
2. **Where `none` and `modest` records are allowed to be terse.** A full record per line of dialogue is a lot
   of ledger. A compact form for low-magnitude records is likely necessary, and its shape is a real decision.
3. **Whether `open[]` entries expire.** A question that nobody answers for twenty scenes is either a dangling
   thread or a forgotten one, and the engine should probably have an opinion.
4. **Rupture classes beyond memory.** Unchanged from the wish-only note: `materialization_possession` is
   likely easier, since material effects are observable and enumerable, but it needs its own tables.
