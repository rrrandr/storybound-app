# Grok 4.3 extractor comparison — REPLAY OVER THE FIXED PATH: DATA

## RECORDED VERDICT

**Parsing PASS · Citation validity PASS · Schema validity FAIL · Semantic grounding FAIL ·
NO COMMITMENT.**

A failed extractor sample. Grok improved on Ministral in exactly two ways — it returned clean JSON and
valid verbatim quotes — and remains unsafe for automatic commitment.

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

**An earlier version of this document called the scope handling "correct". That was wrong, and the
error mattered: it credited as a strength something that is a third grounding failure.**

Grok reported `scopeMatch: "narrower"` with this note:

> "Seren and Julian not shown forgetting the event occurred; **no evidence the forgetting extends past
> the immediate scene or covers every detail for all present**"

`narrower` is for an **evidenced** difference between requested and delivered scope. A note that admits
the report cannot establish the reach is not an evidenced difference — it is insufficient evidence to
compare the two, which under the current contract is exactly **`undetermined`**. Naming an
unestablished reach and then grading the comparison anyway is the same defect as asserting a
disposition the prose does not support, applied to scope instead of to a person.

Note why criterion 3 did not catch this. The validator's rule ties `scopeMatch` to
`unaccountedParties`, and `unaccountedParties` is empty here — all four roster members are resolved.
Nothing in the validator connects *a scopeNote that admits unestablished reach* to `undetermined`, so
`narrower` passed structurally. The gap is in the contract's enforcement, not in this run's reading of
it.

### 4. Semantic grounding — **FAIL**, but not the Ministral failure
The pre-registered rule: Julian's gaze is not evidence of memory in either direction; `retained` or
`forgot` cited to the gaze is a FAIL.

Grok did not rest on the gaze alone: it cited the gaze **plus Julian's spoken line, "The question
stands."** Speech is better evidence than demeanour, and the decisive Ministral defect — flipping a
verdict on a bare gaze — **did not reproduce**.

**But an earlier version of this document overstated what that line shows, and that overstatement is
withdrawn.** "The question stands" may support Julian's awareness of a **continuing question**. It does
not clearly establish that he **retains memory of the erased ceremony**, which is the claim
`disposition: "retained"` actually makes. And it provides **no basis whatsoever** for
`suspicionFromResidue: true`. So Julian's entry is not rescued by being quote-backed: a valid quote
that supports a weaker proposition than the one asserted is still an unsupported assertion.

It fails on three grounds:

1. **Julian's claim outruns his quote.** `affectedKnowers` says `retained` with
   `suspicionFromResidue: true`; `knowledgeStates` says `suspects`. The quote supports awareness of a
   continuing question at most — not retained memory of the erased occurrence, and nothing at all about
   residue. A retained memory and suspicion-from-residue cannot both hold anyway. This is the same
   two-enum confusion Ministral showed.
2. **Seren's `partial` rests on an intention, not a recollection.** Her quote is "We were to begin the
   rite" — an *intended* event. The prompt explicitly forbids an intended or planned event standing in
   for recollection of one that occurred, and `partial` with `memoryAbsent: false` alongside a
   `knowledgeStates` entry of `unaware` is internally inconsistent besides.
3. **`scopeMatch: "narrower"` is unjustified where the report itself names unestablished reach** — see
   above. Under the current contract that is `undetermined`.

So: better format compliance and better citations, no gaze-based verdict — and still three claims the
prose does not establish, plus one schema contradiction that blocks commitment by itself. **One
sample. This certifies nothing.**

## Cost — the provider's own figure, not mine

| | |
|---|---|
| **provider charge (AUTHORITATIVE)** | **$0.006450** (`cost_in_usd_ticks` 64,496,500 × 1e-10) |
| runner's `measuredUsd` | $0.005421 — **INACCURATE. Token-derived, understates the real charge by ~19%. Do not cite it.** |
| reserved | $0.012500 |
| prompt / completion | 2,619 / 859 tokens (192 cached) |
| reasoning tokens | 492 — billed as output, and **0 tokens beyond the 3,200 asked for** |

The reasoning-charge risk you accepted did not materialise: 492 reasoning tokens, no overrun, and the
real charge landed at about half the reservation.

**The provider's tick figure is the authoritative cost for this run. The receipt's `measuredUsd` is
marked INACCURATE** — annotated in the run directory as `COST_AUTHORITY.md` beside the receipt rather
than by editing the preserved receipt itself.

Two reporting defects worth naming, **left unfixed** per the instruction:
- The receipt's `measuredUsd` is computed from token counts, but this repo's own convention
  (`estimateTextCost`, and `_oas_turn_reply_long_context_reclassification_control.mjs`) is that the
  provider's `cost_in_usd_ticks` outranks derived arithmetic. The field name overstates its authority.
- The console's `reserved … of $0.020000` line prints `CEILING_USD` rather than this mode's $0.05
  ceiling. Display only — the ledger itself reserved against the correct ceiling.

## Status unchanged

The extractor is **unavailable for automatic canon commitment**, and the schema contradiction alone
blocks this sample regardless of the grounding verdict.

The stronger-model hypothesis is **only partly supported**: grok-4.3 follows the **output format and
citation requirement** better than Ministral, but it does **not** follow the **semantic contract**
reliably enough to write canon. Format compliance and semantic reliability came apart, and only the
first improved. Ministral prompt tuning for this role stays closed.

## Next step — a design decision, not another sample

Whether a stronger extractor should return **only supported observations**, for a **separate resolver**
to turn into durable outcomes — rather than self-classifying durable outcomes itself.

The evidence for asking now is that all three grounding failures above are the same shape: a model
being asked, in one pass, both to *observe what the prose establishes* and to *grade it into a
contract value* (`retained`, `partial`, `narrower`). Each failure is the grading step overreaching
what the observation step supported. Every quote Grok produced was valid; every verdict it attached to
one was stronger than the quote carried. Splitting the two would let the grading rules be enforced
mechanically against observations, instead of being asked of a model that has already shown it will
assert past its own evidence — and would also close the validator gap noted under criterion 3, since a
resolver could refuse to grade a scope whose reach was never observed.

No sample answers this. It is a decision about where the contract lives.

## Not done

No retry, no fallback, no second request, no story mutation, no routing change, no follow-up fixes,
no push.
