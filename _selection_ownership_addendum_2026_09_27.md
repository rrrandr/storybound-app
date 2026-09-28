# Selection-ownership addendum — Stage 3

Design only. No code, no model calls, no push. Addendum to
`_ordinary_consequence_grammar_design_note_2026_09_27.md`.

**The question this settles:** with `durableDeltas` now a bounded list rather than a single value, what stops
the planner from assembling a rupture out of ordinary parts, or inventing canon a story never declared?

**The rule in one line: the planner SELECTS; it never AUTHORS.** Everything durable is an authored id. The
planner's entire output is a set of references.

**Revision 3 (2026-09-27).** Two final corrections: a fallback may validly have **no** observable result (§5),
and a causal mechanism licenses **only its own authored delta** (§3).

**Revision 2 (2026-09-27).** Three changes from Roman. The absent-party boundary was too blunt and is replaced
(§3); selection precedence is made explicit so "highest priority" cannot override what the player actually wrote
(§4); and the fallback's author-facing consequence is stated (§5).

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

Not a count. Three **structural** tests, all of which an ordinary composite must pass:

| test | ordinary composite | rupture |
|---|---|---|
| **what may be asserted about non-participants** | local, observable facts only — see the boundary below | their private state and knowledge directly |
| **what is changed** | facts about the participants and the present situation | the truth of a declared proposition **for a population** |
| **where it is authored** | the story's delta/composite tables | a **card's** permutation set |
| **scheduled plans** | may not invalidate a plan row, except an adjacent one a delta explicitly declares | invalidates plan rows by design |

### The boundary, stated narrowly

An earlier draft said *"an ordinary consequence may not change a fact about a party who did not take part in the
exchange."* **Withdrawn — too blunt.** It would have rejected ordinary indirect action that any story needs:
leaving Julian a letter, taking an object he owns, locking a door he will find locked, setting up a later
confrontation. Those are real moves with real consequences, and the player is entitled to make them.

The real prohibition is narrower and is about **interiority and agency**, not about reach:

> **An ordinary consequence may not assert a non-participant's private state, knowledge, intention, consent,
> relationship stance, or later action unless a declared causal mechanism establishes it. It may establish a
> local, observable fact — an object moved, a letter left, a door locked, a message sent — while leaving any
> absent person's response in `open[]`.**

So: *the letter is on his desk* is a permitted delta. *He will read it*, *he now knows*, *he softens toward her*
are not — unless a **declared causal mechanism** says so.

**A declared causal mechanism is itself authored**, with its own conditions and its own single effect. And it is
deliberately **narrow**:

> **A causal mechanism licenses only the exact authored atomic delta it declares, once its own conditions hold.
> It is not a general inference rule.**

Worked, because this is the place a mechanism would otherwise become a licence to infer anything:

| mechanism | may establish | does **not** establish |
|---|---|---|
| `message_delivered` | `message_receipt`, **if** the story declared that delivery condition | that the recipient **read** it, **understood** it, **believed** it, **consented**, **softened**, or **will act** |
| `witness_present` | that a party staged as witnessing holds knowledge of the **declared** act | what they think of it, what they will do, or what they will tell anyone |

Each of those withheld effects needs its **own** separately declared mechanism with its **own** conditions. A
chain of four inferences requires four declared mechanisms, each of whose conditions actually hold — which is
exactly the friction that keeps a story from quietly acquiring a theory of mind it never authored.

The mechanism is the authored bridge between a local fact and one specific consequence. Without one, the bridge
does not exist, and the absent person's response belongs in `open[]` where the next planner can see it standing.

That preserves ordinary indirect action while keeping a bounded delta list from manufacturing off-screen
mind-reading — which is the same error the extractor made from prose, arriving by a different route.

`magnitude: 'rupture'` remains unreachable from this policy — not discouraged, unreachable.

## 4. Deterministic selection, and the three approved draws

**Ordinary consequence selection is deterministic.** Given the same canonicalized turn, class, slot, roster and
state, it selects the same consequence. No hidden randomness, no scoring, no model.

### Selection precedence — specificity before priority

"Highest authored priority" alone is wrong: a generic high-priority reading would quietly override what the
player actually wrote. The order is:

1. **Constraint satisfaction.** A reading is eligible only if it satisfies **every** anchored wording
   constraint. An anchor the player supplied is never discarded to make a reading fit.
2. **Anchor specificity.** Among eligible readings, **greater declared anchor specificity wins** — a reading
   anchored on a named entity *and* a declared proposition beats one anchored on the proposition alone, which
   beats a class/slot-generic reading. Specificity is a declared property of the reading, counted from its
   declared anchors, not inferred from its text.
3. **Authored priority** breaks a tie among readings of **equal** specificity.
4. **Still tied?** That is an **authoring error**, raised at authoring/load time, or it takes the §5 fallback.
   It is **never** resolved by an undisclosed draw. The only seeded draws in the system are the three below, and
   none of them is a tie-break for ordinary readings.

The practical effect: a player who writes *"I leave the letter on Julian's desk"* gets the reading anchored on
Julian and on the letter, even if the story authored a higher-priority generic `leave_object` reading. Precision
is rewarded here for the same reason it is rewarded under Tempt Fate — the wording is the player's only
instrument, so it must outrank the table's convenience.

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

### What the author may render on a fallback

The fallback is not a dead turn, and the author is not told to write around it. **It may render the attempted or
enacted local move and whatever observable result the record carries** — the hand on the table, the letter set
down, the words said and the pause after them. That is what the record establishes, and it is enough to write a
scene from.

**`immediateChange: none_observable` is valid on a fallback**, and an earlier draft of proof 12b wrongly required
otherwise. Requiring a visible result would have contradicted `unheard`, weak turns, hesitation, and a failed
attempt — all cases where *nothing visible happened* is the truthful reading. **A satisfying scene can establish
only that the protagonist attempted something, or withheld it, while leaving the world's response open.** That is
a real scene: the move was made, nobody reacted yet, and the question of whether anyone will is standing in
`open[]`.

What a fallback must carry is a **story outcome** — an `acknowledgement` and a `responseStance` — not a visible
change.

**It must not:**

- imply a durable delta the record does not contain — no "and something between them shifted", which is
  `relationship_state` smuggled in as atmosphere;
- **close an item in `open[]`** — a question the record left standing must still be standing when the scene ends;
- assert a non-participant's private state, per §3, since the fallback has no declared causal mechanism either.

Stated positively: a fallback scene may be *complete and satisfying* while establishing nothing durable. Most
turns in most stories are exactly that, and a fallback is only unusual in that the story had no authored reading
for it yet.

**The fallback is also a coverage signal, and that is its second job.** Every `no_declared_consequence_fit` names the
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
| 6 | **no off-screen interiority** | a delta asserting a non-participant's private state, knowledge, intention, consent, stance or later action **without** a declared causal mechanism is rejected — and the **same** delta **with** one is accepted, so the proof is not vacuous. Its pair: a local observable fact touching an absent party's property or space (a letter left on Julian's desk) **is** permitted, and that party's response lands in `open[]` |
| 6c | **mechanisms are narrow** | a declared mechanism licenses **only** its own authored delta: `message_delivered` yields `message_receipt` and is **refused** for read / understood / believed / consented / softened / will-act. A four-step inference requires four declared mechanisms whose conditions each hold, asserted by accepting the chain only when all four are declared |
| 6b | **no chaining** | a delta may not take another delta in the same record as its input — the other shape a planner-assembled rupture would need |
| 7 | **rupture unreachable** | no input to the ordinary policy yields `magnitude: 'rupture'`; the attempt is refused, not clamped |
| 8 | **no free text** | source-level: the planner's output shape contains no free-text field, and every displayed label resolves from an authored table |
| 9 | **determinism** | the same inputs selected twice give byte-identical selections, and **no draw occurred** — asserted by instrumenting the seeded-draw entry points and showing zero calls |
| 9b | **specificity beats priority** | with a generic reading authored at higher priority than a precisely anchored one, the **anchored** reading is selected; flipping the priorities does not change the outcome, which is what proves specificity is ordered *before* priority rather than merely present |
| 9c | **equal-specificity ties** | priority breaks a tie only among readings of equal specificity, and a remaining tie raises an **authoring error** or takes the fallback — never a draw |
| 10 | **the three draws, and only three** | source-level: seeded draws exist at exactly the three approved sites; a fourth call site fails the proof |
| 11 | **fallback** | with no matching reading, a record exists, `durableDeltas` is empty, prior `open[]` entries survive, and `no_declared_consequence_fit` carries its class/slot key |
| 12 | **fallback does not invent** | the fallback path is driven to fire and asserted to add no delta, close no open question, and change no entity state |
| 12b | **fallback carries a story outcome** | the fallback record carries a non-empty `acknowledgement` and `responseStance`, and adds **no** durable fact — so the author has a scene to write without anything being invented. It does **not** assert anything about `immediateChange` |
| 12c | **`none_observable` is valid and does not erase the turn** | a fallback with `immediateChange: 'none_observable'` is **accepted**, its record exists, the turn remains registered, and the author still has the attempt-or-withholding to render. Run for the cases where it is the truthful reading — `unheard`, a weak turn, hesitation, a failed attempt — so the proof covers why the requirement was wrong, not merely that it was dropped |
| 13 | **apparatus boundary** | an apparatus-addressed submission produces **no record** and leaves story state byte-identical; a world-addressed impossible submission produces a record — the pair together, so neither half passes alone |
| 14 | **validation is pre-prose** | every rejection above occurs before any generation request; asserted by source order and by a zero-dispatch network gate |

Proofs 6, 6b, 6c and 9b carry the most weight. **6** is the only thing standing between indirect action and
off-screen mind-reading, and it must be run as a **pair** — the mechanism-less assertion rejected *and* the
mechanism-backed one accepted — or it proves only that something was refused. **6b** closes the chaining route to the same place, and **6c** stops a single
declared mechanism becoming a general inference licence — the failure that would make mechanisms a loophole
rather than a bridge. **9b** is what makes specificity real: if flipping the authored priorities changes which reading
wins, then priority is still in charge and the player's wording is not.

---

## Unchanged constraints

- **OOC / app-directed input stays outside canon** — no record, story state untouched.
- **The reader is never aware of any of this.** No ledger surface, no mechanic choice, no review form.
- **Automatic post-prose extraction and commitment remain disabled.** The compiler commits facts it selected
  from authored tables before any model ran; nothing reads canon back out of prose.
