# Extractor-only live test — result

**Authorized and executed once, 2026-09-24.** One dispatch, `ministral-8b-2512`, HTTP 200, 28.5s.
`prompt_tokens: 2005`, `completion_tokens: 1400`, `total_tokens: 3405`.
Realized cost **≈$0.00051** against a $0.02 ceiling (reserved $0.000750). No second dispatch, no
author/planner/scaffold/image call, no story mutation.

Evidence: `_tempt_fate_fixtures/extractor_only_2026-09-24_08-00-42/`.

---

## Verdict: the reading is right. The output is unusable.

Both halves matter, and they point in opposite directions.

### What it got right — including the thing this whole migration existed to fix

| question | result |
|---|---|
| **Julian's disposition** | **`suspects`**, `memoryAbsent: false`, `suspicionFromResidue: true` — resolved **by name** |
| Roster coverage | **four** parties resolved: the assembly, the presiding Dohkar, Seren, Julian |
| Invoker anchor | `{who: "the protagonist", status: "exempt", reason: "invoker_anchor"}` — applied by default, unjustified, as intended |
| Requested vs delivered scope | both stated, specific, and distinguishable |
| **`full` vs `narrower`** | **`narrower`** — with a scopeNote explaining exactly which parties fell short |

The paid run's own self-certified record named **only "the assembly"** and claimed
**`scopeMatch: "full"`**. The extractor, reading that same prose, resolved every present party and
reported the grant as **narrower**:

> *"The wish explicitly asked for **everyone** to forget, but Seren's composure suggests she retains
> some awareness of the ritual's intent (though not the event itself). Julian's gaze indicates he is
> not fully oblivious to the rupture's effects, though he does not remember the ceremony."*

That is the defect found, by the mechanism built to find it, on the exact scene that exposed it.
A separate witness reading accepted prose reaches a different and more honest verdict than an
author certifying its own unwritten work.

### What failed — and why nothing was committed

| failure | detail |
|---|---|
| **No citations at all** | `evidenceQuote` is `undefined` on every one of the four knowers, despite an explicit, repeated instruction |
| **Truncated** | `completion_tokens` hit `max_tokens: 1400` **exactly**; the reply stops mid-sentence inside `invokerExemption.note`, and `unaccountedParties` never appears |
| **Markdown-fenced** | wrapped in ```` ```json ```` despite "No markdown, no commentary" |
| Internal contradiction | `deliveredScope` says *"Julian forgets the ceremony"*, but his structured `memoryAbsent` is `false` |
| Questionable `targetPopulation` | declared `named_subset` enumerating the present cast, where `all_present_except_invoker` is the plainer reading of "everyone forgets" |

**The production path rejected it, correctly.** `JSON.parse` failed, the `\{[\s\S]*\}` fallback
produced invalid JSON, and `_extractTemptOutcome` threw. Nothing was committed; no consequence was
manufactured from a truncated, uncited reply. The safety property held.

The structured content above was recovered **offline** from the preserved `gate.jsonl` by
`_tempt_outcome_extractor_recover_report.mjs`, which closes the truncation for **review only**. It
is explicitly not a commit path and never feeds one.

## Root causes, stated — not fixed

Per the freeze, these are findings:

1. **`max_tokens: 1400` is too small for the contract as it now stands.** The reply produced 5,758
   characters and was still mid-object. The contract grew this week — `targetPopulation`,
   `invokerExemption`, `unaccountedParties`, and per-knower `memoryAbsent` /
   `suspicionFromResidue` / `evidenceQuote` — and this scene has four knowers. Citations alone
   would add roughly 400 characters. The ceiling was set before those fields existed.
2. **`ministral-8b-2512` did not honour the citation requirement or the no-markdown instruction.**
   A small primary tier under a long structured contract. Whether the right answer is a larger
   ceiling, a shorter contract, a different primary tier, or citations as a second cheap pass is a
   design question — and the freeze says it is not answered now.

Note the asymmetry this exposes: a **truncated** reply is a parse failure and stops at one tier; an
**uncited but complete** reply would also stop, as a validation failure. Neither cascades. That
behaviour is what the dry proof established and what happened here.

## One runner defect, found by running it

`gate.waitForSettlement(roleTag, opts)` takes a **roleTag** first. I passed an options object, so
the runner waited on a roleTag that never existed and hung after its single successful dispatch
until killed (SIGTERM, exit 144).

Nothing was lost and nothing was re-dispatched: the response had already settled and been persisted
to `gate.jsonl` before the hang, which is exactly the property that log exists for. The call is
fixed. One consequence to record honestly: the runner's own before/after state snapshot was never
written for this run, so **non-mutation here rests on the structural guarantee** (the runner calls
no resolve/commit/write path) **and the dry proof** — not on a captured snapshot of this execution.

## Accounting

| | |
|---|---|
| Dispatches | 1 of 3 permitted |
| Reserved | $0.000750 of $0.020000 |
| Realized | ≈$0.00051 (2005 in + 1400 out @ ministral-8b-2512) |
| Scene A budget consumed | **$0** — this run had its own ceiling and did not touch it |
| Cumulative session spend | ≈$0.4461 |

## Status: Tempt Fate architecture is FROZEN

No follow-up run is scheduled and no new design branch is open. The extractor architecture stands
as committed; the two root causes above are recorded for whenever you choose to pick them up.
