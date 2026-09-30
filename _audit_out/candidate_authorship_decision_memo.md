# Decision memo: where candidate destinations come from

**Status:** decision memo. No implementation. No change to First Sacrifice.
`_invariantRuntimeV0` stays OFF. 2026-09-30.

Fourth and final document of the planning thread: audit →
`planning_scaffold_audit_addendum.md` → `issue_branch_board_decision_memo.md` (approved as the state
model, build paused) → this.

**Recommendation: the frozen-per-issue hybrid.** Reasoning below, then the three alternatives, then the
one residual timer it does not remove.

---

## 1. Why the hybrid resolves the trade-off rather than splitting it

Every earlier option traded player freedom against canon authority. The hybrid separates them **in
time** instead:

| Window | Property | Mechanism |
|---|---|---|
| **during an issue** | canon authority is absolute | the catalogue is **frozen**. The planner can only pick from a fixed set or `none`. Nothing can be invented, so nothing needs to be trusted. |
| **at an issue boundary** | branch-responsiveness is real | the catalogue is **re-derived from committed canon** — what the player actually did, not prose and not a predicted schedule. |

Both properties hold fully in their own window. That is the whole argument, and it is why this is
better than a compromise between the two.

## 2. What the catalogue declares

Produced once at issue initialization, from the story-wide posts and destination families plus the canon
active when the issue begins. Write-once for that issue's life.

Each candidate declares:

- **preconditions** — stated against canon atoms, so `available` / `reversibly_ineligible` stay derived
  (branch-board memo §2);
- **alternatives / replacements** — sibling candidates carrying the same dramatic job, so `replaced_by`
  has somewhere to point;
- **irreversible blockers** — the named conditions that, if committed, justify a sticky `impossible`
  write and nothing less;
- **an allowed unresolved terminal** — declared per issue at init, so an extreme branch always has a
  legal exit.

The last two are what make the branch board's sticky states meaningful. Without declared blockers,
`impossible` would be a judgment call; with them, it is a citation.

## 3. The current-issue edge case, honestly costed

**War against the First Favored, mid-Issue-1.** Under this design it resolves one of exactly two ways:

1. an **already-declared escalation/replacement candidate** in the relevant family carries it, or
2. the issue terminates at its **declared unresolved terminal**.

The planner may not mint a durable candidate mid-issue. That is the point, not a limitation to be
engineered around.

**What this costs, stated plainly:** if Issue 1's catalogue did not declare an escalation route for this
family, an extreme branch ends the issue unresolved rather than producing a bespoke destination. The
player is not blocked and the scene still writes — but the *issue* closes without a resolution it could
have had.

**The design consequence that follows:** escalation and replacement candidates must be declared
**generously** at issue init, because they are the only mid-issue relief valve. The catalogue generation
must ask for them explicitly — not just the expected route, but the routes an angry or destructive player
could force. A catalogue that declares only the hearing is the failure mode that produces the empty set,
and it will be a prompt-quality problem, not an architecture problem.

## 4. The four options compared

| | Player freedom | Canon authority | Pursuit / hearing / catastrophe | Prose-inference risk | Hidden-timer risk | Cost |
|---|---|---|---|---|---|---|
| **1. story-setup only** | low–med | high | ✓ / ~ / ✗ | none | **med** | none |
| **2. unrestricted player-generated** | highest | **lost** | unverifiable | **high** | low | low |
| **3. re-derived during an active issue** | high | med | ✓ / ✓ / ✓ | **med–high** | med | highest |
| **4. frozen-per-issue hybrid** | high | high | ✓ / ✓ / ✓ | **none by construction** | low (one residual, §5) | one call per issue |

**1 — story-setup only.** Auditable and free, but the set is fixed before any branch exists, so late
issues are impoverished by construction and catastrophe in Issue 3 cannot be anticipated at setup. Its
real danger is the timer risk: as candidates become impossible with no re-derivation to replace them,
later issues drift toward empty sets, and an empty set is precisely the pressure that reinstates a
default route. It also inherits `cgScaffold`'s unvalidated arc count and silent last-arc reuse.

**2 — unrestricted player-generated.** Maximum freedom, and it fails on the one thing that matters: a
model deciding what is *possible* is a model inventing durable plot facts. It also re-creates prose
inference in a new location — instead of reading finished prose to infer events, it reads player text to
invent destinations, which is the same direction of flow. And it has a consequence worth naming
separately: **it silently deletes the `impossible` state.** If a new candidate can always be minted,
nothing is ever truly impossible, so the catastrophe route becomes unrepresentable again — from the
opposite direction to `aPlot`'s. Rejected.

**3 — re-derived during an active issue.** Branch-responsive, but the candidate set becomes a moving
target with no audit point, so "was this declared before the scene?" stops having a clean answer. In
practice the most available input for mid-issue re-derivation is the scene that just happened — which is
prose. Re-derivation triggered per scene tends to become "read the last scene, propose new
destinations," which is prose inference wearing a different hat. It also needs a trigger, and the scene
boundary is the obvious one, re-introducing scene-indexed behaviour. And it largely voids the branch
board: a candidate's status matters less if the set is rebuilt constantly. Most expensive, least
auditable.

**4 — the hybrid.** Mid-issue the set is frozen, so there is nothing to invent; re-derivation happens at
one auditable boundary from the committed ledger only. Free text never creates a fact or a candidate —
it can make a declared candidate relevant, leave everything unselected, or select an already-declared
escalation route. The next issue's options genuinely differ because they are computed from what was
committed.

## 5. The one residual timer — a decision, not a hidden default

The hybrid re-derives at **issue initialization**, and the issue boundary today is scene-count-derived:
`_currentIssueIndex()` reads `state.issueIndexInRun` (`app.js:143186`), set by
`Math.floor(sceneIndex / pricing.scenesPerIssue) + 1` (`143199`).

So a scene count still decides *when the option set is rebuilt*. This is far weaker than scheduling plot
facts — crossing the boundary commits nothing, forces no selection, and can only widen or narrow
options — but it is a scene-number trigger and should not be discovered later.

Three things bound it, and one question remains:

- a frozen catalogue means crossing the boundary cannot assert anything;
- re-derivation reads the committed ledger, never prose;
- the unresolved terminal is declared, so a boundary crossing never needs to force a route.

**Open question for you:** should the issue boundary stay scene-count-derived, or become
canon-conditioned? Nothing in this memo depends on the answer; it is the last place a scene index
touches the design.

## 6. Board scoping — resolved, and it strengthens the model

The branch-board memo voids the board when its scaffold slice is replaced. At an issue boundary
`issueArcs[i]` → `issueArcs[i+1]`, so the board voids. That is **correct**, and consistent with the
approved definition of `impossible` as *"cannot happen in this issue/route."*

The important consequence: **permanence lives in canon, not in the board.** A destination whose
precondition was irreversibly contradicted does not need a carried-over sticky flag — the committed fact
persists in the ledger, so at the next issue the candidate is either derived-ineligible or simply not
declared. The board stays per-issue and disposable; the ledger stays authoritative and permanent.

## 7. The smallest extension to existing scaffold generation

Two touch points, both inside generation that already exists. **No third planning system**: the
catalogue and its status view live in the *same single new state key* as the approved board, as a
companion to `issueArcs[i]`.

**(a) Story-wide — extend the existing `_buildCGScaffold` emission.** Add, per `issueArcs[i]`, a small
**destination-family** declaration: named families and the dramatic job each carries (not instances, not
scenes, not prose). This is one field group added to an existing prompt schema (`226150-226192`) and an
existing parsed object. No new call, no new object. While there, validate
`parsed.issueArcs.length` against `_expectedIssueCount` — today it is never checked (`226123`), and a
catalogue derived from a silently-truncated arc list would inherit that defect.

**(b) Issue-init — one catalogue generation per issue.** Inputs: the issue's own `issueArcs[i]` slice
(thesis, `pressureVectors`, `ambiguityTargets`, `endingShape`), the story-wide families, and the
committed-canon digest. Output: the frozen catalogue of §2. Reuses the existing
`_callTieredProvider('scaffold', …)` path (`6351`) and hooks where the issue index already advances
(`_advanceToNextIssueIfNeeded`, `143191`; the `startBook2` / `_mountAndTransition` seam). One call per
issue — two for Fling, six for Soulmates.

Storage: **one** new state key, write-once catalogue plus the mutable status view already specified.
That single-key shape is the strongest guarantee this is a companion and not a fourth system.

---

## What remains undecided after this memo

1. **Whether the issue boundary stays scene-count-derived** (§5).
2. **Build order** — the story-wide family declaration (a) is a prerequisite for the catalogue (b),
   which is a prerequisite for the board being anything but inert.
3. **Nothing here has been proven on real generation.** Both extensions are prompt-schema work whose
   output quality is unmeasured; §3 notes that a thin catalogue would be a prompt-quality failure, and
   that risk is real and untested.

No code, no First Sacrifice changes, no flag flips.
