# Grok 4.3 extractor comparison — REPLAY OVER THE FIXED PATH: DATA

Run id `2026-09-27_06-02-49`. Phrase 8 consumed. Evidence:
`_tempt_fate_fixtures/extractor_only_2026-09-27_06-02-49/`

The persisted-response redirect path worked. `upstream_raw_response.json` (5,490 bytes) and
`upstream_receipt.json` were written inside the route handler, before `route.fulfill` handed the
response to the page — so before the extractor parsed anything. The process exited on its own, code 0.

## Provenance, verified

| | |
|---|---|
| served by | **grok-4.3** (`resolvedModel`, and `[PROXY] SB model override -> grok-4.3 (effort high)`) |
| chain entry | grok-4.3 — `_noFallback` reduced the chain to one entry |
| **upstream attempts** | **1** (`_orchestration.upstreamAttempts`) |
| reasoning effort | high (the proxy's own default; never specified by us) |
| HTTP | 200 |
| gate-tracked calls | 0 — the redirect bypasses the gate by design, as proven |

## The four criteria, reported separately

### 1. Parsing — **PASS**
One complete JSON object, not truncated. 859 completion tokens against a 3,200 limit, so the output
budget was never in play.

### 2. Citation validity — **PASS**
`citations: []` — zero refusals. Every `evidenceQuote` is present verbatim in the accepted scene, and
the quotes are distinct and apposite rather than one line reused:

- the assembly → "The assembly settles into confusion that carries no memory of accusation"
- the presiding Dohkar → "The presiding Dohkar blinks as if waking. \"What gathering is this?\""
- Seren → "Seren remains kneeling, her composure untouched. \"We were to begin the rite.\""
- Julian → "Julian has not moved, yet his gaze finds mine across the clearing. \"The question stands.\""

This is a real improvement over Ministral, whose last replay produced a stitched quote that failed
verbatim checking. **But verbatim validity still proves only that a quote exists, never that it
supports the claim** — which criterion 4 is for.

### 3. Schema validity — **FAIL**, one error
```
Julian: suspicionFromResidue is true but disposition is "retained"
        — residue-driven suspicion belongs to "suspects" or "partial"
```
A genuine internal contradiction, caught by the validator. `structurallyValid: false`, so this report
could not have been committed.

Scope handling, by contrast, is correct: `scopeMatch: "narrower"` with a `scopeNote` naming exactly
what is unestablished ("Seren and Julian not shown forgetting the event occurred"), and
`unaccountedParties: []` with all four roster members resolved in `affectedKnowers`. That is the
honest downgrade the contract demands rather than a false "full".

### 4. Semantic grounding — **FAIL**, but not the Ministral failure
The pre-registered rule: Julian's gaze is not evidence of memory in either direction; `retained` or
`forgot` cited to the gaze is a FAIL.

**Grok did not do that.** It cited the gaze **plus Julian's spoken line, "The question stands."** That
is speech referring back to a question posed before the rupture — textual evidence of continuity, a
different category from the prohibited gaze/silence/stillness/composure/presence inferences. On the
letter of the pre-registered prohibition, Julian's disposition is **not** ungrounded, and the decisive
Ministral defect — flipping a verdict on a bare gaze — **did not reproduce**.

It fails on two other grounds:

1. **Julian is asserted two incompatible ways at once.** `affectedKnowers` says `retained` with
   `suspicionFromResidue: true`; `knowledgeStates` says `suspects`. Nothing in the prose establishes
   residue-driven suspicion at all, and a retained memory and suspicion-from-residue cannot both
   hold. This is the same two-enum confusion Ministral showed, and the unsupported half is the
   residue claim.
2. **Seren's `partial` rests on an intention, not a recollection.** Her quote is "We were to begin the
   rite" — an *intended* event. The prompt explicitly forbids an intended or planned event standing in
   for recollection of one that occurred, and `partial` with `memoryAbsent: false` alongside a
   `knowledgeStates` entry of `unaware` is internally inconsistent besides.

So: better citations, correct scope discipline, no gaze-based verdict — and still two claims the prose
does not establish, plus one schema contradiction. **One sample. This certifies nothing.**

## Cost — the provider's own figure, not mine

| | |
|---|---|
| **provider charge** | **$0.006450** (`cost_in_usd_ticks` 64,496,500 × 1e-10) |
| runner's `measuredUsd` | $0.005421 — **token-derived, and it understates the charge by ~19%** |
| reserved | $0.012500 |
| prompt / completion | 2,619 / 859 tokens (192 cached) |
| reasoning tokens | 492 — billed as output, and **0 tokens beyond the 3,200 asked for** |

The reasoning-charge risk you accepted did not materialise: 492 reasoning tokens, no overrun, and the
real charge landed at about half the reservation.

Two reporting defects worth naming, **left unfixed** per the instruction:
- The receipt's `measuredUsd` is computed from token counts, but this repo's own convention
  (`estimateTextCost`, and `_oas_turn_reply_long_context_reclassification_control.mjs`) is that the
  provider's `cost_in_usd_ticks` outranks derived arithmetic. The field name overstates its authority.
- The console's `reserved … of $0.020000` line prints `CEILING_USD` rather than this mode's $0.05
  ceiling. Display only — the ledger itself reserved against the correct ceiling.

## Status unchanged

The extractor remains **not ready for reliable automatic canon commitment**. The stronger-model
hypothesis is **partly** supported and not settled: grok-4.3 cleared the citation and scope failures
and did not repeat the gaze-verdict flip, but still asserted unsupported content and produced a
schema contradiction on the very first sample. Ministral prompt tuning for this role stays closed.

## Not done

No retry, no fallback, no second request, no story mutation, no routing change, no follow-up fixes,
no push.
