# Feasibility specification: predeclared local successors, depth 1

**Status:** bounded-feasibility spec, **rev 3**. No code, no provider call, **no authorization
requested**. `_invariantRuntimeV0` OFF. 2026-09-30.

Seventh of the planning thread. Rev 2 corrected five overclaims in rev 1. **Rev 3 records Roman's
overflow decision — policy (a), reject before the paid unit starts, generate before charging, no
truncation (§2)** — adjusts the cost bound to that policy (§6), and submits the quality-evaluation plan
for approval (§9). The prototype is **not funded**; see Decision state at the end.

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

## 2. Overflow policy — **DECIDED: (a) reject before the paid unit starts**

**Roman, 2026-09-30: policy (a). Catalogue generation precedes charging. Do not truncate.**

His reasoning, recorded because it governs future variants of this question: *a thin but "successful"
catalogue is worse than a temporary generation failure — it silently takes away routes the player may
need.* **Priority-ordered truncation is also rejected**: it reduces the risk but cannot prove the omitted
candidate was unimportant. On failure the reader is **not charged**, and the app either retries or tells
them the unit cannot begin yet.

The comparison below is retained as the record of what was weighed.

### What this decision requires

1. **`_chargeIssuePurchase` must be gated on a valid catalogue.** The charge cannot fire until
   generation has succeeded and validated.
2. **The whole boundary sequence must be gated with it.** `_advanceToNextIssueIfNeeded` (`143194-143214`)
   currently clears purchase status, auto-renders the prior cover, refreshes the back-cover synopsis and
   ticks the Fatelands quest in one step. None of that may run for a unit that cannot begin — otherwise a
   cover renders for a unit the reader was never charged for and never played.
3. **A user-facing failure state is required**, not a silent stall: bounded retry, then an explicit "this
   unit cannot begin yet" message.

### Two consequences worth stating plainly

- **Provider cost is incurred with no revenue on a failed unit.** The reader is not charged, but the
  failed generation attempts are still billed to us. Policy (a) therefore trades revenue-certainty for
  route-safety — which is the trade Roman chose knowingly, but it should not be discovered later in a
  bill.
- **A persistent provider outage blocks readers mid-story.** With no truncation fallback and no stale
  catalogue permitted, a sustained failure means affected readers cannot start their next unit at all.
  That needs a user-facing message and a support/status story, not just a retry loop.

### The comparison that was weighed

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

Two mitigations were considered. **Generate-before-charging is ADOPTED** — it is what makes (a) viable
rather than punitive, since a failure then costs the reader nothing and needs no refund path.
**Priority-ordered truncation is REJECTED** along with truncation itself: tagging candidates and dropping
only plain non-terminal ones would reduce route-loss risk, but it cannot establish that the dropped
candidate was dispensable, and an unprovable safety argument is not a safety argument.

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

Under the decided policy there is **no truncation retry** — a failed or invalid emission is retried as a
failure, capped, and then the unit is refused. So the components are:

| Component | Calls | Cost |
|---|---|---|
| initial generation | 1 | $0.0196 |
| failure/validation retry, capped at R = 2 | ≤ 2 | $0.0392 |
| **worst case per paid unit that eventually starts** | **≤ 3** | **≈ $0.0588** |
| a unit that never starts (all attempts fail) | ≤ 3 | ≈ $0.0588 **with no revenue** |

Per story, worst case: a 90-scene CG Soulmates ≈ 9 units × 3 calls = 27 calls ≈ **$0.53**; a 40-scene CG
Fling ≈ 4 units ≈ **$0.24**. Both remain well above rev 1's $0.176 / $0.078 happy-path figures.

The last row is the one to watch: under policy (a) a refused unit is **pure cost**. A reader who retries
a failing boundary several times generates provider spend and no Fortune revenue, so the retry cap R is
a cost control as much as a UX rule.

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

**Claim B — catalogue breadth. Not provable provider-free. Plan submitted for approval below.**

### The quality-evaluation plan (awaiting approval)

Policy (a) raises the stakes on this: with no truncation and no stale fallback, a catalogue either
supports the player's branch or the branch has no destination. Breadth is now the load-bearing quality
property, so it must be measured rather than assumed.

**Pre-register before any generation** ([[feedback_pre_register_verdict]]):

- **Branch-intent corpus — 7 intents**, fixed in advance: comply/stay · flee · return and negotiate ·
  refuse and stonewall · **escalate destructively** · conceal and go silent · seek an ally against the
  accuser.
- **Canon states — 3**, each derived from *committed* canon, not from prose: (i) the opening; (ii)
  post-flight (she is at large); (iii) post-escalation (the convening authority is damaged).
### Every pair gets an expected classification — binary scoring is withdrawn

Rev 3 scored all 21 pairs as "destination exists or failure." **That is wrong and would force fake
routes**, precisely the harm policy (a) exists to prevent. Some intents *should* have no destination in
some states: "return-and-negotiate" is meaningless before any flight occurred, and compliance or
alliance may be genuinely impossible after irreversible escalation. Rewarding a destination there would
train the catalogue to manufacture reconciliation with a counterparty that no longer exists.

Each pair is pre-registered as exactly one of:

- **supported** — the catalogue must offer at least one coherent candidate destination;
- **intentionally unavailable** — the intent conflicts with established canon, or the route is
  deliberately impossible. The catalogue **must not manufacture a substitute**;
- **open continuation** — no destination need be selected, but the catalogue and brief must preserve a
  coherent way to continue **without asserting a new event**.

### Pre-registration — the 21 cells

S1 = opening · S2 = post-flight (at large, "present and answerable" false) · S3 = post-escalation
(convening authority damaged)

| Intent | S1 opening | S2 post-flight | S3 post-escalation |
|---|---|---|---|
| comply / stay | **supported** | **unavailable** — she is not present; "stay" presupposes presence canon removed | **unavailable** — no body survives to receive compliance; no substitute tribunal |
| flee | **supported** | **open continuation** — already fleeing; pursuit pressure, no new event | **supported** |
| return and negotiate | **unavailable** — nothing to return from; no absence in canon | **supported** — the route this design exists for | **⚠ canon call** — see below |
| refuse and stonewall | **supported** | **open continuation** — refusal at distance is posture; pressure = proceedings without her | **open continuation** |
| **escalate destructively** | **supported** | **supported** | **supported** |
| conceal / go silent | **supported** | **supported** | **supported** |
| seek an ally | **supported** | **supported** | **⚠ canon call** — see below |

### ⚠ Two cells cannot be pre-registered without a canon decision from Roman

Doing the classification surfaced a dependency that describing the method had hidden:

1. **return-and-negotiate in S3.** Negotiation needs a counterparty with standing. If the damaged
   convening authority is the *only* one, this is intentionally unavailable. But Julian is **Provast**,
   above the Chayr and next for First Dohkar ([[project_first_sacrifice_editorial_scene1]]) — so a higher
   authority may survive, which would make it **supported** via a different counterparty.
2. **seek-an-ally in S3.** Whether any faction would still ally with her after catastrophic escalation is
   a canon question, not an inference I can make.

**I will not guess these.** Claude never invents starter canon, and a mis-registered cell would either
reward a fabricated route or penalise a correct refusal. **Pre-registration is incomplete until these two
are answered, and the paid run should not be authorized before it closes** — pre-registering after seeing
output is not pre-registration ([[feedback_pre_register_verdict]]).

### Pass criteria — per class, not a single rate

1. **every `supported` pair** has at least one coherent candidate destination;
2. **every `intentionally unavailable` pair** has a **named canon reason** and **no false substitute** —
   the catalogue must not offer a near-miss route that papers over the impossibility;
3. **destructive escalation** is either `supported` or **explicitly and credibly unavailable** in every
   state — never silently absent;
4. **the opening state has no unclassified gap** — every S1 cell resolves to one of the three classes;
5. **`open continuation` pairs are read for non-circular forward pressure**, not counted as missing
   destinations. The failure mode here is circling, not absence.

Reported separately: `supported` coverage, false-substitute count (criterion 2 violations), and
open-continuation circling rate. A single aggregate rate is explicitly **not** the headline, because it
was the aggregate that created the fake-route incentive.

### Method and cost

Generate one catalogue per state (**3 calls**), then blind-read each of the 21 cells against its
pre-registered class ([[feedback_comparative_blind_evaluation]]). **Not keyword-scored** — the same
lexical trap as §7; a keyword match would measure vocabulary rather than coherence, and could not detect
a false substitute at all.

**Cost:** 3 calls ≤ $0.0196 each ≈ **$0.06** (non-authoritative, §6), plus read time. Small, but it is
paid generation and needs its own explicit authorization and ceiling — **and it should not be authorized
until the two canon cells above are decided.**

A failure here is a **prompt-quality** finding, not an architecture one, and far cheaper to learn at
$0.06 than after a prototype is built assuming breadth.

---

## Decision state

**Decided (2026-09-30):** overflow policy (a) — reject before the paid unit starts, generate before
charging, no truncation and no priority-ordered truncation (§2).

**Not funded:** the bounded prototype. Roman: *"otherwise the prototype can prove safety while
preserving the billing-driven story progression problem"* — which is exactly what rev 1's "v1 unblocked"
framing would have let happen. Two prerequisites, in order:

1. **Narrative-index separation resolved** — story-wide posts must stop advancing on `issueIndexInRun`
   (§8). Until then a prototype would demonstrate claim A while leaving the audit's central defect in
   place.
2. **This quality-evaluation plan approved** — and then run, since claim B is unproven and policy (a)
   makes breadth load-bearing.

**And one gate ahead of that second prerequisite:** two of the 21 pre-registration cells depend on canon
only Roman can settle — whether a surviving higher authority (Julian as Provast) makes post-catastrophe
negotiation possible, and whether any faction would still ally with her. Pre-registration cannot close
without them, so the $0.06 evaluation is **not yet authorizable** even though its cost is trivial.

Nothing is built. No provider call. No authorization requested. The cost figures remain arithmetic and
non-authoritative until a measured run exists.
