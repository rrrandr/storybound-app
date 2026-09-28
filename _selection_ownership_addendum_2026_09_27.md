# Selection-ownership addendum — Stage 3

Design only. No code, no model calls, no push. Addendum to
`_ordinary_consequence_grammar_design_note_2026_09_27.md`.

**The question this settles:** with `durableDeltas` now a bounded list rather than a single value, what stops
the planner from assembling a rupture out of ordinary parts, or inventing canon a story never declared?

**The rule in one line: the planner SELECTS; it never AUTHORS.** Everything durable is an authored id. The
planner's entire output is a set of references.

---

## 1. Fields that must come from closed authored vocabularies

| field | source | planner may supply |
|---|---|---|
| `acknowledgement` | engine enum (5 values) | one listed value |
| `responseStance` | engine enum (7) | one listed value |
| `immediateChange` | engine enum (7) | one listed value |
| `magnitude` | engine enum (3) | one listed value, `rupture` excluded |
| `readingId` | **story** reading table | an existing id |
| `compositeId` | **story** composite table | an existing id |
| `durableDeltas[].deltaId` | **story** delta table | an existing id |
| delta `kind` | engine enum (6) | implied by the delta id, not chosen separately |
| entity references | the scene's **composite roster** | an existing entity ref |
| `propositionId` | the story's **declared event/proposition ledger** | an existing id |
| `open[].question` | the story's **declared open-question set** (id, or a template whose slots take declared entity refs) | an existing id |

**There is no free-text field in the planner's output.** Not a note, not a label, not a reason — labels are
looked up from the authored tables for display and audit. Free text is available to **human** authoring and
**human** review only. A planner that needs a word the tables do not contain has found a coverage gap, and the
correct outcome is the fallback in §5, not a sentence.

## 2. What a generic ordinary consequence may reference

Three sources, exhaustively:

1. **Entities already in the scene** — the composite roster (invoker / love_interest / accepted_stage /
   declared_collective / beat_speaker). No off-scene party, no new name, no "someone".
2. **The current slot and class** — from `_classifySayDoSlot` and `_llClassifyPlayerInput`. These *narrow* what
   is selectable; they are never widened by selection.
3. **Declared event/proposition ids** — from the plan rows, `reservedEvents`, `sealedEvents`.

Nothing else. In particular: no proposition the story has not declared, no entity the scene has not staged, and
no reference to a *future* plan row except through the declared `plan_invalidated` delta, which names the row by
id.

## 3. A composite ordinary consequence versus a rupture

Not a count. Four **structural** tests, all of which an ordinary composite must pass:

| test | ordinary composite | rupture |
|---|---|---|
| **who is changed** | only parties who **participated** — the actor, and those who responded in-scene | parties who did nothing, including absent ones |
| **what is changed** | facts *about* those parties and the present situation | the truth of a declared proposition **for a population** |
| **where it is authored** | the story's delta/composite tables | a **card's** permutation set |
| **scheduled plans** | may not invalidate a plan row, except an adjacent one a delta explicitly declares | invalidates plan rows by design |

The first test is the sharpest and the easiest to check: **an ordinary consequence may not change a fact about a
party who did not take part in the exchange.** A boundary stated, an obligation accepted and a stance hardening
are one move because they all concern the two people in it. "And also the assembly forgets" is not a bigger
ordinary consequence; it is a rupture, and it is card-gated.

`magnitude: 'rupture'` is therefore unreachable from this policy — not discouraged, unreachable.

## 4. Deterministic selection, and the three approved draws

**Ordinary consequence selection is deterministic.** Given the same canonicalized turn, class, slot, roster and
state, it selects the same consequence: the highest-priority declared reading whose constraints are satisfied,
with priority authored alongside the reading. No hidden randomness, no scoring, no model.

**Exactly three seeded draws exist in the whole system**, all previously approved, none of them here:

| draw | where | shape |
|---|---|---|
| Petition ambiguity | `petition_fate` module | weighted, tilted toward the player |
| Say/Do wish ambiguity | `say_do` wish module | uniform over **exactly two** authored readings |
| Tempt rank tie-break | `tempt_fate` module | uniform, and **only** among outcomes equivalent on affected set, granted proposition, unchanged set and intrinsic cost |

A draw anywhere else is a defect. Tempt ambiguity itself is deterministic (max `playerFavorRank`), so the
tie-break is its only seeded element.

## 5. When no declared consequence fits

The honest case, and it will be common early. The turn is **not** dropped and nothing is invented:

- the record **exists**, with the audit fact intact — this submission occurred;
- `acknowledgement` takes the **class default** (which may be `unheard`);
- `responseStance` and `immediateChange` take the class defaults;
- **`durableDeltas: []`** — no delta is invented, ever;
- `open[]` is **preserved and carried forward**: questions already open stay open, and the turn may not close one
  it had no declared means to close;
- `selection: { outcome: 'no_declared_consequence_fit', reason, classSlotKey }`.

**The fallback is a coverage signal, and that is its second job.** Every `no_declared_consequence_fit` names the
class/slot combination that had no reading, so the authoring gap is a queryable list rather than a feeling that
the story is going flat. Early on that list *is* the authoring backlog.

## 6. Proof plan

Dry controls, zero provider calls, in this repo's existing style. Each is stated so it can go red.

| # | proof | asserts |
|---|---|---|
| 1 | **vocabulary closure** | every enum field rejects an unlisted value; the rejection names the field |
| 2 | **entity closure** | a delta or `open[]` entry naming an entity outside the scene's composite roster is rejected — including a plausible-looking name that is simply not staged |
| 3 | **proposition closure** | a `knowledge_state` delta naming an id absent from the declared ledger is rejected; a declared id is accepted, so the proof is not vacuous |
| 4 | **delta closure** | a `deltaId` outside the story's delta table is rejected; a composite whose member list the planner altered is rejected as a whole |
| 5 | **bound** | more deltas than the class cap is rejected, and the cap is read from the class, not hard-coded in the proof |
| 6 | **no second-order consequence** | a delta may not take another delta in the same record as its input, and may not target a party absent from the exchange — the two shapes a mini-rupture would need |
| 7 | **rupture unreachable** | no input to the ordinary policy yields `magnitude: 'rupture'`; the attempt is refused, not clamped |
| 8 | **no free text** | source-level: the planner's output shape contains no free-text field, and every displayed label resolves from an authored table |
| 9 | **determinism** | the same inputs selected twice give byte-identical selections, and **no draw occurred** — asserted by instrumenting the seeded-draw entry points and showing zero calls |
| 10 | **the three draws, and only three** | source-level: seeded draws exist at exactly the three approved sites; a fourth call site fails the proof |
| 11 | **fallback** | with no matching reading, a record exists, `durableDeltas` is empty, prior `open[]` entries survive, and `no_declared_consequence_fit` carries its class/slot key |
| 12 | **fallback does not invent** | the fallback path is driven to fire and asserted to add no delta, close no open question, and change no entity state |
| 13 | **apparatus boundary** | an apparatus-addressed submission produces **no record** and leaves story state byte-identical; a world-addressed impossible submission produces a record — the pair together, so neither half passes alone |
| 14 | **validation is pre-prose** | every rejection above occurs before any generation request; asserted by source order and by a zero-dispatch network gate |

Proofs 6 and 9 carry the most weight: 6 is the only thing standing between "a bounded list" and "a rupture the
planner assembled", and 9 is what makes the whole policy auditable rather than merely plausible.

---

## Unchanged constraints

- **OOC / app-directed input stays outside canon** — no record, story state untouched.
- **The reader is never aware of any of this.** No ledger surface, no mechanic choice, no review form.
- **Automatic post-prose extraction and commitment remain disabled.** The compiler commits facts it selected
  from authored tables before any model ran; nothing reads canon back out of prose.
