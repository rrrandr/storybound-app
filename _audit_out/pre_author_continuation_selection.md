# Pre-author continuation selection — proposal

**Status:** proposal for review. No code written. 2026-09-30.

The selection step is the only thing in the system that decides what becomes true. Everything else
either reads canon (the author, the planner, the Fate compiler's eligibility filter) or refuses
things (the gates). This document specifies the one writer.

Governing rule, already settled: *a plan event is committed only when the pre-author continuation
selection explicitly chooses it as a fact for this particular scene; the selection happens before
prose and is recorded with its source; the author renders the already-committed fact; no event is
inferred from completed prose, and no event is committed from scene number.*

---

## 1. What is eligible

Three sets, intersected. All deterministic.

**The catalogue.** Every event the story may ever use, declared in the seed. Today these are
`reservedEvents` ids spread across plan rows (`price_identified`, `inquiry_opened`, …) plus
`sealedEvents`.

**Eligibility predicate** — an event is a candidate iff all three hold:

| | |
|---|---|
| **preconditions satisfied** | its required atoms are active in canon now |
| **not already committed** | absent from `_committedStoryEvents` (first-write-wins) |
| **not sealed** | not withheld by `sealedEvents.unsealsAtScene` |

**Open obligations.** The continuity/obligation ledger contributes candidates the same way: a live
commitment the story has incurred is a fact that may land this scene.

Two things deliberately absent from the predicate:

- **Scene number.** A row's due index is not a precondition. It may inform *ordering preference*, never
  eligibility. This is the whole point.
- **The player's choice.** It does not gate eligibility; it gates *relevance* (§4). Keeping these
  separate is what makes the safety boundary testable — eligibility is a pure function of canon.

This requires one change to how the seed declares events: **a catalogue with preconditions, not a
sequence with dates.** `inquiry_opened` stops being "row 14" and becomes "exists; requires an accused
present and answerable, and a convener with standing; excluded once committed." That is authorable
without pre-writing scenes, because it describes world conditions, not narrative beats.

## 2. When selecting nothing is correct

**Most scenes.** "No event selected" is the default and a first-class recorded outcome, never a
failure. It is correct when:

- the candidate set is empty (no preconditions met);
- the scene's job is consequence or aftermath of the previous scene, not a new world event;
- the change is perceptual or relational rather than a world fact (Character+ territory);
- the player moved the story somewhere the catalogue does not cover.

If "nothing selected" were treated as an error, the selector would manufacture events to satisfy
itself — the scene-number timer in a different costume. So the failure mode must be *absence*, loudly
recorded, never substitution of the nearest planned event.

A direct consequence, and the test of whether we mean it: **an Issue may end with `inquiry_opened`
never committed**, because the player never let the hearing happen. The plan going unused is a
success condition, not a bug.

## 3. How a branch changes what is relevant

Because eligibility is a predicate over *canon*, and the player's choices change canon, a branch
changes which candidates are even eligible — before any judgment is applied.

The mechanism is precondition failure, not preference. If the player flees, the fact "the accused is
present and answerable before the assembly" is not active; `inquiry_opened` is therefore
**ineligible**, not merely unselected. No timer can reach past that, because no scene index appears
in the predicate.

The honest limit: this only produces a *different* scene if the catalogue declares events for that
branch. If it declares only the hearing, a fleeing player empties the candidate set and selection
returns none — the scene becomes consequence material and the absence is recorded. That recorded
absence is the signal that the catalogue needs extending, which is a decision for Roman, not a gap
for the system to paper over. Silent substitution is the one behaviour explicitly excluded.

## 4. Who selects, and what is judgment

Three layers. Judgment is confined to the middle one and cannot escape it.

**a. Eligibility filter — deterministic.** Pure predicate (§1) over canon, the committed ledger and
the sealed list. Produces the candidate set. This is the safety boundary: nothing outside this set can
be selected, ever.

**b. Relevance choice — bounded model judgment.** Given the candidate set (small), the player's
recorded decision and exact Say/Do, and the open obligations, answer one question: *which one of
these, if any, is this scene actually about?* The answer is an **id from the set, or none**. The model
cannot author an id, cannot add a fact, cannot reorder the catalogue. Same discipline as the Fate
compiler's ask-classification and C1–C4: choose among enumerated options, never invent.

**c. Admission check — deterministic, reject-only.** The returned id must be in the candidate set. If
not, reject and record `none`. It never rewrites the answer — a validator that edits is a competing
author.

**Suggested v1 has no model at all:** exactly one eligible candidate → select it; zero or more than
one → select none. That ships the whole pipeline, the recording, and the proofs with deterministic
behaviour only, and it can never force anything. Layer (b) is then added as a separate, measurable
change against a system already proven safe.

## 5. Recording, and how the author receives it

Strict order. The commit precedes the payload build.

1. **Select.** Write a selection record: `{ sceneUid, candidateSet: [ids], selectedId | null,
   selectedBy: 'deterministic_single' | 'model_ranking' | 'none', basis: { decisionId, postureHash },
   at }`. Recorded whether or not anything was selected — the `none` case is evidence, not silence.
2. **Commit.** If selected, `_commitStoryEvent(id, { source: 'continuation_selection', sceneUid,
   selectionId })`. The ledger's existing `source` field carries provenance; first-write-wins already
   makes it idempotent.
3. **Build the payload.** The fact is canon by now.
4. **Author receives a declarative fact,** in the compact register the Fate brief already uses: what
   is now true, stated plainly, with no machinery, no ids, no candidate set. It is told the fact has
   happened and must be rendered. It cannot add it, decline it, or hedge it.
5. **Gate.** The existing acceptance gate applies unchanged: the scene must render the committed fact
   and add no canon of its own.

This is deliberately the same pipeline the Fate compiler already proves in production — compile →
persist → render → gate. Selection is to plan events what the Fate compiler is to wishes.

## 6. Proving prose cannot commit anything

Five provider-free controls. Each must be shown RED before it is trusted.

| # | Assertion | Bites when |
|---|---|---|
| 1 | `_commitStoryEvent` has exactly **one** caller, the selection step (static scan of `public/app.js`) | anyone adds a second writer |
| 2 | the scene-acceptance path contains no call to `_commitStoryEvent` and no write to `_committedStoryEvents` | a post-prose write is introduced |
| 3 | an accepted scene whose prose asserts an unselected event (`"the inquiry opened"`) leaves `_committedStoryEvents` **unchanged** | prose is ever allowed to create canon |
| 4 | the ledger write precedes the author dispatch, and the payload carries the fact | the order is ever inverted |
| 5 | an id outside the candidate set is rejected and yields `none` | the admission check is weakened |

Control 3 is the load-bearing one: it is the direct refutation of inference-from-prose.

---

## Worked example A — the hearing path

Player claims the interference openly at the Scene-1 decision (`remain`).

- Canon after: she is present, answerable, her standing at risk; `auth.julian_standing_to_convene`
  active; `auth.inquiry_not_yet_opened` still active.
- Candidate set: `price_identified` (preconditions met), `inquiry_opened` (accused present and
  answerable ✓, convener with standing ✓, not committed ✓, not sealed ✓).
- Two candidates, so v1 selects **none** and the scene is consequence material. With layer (b), the
  model is asked which the scene is about given her claim, and may return `inquiry_opened`.
- If selected: committed with `source: 'continuation_selection'` before the payload; the author is
  told a formal inquiry has been opened into her and renders it as having happened; the gate checks it
  landed and that nothing else was added.
- `auth.inquiry_not_yet_opened` now reads inactive from the ledger, so `inquiry_opened` is ineligible
  forever after and every downstream consumer sees the new world.

## Worked example B — the Fatelands pursuit path

Same wish, same Scene 1, player flees (`run`).

- Canon after: she is outside the college's reach; "present and answerable before the assembly" is
  **not** active.
- `inquiry_opened` fails its precondition — **ineligible**, not deferred. No scene index can reach it.
- Candidate set is now empty, because the catalogue today declares only the hearing shape for this
  pressure. Selection records `none` with the empty set and the reason.
- The scene proceeds on consequence and relationship material. Nothing is committed. Nothing is
  substituted — specifically, the hearing is not quietly reinstated.
- The recorded empty set is the actionable signal: if pursuit should be able to produce world events
  (a notice in absentia, a pursuit authorised, a Chayr dispatched), those must be **authored into the
  catalogue with their own preconditions**. This proposal does not invent them; it makes their absence
  visible instead of letting the plan overrule the player.

---

## Open questions for Roman

1. **Catalogue rewrite.** Do `reservedEvents` become precondition-declared entries rather than
   row-anchored ones? Nothing else in §1 works without it.
2. **v1 without a model?** Ship deterministic single-candidate selection first, add ranking later as a
   measured change.
3. **Mutually-exclusive event families.** Should the seed be able to declare hearing / pursuit /
   concealment as alternatives for one story pressure, so a branch selects between them by
   precondition rather than finding an empty set?
4. **Preference vs eligibility.** Confirm a row's due index may inform ordering preference only, and
   never eligibility.
