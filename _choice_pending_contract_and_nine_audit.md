# `choice_pending` interaction contract · and the remaining-nine audit

> **Contract and audit only. No code, no ranking, no implementation, no push.**

---

# Part A — The `lirael.choice_pending` interaction contract

## A0. Scope check — no existing pending-choice path conflicts

`player_decision_required` already exists in the seed (rows 1, 2 and 4) — but it is **prompt-level only**.
Its entire consumption, `app.js:100482`:

```js
if (_planScene.player_decision_required)
  _sConstr += '\n  Do NOT resolve the central crisis before the player decides. End the scene ON the choice.';
```

It appends a sentence to the author prompt. **It is not persisted, not a state, and blocks nothing.** A model
may disobey it, and nothing detects that.

**So `choice_pending` does not replace it or conflict with it — it is the enforcement layer that directive
never had.** The two say the same thing at different strengths: one asks the author, one stops the engine.

**This pass is therefore not broadened to Petition or any other mechanic.** No existing pending-choice path
demonstrably conflicts, which was the condition.

---

## A1. Generation boundary

**A replay may generate the reset/ceremony scene up to the renewed choice point, and no further.** The scene
ends **on** the choice. **No consequence past it may be authored** — not a reaction, not a closing line that
implies which way she went, not an aftermath beat.

## A2. While `lirael.choice_pending` is active

- **No continuation scene may be generated.** The gate is on generation, not on rendering.
- **No planner may infer a disposition, motive, or aftermath.** Not from the prior timeline, not from tone,
  not from what the reader witnessed.
- Active canon asserts exactly one thing here: **a decision is owed.**

## A3. Presentation

**The existing authored Scene-1 choice is presented again, with both original options genuinely available.**

- Neither option is disabled, de-emphasised, pre-selected, or annotated because of what was chosen before.
- **This is a fresh choice, not a constrained replay.** The player may choose differently, and choosing
  differently is the point of the card.

## A4. Resolution

When the player chooses:

1. **Seal** the new disposition against the **replayed scene's uid** and its own choice record.
2. **Clear** `choice_pending`.
3. **Resume** normal authoring from active canon.

Future canon reads **only** the new choice. The prior disposition stays in RECORD, historical, and — per the
active-canon rule — never becomes eligible again by being remembered.

## A5. Durability

**If the player closes, reloads, or does nothing: persist and restore `choice_pending`, and return them to
that same unresolved choice.**

| prohibited | |
|---|---|
| auto-select | no option is chosen on the player's behalf, ever |
| expiry | the state does not time out |
| fallback substitution | no default disposition stands in |

**Durability needs no new mechanism.** `choice_pending` is established by an appended revision, and active
canon is *derived* by folding that log — so it survives a reload the same way every other revision does, and
it clears when the new disposition seals. **A stored pending flag would be a second source of truth and would
drift; the derived model already prevents that.**

## A6. The scope key is inherited

**The renewed choice does not permit another Tempt in that causal moment.** The replayed scene carries
`originScopeKey` from the sealed scene, so the guard resolves to the same scope. **A rewind buys a second
decision, never a second Fate intervention.**

## A7. One edge the contract must name

**If replay generation fails after the revision is sealed**, `choice_pending` is active with no scene to show.
The revision seals at Tempt acceptance; the scene generates after. So: **a failed generation does not consume
`choice_pending`**, and the replay scene must be re-generatable against the same revision. The player returns
to an unresolved choice, which is exactly A5's behaviour — the state is already correct; only the scene is
missing.

---

# Part B — Remaining-nine audit: atoms, `requiresActive[]`, invalidation exposure

Two requirements applied to all nine: **target atoms, never bundles**, and **declare `requiresActive[]`**.

| outcome | target atoms | `requiresActive[]` | invalidated by |
|---|---|---|---|
| `mem.exact.assembly_forgets_twist` | `twist.wish_misaligned`, `twist.intent_failed` | both | — |
| `mem.exact.all_present_forget_twist` | `twist.wish_misaligned`, `twist.intent_failed` | both | — |
| `mem.exact.institution_forgets_custody` | `answer.owned_by_institution` | it | **`unm.custody_severed`** |
| `mem.exact.julian_forgets_interrogation` | `interr.julian_questioned_lirael` | it | **`unm.time_gives_way`** |
| `mem.exact.dohkar_forgets_authority` | **`auth.dohkar_claims_rite_and_ruling`** | it | — *(not `standing_dissolved`)* |
| `mem.exact.seren_forgets_price` | **none exist** | — | **F4** |
| `unm.the_answer_speaks` | establishes only | `twist.wish_misaligned` | — |
| `unm.witness_scattered` | `twist.wish_misaligned`, `twist.loose_note_heard` | both | — |
| `unm.the_shunning` | none | **none** | — |

## F1 — `mem.exact.assembly_forgets_twist` must re-scope, and the sheet's flagship example is stale

Under the **approved** `population.assembly`, this reading reaches **the crowd only.** Seren, Julian, the
presiding Dohkar and Lirael are **not** members.

**The approval sheet's Part 1 precise example still says the opposite** — *"Seren does not know her wish went
wrong. Julian does not know what he interrogated her about… And Lirael does not know what she is about to be
accused of."* That text was written before the population audit and **now overstates the outcome's reach.**

**It is the sheet's flagship example**, the one carrying the whole precision-vs-vagueness argument, so it is
worth being exact about what replaced it: the roster is right for
**`mem.exact.all_present_forget_twist`** — *"I wish everyone here would forget"*, scope `population.scene_present`,
**Lirael included per D1.** The dramatic beat survives; it belongs to the other wish.

**The two readings are therefore genuinely distinct, exactly as the seed's own sentence implied** — *"the whole
assembly turned"* versus *"every First Favored present heard"*. My earlier note calling them co-extensive is
doubly withdrawn.

*(Sheet not edited in this pass — it is banner-marked stale and will be regenerated after ranking.)*

## F2 — Additive-only outcomes have no channel in the revision model

`unm.the_answer_speaks` **establishes** `exculpating_reading_on_record` and **ceases nothing**. It was recorded
as *"reality revision: no"* — but it changes active canon, and §4 defines active canon as base facts folded
with revisions. **A fact that appears from neither is unreachable.**

**Proposed:** it is a revision record with **`ceases: []`** and a non-empty `establishes[]`. The existing
prohibition is one-directional — *empty `establishes` alongside a non-empty `ceases` is malformed* — and its
converse is legitimate. **One channel, no new machinery.**

Consequence, stated: **additive outcomes are revisions too**, so the count is **five of seven** unmoored
outcomes creating revisions, not four. Revisions are less rare than the design assumed.

## F3 — `incoherent` is an undeclared memory-effect kind

`unm.witness_scattered` applies `{ party, twist.*, incoherent }` — *"no two people present keep a reconcilable
version."* Every other memory effect in the design is `forgotten` or `not_retained`, both of which mean the
party no longer holds the fact. **`incoherent` means they hold it wrongly, and differently from each other.**

That is a materially different claim — it asserts **content** about what each party now believes, not merely
absence. **No declared semantics exist for it**, and under D2 a rupture may reach interior states only when the
authored grant names target, proposition and effect. *Effect* is exactly what is undefined here.

**Not resolved in this pass.** Either `incoherent` gets declared semantics, or the outcome is re-authored in
terms of `forgotten`.

## F4 — `mem.exact.seren_forgets_price` has no target atom at all

Consistent with the ruling already recorded: `price_identified` is not active in the opening, so there is
nothing to target and nothing to declare in `requiresActive[]`. **It is not an exact reading in this phase**,
and its wording routes to Fate-chosen. Listed for completeness; no further work.

## F5 — `unm.the_shunning`'s roster excludes Lirael structurally, not by privilege

The actors are `population.assembly` plus Seren, Julian and the Dohkar — **everyone present except Lirael**,
because **she is the object of the shunning, not a participant in it.** One cannot withdraw from oneself.

**Recorded so it is never mistaken for an invoker exemption.** D1 removed protagonist privilege; it did not
require the protagonist to appear in every roster. **The test is whether the population's own definition
includes her**, and here the population is *those who withdraw from Lirael*, which she cannot be in.

Also: its `establishes` fact should be renamed from `shunned_by_assembly` — the assembly is now a narrower
body than the outcome's actual reach. **Proposed: `lirael.shunned_by_all_present`.**

---

# Part C — Status

**All thirteen outcomes now carry atom targets, `requiresActive[]`, and a declared invalidation set.**

### Owed before ranking

1. **F2** — approve additive-only revisions (`ceases: []`).
2. **F3** — declare `incoherent` semantics, or re-author `unm.witness_scattered`.
3. **F5** — approve the `lirael.shunned_by_all_present` rename.
4. **F1** — re-scope `mem.exact.assembly_forgets_twist` to the crowd in the source documents.
5. Then: re-rank all thirteen complete packages, and compute revision-expanded coverage
   (states × ask-classes × active-canon configuration).

**No ranking. No coverage computation. No implementation.**
