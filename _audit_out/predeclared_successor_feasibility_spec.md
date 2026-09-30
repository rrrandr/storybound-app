# Feasibility specification: predeclared local successors, depth 1

**Status:** bounded-feasibility spec, **rev 2**. No code, no provider call, **no authorization
requested**. `_invariantRuntimeV0` OFF. 2026-09-30.

Seventh of the planning thread. Rev 2 corrects five overclaims in rev 1.

## 0. What this spec establishes — and what it cannot

Two claims must not travel together, because only one of them is provable here.

| | Claim | Status |
|---|---|---|
| **A — structural safety** | prose cannot write canon; a hypothetical cannot become fact | **provable provider-free** (§4, §7, §9) |
| **B — product quality** | the generated catalogue is broad enough to support real player branches | **NOT established.** Schema limits cannot establish it. Needs a funded evaluation (§9) |

Rev 1 blurred these by treating a bounded schema as evidence of sufficiency. A catalogue can be
perfectly safe, perfectly bounded, and still too thin to make a player's branch coherent.

### Corrections to rev 1

1. **"v1 unblocked" — withdrawn.** Segment successors without narrative-index separation are a
   **contained prototype**, not the universal solution. They *preserve* the billing/narrative mismatch
   the audit found (§8).
2. **"A one-line change" for overflow — withdrawn.** It is a product policy with reader, route-loss and
   billing consequences (§2).
3. **"One call per paid unit" — false whenever a retry is allowed** (§6).
4. **Activation was underspecified** — now an explicit contract (§4).
5. **The marker scan is not proof** — already corrected in rev 1 §5, retained here as §7.

---

## 1. Hard schema budget

| Limit | Max | On reaching it |
|---|---|---|
| primary candidates | **6** | see §2 — product policy, not chosen here |
| terminals among primary | **3** | excess demoted to non-terminal, recorded |
| successor catalogues | **3** (one per primary terminal) | successor for an undeclared terminal discarded; missing successor → §5c |
| candidates per successor | **4** | truncate in declared order, recorded |
| terminals per successor | **1** | excess demoted, recorded |
| **depth** | **1** — successors have no successors | a second terminal is §5c |

Maximum candidate objects: 6 + (3 × 4) = **18**.

## 2. Overflow policy — a product decision, not chosen here

Rev 1 chose truncate-after-one-retry and called it harmless. **It is not harmless.** Truncation drops by
declared order, and nothing guarantees the generator declares the destructive-escalation or replacement
route early — so truncation can remove precisely the route that makes a player's catastrophe branch
coherent, and remove it invisibly.

| Policy | Reader impact | Route-loss risk | Billing / retry |
|---|---|---|---|
| **a. reject → retry → fail before the unit starts** | blocked from starting the unit; on a provider outage, cannot continue the story at all | **none** — never runs on a narrowed catalogue | cleanest: **generate before charging**, so no charge is taken for an unplannable unit. No refund path needed. Support absorbs hard stops |
| **b. truncate with a durable diagnostic** | invisible; feels fine until the player takes the dropped branch | **highest, and silent** — may drop the escalation/replacement route. Mitigable: see below | no extra call, no refund question |
| **c. start in explicitly catalogue-less mode** | whole unit runs under §7 — consequence and relationship scenes only, no plot-fact selection, for up to `scenesPerIssue` scenes. The circling this project exists to prevent | total for that unit, but **visible and recorded** | strongest refund/credit exposure — the reader paid for a unit that cannot advance plot. Arguably should not charge |
| **d. truncate after one retry** (rev 1's choice) | slight delay, then (b)'s invisible narrowing | (b)'s risk | **adds a billed call**, breaking the one-call bound (§6) |

**Two mitigations that change the calculus, offered as analysis rather than preference:**

- **Priority-ordered truncation** converts (b) from blind to policy-guided: require the emission to tag
  each candidate, and drop plain non-terminal candidates first — **never** an escalation/replacement
  candidate, and never the unresolved terminal. This directly addresses the route-loss objection without
  changing cost.
- **Generate before charging** makes (a) viable rather than punitive: if a valid catalogue is a
  precondition of `_chargeIssuePurchase` at the boundary, a failure costs the reader nothing and needs no
  refund path.

**Not chosen here.** This is one of the two decisions left to you.

## 3. Successor assumption rule

`S_T` may condition **only** on its own named terminal `T` having been selected and committed — canon
atoms plus T's own committed consequences, nothing else.

`S_T` may **not** assert any other new world fact; presuppose that a sibling terminal or any unselected
alternative resolved; presuppose elapsed time or offstage events; or become canon merely by existing.

**Enforcement is structural.** At activation every `S_T` candidate's preconditions are re-checked against
**live** canon. A candidate presupposing something absent from canon fails its precondition and is
ineligible — so an over-assuming successor **degrades to a smaller set, never a wrong one**, and an
all-failing successor activates empty into §5c.

## 4. Activation contract

`S_T` is **inert data** until `T` is selected **and** its canon commit has succeeded.

It may **not** become active because:

- its parent catalogue exists;
- `T` is merely `available`;
- `T` was *proposed* by the planner;
- `T` was validated but the ledger commit failed or was not confirmed.

**Before activation, successor content may not enter author context at all.** The payload builder must
not read successor data while the primary catalogue is active — no ids, no statements, no preconditions,
and no hypothetical framing ("if the inquiry opens…"). A predeclared possibility that reaches the writer
is a possibility asserted as context, which is the defect class already closed for Fate briefs.

**Nor may it ever enter canon.** Only a selected candidate **of the currently active catalogue** produces
a ledger fact.

*Provable provider-free:* with a primary catalogue active and a terminal merely `available`, assert the
author payload contains **no** successor id or statement (byte-level absence), and the ledger is
unchanged.

## 5. Terminal-chain table

CG, `scenesPerIssue = 10`.

| Case | Chain | Catalogue state | Calls |
|---|---|---|---|
| **a. no terminal in the unit** | primary active Scenes 1–10 | successors never activate; fresh generation at the paid boundary | 1 |
| **b. one segment terminal at Scene 6** | T commits → primary retired (derived) → `S_T` activates **locally, free** | Scenes 7–10 on `S_T` | 1 |
| **c. second terminal at Scene 8 (inside `S_T`)** | T2 commits → `S_T` retired → **depth 1: no further successor** | **catalogue-less continuation Scenes 9–10** under §7, bounded by the paid unit | 1 |
| **d. issue-closing terminal** | commits → retires its catalogue → advances the **narrative issue** | as (b)/(c); story-wide posts advance — **v2 only, §8** | 1 |
| **e. generation fails at setup** | no primary catalogue | no candidate selection for up to `scenesPerIssue` scenes; §7 governs; retries capped | 1 + capped retries |

**Case (c) is the honest cost of depth 1.** Chosen outcome: catalogue-less continuation to the paid
boundary, because the reader has already paid for those scenes. It scales badly early — a second
terminal at Scene 3 leaves 7 catalogue-less scenes — so case-(c) frequency and position must be
instrumented before depth 2 is considered. Partial mitigation now: successors may declare the
**unresolved terminal**, letting a segment close cleanly rather than drift.

## 6. Cost bound, including retries — and explicitly non-authoritative

"One call per paid unit" holds only on the happy path. The reservation must cover the worst case.

**Per-call estimate** (arithmetic from §1 maxima, grok tier `in 1.25e-6` / `out 2.5e-6`):

| Part | Value |
|---|---|
| input | ~12,000 chars ≈ 3,000 tokens |
| emission | 6×610 + 3×(100 + 4×610) + 25% overhead ≈ 14,100 chars ≈ 3,525 tokens |
| after guard conventions (×1.5 reasoning, ×1.2 margin) | ~6,350 output tokens |
| **per call** | **≈ $0.0196** |

**Worst-case reservation per paid unit**, which is what must be reserved before the first dispatch via
the existing `openChainReservation` discipline:

| Component | Calls | Cost |
|---|---|---|
| initial generation | 1 | $0.0196 |
| overflow/validation retry (if policy allows) | ≤ 1 | $0.0196 |
| setup-failure recovery, capped at R = 2 | ≤ 2 | $0.0392 |
| **worst case per paid unit** | **≤ 4** | **≈ $0.0784** |

Per story, worst case: a 90-scene CG Soulmates ≈ 9 units × 4 calls = 36 calls ≈ **$0.71** — roughly **4×**
the $0.176 happy-path figure rev 1 quoted. A 40-scene CG Fling ≈ 4 units ≈ **$0.31** worst case.

**Explicitly non-authoritative.** These are planning figures, not measurements:

- field sizes are assumed; a real emission could be 2× these char counts, roughly doubling the output
  term;
- tier 1 is ministral-8b and materially cheaper, but its pricing is unverified here, so the grok figure
  stands as the bound rather than the expectation;
- **xAI reasoning tokens are unbounded by `max_tokens`**
  ([[project_tempt_outcome_extractor_provider_question]]), so on the grok tier the output figure is a
  **floor, not a cap**. The guard can refuse before dispatch; it cannot truncate in flight.

**Do not use these as a budget without a measured run.**

## 7. Author and acceptance contract for catalogue-less continuation

**MAY render:** committed canon; the player's action and Say/Do; the already-committed consequences of
the selected terminal; scaffold pressures, relationship material, interior change.

**MUST NOT:** introduce a new world event, standing, rule or relationship; resolve an open question;
assert that any declared candidate — **current, retired, or predeclared-but-unactivated** — has
occurred; stage a possibility as though selected.

**The candidate statement/marker scan is a rejection guard, not proof.** It catches literal and
near-literal assertion and **will miss paraphrase**. The evidence is this session's own: the C1–C4 scorer
needed four successive paraphrase-gap repairs. So it carries the discipline lexical validators require:

1. **human-readable diagnostics** — candidate id, beat index, matched marker, the offending line
   verbatim;
2. **a repair path** — the bounded model-authored revision already proven live at $0.001393: failing
   beats only, spliced only if the full gate re-passes;
3. **fail-closed** — reject without persisting, same contract as `__fateRejected`: no mount, no commit,
   no continuity written;
4. **detector changes re-score history** — fix and re-score every saved output, publishing a revised
   table; never preserve old counts ([[feedback_report_results_before_fixing]]).

**Why the residual risk is bounded, stated precisely:** prose has **no write path to canon** — the
ledger has one writer and it runs before prose. A paraphrase that slips the guard is a
**prose-continuity defect, not canon corruption**; the next scene's eligibility is computed from the
ledger, which the paraphrase never touched. The guard protects reader-facing coherence. The structural
canon boundary is elsewhere and does not depend on it.

## 8. v1 reclassified — a contained prototype, not the universal solution

Rev 1 called this "unblocked" and implied the prerequisite had dissolved. It has not.

**What is true:** a segment terminal does not advance the narrative issue, so activating successors on
segment terminals introduces **no new** mismatch, and `issueIndexInRun` remains what it already is.

**What rev 1 obscured:** story-wide posts still advance on the **billing counter**
(`_currentIssueIndex()` → `state.issueIndexInRun`, `app.js:143186`, set from
`Math.floor(sceneIndex / scenesPerIssue) + 1`, `143199`). v1 therefore **preserves the exact mismatch the
audit identified.** It does not fix issue-to-issue planning, and it is not the flexible-story solution
for all stories.

**Accurate classification:**

- **v1 = a contained prototype of segment successors**, on one story, proving claim A and generating the
  evidence for claim B. Declares **segment terminals and the unresolved terminal only**. Story-wide posts
  keep advancing on the paid boundary exactly as today.
- **v2 = issue-closing terminals** and story-wide post advancement — gated on narrative-index
  separation, which remains a genuine prerequisite for anything universal.

**Which terminals may advance story-wide posts:** only issue-closing ones, and only in v2.

## 9. Proving A, and the plan claim B would need

**Claim A — structural safety. Provider-free, each shown RED first:**

1. no scene index alone changes the selectable set (§5 of the boundary note);
2. a retired catalogue is never reused; a previously-`impossible` hearing is not resurrected;
3. retirement reads from a resolved terminal in the ledger, with no stored flag consulted;
4. a commit survives author-generation and acceptance failure; the catalogue stays retired;
5. **an unactivated successor's content is absent from the author payload byte-for-byte**, and the
   ledger is unchanged (§4);
6. prose asserting an unselected, retired, or unactivated-successor candidate leaves the ledger
   unchanged;
7. `_commitStoryEvent` has exactly one caller (static scan);
8. catalogue generation commits nothing.

**Claim B — catalogue breadth. Not provable provider-free; needs its own funded evaluation:**

- a pre-registered corpus of player branch intents per issue — stay, flee, return, negotiate, refuse,
  escalate destructively, go silent;
- for each, does the generated catalogue contain a **coherent** destination? Scored by **reading**, blind
  and pre-registered ([[feedback_pre_register_verdict]], [[feedback_comparative_blind_evaluation]]) —
  not by keyword match, which is the same lexical trap as §7;
- headline metric: branch coverage rate, reported **separately** for destructive-escalation branches,
  which are the routes most likely to be missing and the ones that make route C coherent;
- this requires paid generation and is therefore its own authorization, separate from any prototype.

---

## The next decision is yours, and it is not code

1. **Fund a bounded prototype?** Contained, one story, proving claim A and producing claim B's evidence.
2. **Which overflow policy** — (a) reject before the unit starts, (b) truncate with a durable diagnostic,
   (c) explicit catalogue-less start, or (d) truncate after a retry — and whether to adopt
   priority-ordered truncation and generate-before-charging (§2).

Nothing is built. No provider call. No authorization requested. Claim B remains unproven and the cost
figures remain arithmetic.
