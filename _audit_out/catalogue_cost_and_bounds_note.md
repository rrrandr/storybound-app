# Cost-and-bounds decision note: catalogue generation

**Status:** decision note. No implementation. No authorization sought. `_invariantRuntimeV0` OFF.
2026-09-30.

Sixth of the planning thread. Records two conclusions, then compares only bounded shapes.

---

## Conclusion 1 — a separate narrative index is a PREREQUISITE, not a cleanup

Story-wide posts, regime phase, cliff shape and reveal windows are indexed by the **paid-unit counter**:
`_currentIssueIndex()` returns `state.issueIndexInRun` (`app.js:143186`), which
`_advanceToNextIssueIfNeeded` sets from `Math.floor(sceneIndex / scenesPerIssue) + 1` (`143199`). That
index reaches `issueArcs[ii-1]` for cliff shape (`48876`), regime phase (`66128`) and the
committed-truth reveal window (`45167`).

The moment a segment terminal can open a catalogue epoch without a paid-unit transition, that index is
**semantically wrong**: the catalogue believes the reader has moved to a new narrative segment while the
story-wide posts still report the purchased unit's number.

**Do not build epochs while those systems read `issueIndexInRun` as though it meant narrative issue.**
Separating the narrative index comes first.

## Conclusion 2 — unbounded per-epoch calls are not an acceptable implicit runtime cost

Not to be authorized, and authorization is not being sought. Only bounded product shapes are considered
below.

---

## The finding that shrinks the problem

Rev 2 feared unbounded calls because it assumed branch movement implies a new catalogue. It does not.

**Only a terminal changes a catalogue. Eligibility shifts change nothing and cost nothing**, because
`available` / `reversibly_ineligible` are *derived* from preconditions against live canon
(branch-board memo §2). So:

- Lirael flees → hearing becomes reversibly ineligible, pursuit becomes available — **same catalogue,
  zero writes, zero calls**;
- she returns → hearing available again — **zero calls**;
- war commits facts contradicting the hearing's blocker → one sticky `impossible` write, and the
  catalogue's declared escalation candidates become available by precondition — **zero calls**.

The entire flight/pursuit/return route runs on one catalogue. Catalogue generation is needed only when a
**terminal** is selected — a far rarer event than a branch change. That reframes the cost question from
"per branch" to "per narrative segment close".

---

## Three bounded shapes

Using CG: `scenesPerIssue = 10`, 130F per paid unit.

### A — One catalogue per paid unit

One call per paid unit. Naturally bounded: `total scenes ÷ scenesPerIssue`. No mid-unit refresh.

| Scenario | Behaviour |
|---|---|
| segment terminal at Scene 6 | terminal commits; catalogue retires (derived). **No successor until Scene 10.** Scenes 7–10 run catalogue-less — the fail state becomes the normal state for 40% of the unit |
| successor generation fails | only occurs at a paid boundary; the next unit begins catalogue-less, bounded by that unit |
| extreme route at Scene 9 | alternates must already be in the unit-start catalogue (generated before the war). If declared → works. If not → unresolved terminal or catalogue-less to Scene 10; the next unit's catalogue then re-derives from canon including the war |

Cheapest and most predictable. Its flaw is specific: **a mid-unit terminal costs the remainder of the
unit.** That silently pressures the design toward terminals landing only at unit ends, which selection
cannot and should not enforce.

### B — Bounded epochs per paid unit (hard limit N)

At most N calls per paid unit; reserve N × estimate at unit purchase, using the existing chain-reservation
discipline in `_fsc_cost_guard`.

| Scenario | Behaviour |
|---|---|
| segment terminal at Scene 6 | epoch 2 generated from canon including the terminal; Scenes 7–10 have a live catalogue |
| successor generation fails | **must not consume the budget** — it produced nothing. Retries capped separately so a failing provider cannot drain N |
| extreme route at Scene 9 | if the budget is spent, alternates must come from the current catalogue or the unresolved terminal — same as A, but with better odds because the Scene-6 refresh already re-derived from canon |

After the limit: a further terminal still commits (canon is canon), the catalogue still retires, and no
successor is generated until the paid boundary. **The limit must be a stated product rule with a stated
consequence, not a silent stop.** Cost up to N× shape A.

### C — Predeclared local successors (one call, activated locally)

The single paid-unit call emits the primary catalogue **plus one predeclared successor catalogue per
declared terminal**. When a terminal is selected, its successor **activates locally — no call**.

| Scenario | Behaviour |
|---|---|
| segment terminal at Scene 6 | its predeclared successor activates instantly and free; Scenes 7–10 have a live catalogue |
| successor generation fails | **this failure mode largely disappears** — nothing is generated at terminal time. The only exposure is the single unit-boundary call, as in A |
| extreme route at Scene 9 | the catastrophe terminal's successor was predeclared from canon as of unit start. Its candidates are precondition-filtered against **live** canon at activation, so a stale successor degrades to a smaller set rather than a wrong one; if all its candidates fail preconditions it activates effectively empty → fail state |

Cost: one call per paid unit, same count as A. The call is larger (a shallow tree rather than a list), so
more output tokens and one bigger round trip — but no sequence, and the count cannot grow with player
behaviour.

**Branch-flexibility assessment.** Bounded by **depth, not budget**. Depth 1 covers one mid-unit
terminal; a second mid-unit terminal has no predeclared successor and falls to the fail state. It cannot
adapt to a *combination* of events the generator did not foresee at unit start.

**Canon assessment — it does not increase canon risk.** Predeclared successors are possibilities exactly
like the primary catalogue, and the same noncanonical rule governs them: data only, never rendered to
the author, and only a *selected* candidate's fact reaches the author, from the ledger. They are a menu
of menus. Nothing about predeclaring them makes them facts, provided the enforcement in the boundary
note §5 holds.

**Net:** C buys B's mid-unit flexibility at A's call count, trading budget-bounding for depth-bounding.

---

## The author contract for catalogue-less scenes

"Continue with no selected candidate until the paid unit ends" is **not automatically safe.** It is safe
only under an explicit contract and an acceptance check, because a writer given no destination will
reach for one.

**The writer MAY render:**

- committed canon — facts in the ledger;
- the player's action and Say/Do;
- the already-committed consequences of the selected terminal;
- scaffold pressures, relationship material, and interior/perceptual change (advisory, assert nothing).

**The writer MUST NOT:**

- introduce a new world event, standing, rule, or relationship;
- resolve an open question;
- assert that any **declared candidate destination has occurred** — including candidates of the
  **retired** catalogue, which is the resurrection-by-prose risk;
- stage a possibility as though selected.

**Acceptance check** — extends the existing "adds no canon" gate, and is *stronger* than a generic
heuristic because the candidate list is enumerable:

1. no new named world event asserted (existing C3-class check);
2. **no text asserting any declared candidate — current or retired — has occurred.** Each candidate
   carries a statement and markers, so this is a bounded test against a known list, not a judgment call;
3. no open question resolved;
4. on failure: reject without persisting, same contract as `__fateRejected` — no mount, no commit, no
   continuity written.

Check 2 is the load-bearing one: it is what stops a catalogue-less stretch from quietly manufacturing
the route the catalogue declined to offer.

---

## Recommendation — smallest bounded v1

**Shape C at depth 1**, with shape A's fail state as the floor.

- **one** provider call per paid unit, reusing `_callTieredProvider('scaffold', …)`; count fixed by
  `total scenes ÷ scenesPerIssue`, unaffected by player behaviour;
- that call emits the primary catalogue plus one predeclared successor per declared terminal;
- a terminal activates its successor **locally**, free, with candidates precondition-filtered against
  live canon;
- a second mid-unit terminal, or an empty activation, falls to the bounded catalogue-less state under
  the contract above;
- no new recurring runtime cost, and no call whose count a player can drive.

**Against First Sacrifice's three routes:**

| Route | v1 behaviour | Calls |
|---|---|---|
| **hearing** | declared in the primary catalogue, deferrable indefinitely; selected whenever the scene is about it; issue-closing terminal activates its predeclared successor | **0** beyond the unit call |
| **flight / pursuit / return** | pure eligibility movement — hearing reversibly ineligible, pursuit available, hearing available again on return. No terminal, no epoch, no catalogue change | **0** |
| **catastrophe** | war commits facts → one sticky cited `impossible`; declared escalation candidates become available by precondition. If catastrophe is itself a declared terminal, its successor activates locally | **0** |

All three routes run on the single per-unit call. That is the point of choosing C: the routes this
project exists to support are precisely the ones that need no additional generation.

**Prerequisite, restated:** conclusion 1 first. Do not build any of this while story-wide posts still
read `issueIndexInRun` as a narrative index.

---

## Still open

1. **Depth 1 vs depth 2** for predeclared successors — a token-cost and prompt-quality question, not an
   architecture one; needs a measured estimate of the larger emission.
2. **Whether the enlarged unit-boundary call stays within the existing scaffold authorization** or
   counts as a new billed shape. It is the same call at the same site with a larger schema, which
   argues for the former — but the output-token delta is unmeasured, so this is not yet a claim.
3. **Nothing measured.** Both extensions are prompt-schema work whose output quality is untested; a thin
   catalogue or a thin successor tree is a prompt-quality failure that no architecture here prevents.

No implementation, no authorization sought, no First Sacrifice changes.
