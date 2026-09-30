# Boundary decision note: what authorizes a transition?

**Status:** decision note, **rev 2**. No implementation. Provider-cost question **OPEN**.
`_invariantRuntimeV0` stays OFF. 2026-09-30.

Rev 2 closes two holes in rev 1: an unsafe last-known-good fallback, and the word "issue" carrying
three meanings. Rev 1's §5 rule — *"fail to the last known good menu, never to no menu"* — was **wrong**
and is withdrawn; see §4.

---

## 0. The finding that reframes the question

**The paid boundary is a billing boundary, not a narrative one.** `scenesPerIssue` is the unit of sale:

```
literary: { scenesPerIssue: 20, fortuneCost:  60 }     app.js:86361
cg:       { scenesPerIssue: 10, fortuneCost: 130 }     app.js:86362
```

Crossing it (`_advanceToNextIssueIfNeeded`, `143194-143214`) clears `_issuePurchaseStatus` so the next
`_chargeIssuePurchase` fires — the comment says the index comes from `sceneIndex` "so the per-issue
charge attributes to the correct issue" — and also renders the prior cover, refreshes the back-cover
synopsis, and ticks the Fatelands quest. `_issuePricingApplies()` is inverted-default **true** (`87434`),
so this governs every non-Taste story.

## 1. Three concepts, three names — the word "issue" is retired

Rev 1 used "issue" for two things and then invented "epoch" for a third. Naming them apart is half the
decision.

| Name | Authorized by | Owns |
|---|---|---|
| **Paid issue unit** | scene count: `Math.floor(sceneIndex / scenesPerIssue) + 1` | charging, covers, synopsis refresh, quest tick, `issueIndexInRun` |
| **Narrative catalogue epoch** | a **declared terminal** being selected | the selectable candidate set, the branch board |
| **Narrative issue** | an **issue-closing terminal** being selected | story-wide issue-to-issue posts: `issueArcs[i]` thesis, `regimePhase`, `cliffShape`, `endingShape`, `ambiguityTargets` |

Nothing below uses the bare word "issue".

### Which boundary advances story-wide posts? A third, explicit narrative-issue transition.

Not the paid unit, and not every catalogue epoch.

- **Not the paid unit** — that is the same category error as scheduling canon: an issue arc's thesis and
  ending shape are narrative, and advancing them because the reader's tenth scene arrived is a billing
  artifact driving story shape.
- **Not every epoch** — a terminal at Scene 6 begins a new narrative segment, but the reader is still
  inside the purchased unit and several epochs may occur within one narrative issue. Jumping to the next
  issue's thesis on each would burn the story's posts far too fast.

So terminals are of two kinds, declared in the catalogue: a **segment terminal** opens a new catalogue
epoch inside the current narrative issue; an **issue-closing terminal** opens a new catalogue epoch
*and* advances the narrative issue.

**Finding, same class as the other two:** today story-wide posts already ride the paid index.
`_currentIssueIndex()` returns `state.issueIndexInRun` (`143186`) — the billing counter — and that is
what indexes `issueArcs[ii-1]` for cliff shape (`48876`), regime phase (`66128`), and the committed-truth
reveal window (`45167`). A narrative index would have to be separated from the paid one. This is a third
instance of a billing or scene-count value governing narrative state, and it should be recorded as such
rather than inherited.

## 2. Options against the routes

Using CG (`scenesPerIssue = 10`).

| | Route A — return to a hearing at Scene 9 | Route B — unresolved pursuit past Scene 10 | Route C — war destroys the hearing near Scene 10 |
|---|---|---|---|
| **1. fixed scene count** | hearing available with **one scene left**, then the catalogue is replaced on schedule | the story **terminates unresolved because a scene number arrived** | the escalation is **cut in half**; its close is scheduled, not dramatic |
| **2. scene count as soft pacing signal** | hearing stays selectable at 9, 10, or later | paid unit closes and the reader is charged; the **pursuit catalogue persists**; the unresolved terminal fires only when selected | `impossible` recorded and cited; alternate becomes available; closes when a terminal is **selected** |
| **3. canon-conditioned only** | works | works | works — but paid-unit length becomes unbounded, so **the unit of sale breaks** |

**Option 1's precise flaw:** it makes the *unresolved terminal* fire on a schedule. An unresolved ending
is legitimate, but it must be declared and selected, not reached because `sceneIndex` hit a multiple of
10. That is scheduled canon in its last hiding place.

**Option 3 is unavailable,** not merely risky: it breaks billing, cover rendering, synopsis refresh and
the quest tick, all keyed to the same scene-count boundary.

## 3. Recommendation — option 2, with the three boundaries kept apart

Keep the **paid issue unit** exactly as it is; scene count is the honest measure of a packaging decision.
Give the **catalogue epoch** its own boundary, advanced only by a selected declared terminal. Advance the
**narrative issue** only on an issue-closing terminal.

Scene count becomes a **soft pacing signal**: crossing a paid boundary may make an issue-closing
candidate or the unresolved terminal *relevant*; it may not select one.

Consequences, both features:

- **A catalogue epoch may outlive a paid unit** (route B): the reader is charged for the next unit and
  keeps playing the pursuit; the catalogue carries forward. Advisory `issueArcs[i]` pressures are prompt
  text and assert nothing, so their drift is harmless — but see §1: their *index* should move on
  narrative issues, not paid ones.
- **A catalogue epoch may end inside a paid unit** (routes A/C): a terminal at Scene 6 retires the
  catalogue; the reader keeps the scenes already paid for, now running on the successor — with **no**
  charge, **no** cover render, **no** synopsis refresh, **no** quest tick and **no** `issueIndexInRun`
  bump, because none of those belong to a catalogue epoch.

**Keying:** the branch board keys to the **catalogue epoch**, not `arcIndex`. This supersedes the
branch-board memo's `scaffoldRef.arcDigest`, which assumed the two moved together.

## 4. Failure recovery — rev 1 was wrong

**Withdrawn:** *"fail to the last known good catalogue, never to no menu."* That rule resurrects the
hearing after catastrophe and can continue a route already resolved. A retired catalogue is not a safe
fallback; it is a stale one.

**Corrected rule.** A last-known-good catalogue may be reused **only while its own epoch is still
active** — i.e. only in the case where generation failed and *no terminal was selected*. The two failure
cases are different and must not share a path:

| Case | State | Rule |
|---|---|---|
| generation failed, **no terminal selected** | current epoch still active | reuse the active catalogue — it is current, not stale |
| generation failed, **terminal selected** | prior catalogue **retired** | **no candidate selection. No substitute route. No resurrection of retired candidates.** |

**Retirement is derived, not flagged.** A catalogue is retired **iff one of its declared terminals is
`resolved`** in the ledger. Storing a retirement flag would leave a window between "terminal committed"
and "flag written" in which the stale catalogue is still live — exactly the resurrection hole. Deriving
it closes the hole structurally, with no transaction to lose, and matches the branch board's
derived-vs-stored discipline.

### The fail state, chosen and justified

**Continue from committed canon and the selected terminal's consequences — bounded by the current paid
unit. Then refuse to advance rather than drift.**

Why continue rather than stop:

- it is **not a new mode**. A scene with no candidate selection is the already-normal `none selected`
  path, which this thread established is first-class and not a fault;
- the terminal's fact is already committed to the ledger, so there is real, canonical material to write
  from — the author is not improvising;
- the codebase's established pattern for a failed generated artifact is proceed-with-less: a failed
  scaffold leaves the story with none and every consumer null-guards ("scene proceeds without scaffold",
  `227275-227278`);
- stopping mid-paid-unit is a refund and support problem for scenes the reader has already bought.

Why bounded rather than open-ended:

- indefinite `none selected` is precisely the circling this whole project exists to prevent, and silent
  indefinite degradation is the defect the audit found everywhere (last-arc reuse forever, no detection);
- the bound is **the remainder of the current paid unit** — not an arbitrary number, but an existing
  product boundary. The reader receives every scene they paid for; the system does not sell a further
  unit it cannot plan for.

While in this state: it is **recorded** (`successorPending`, with the failure reason), **surfaced**, and
**retried** at each scene attempt. It is never silent.

### Transaction ordering

```
1. PROPOSE    planner proposes terminal T from the ACTIVE catalogue.        writes: none
2. VALIDATE   deterministic, reject-only: T declared? available?
              irreversibility cited? branch-compatible?                     writes: none
3. COMMIT     T's fact → ledger, source-stamped; board T → resolved.
              The prior catalogue is now RETIRED (derived, §4).             writes: ledger + board
4. RENDER     author receives the committed fact and writes the scene.      writes: none
5. ACCEPT     existing gate: did the fact land, was canon added?            writes: scene, on pass
6. SUCCESSOR  generate the successor catalogue from committed canon
              (which now includes T).                                        writes: catalogue
7. ACTIVATE   successor epoch active; board re-keyed to the new epoch.      writes: epoch pointer
```

What survives a failure at each point:

- **fail at 2** — nothing happened. `none selected` recorded with the rejection reason. Epoch untouched,
  catalogue still active. The safest state in the system.
- **fail at 4 (author generation)** — T's fact is committed and the prior catalogue is retired; canon is
  canon. No scene persists. The story sits in `successorPending` holding a committed terminal. The next
  attempt can still render that fact from the ledger.
- **fail at 5 (acceptance)** — same as above: the commit and the retirement **stand**, the scene does
  not persist, and the existing repair path runs. Retirement is not rolled back, because the terminal is
  a canon fact and the segment is over whether or not this particular prose was acceptable.
- **fail at 6 (catalogue generation)** — `successorPending` persists. No selection is possible; §4's
  bounded-continuation rule governs. Retried at each scene attempt.
- **fail at 7** — a malformed or validation-rejected successor is treated as a fail at 6: the successor
  is discarded, not activated, and the retired catalogue is still not resurrected.

The asymmetry is deliberate: everything before the commit rolls back to a clean state; nothing after it
does, because after it a fact exists.

## 5. Rule — catalogue generation is noncanonical, enforced structurally

Catalogue generation may create only **possible destination families**. It may not assert a world fact,
commit an event, or become a canon source.

- the catalogue is **data**: ids, statements, precondition references to canon atoms, named blockers,
  declared alternatives, and each terminal's kind (segment or issue-closing). It is never rendered to the
  author.
- **only a selected candidate's fact reaches the author, and from the ledger, not the catalogue.** A
  catalogue statement in a brief would assert an unselected possibility as fact — the defect class
  already closed for Fate briefs.
- no canon store ever reads a catalogue field.

A catalogue is a menu; the ledger is the record. A menu item is not a meal.

## 6. Cost and authorization — still OPEN, nothing approved

**This would add a NEW billed provider call per catalogue epoch, not an extension of an authorized
call.** The cheaper path does not work: folding all catalogues into the single existing
`_buildCGScaffold` call (`226104`) costs nothing extra, but at story setup the later canon does not exist
yet, so catalogues could not be derived from committed canon — which collapses the hybrid into
story-setup-only authorship, already rejected.

Rev 2 raises the volume estimate. Rev 1 assumed one call per paid unit; epochs can occur **more often
than paid units**, since a terminal may land mid-unit. So the call count is **once per catalogue epoch —
unbounded in principle, driven by how often terminals are selected**, not `(scenes ÷ scenesPerIssue) − 1`.
That is a materially worse cost profile than rev 1 stated and it strengthens the case for leaving this
unauthorized until estimated properly.

Conditions any authorization would need:

- estimated and reserved before dispatch through the existing cost guard;
- **refusable** — a declined or failed call leads to §4's bounded state, never to a stale catalogue;
- a per-story ceiling on epoch generations, since the count is player-driven rather than fixed.

**No implementation, no recurring call, nothing approved.** The per-epoch cost needs its own decision
once a bounded estimate exists.

## 7. Smallest provider-free proofs

| # | Proof |
|---|---|
| 1 | **Scene count alone cannot change the selectable set.** Drive `sceneIndex` across a `scenesPerIssue` multiple with no terminal selected; assert the catalogue epoch unchanged, the selectable set byte-identical, the unresolved terminal not fired — **and** `issueIndexInRun` advanced. One moving while the other does not is the decoupling |
| 2 | **A retired catalogue is never reused.** Select a terminal, then fail successor generation; assert no candidate is selectable, no retired candidate is offered, and specifically that a previously-`impossible` hearing is not resurrected |
| 3 | **Retirement needs no flag.** Assert a catalogue reads retired purely from a resolved terminal in the ledger, with no stored retirement field consulted |
| 4 | **A commit survives author and acceptance failure.** Fail at step 4, then step 5; assert the ledger entry and the `resolved` board entry persist, no scene persists, and the catalogue stays retired |
| 5 | **A segment terminal does not bump the paid unit.** Select a segment terminal mid-unit; assert no charge, no cover render, no synopsis refresh, no quest tick, and `issueIndexInRun` unchanged |
| 6 | **An issue-closing terminal advances narrative posts; a segment terminal does not.** Assert the narrative-issue index moves for one and not the other, independently of `issueIndexInRun` |
| 7 | **Catalogue generation commits nothing.** Run it; assert `_committedStoryEvents` unchanged and no board write |
| 8 | **The bounded fail state is bounded.** Hold `successorPending` to the end of the paid unit; assert it is recorded and retried throughout, and that the system refuses to advance past the unit rather than continuing silently |

Each shown RED first.

---

## Settled / not settled

**Settled by rev 2:** three named boundaries with distinct owners; story-wide posts belong to an explicit
narrative-issue transition, not to the paid unit or to every epoch; retirement is derived from a resolved
terminal; a retired catalogue is never a fallback; the fail state is bounded continuation with a stated
justification; transaction ordering with per-step survival.

**Not settled:** the per-epoch provider cost and its authorization (§6), and whether the narrative index
separation in §1 is worth doing before anything else here. Nothing is built.
