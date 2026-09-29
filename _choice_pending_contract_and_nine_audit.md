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

## A7. Failed replay presentation — a deterministic recovery path

**A surviving `choice_pending` is not sufficient.** The state being correct does not help a player who cannot
*reach* the choice. The revision seals at Tempt acceptance and the scene generates afterwards, so a generation
failure leaves an owed choice with nothing on screen — **and an owed choice that cannot be reached is a
stranded save.** This was under-specified and is now a blocker on `unm.time_gives_way`.

### Tier 1 — retryable replay generation

- **The replay scene is re-generatable against the same sealed delta**, on demand and without limit.
- **Retry appends nothing.** The delta is already in the log; regeneration produces a *scene*, never a second
  delta. Retrying twice must not revise the world twice.
- **No further charge.** The Fortune was spent at acceptance and the delta is sealed; generation is downstream
  of payment. **A failure the player did not cause may never be billed to them.**
- **No second Tempt is consumed or permitted** — the scope key is inherited per A6, retry or not.

### Tier 2 — authored, non-model choice presentation

**Tier 1 depends on a provider and therefore cannot be the guarantee.** So the floor is a presentation that
requires no model call at all:

- The renewed choice is presented from **authored, static text** — the Scene-1 choice itself, both options, as
  already authored.
- **It presents the choice and nothing else.** No prose, no recap, no continuation, no implied aftermath — A1
  and A2 bind here exactly as they do on the generated path.
- Because it makes no request, **it cannot fail for provider reasons**, which is what makes it a guarantee
  rather than another attempt.

### The invariant this establishes

> **The renewed choice is always reachable.** Tier 1 gives the intended experience; Tier 2 guarantees access
> when Tier 1 cannot run. A player is never stranded at an owed choice, never charged twice for one Tempt, and
> never handed a continuation the engine invented to paper over a failure.

**Choosing on the Tier 2 path is a real choice** — it seals exactly as A4 describes. The missing scene is a
presentation loss, not a canon loss.

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

> ### Corrected 2026-09-28 — my proposal was rejected, and rightly
> I proposed making it a revision with an empty `ceases[]` so it would fit the existing type. **That is
> type-driven modelling, not design.** It would have called every new fact a rewrite of reality, and made
> "revision" stop meaning anything in particular.

**The model is amended instead.** The log holds **canonical deltas**:

| delta | shape | what it is |
|---|---|---|
| **reality revision** | non-empty `ceases[]` | something that governed no longer does |
| **additive / revelatory canon change** | `establishes[]` only | something now governs that did not |

**`unm.the_answer_speaks` is an additive canon change, not a revision.** Nothing is taken back; a reading
that was never on the record is now on it. **Revising is taking something back; revealing is not.**

So the count stands at **four of seven** unmoored outcomes creating revisions, plus one additive delta.
Revisions stay as rare as the design assumed — which is what makes them mean something.

## F3 — `incoherent` is an undeclared memory-effect kind

`unm.witness_scattered` applies `{ party, twist.*, incoherent }` — *"no two people present keep a reconcilable
version."* Every other memory effect in the design is `forgotten` or `not_retained`, both of which mean the
party no longer holds the fact. **`incoherent` means they hold it wrongly, and differently from each other.**

That is a materially different claim — it asserts **content** about what each party now believes, not merely
absence. **No declared semantics exist for it**, and under D2 a rupture may reach interior states only when the
authored grant names target, proposition and effect. *Effect* is exactly what is undefined here.

### ⛔ `unm.witness_scattered` is BLOCKED (2026-09-28)

**A vague label cannot alter minds.** `incoherent` is not an effect until its content is authored. Two ways
forward, both editorial:

1. **Author each affected party's exact mistaken or fragmented proposition** — what *this* person now believes
   happened, named per party. That is a large authoring job: it is a separate false belief for every member of
   `population.scene_present`, and `population.assembly` is a collective that cannot hold individual
   beliefs, so the outcome may not even be expressible at that reach.
2. **Re-author the outcome as a defined forgetting effect** — `forgotten`, which already has semantics, at
   whatever reach is dramatically right.

**Blocked until one is chosen.** It may not be ranked, counted in coverage, or presented for approval
meanwhile.

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

**APPROVED 2026-09-28**, and the established fact is renamed `shunned_by_assembly` →
**`lirael.shunned_by_all_present`** — "assembly" is now a narrower body than the outcome's actual reach, and
a fact named after the wrong population is the same class of error as an outcome scoped to one.

---

# Part C — Status of every numbered finding

**All five findings are reported here, including the one that needs no further work.** F4 was recorded in
Part B and in the table above but was **omitted from my spoken summary** of this audit — the finding never
left the document, and reporting it was still incomplete. Listed explicitly from here on.

| # | finding | status |
|---|---|---|
| **F1** | `mem.exact.assembly_forgets_twist` reaches the crowd only; the sheet's flagship example overstates it | **CORRECTED** — example moved to `all_present` / `population.scene_present`; the crowd-only reading kept distinct |
| **F2** | additive-only outcomes had no channel | **MODEL AMENDED** — canonical deltas; a delta with `ceases[]` is a revision, a delta with only `establishes[]` is an additive/revelatory change. **No empty-cease "revision" is manufactured.** |
| **F3** | `incoherent` is an undeclared effect | **`unm.witness_scattered` BLOCKED** until each party's exact mistaken or fragmented proposition is authored, or the outcome is re-authored as a defined forgetting effect |
| **F4** | `mem.exact.seren_forgets_price` has **no target atom at all** in this phase | **STANDS, and is not closed.** `price_identified` is not active in the opening, so there is nothing to target and nothing in `requiresActive[]`. It is **not an exact reading in this phase**; its wording routes to Fate-chosen. **The opening exact-reading set is five, not six** — and that count must survive into every later document. |
| **F5** | `unm.the_shunning` excludes Lirael structurally, not by privilege | **APPROVED**; established fact renamed `lirael.shunned_by_all_present` |

### Blocked

- **`unm.witness_scattered`** — F3. May not be ranked, counted in coverage, or presented for approval.
- **`unm.time_gives_way`** — until the A7 recovery path is approved.

### Owed before ranking

1. Resolve F3 for `unm.witness_scattered` (an editorial choice between two authoring routes).
2. Approve the A7 recovery path.
3. Then: re-rank the complete packages, and compute revision-expanded coverage
   (states × ask-classes × active-canon configuration).

**No ranking. No coverage computation. No implementation.**
