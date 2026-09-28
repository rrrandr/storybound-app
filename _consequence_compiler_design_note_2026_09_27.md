# Pre-author consequence compiler — Petition and Tempt Fate

Design only. No implementation, no provider call, no scene generation, no push.

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
2. **The structured player entry** — see *Ambiguity* below. Today this is free text (`state.temptFateWish`,
   `_petitionText`); the compiler requires it to arrive as, or be deterministically reduced to, a structured
   triple.
3. **Current scene and roster scope** — the composite roster for this scene, the staged collectives, and the
   plan row's declared events.
4. **Explicit self-targeting language** — matched against a declared pattern list, never inferred.

## Output: the "therefore" ledger

One durable record, emitted before prose exists, carrying **only** compiled facts:

```
therefore: {
  compilerV, compiledAt,
  card:            { id, amplitude, ruptureClass },
  request:         { rawEntry, structured: { verb, proposition, scopeAsked, selfTargeted } },
  verdict:         'granted' | 'partial' | 'kernel_substituted' | 'refused',
  verdictReason:   <declared rule id that produced it>,

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

- **Every field traces to a `ruleId`**, so any outcome can be explained without reading prose.
- **`population.closed` is true by construction** — the compiler cannot emit an open population, because it
  selects from an enumerable roster. That alone retires the `full`-vs-`undetermined` problem: scope is a
  fact about the compiled set, not a comparison inferred from text.
- **`unchanged[]` is explicit.** "Nothing happened to Julian" stops being an absence a later reader must
  interpret and becomes a recorded fact with a reason.

---

## Ambiguity: "everyone" is resolved at compile time

**The declared scope permutations.** Finite, named, and the only values `population.permutation` may take:

| permutation | members | closed by |
|---|---|---|
| `NAMED_ATTENDEES` | the scene's resolved named roster, invoker excluded unless self-targeted | the composite roster |
| `DECLARED_COLLECTIVE` | one staged collective as a single entity, with declared membership bounds | the plan row's staging |
| `SCENE_PRESENT` | every named attendee **and** every staged collective | the roster + staging |
| `STORY_WORLD` | every entity in the story's cast ledger | the cast ledger; gated by amplitude, unavailable to Petition |
| `PARTIAL_GRANT` | a deterministically withheld subset — Fate grants less than asked | the withholding rule (below) |
| `REFUSAL` | nobody; the world does not tilt | the refusal rule |

**How free text reaches a permutation.** Not by a classifier's judgment, and not by an LLM:

1. A **declared scope lexicon**, human-maintained, maps literal phrasings to permutations: *"everyone here",
   "all of them", "this room"* → `SCENE_PRESENT`; *"the assembly", "the panel"* → `DECLARED_COLLECTIVE`
   when that collective is staged; a named character → `NAMED_ATTENDEES` restricted to them.
2. **The proposition comes from the declared event ledger, never from parsing the ask.** The player's words
   select among the events the plan already declares for this scene and its recent past; the compiler emits
   that event's **id**. This is the move that kills the synonymy problem outright: "the ceremony" versus
   "this gathering" stops being a matching question because the proposition *is* the plan's event id, and
   every downstream consumer already knows how to talk about it.
3. **Nothing matches, or the ask is broader than the lexicon covers → `PARTIAL_GRANT`, never the broadest
   reading.** Fate granting less than asked is already this game's idiom (`:75601`'s kernel and partial-lead
   rules), so the safe default is also the in-world one. Ambiguity costs the player reach, not coherence.
4. **Impossible or plot-resolving asks → `kernel_substituted` or `REFUSAL`**, by the amplitude rules already
   written in prose at `:75601`, now expressed as rule ids.

**The withholding rule must itself be declared**, or `PARTIAL_GRANT` just relocates the arbitrariness. The
natural mechanical answer is also the dramatically right one: **the love interest is withheld first** — the
relationship anchor is the one party whose knowledge state carries the most story weight, so Fate's partial
grant is the one that keeps the LI dangerous. Stated as a rule, deterministic, and explicable to a player.

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
| permutations available | `NAMED_ATTENDEES`, `DECLARED_COLLECTIVE`, `PARTIAL_GRANT`, `REFUSAL` | adds `SCENE_PRESENT`, `STORY_WORLD` |
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

1. **Does the player's entry become structured at the UI?** The compiler is deterministic either way, but a
   free-text entry means ambiguity is resolved *for* the player by the lexicon and the partial-grant
   default. Letting them choose a scope explicitly ("everyone here" / "the assembly" / "just him") is more
   honest and probably better play — and it is a product decision about how much mechanism to show.
2. **Who authors the scope lexicon and the amplitude tables**, and per-story or global? These are canon
   artifacts, not code, and they grow by human decision.
3. **Which propositions are selectable.** The plan's declared events are the safe set; whether a player may
   target a fact the plan never declared (and what happens if they do — `REFUSAL`?) is a design question
   with real reach.
4. **Rupture classes beyond memory.** This note works the memory case because it is the one with five
   samples of evidence behind it. `materialization_possession` is likely *easier* — material effects are
   observable and enumerable — but it needs its own permutation and durability tables before that is more
   than a guess.
