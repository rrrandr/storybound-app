# Pre-author consequence compiler — Petition and Tempt Fate

Design only. No implementation, no provider call, no scene generation, no push.

**Revision 3 (2026-09-27).** Authoring scope settled as **three layers**, and the draw seed defined
explicitly. One correction: revision 2 said the seed makes *"the same wish in the same story state"* compile
identically. **Withdrawn — "same wish" is not the seed identity.** Repeated wishes may legitimately resolve
differently, and must be able to: repeated Tempts deliberately move saturation and volatility, so a second
identical wish is a *different occasion* and Fate is entitled to read it differently. See *The draw seed*.

**Revision 2 (2026-09-27).** Two corrections from Roman, both of which the first draft got wrong in the
same direction — it reached for a board-game affordance instead of letting the mechanic live in the wording:

1. **Free text is the player's sole choice mechanism.** The first draft proposed a scope/proposition picker
   as an open question. Withdrawn. *"The player chooses by stating the wish well."* A picker would replace a
   wish with a form and hand the player the engine's vocabulary instead of their own.
2. **Ambiguity does NOT automatically mean a narrower or partial grant.** The first draft made
   `PARTIAL_GRANT` the default for anything unmatched and made love-interest withholding a *rule*. Both
   withdrawn. Ambiguity is a **valid choice**: it hands the interpretation to Fate, and Fate may choose full
   reach. Partial grant, refusal, full reach and any withholding are each **explicit permutations authored
   by the story/card**, with exact affected and unchanged sets — not a conservative fallback the compiler
   applies on its own.

---

## B7 is REJECTED — wrong product

**The reader must never be asked to adjudicate what happened in their own story.** A review surface makes
the player a continuity editor of their own fiction and puts them behind the curtain of a mechanic that
should feel like the world responding. Treating "what did the wish do?" as a post-hoc editorial question was
the error; B7 was a faithful implementation of that error.

`_b7_review_surface_design_note_2026_09_27.md` stands as a record of the rejected direction. It should not
be built.

## The correction

**The consequence is decided BEFORE the author writes, from the card mechanics and the player's entry — not
inferred afterward from ambiguous prose.**

Everything that went wrong in the extractor workstream was a symptom of asking prose a question prose
cannot answer. Five samples across two models all failed the same way: a valid quote carrying a verdict
stronger than the quote supports. No prompt fixed it, a stronger model did not fix it, and a deterministic
resolver over prose could only have salvaged one committable claim out of four parties — because *the
information was never in the prose to begin with.* It was in the mechanic, and the mechanic had not been
asked to declare it.

**The hard question moves earlier, where it can actually be answered:** what does "everyone" mechanically
mean, for this card, in this situation? That is a game-design decision with a finite answer set. It is not a
reading-comprehension problem.

## What already exists — the compiler is a relocation, not an invention

This matters for scoping: Fate's verdict logic is **already written**, as prose instructions inside the
author prompt (`public/app.js:75601`):

> "FATE'S VERDICT — GRANTED (first petition, guaranteed)… if the literal ask is impossible in this world…
> grant ONLY its plausible emotional KERNEL… PLOT-RESOLVING ASKS… grant ONLY a PARTIAL lead… ADVANCES the
> question without answering it."

That is a permutation table written in English and handed to a model to interpret. Amplitude rules, partial
grants, kernel substitution and refusal-by-implausibility are all already conceived. The compiler's job is
to move them from **instructions the author interprets** to **facts the author renders**.

Also already in place and reusable:

| existing | role in the compiler |
|---|---|
| `TEMPT_OUTCOME_CONTRACT`'s 11 universal fields | becomes the compiler's **output schema**, emitted deterministically instead of requested from a model |
| `_temptOutcomeSceneRosterDetailed` | the closed, enumerable population source (invoker / love_interest / accepted_stage / declared_collective / beat_speaker) |
| `STARTER_PLANS` rows, `reservedEvents`, `sealedEvents` | the declared event ledger — the source of **propositions** and of **invalidated plans** |
| Track A's canonical projection + uid | where the rendered scene lands, and how the ledger binds to it |
| Track B's records | the temporary safety net, retired on handover (below) |

---

## Inputs

The compiler is a pure function of four things, evaluated at **seal time** — before any generation request:

1. **The card** — identity and amplitude class (Petition vs Tempt Fate; first-petition-guaranteed vs
   ordinary; any per-card declared rupture class).
2. **The player's wish, as free text** (`state.temptFateWish`, `_petitionText`) — and nothing else. There is
   no scope picker, no proposition menu, no clarifying prompt. The wording IS the choice, including the
   choice to be imprecise.
3. **Current scene and roster scope** — the composite roster for this scene, the staged collectives, and the
   plan row's declared events.
4. **Explicit self-targeting language** — matched against a declared pattern list, never inferred.

## Output: the "therefore" ledger

One durable record, emitted before prose exists, carrying **only** compiled facts:

```
therefore: {
  compilerV, compiledAt,
  card:            { id, amplitude, ruptureClass },
  request:         { rawEntry, selfTargeted },

  mode:            'exact_reading' | 'fate_chosen_reading',
  anchors:         {                                  // what the WORDING actually matched, if anything
                     proposition: <event id> | null,
                     scopeForm:   <lexicon form id> | null,
                     namedTargets: [<entity ids>],
                     unmatchedSpans: [<the wording that anchored nothing>]
                   },
  selection:       {                                  // present only in fate_chosen_reading
                     permutationSetId,                // which authored set Fate drew from
                     permutationId,                   // what it chose
                     weights,                         // the declared weights in force
                     seed,                            // so the same wish in the same state recompiles identically
                     influencedBy                     // e.g. saturation, volatility, consecutive tempts
                   } | null,

  verdict:         'granted' | 'partial' | 'kernel_substituted' | 'refused',
  verdictReason:   <declared rule id or permutation id that produced it>,

  population:      { permutation, members: [<entity ids>], closed: true, boundsSource },
  proposition:     { id: <declared event/fact id>, label, granularity },
  effects:         [ { entityId, change: 'loses_knowledge_of', propositionId } ],
  unchanged:       [ { entityId, reason } ],          // stated, not implied
  invoker:         { entityId, treatment: 'exempt' | 'included', reason, ruleId },

  invalidatedPlans:[ { planRow, eventId, why } ],
  durability:      { status: 'persists' | 'decays' | 'bounded', scope, ruleId },
  partialGrant:    { withheld: [<entity ids>], ruleId } | null,
  refusal:         { ruleId, whatInsteadOccurs } | null,

  boundScene:      { uid: null }                      // filled when the scene is accepted
}
```

Three properties make this different from everything the extractor produced:

- **Every field traces to a `ruleId` or a `permutationId`**, so any outcome can be explained without reading
  prose — including *why Fate read the wish the way it did*.
- **`population.closed` is true by construction** — the compiler cannot emit an open population, because it
  selects from an enumerable roster. That alone retires the `full`-vs-`undetermined` problem: scope is a
  fact about the compiled set, not a comparison inferred from text.
- **`unchanged[]` is explicit.** "Nothing happened to Julian" stops being an absence a later reader must
  interpret and becomes a recorded fact with a reason.

---

## Two compilation modes

The wording decides which mode applies. Both resolve fully before prose exists; neither asks the player
anything.

### Mode 1 — `exact_reading`

The wording matches a declared target/proposition **and** a declared scope form closely enough for the
mechanic to select **one** exact, pre-authored consequence permutation. Fate follows the reading the player
wrote.

- The **proposition** is matched to an id in the story's declared event ledger — the plan rows,
  `reservedEvents`, `sealedEvents`. The compiler emits that id, never a paraphrase. This is what kills the
  synonymy problem outright: "the ceremony" versus "this gathering" stops being a matching question because
  the proposition *is* the event id, and every downstream consumer already knows how to talk about it.
- The **scope form** is matched against a human-maintained lexicon of literal phrasings → declared scope
  forms (*"everyone here"*, *"the assembly"*, a named character, *"just him"*).
- Both must match for `exact_reading`. One without the other is ambiguity, and ambiguity is mode 2.

**Precision is the reward.** A player who says exactly what they mean gets exactly that, and can learn to.
That is the whole skill the mechanic is teaching, and it is taught by consequence rather than by a tooltip.

### Mode 2 — `fate_chosen_reading`

The wording is ambiguous, over-broad, or does not resolve to one declared interpretation. **Fate chooses**,
from the card's and story's declared permutations, before prose generation.

This is not a penalty and not a fallback. A vague wish is a real move: *you left it to Fate.* Fate's
options include full reach — the reading most generous to the player is as available as any other.

**What Fate may choose from is AUTHORED, not derived.** Each card (and a story may extend or override) ships
a **permutation set**: a list of complete, pre-authored consequence permutations, each carrying its own
**exact affected and unchanged sets** resolved against the current roster. Illustrative shapes, all of them
peers — none is a default:

| permutation | what it declares |
|---|---|
| full reach | every named attendee and every staged collective loses the proposition; invoker exempt |
| declared collective only | the staged collective loses it; named attendees unchanged, listed |
| named attendees only | the named roster loses it; collectives unchanged, listed |
| withholding | everyone loses it **except** a named party the card declares — the love interest being the obvious authored choice, because it keeps them dangerous, but it is an **authored permutation, not a rule the compiler applies** |
| partial by nature | the proposition is lost in part: a declared sub-proposition goes, a declared one stays |
| refusal | nobody loses anything; the card declares what occurs instead |
| overreach inversion | the wish lands on the invoker as well as the asked-for population, where the card declares self-inclusion as a possible reading of an over-broad ask |

**How Fate chooses.** A declared weighted draw over the authored set. The weights are authored alongside the
set and may be **modified by declared story physics** — saturation, volatility, consecutive Tempt count —
which is how Fate becomes a character rather than a coin. Escalating strangeness under repeated tempting is
already this engine's idiom; here it is a weighting input with a recorded value, not a vibe.

### The draw seed

**"Same wish" is not the seed identity, and must not be.** Two identical wishes at different points in a
story are different occasions: repeated Tempts *deliberately* move saturation and volatility, so a second
"everyone forgets" arriving into a more saturated world should be free to read differently. Seeding on the
wording would freeze that.

The seed is composed of exactly these, and **every component is recorded in the ledger** — not only the
resulting digest, because a digest alone cannot be debugged:

| component | why it is in the seed |
|---|---|
| `storyId` | two stories must not share Fate's dice |
| `cardId` | the same wording on a different card is a different mechanic |
| `stateFingerprint` | the canonical state revision/fingerprint — the world this wish landed in |
| `invocationOrdinal` | 1-based per story; distinguishes repeats of identical wording |
| `mode` | an exact reading and a Fate-chosen reading are different draws |
| `weightTableV` | a retuned table is a different distribution; an old ledger stays explicable against the version it used |

**The wish text is deliberately NOT a component.** The wording has already done its work: it selected the
mode and produced the anchors, and the anchors narrow the set being drawn from. The seed identifies the
*occasion*, not the phrasing. The ordinal already makes each occasion unique, so including the text would add
no distinguishing power and would quietly reintroduce "same wish, same outcome".

**`stateFingerprint` comes free from Track A.** Canonical projections give every prose scene a stable `uid`
with a `revision` and a content `hash`, so the fingerprint is a digest over the ordered
`(uid, revision, hash)` triples for prose scenes plus the durable-consequence ledger's own length and last
entry id. That is a real dividend of the canonicalization work: before it, there was no stable answer to
"what state was the story in?" — three competing texts and index-based identity meant the question had no
single answer to hash.

### Anchors are recorded either way

Even in `fate_chosen_reading`, whatever the wording *did* anchor is recorded: a matched proposition with no
scope form, a scope form with no proposition, named targets, and the spans that anchored nothing. Two
reasons this matters more than it looks:

- Fate's choice can legitimately be **narrowed by a partial anchor** — a wish that clearly names the
  ceremony but not who forgets is drawn from a permutation set already restricted to that proposition.
- The anchors are the evidence for *why* this compilation went the way it did, available to a designer
  tuning the lexicon without re-running anything.

### Wording that names no targetable proposition at all

A wish that anchors nothing — no declared event, no declared fact, nothing the story has staged — is not an
error and does not stop the turn. **Fate chooses among the card's declared `unmoored_wish` outcomes.**

These are authored per card, with exact sets like any other permutation. They are the mechanic's answer to
*"I wish things were different"*: something happens, it is declared in advance, and it is Fate's to pick.
**The reader is never asked to clarify** — a clarifying prompt would break the fiction and hand the engine's
vocabulary back to the player, which is the same mistake as the picker.

---

## Authoring scope — three layers

Layered deliberately: not one global table (which cannot be specific to a story) and not a bespoke system
per story (which cannot be tested). The engine stays testable **because** it owns no story content.

### Global engine

- the two **compilation modes** and the requirements for `exact_reading` (a matched proposition **and** a
  matched scope form — one without the other is mode 2);
- the **ledger schema**, including which fields are mandatory per mode;
- the **deterministic draw mechanics**: seed composition, digest derivation, how weights and physics
  modifiers combine into a distribution;
- the **invariant checks** below.

It owns no propositions, no anchors, no permutations, no weights. A story cannot break the engine by
authoring badly; it can only fail the invariants, loudly, before prose.

### Per card

The **consequence grammar** — what this card is permitted to alter at all:

- which rupture classes it may produce;
- which populations it may reach (a Petition may not reach the story world);
- which effect kinds it may declare (lose knowledge of a proposition, gain a material object, rewrite a
  history fact…);
- its **durability envelope** (a Petition decays or is bounded; a Tempt persists);
- whether self-inclusion is a permissible reading of an over-broad ask;
- its **unmoored-wish outcome categories** — the kinds of thing that may happen when the wording anchors
  nothing. Categories here, concrete instances per story.

The grammar is a **constraint, not content**. It says what shapes are legal; the story supplies the shapes.

### Per story / seed

Everything specific:

- **target proposition ids** — drawn from the plan rows, `reservedEvents`, `sealedEvents` the seed already
  declares;
- **recognized wording anchors** — the lexicon mapping literal phrasings to propositions and scope forms;
- **scope forms** — what "everyone here" means in *this* story's staging;
- **concrete permutations**, each with exact affected and unchanged sets, and each **within its card's
  grammar**;
- **weights**, versioned (`weightTableV`);
- **declared physics modifiers** — how saturation, volatility and consecutive Tempt count bend those weights
  for this story;
- concrete **unmoored-wish outcomes**, instantiating the card's categories.

### Composition rule

**Story content is validated against card grammar, and card grammar against the engine.** A story
permutation that reaches a population its card forbids, declares an effect kind outside the grammar, or
exceeds the durability envelope is **rejected at authoring/load time, not at compile time** — a wish should
never fail because a table was wrong.

### Invariants the engine checks on every compiled ledger

Testable with no story content loaded, which is the point of the split:

1. `population.closed === true` — no compiled population may be open-ended.
2. **affected ∪ unchanged covers the whole compiled population**, and the two sets are disjoint. Nobody is
   unaccounted for; "nothing happened to Julian" is always a recorded fact.
3. No permutation references an entity outside the roster it was compiled against.
4. `proposition.id` is a **declared** id, not a string the compiler invented.
5. Invoker treatment is declared, with a rule id; self-targeting only from explicit matched language.
6. `exact_reading` carries both anchors; `fate_chosen_reading` carries a full `selection` record.
7. The seed carries **all six components**, and the digest is reproducible from them.
8. The ledger is **immutable once bound to a scene uid**; a later scene revision does not rewrite it.
9. Every field traces to a `ruleId` or a `permutationId`.
10. The chosen permutation is inside its card's grammar.

---

## The author contract

**The author receives the ledger as hard canon and renders it.** It is no longer asked what happened, so it
can no longer get that wrong. It is told: these parties lose knowledge of this proposition; this party is
exempt and why; these parties are unchanged; this is permanent; Fate withheld this one.

Three consequences worth stating because they are the point:

- **The author is not asked to self-certify anything.** That was already removed when the extractor was
  introduced; the compiler makes it permanent by leaving nothing to certify.
- **The next scene reads the same ledger**, not a re-reading of prose. It never has to infer Julian's memory
  state from a gaze, because Julian's state is a compiled fact with a rule id behind it.
- **The scene can be checked against the ledger** rather than mined for it — see *the extractor's residual
  role*.

## Removing post-prose extraction as the source of durable outcomes

`_extractTemptOutcome` stops being a source of canon. Concretely: the pending-extraction lifecycle
(`_tfoWritePending`, `_tfoResumePending`, the pending map) is retired for outcome purposes, and nothing a
model says after the fact can create or modify a durable consequence.

**A residual role is available, and it is the inverse of the failed one.** The extractor could be pointed at
a *conformance* question: does the accepted prose actually render the ledger it was given? That is a
comparison against known facts rather than an inference about unknown ones, its failure mode is a flagged
scene rather than fabricated canon, and it never writes. Worth considering **later and separately** — it is
not required by this design and should not be bundled into it.

---

## Petition versus Tempt Fate

Same compiler, different amplitude tables — the difference is declared, not emergent:

| | Petition | Tempt Fate |
|---|---|---|
| typical verdict | `granted` at low amplitude, `kernel_substituted` for impossibilities, `partial` for plot-resolving asks | `granted` or `partial` at rupture amplitude |
| authored permutation sets | narrower reach; refusal and partial shapes prominent | wider reach available, including whole-scene and story-world permutations |
| durability | `decays` or `bounded` by default | `persists` by default |
| may invalidate scheduled plans | rarely, and only adjacent rows | yes, by design |

The first-petition guarantee stays a declared rule (`granted`, reason `first_petition_guaranteed`) rather
than a prompt instruction a model might not honour.

---

## What happens to Track A and Track B

**Track A stays, as shared infrastructure.** Canonical projections, uids, hashes, revisions and the
attribution sidecar are how the ledger binds to the scene the reader actually read, and they are what any
future conformance check would compare against. Nothing in this redesign touches it.

**Track B stays only as a temporary safety record.** While the compiler does not exist, an accepted
invocation still has no compiled consequence, and the accepted-invocation record plus its downstream
uncertainty directive remain the only thing stopping a planner from inventing one. The handover:

| on compiler landing | |
|---|---|
| accepted-invocation records | stop being created for compiled invocations — there is nothing unresolved |
| the uncertainty directive | replaced by the ledger's own facts |
| the fail-safe marker | **kept** — a compiled ledger that fails to persist is the same class of problem, and the two-carrier marker already solves it |
| existing unresolved records | remain, and remain non-blocking; they describe invocations that genuinely have no compiled consequence and never will |
| `_tfoResolveInvocationByHuman` / `_tfoDismissInvocation` | retained for those legacy records only, reachable by tooling, **never by the reader** |

Automatic outcome commitment from **prose** stays permanently disabled. Commitment from the **compiler** is a
different mechanism and is the point of the redesign — it commits facts it computed itself, before any model
ran.

---

## Open decisions

1. **SETTLED (revision 3): authoring scope is the three layers above.** What remains is volume, not
   structure — the compiler is only as good as the authored sets it draws from, and a card whose story has a
   thin permutation set will feel arbitrary however deterministic the draw is. First Sacrifice is the natural
   first story to author, since its plan rows and `reservedEvents` already supply proposition ids.
2. **How visible is Fate's reading to the player?** Not a picker — but there is a real question about
   whether a player ever learns that a vague wish was read by Fate rather than followed literally. Wording
   inside the prose can carry that ("Fate took the question as its own"), which keeps it diegetic.
3. **Which propositions are selectable.** The plan's declared events are the safe set; whether a player may
   target a fact the plan never declared (and what happens if they do — `REFUSAL`?) is a design question
   with real reach.
4. **Rupture classes beyond memory.** This note works the memory case because it is the one with five
   samples of evidence behind it. `materialization_possession` is likely *easier* — material effects are
   observable and enumerable — but it needs its own permutation and durability tables before that is more
   than a guess.
