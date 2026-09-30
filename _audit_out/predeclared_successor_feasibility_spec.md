# Feasibility specification: predeclared local successors, depth 1

**Status:** bounded-feasibility spec. No code, no provider call, **no authorization requested**.
`_invariantRuntimeV0` OFF. 2026-09-30.

Seventh of the planning thread. Gates implementation of the shape recommended in
`catalogue_cost_and_bounds_note.md`.

## Two corrections to that note

1. **"C buys B's mid-unit flexibility at A's call count" — withdrawn.** Depth 1 buys **one** local
   successor transition per active catalogue. It is not general mid-unit flexibility, and a second
   terminal before the paid boundary has a defined, worse outcome (§3c).
2. **"One call per paid unit" — true of request count only.** The single call's *payload* scales with
   terminal count × successor size. Cost is fixed by the schema budget (§1), not by the request count
   (§4).

---

## 1. Hard schema budget

| Limit | Max | On reaching it |
|---|---|---|
| primary candidates | **6** | validation rejects the emission with a diagnostic naming the overage → **one** retry → then accept the first 6 in declared order, recording the dropped ids |
| terminals among primary | **3** | same path; excess terminals are demoted to non-terminal candidates, recorded |
| successor catalogues | **3** (one per primary terminal) | a successor for an undeclared terminal is discarded; a missing successor means that terminal falls to §3c |
| candidates per successor | **4** | truncate to 4 in declared order, recorded |
| terminals per successor | **1** (typically the unresolved terminal or an issue-closing one) | excess demoted to non-terminal, recorded |
| **depth** | **1** — successors have no successors | a second terminal is §3c: catalogue-less continuation |

Total candidate objects at maximum: 6 + (3 × 4) = **18**.

**The one product decision inside this budget:** primary over-count is handled by *truncate-with-loud-diagnostic* after a failed retry, rather than by rejecting the whole catalogue. Reasoning: at setup
there is no stale-catalogue risk (the withdrawn rev-1 hazard does not apply), a narrowed catalogue
asserts nothing false, and total absence costs the entire unit. The dropped ids are recorded so the
narrowing is visible, never silent. If you prefer whole-catalogue rejection, that is a one-line change
in this table and the rest of the spec is unaffected.

## 2. Successor assumption rule

A successor catalogue `S_T` may condition **only** on its own named terminal `T` having been selected
and committed. Concretely, `S_T`'s candidates may state preconditions against canon atoms **plus T's own
committed consequences**, and nothing else.

`S_T` may **not**:

- assert any other new world fact;
- presuppose that a sibling terminal, or any unselected alternative, also resolved;
- presuppose elapsed time, offstage events, or a second fact landing;
- become canon merely by existing — it is a possibility set under the same noncanonical rule as the
  primary catalogue (boundary note §5): data only, never rendered to the author, and only a *selected*
  candidate's fact reaches the author, from the ledger.

**Enforcement is structural, not trusted.** At activation every `S_T` candidate's preconditions are
re-checked against **live** canon. A candidate that presupposes something absent from canon fails its
precondition and is simply ineligible. So an over-assuming successor **degrades to a smaller set, never
a wrong one** — and if all its candidates fail, it activates empty and §3c governs.

## 3. Terminal-chain table

CG, `scenesPerIssue = 10`.

| Case | Chain | Catalogue state | Calls |
|---|---|---|---|
| **a. no terminal in the unit** | primary active Scenes 1–10 | successors never activate; fresh primary + successors generated at the paid boundary from canon | 1 |
| **b. one segment terminal at Scene 6** | T commits → primary retired (derived) → `S_T` activates **locally, free** | Scenes 7–10 run on `S_T`; paid boundary generates the next unit normally | 1 |
| **c. second terminal at Scene 8 (inside `S_T`)** | T2 commits → `S_T` retired (derived: it holds a resolved terminal) → **depth 1 means no further successor** | **catalogue-less continuation, Scenes 9–10**, under §5, bounded by the paid unit | 1 |
| **d. issue-closing terminal** | commits → retires its catalogue → advances the **narrative issue** (§6) → its successor activates if declared, else §3c | as (b) or (c); story-wide posts advance — **gated on §6** | 1 |
| **e. catalogue generation fails at setup** | no primary catalogue for the unit | **no candidate selection for up to `scenesPerIssue` scenes**; catalogue-less continuation under §5; retried at each scene attempt, retries capped so a failing provider cannot loop | 1 + capped retries |

**Case (c) is the honest cost of depth 1, and it is defined here rather than discovered later.** Chosen
outcome: catalogue-less continuation to the paid boundary, because the reader has already paid for those
scenes and §5 governs what may be written; refusal mid-paid-unit is the worse product outcome.

**But it scales badly early.** A second terminal at Scene 3 leaves 7 catalogue-less scenes. That is a
poor experience, and it is the measurement that would justify depth 2 — so case (c) frequency and
position should be instrumented before depth 2 is considered. Partial mitigation available now:
successors may declare the **unresolved terminal**, letting a segment close cleanly instead of drifting.

Case (e) is the worst case and it is bounded by one paid unit.

## 4. Conservative cost estimate — derived, not dispatched

From the §1 maxima. Chars→tokens at 4.0, matching `_fsc_cost_guard`.

**Input** — `issueArcs[i]` slice + story-wide families + committed-canon digest + schema instructions:
conservatively **~12,000 chars ≈ 3,000 tokens**.

**Output** — per candidate: id + statement (~200) + preconditions (~150) + blockers (~150) +
alternatives (~80) + terminal kind (~30) ≈ **610 chars**.

| Part | Calculation | Chars |
|---|---|---|
| 6 primary candidates | 6 × 610 | 3,660 |
| 3 successors | 3 × (100 header + 4 × 610) | 7,620 |
| JSON overhead / field names | +25% | +2,820 |
| **total emission** | | **~14,100 ≈ 3,525 tokens** |

Applying the guard's own conventions — ×1.5 reasoning, ×1.2 margin — gives **~6,350 output tokens**.

**Worst-case per call**, priced at the grok tier (`in 0.00000125`, `out 0.0000025`):

```
in   3,000 × 1.25e-6 = $0.00375
out  6,350 × 2.50e-6 = $0.01588
                        ≈ $0.0196 per catalogue call
```

Per story (CG, one call per paid unit): 40-scene Fling ≈ 4 calls ≈ **$0.078**; 90-scene Soulmates ≈ 9
calls ≈ **$0.176**.

**Three honesty notes on this estimate:**

- tier 1 is ministral-8b, materially cheaper than grok — but I do not have verified ministral pricing in
  hand, so the grok figure stands as the conservative bound rather than the expected cost;
- **xAI reasoning tokens are unbounded by `max_tokens`** ([[project_tempt_outcome_extractor_provider_question]]),
  so on the grok tier the output figure is a **floor, not a cap**. The guard can refuse before dispatch;
  it cannot truncate in flight;
- this is arithmetic from assumed field sizes, not a measurement. A real emission could be 2× these
  char counts, which would roughly double the output term.

## 5. Author and acceptance contract for catalogue-less continuation

**The writer MAY render:** committed canon (ledger facts); the player's action and Say/Do; the
already-committed consequences of the selected terminal; scaffold pressures, relationship material, and
interior/perceptual change.

**The writer MUST NOT:** introduce a new world event, standing, rule or relationship; resolve an open
question; assert that any declared candidate — **current or retired** — has occurred; stage a
possibility as though selected.

### The marker scan is a rejection guard, not proof — correcting the cost note

I previously called the candidate statement/marker scan "a bounded test, not a judgment call," which
implied semantic certainty. **It is not proof.** It catches literal and near-literal assertion of a
declared candidate and **will miss paraphrase.** This session's own history is the evidence: the C1–C4
scorer needed four successive paraphrase-gap repairs (exact wording → split presentation → pending
phrasing → bare imperative), and a lexical guard was wrong each time before it was right.

So it is specified as an **enumerable rejection guard** with the discipline lexical validators require:

1. **Human-readable diagnostics** — which candidate id, which beat index, which marker matched, and the
   offending line verbatim. No rule codes to the writer.
2. **A repair path** — the bounded model-authored revision already built and proven live
   ($0.001393): failing beats only, spliced only if the full gate re-passes.
3. **Fail-closed on failure** — reject without persisting, same contract as `__fateRejected`: no mount,
   no commit, no continuity written; fall through to resumable state.
4. **Detector changes re-score history** — when a paraphrase is found to have slipped through, fix the
   detector and re-score every saved output, publishing a revised table. Never preserve old counts
   ([[feedback_report_results_before_fixing]]).

**Why the residual risk is acceptable, stated precisely.** Prose has **no write path to canon** — the
committed-event ledger has exactly one writer, and it runs before prose. So a paraphrased assertion that
slips the guard is a **prose-continuity defect**, not canon corruption: the next scene's eligibility is
computed from the ledger, which the paraphrase never touched. The guard protects reader-facing
coherence; the *structural* canon boundary is elsewhere and does not depend on it. That distinction is
the honest claim, and it is the one I should have made instead of asserting a bounded test.

## 6. Prerequisite: narrative index separation — and what can ship without it

**Depth-1 segment successors CAN be designed and built before the index separation.**

Reasoning: a **segment** terminal by definition does not advance the narrative issue. If successors are
activated only by segment terminals, no narrative-issue advance occurs, and `issueIndexInRun` remains
correct as what it already is — the paid index. No new inconsistency is introduced.

The conflict arises **only** for issue-closing terminals, which by definition advance story-wide posts
while `_currentIssueIndex()` still returns the billing counter (`app.js:143186`).

**Which terminals may advance story-wide posts:** only issue-closing ones, and only once a separate
narrative index exists.

So the staging is:

- **v1 (unblocked):** primary catalogues declare **segment terminals and the unresolved terminal only**.
  Story-wide posts continue to advance on the paid boundary exactly as today — unchanged behaviour, no
  new semantic drift. Catalogue activity never touches `issueArcs` indexing.
- **v2 (gated):** issue-closing terminals, and with them `regimePhase` / `cliffShape` / `endingShape` /
  reveal-window advancement — only after the narrative index is separated from `issueIndexInRun`.

This makes the prerequisite **non-blocking for a first slice** while keeping conclusion 1 of the
cost-and-bounds note intact: no epochs may advance story-wide posts until the index is separated.

---

## Open before implementation

1. Whole-catalogue rejection vs truncate-with-diagnostic for primary over-count (§1) — your call.
2. The §4 estimate is arithmetic, not measurement; field sizes are assumed and the grok floor is not a
   cap.
3. Case (c) frequency and position (§3) is unmeasured and is the evidence that would justify depth 2.
4. Prompt quality for both the family declaration and the successor tree is untested; a thin emission is
   a failure this spec does not prevent.

No code, no provider call, no authorization requested.
