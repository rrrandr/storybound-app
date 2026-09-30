# Decision memo: the issue branch board

**Status:** decision memo. No implementation. `_invariantRuntimeV0` stays OFF. 2026-09-30.

Third and final document of the planning-scaffold thread, after the audit and
`planning_scaffold_audit_addendum.md`.

The missing capability is not another planning system. It is a small **mutable branch-state companion**
to the generated issue slice, which is immutable and therefore cannot hold living state.

---

## 0. The one precondition, stated first

**The board is necessary but not sufficient, and it cannot fix anything alone.** No field in either
generated scaffold declares candidate destinations today (audit addendum §2). The board holds only
*status about already-declared destinations*. If the scaffold declares none, the board is an empty
ledger and every scene correctly resolves to `none selected`.

The board is deliberately compatible with all three authorship options still open in addendum §4 —
generated-at-setup, player-choice interpretation, re-derived-per-issue. It does not prejudge that
decision, and that is a design goal, not an omission.

---

## 1. Where it lives, and why not inside the scaffold

`cgScaffold.issueArcs[i]` is a slice of a container with one write site, persisted verbatim and never
mutated, regenerated wholesale when `storyId` changes. Putting mutable state inside it would make an
immutable object mutable and lose the state on regeneration.

So: a **sibling state key**, keyed to the slice it accompanies and **voided** if that slice is replaced.

```
state._issueBranchBoard = {
  v: 1,
  storyId,                       // identity — board is void if either changes
  issueIndex,
  scaffoldRef: { arcIndex, arcDigest },   // which issueArc slice this accompanies
  destinations: {
    <destinationId>: {
      declaredBy: 'story_scaffold' | 'issue_scaffold' | 'seed_catalogue',
      sticky: null | {
        status: 'impossible' | 'replaced' | 'resolved',
        replacedBy: <destinationId> | null,
        reasonCode, reason,            // named, not free narration
        source, basis,                 // provenance — see §4
        citedLedgerEntry,              // the committed fact that justifies it
        at
      },
      history: [ <every sticky write, append-only> ]
    }
  },
  terminal: null | { kind: 'resolved' | 'unresolved_declared', destinationId | null, reasonCode, at }
}
```

No prose. No scene numbers. No inferred events. Destination ids are references; the board never mints
one.

## 2. Status: two derived, three recorded

The smallest board stores **only the three sticky statuses.** The two fluid ones are computed on demand
from declared preconditions against current canon.

| Status | Kind | How it arises |
|---|---|---|
| `available` | **derived** | every declared precondition holds in canon now |
| `reversibly_ineligible` | **derived** | some precondition is false now, but not contradicted irreversibly |
| `impossible` | **recorded, sticky** | an explicit source-stamped write citing a committed fact |
| `replaced` | **recorded, sticky** | an explicit write naming `replacedBy` |
| `resolved` | **recorded, sticky** | the selection was made, committed and verified |

Effective status, resolved in this fixed order:

```
1. sticky.resolved      → resolved
2. sticky.impossible    → impossible
3. sticky.replaced      → replaced (by X)
4. all preconditions hold in canon → available
5. otherwise            → reversibly_ineligible
```

**Why this split is the whole design.** Reversibility requires *no writes at all* — flight changes canon,
and the derived status follows; return changes canon back, and it follows again. Irreversibility requires
an explicit, cited, source-stamped write. So "fleeing cannot permanently erase a hearing" is
**structural, not merely tested**: flight never touches the board. And `impossible` cannot be reached by
accident, because reaching it takes a deliberate write naming a ledger entry.

The resolver's inputs are `(declaredDestinations, canon, board)`. **`sceneNum` is not a parameter.** That
is the no-scene-number guarantee, enforced by signature rather than by discipline.

## 3. First Sacrifice — the transitions

| Step | Canon change | `hearing` | `pursuit` | Board writes |
|---|---|---|---|---|
| opening | — | **available** (accused answerable ✓, convener with standing ✓) | reversibly_ineligible (needs "at large") | **0** |
| Lirael flees | she is beyond the college's reach → "present and answerable" false | **reversibly_ineligible** | **available** | **0** |
| pursuit occupies scenes | — | reversibly_ineligible | available, may be `deferred` unselected any number of scenes | **0** |
| she returns / is answerable | precondition restored | **available again** | reversibly_ineligible | **0** |
| escalation destroys the convening authority | committed fact irreversibly contradicts the precondition | **impossible** — recorded, `reasonCode: convener_authority_destroyed`, citing the ledger entry | — | **1** |
| after that | alternate (`settlement`, `tribunal_in_absentia`) derived **available**; or issue declares `unresolved_declared` | impossible (sticky, survives later canon change) | — | 0 or 1 |

Four of the six steps write nothing. The only writes are the irreversible ones, and each must name a
committed fact. A hearing can therefore land at scene 4 or scene 24 or never, and none of that is a
function of the scene index.

## 4. The authority question, answered directly

Before Grok writes a scene, in response to a player's free-text action, **exactly one** declared input may
change the board — and it passes through four separated stages.

**(1) Proposal — a model/planner, with zero authority.**
Reads: the player's free text, the *declared* destinations for this issue (id + statement + preconditions),
and current canon. Returns: at most one destination id **from the declared set**, or `none`; plus an
optional *claim* that a named precondition has become irreversibly false; plus a reason code.
It returns ids and codes only. It may not mint an id, assert a fact, emit prose, or return two picks.
Its output is an interpretation, not a decision.

**(2) Deterministic validation — no model, reject-only.**
Checks, in code:
- the proposed id exists in the declared set for this issue;
- its effective status (§2) is `available`;
- any claimed irreversibility cites a canon atom that exists and a ledger entry that actually confirms it;
- the pick is compatible with the recorded player branch.
It never rewrites a proposal, never substitutes a neighbour, never picks when the proposal was `none`.
A validator that can edit is a competing author.

**(3) One selected, source-stamped transition.**
On pass, exactly one transition is written, stamped with: destination id, `declaredBy` layer, the
proposing model and reason code, a hash of the player's utterance and recorded decision, the canon digest
validated against, and time. Only then is the canon fact committed — **before** the payload is built.
This is the single caller `_commitStoryEvent` gains. Nothing else may call it.

**(4) No-match / ambiguous — canon untouched.**
If the proposal is `none`, cites an unknown id, picks a non-`available` destination, returns more than
one, or fails any check: **no board write, no commit, canon untouched.** A selection record is written
capturing the proposal, the evaluated set and the rejection reason — evidence, not silence. The scene
proceeds on scaffold pressures. There is **no retry into a forced pick**; an unrecognised action selects
nothing, and that is a correct outcome.

## 5. Relation to the existing systems

- **`cgScaffold`** — declares destinations (requires the extension in §0). The board references them by
  id and **never writes back**. Its one write site stays one.
- **`cgScaffold.issueArcs[i]`** — the board's companion. `scaffoldRef.arcDigest` voids the board if the
  slice is regenerated, so stale statuses cannot survive into a new scaffold. This also finally exposes
  the silent `issueArcs[ii-1] || issueArcs[last]` reuse, which should be validated rather than tolerated.
- **`rPlot`** — supplies per-issue relationship pressures and rungs. **Untouched.** A relationship rung is
  not a world event and does not belong on the board.
- **`aPlot`** — **not a canon source, now or later.** Keep its non-milestone hard gates: `tier`,
  `timelineLength`, `goal` (presence), `antagonistShape`/`antagonistSubject`, `romanceEngine`, and the
  wound/stake fields other generators consume. Its `milestones` become writer pressure phrasing only.
  One binding must be re-sourced: `regimePhase` completion is today
  `.some(m => m.kind === 'resolution' && m.triggered)` — one scheduled row declaring the story resolved.
  It should read the board's `terminal` instead. `_curMs` scene anchoring likewise stops being authority.
- **Event ledger (`_committedStoryEvents`)** — remains the single canon store with a single writer. Clean
  division: **the ledger holds facts; the board holds status about candidates.** The ledger is
  authoritative; a `resolved` board entry implies a ledger commit, never the reverse. The board's derived
  statuses are a *view* of canon and store nothing.

## 6. Provider-free proofs

Each must be shown RED before it is trusted.

| # | Proof | Method |
|---|---|---|
| 1 | **No scene index alone can alter branch state** | resolve identical canon + board at scene 2 and scene 40; assert byte-identical statuses. Plus a static check that `sceneNum` is not a parameter of the resolver |
| 2 | **Prose asserting an unselected event changes nothing** | accept a scene whose prose says "the inquiry opened"; assert board and ledger both unchanged |
| 3 | **Fleeing does not permanently erase a hearing** | apply flight canon → assert `reversibly_ineligible` **and zero board writes**; restore the precondition → assert `available` again |
| 4 | **Catastrophe makes it impossible without forcing it back** | record the impossible transition; then apply a canon change that would otherwise restore the precondition; assert it stays `impossible` and is never re-selected |
| 5 | **An unrecognised action selects nothing and cannot manufacture a route** | free text matching no declared destination → assert proposal rejected, board unchanged, ledger unchanged, selection record written with reason, and no second attempt |
| 6 | `_commitStoryEvent` has exactly one caller | static scan of `public/app.js` |
| 7 | An issue cannot end with the default `impossible` unless an alternate was `available` or `unresolved_declared` is set | drive both legal terminals and the illegal one |
| 8 | The board voids when its scaffold slice is replaced | change `storyId`/`arcDigest`; assert no status survives |
| 9 | A proposal naming an id outside the declared set is rejected | feed a plausible invented id |

Proof 3 is the one that distinguishes this design from every version that came before it, and it should
pass for a structural reason — no write path exists — not because a test happens to cover it.

---

## What this memo does not settle

The authorship of candidate destinations (addendum §4) remains open, and the board is intentionally
agnostic to it. Until that is decided and the generated scaffold declares destinations, the board would
run empty and every scene would resolve `none selected` — correct behaviour, and no improvement on today.
**Both decisions are needed; this one alone changes nothing.**
