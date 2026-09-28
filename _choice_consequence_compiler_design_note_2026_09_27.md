# Universal pre-author choice-consequence compiler

Design only. No implementation, provider call, scene generation, or push.

**Revision 3 (2026-09-27).** `magnitude: 'none'` withdrawn and the scale collapsed to three values; stage 3 for
ordinary submissions specified in its own note. See *Recorded ≠ irreversible*.

**Revision 2 (2026-09-27).** Two corrections from Roman:

1. **What the existing systems do and don't do.** Revision 1 said *"the engine already knew what the turn
   was, threw it away, wrote prose, then asked a model to read the answer back out."* Too strong, and
   withdrawn. The existing systems classify and constrain player input before authoring — **input class, risk,
   and authoring constraints** — but they do **not** consistently establish a durable **consequence**. The
   compiler formalizes those existing inputs and **adds the missing pre-author consequence-selection stage**,
   which for ordinary actions does not exist at all today.
2. **One record per accepted player submission**, not per line of dialogue. A submission may contain an
   action, speech, weak uncertainty, or a gibberish substitute; they belong in **one coherent record**.

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

### What exists, and precisely what is missing

**A pre-author layer already classifies and constrains — it does not select a consequence.**

| the engine already establishes, before authoring | the engine does NOT establish |
|---|---|
| **input class** — eight of them, from `_llClassifyPlayerInput` | **what the turn did to the world** |
| **risk and mode** — `literal_safe`, `fate_redirect`, `consequence_without_obedience`, … | which parties changed, and how |
| **impact signals** — `divergenceScore`, `mustReact`, `fate`, computed before the author runs | what remains open afterwards |
| **authoring constraints** — what the author may not overwrite (canon, Bibles, names, faces) | what is explicitly unchanged |
| **slot and handling** — `_classifySayDoSlot`, `_detectWeakTurn`, `_applyGibberishPolicy` | a durable record any later planner can read |

So the compiler is **two things, not one**:

- a **formalization** of inputs that already exist — the classifiers largely stay, and their output stops being
  prompt text and becomes recorded fact;
- **a new stage that does not exist today: pre-author consequence selection.** For card wishes this stage has
  at least a prose analogue in the verdict block at `:75601`. **For ordinary actions it does not exist at
  all** — nothing decides, before prose, what an ordinary turn changed. That gap is the substance of this
  design, not the classification layer.

The extractor's failure reads correctly in that light: the engine knew the turn's *class* and *constraints* and
never its *consequence*, so the consequence had to be invented somewhere — and it was invented after the fact,
by a model reading prose, which is the one place it cannot be established.

---

## The five stages

Explicit, ordered, and all of it before any generation request:

| # | stage | what it produces | exists today? |
|---|---|---|---|
| 1 | **Canonicalize** the accepted player submission | `turn.canonical` — one action-plus-speech unit, with any substitution named | partly: gibberish substitution exists; nothing records the canonical form |
| 2 | **Classify** its mode, risk and applicable mechanic | `inputClass`, `mode`, `risk`, `impactRead`, the mechanic and its policy module | **yes** — `_llClassifyPlayerInput`, `_playerImpactRead`, `_classifySayDoSlot`, `_detectWeakTurn` |
| 3 | **Select a consequence** under the applicable policy | the chosen reading and its declared consequence | **no — this is the new stage.** A prose analogue exists for cards (`:75601`); for ordinary actions, nothing |
| 4 | **Record one `therefore` entry** for the whole submission | the append-only record below | **no** |
| 5 | **Author renders** that entry | prose | the author exists; it currently receives instructions, not an established record |

Stage 3 is the design. Stages 1, 2 and 5 are mostly rewiring; stage 4 is bookkeeping in service of stage 3.

## The shared `therefore` record

One schema for every mechanism. A wish is not special; it selects a different **policy module**.

**One record per accepted player submission.** Not per line, not per sentence, not one for the action and
another for the speech. A submission is a single coherent move — the player typed an action and a line, or a
line alone, or something unparseable that became an in-world substitute — and the record holds those
**together**, because they were one decision and their consequence is one consequence.

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
    coinApplied: true | false,                    // say_do only; false carries its reason
    coinSkipReason: null | 'readings_authored:1' | 'readings_authored:3+',
    draw:      { seed: {...}, weights, digest } | null
  },

  consequence: {
    magnitude:  'acknowledged_no_durable_change' | 'durable_change' | 'rupture',
    acknowledgement,                              // ALWAYS present — the turn occurred and was acknowledged
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

**`magnitude: 'none'` is withdrawn (revision 3).** An accepted turn always changes the story at least by having
occurred, and `none` invited a reading where some turns simply did not happen. The record separates the two
things it conflated: **`acknowledgement` is always present** — the turn occurred and was acknowledged — while
**`durableChange` may be `null`**, meaning no *additional* durable fact was established.

| magnitude | what it means | expected frequency |
|---|---|---|
| `acknowledged_no_durable_change` | the turn happened and was acknowledged; no additional durable fact entered canon. `open[]` may still carry real questions | **the overwhelming majority** |
| `durable_change` | exactly one additional durable fact entered canon | uncommon |
| `rupture` | the world changes shape; cards only | rare, and card-gated |

`opens_question` is gone as a magnitude because `open[]` already carries it — a turn can open a question whether
or not it changed durable state, so it was never a point on the same scale.

An `acknowledged_no_durable_change` record is not a failure of the system; it is the system **declining to
invent significance**, on the record. That is strictly better than today, where nothing is recorded and a later
planner is free to imagine either that the turn mattered or that it did not.

**Stage 3 for ordinary submissions is specified separately** in
`_ordinary_consequence_grammar_design_note_2026_09_27.md`: a small closed grammar (acknowledgement, response
stance, immediate change, durable change, what remains open) constrained by the input class and slot the engine
already computes.

---

## Policy modules

The mechanism selects the module; the module selects the reading. The schema above does not change.

| module | precise wording | ambiguous wording |
|---|---|---|
| **`tempt_fate`** | its exact declared reading | **resolves in the player's favor**: max `playerFavorRank` in the eligible set, deterministically, not a draw. Ambiguity may not reduce scope, induce refusal, or add a twist — the eligible set excludes every `twist: true`. Only `intrinsicCost` survives. |
| **`petition_fate`** | its exact declared reading | a draw **weighted toward the player**. If a twist is selected, every dimension in its authored `exploits` must be **absent from `anchors`** — a twist may act only on what the player left open, which makes "never punish a precise wish" checkable rather than aspirational. |
| **`say_do`** (ordinary wish) | its exact declared reading | **exactly two authored readings, a seeded 50/50** — see the edge case below. With one or three-plus readings the coin does not apply and the turn goes to the **generic ordinary-consequence policy**, which still produces a record. No `playerFavorRank`, no twist rules, no refusal semantics: there is no card, so there is no card grammar. |
| **`say_do`** (ordinary action / dialogue) | the declared reading for its slot (`_classifySayDoSlot`) | the **generic ordinary-consequence policy**: the class and slot select a declared reading from a small per-story set, defaulting to `modest` or `opens_question` magnitude. This is the stage that does not exist today, and it is where most turns will be decided |
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

- **do not generalise the probability** — a uniform draw over three is not a coin, and pretending otherwise
  changes the mechanic while appearing to preserve it;
- keep the **"no coin" result** explicitly: `coinApplied: false`, with the reason (`readings_authored: 1` or
  `3`);
- and route the turn through the **generic ordinary-consequence policy** — the same defined path an ordinary
  action takes, which selects a declared reading from the class and slot rather than by chance;
- **a `therefore` record is still produced.** The turn still has a consequence; it simply was not selected by
  a coin. "No coin applied" is never "no record".

That turns a thin or over-rich authoring table into a visible, diagnosable condition instead of a silent
probability change — and it has a defined destination rather than a fall-through.

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
2. **How terse a low-magnitude record may be.** One record per submission keeps the volume proportionate to
   play — a long story is hundreds of records, not thousands — but a full-schema entry for a `none` or `modest`
   turn is still more structure than most turns need. A compact form for low-magnitude records is probably
   necessary, and deciding what it may omit (`anchors`? `eligibleSet`?) without losing auditability is a real
   decision.
3. **Whether `open[]` entries expire.** A question that nobody answers for twenty scenes is either a dangling
   thread or a forgotten one, and the engine should probably have an opinion.
4. **Rupture classes beyond memory.** Unchanged from the wish-only note: `materialization_possession` is
   likely easier, since material effects are observable and enumerable, but it needs its own tables.
