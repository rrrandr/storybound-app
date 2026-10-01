# Narrative-index consumer classification

**Status:** audit + no-op seam. **Not the separation.** Provider-free. 2026-10-01.

Eleventh of the planning thread. Companion to the code in `public/app.js`
(`currentNarrativeIssueIndex`, ~`143546`) and `_narrative_index_parity_control.mjs` (42/42).

---

## The problem, in one line

`issueIndexInRun` is a **billing** counter — `Math.floor(sceneIndex / pricing.scenesPerIssue) + 1`
(`143199`) — and it also indexes `cgScaffold.issueArcs[ii-1]`, which supplies the story's **thesis,
regimePhase, cliffShape** and gates the **committed-truth reveal window**. So a Fortune charge decides
which narrative arc is in force: the same category error as `_tickAPlot` firing a milestone because a
scene number arrived, moved up to the issue layer.

## Why this is preparation and not the fix

A narrative index only advances if something advances it, and the thing that would — an issue-closing
terminal chosen by a pre-author continuation planner — does not exist. Returning anything other than the
paid index today would **freeze every story on `issueArcs[0]`**, so thesis, regime phase, cliff shape and
the reveal window would stop progressing entirely. Strictly worse than the current proxy.

So `currentNarrativeIssueIndex()` returns `_currentIssueIndex()` exactly. No new state, no transitions,
no terminals, no lifecycle change. What it buys: the eventual change is **one function body** instead of
a hunt across ~35 sites, and every narrative read now declares itself at its call site.

## Classification

25 `_currentIssueIndex` references and ~17 further direct `issueIndexInRun` reads.
**My first grep was truncated at 20 results and missed two narrative sites** (`174555`, `227722`) — both
found only when an `Edit` hit two identical matches. The complete list follows.

### NARRATIVE — converted to the seam (7)

Every one indexes `issueArcs[]`. This is now an invariant the control enforces: **no `issueArcs[i]` may
be indexed from the paid counter.**

| Line | Consumer | Reads |
|---|---|---|
| 30927 | `_spineSeedClause` — sensory/atmosphere/axis prompt seeding | `issueArcs[idx-1]` |
| 45212 | committed-truth **reveal window** eligibility | `issueArcs[_ri-1]` |
| 48925 | `_currentIssueCliffShape` → `_selectCliffArchetype` weighting | `issueArcs[ii-1]` |
| 66178 | `_inferRegimePhase` → regime permissions | `issueArcs[_ii-1]` |
| 93255 | `buildOASSpineDirective` — the intimate/OAS turn loop | `issueArcs[idx-1]` |
| 174557 | CG screenplay prompt — per-issue visual dramaturgy | `issueArcs[_vii-1]` |
| 227725 | `_renderCGScaffoldBlock` — per-issue visual arc | `issueArcs[_vii-1]` |

### PAID-UNIT / BILLING — unchanged (the majority)

Charging, product labels, lifecycle. A named subset is pinned by the control so a later change cannot
quietly move one:

preview/paywall idempotency (`143768`) · next-issue label (`143868`) · `state.nextIssueNumber` (`143967`)
· next-issue index for pricing (`145014`) · issue-one claim (`145064`) · begin-button charge (`145169`) ·
charge-declined CG (`238109`) · charge-declined literary (`268333`, `289038`) · refund-popup issue match
(`238267`) · first-scene-of-later-issue gate (`233171`) · `_isFinalSceneOfFinalIssue` (`87420`) ·
title-line `#?.N` renders (`15116`, `15152`, `15185`) · issue numbering (`76588`, `80572`, `80634`) ·
"Continue to Issue N" button (`112431`) · the Supabase snapshot column (`130806`) · the writes at
`87322`, `102789`, `103001` and the init at `19378` · the health-dashboard readout (`228293`, display
only).

### AMBIGUOUS — deliberately NOT converted (5 questions)

Each carries an unanswered semantic question. Converting on a guess would be exactly the silent
reclassification this audit exists to prevent.

| # | Site | The unanswered question |
|---|---|---|
| 1 | `60449` relationship-span index (`_resolveIssueRelationshipSpan(tier, idx, count)`) | The **index** is a narrative rung, but `count` comes from `ISSUE_TIER_COUNT` — a pricing table. If narrative issues can diverge from paid units, "issue 2 of 4" becomes ill-defined. Does the span re-base on narrative issues, or stay a paid-unit pacing curve? |
| 2 | `60868` cliffhanger-family memo key (`_cliffhangerFamilyByIssue[ii]`, "record the steer ONCE per issue") | `cliffShape` is narrative, but a cliffhanger is what **ends a purchased issue** — the cover renders and the "Continue to Issue N" button appears. Should the once-per-issue memo reset on the narrative boundary or the paid one? |
| 3 | `17448` / `17537` secret-quest selection and tick | `_advanceFatelandsMysteryForIssue` is called **from the paid boundary** (`143208`), described as "player-paced, floor-gated". The quest is narrative in substance but paid in mechanism. Which boundary should advance a story mystery? |
| 4 | `65192` `descLedger` issue key (`storyId:issueIndexInRun`) | A prose-repetition ledger that resets per issue. Narrative in purpose — but resetting it on the (more frequent) narrative boundary would weaken repetition protection. Which reset cadence is correct? |
| 5 | `198973` embodiment-ledger stamp (`issueIndex` beside `sceneInIssue`) | Provenance metadata. `sceneInIssue` is unambiguously a paid-unit position, so consistency argues paid — but the ledger itself is narrative. Should the stamp record the purchased issue, the narrative issue, or both? |

## What the control proves — 42/42

Static sections run **before** the browser, so a build without the seam reports named failures rather
than timing out in `waitForFunction` (both this control and the delivery-anchor control did exactly that
on their first bite check — a valid RED, a useless diagnostic).

- the seam's body is a pure delegation, declaring no state, transition or terminal;
- **all 7** indexed `issueArcs` reads derive from the seam, each asserted by line;
- the 8 pinned billing consumers still read the paid index;
- all 5 ambiguous consumers are untouched;
- the paid boundary still computes from scene count, renders the cover, refreshes the synopsis, ticks the
  quest, clears all three purchase-status fields, and writes the **paid** counter and never a narrative
  one;
- the accessor equals the paid index at `unset · null · 0 · 1 · 2 · 5 · 9 · 37`, adds no state key, and
  is read-only.

**Bite: 21/32** on the pre-seam build — the seam absent, all 7 `issueArcs` reads named individually, and
parity unmeasurable.

## What remains

1. **The 5 ambiguous questions above** are yours to settle; the seam does not need them answered, but the
   real split does.
2. **The real split** still waits on a planner that can select an issue-closing terminal. Nothing here
   pretends otherwise.
3. Behaviour today is identical by construction — this changed no story output.
