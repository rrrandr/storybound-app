# Grok 4.3 extractor comparison — PREPARED, NOT RUN

Prepared 2026-09-27. **Nothing has been dispatched. No phrase has been consumed.**

## Why this run exists

Ministral prompt tuning for this role is **closed**. Three bounded corrections (output budget,
`evidenceQuote` in the schema, semantic grounding rules) each did exactly what they were scoped to
do, and none moved the model's willingness to assert unsupported conclusions. The decisive evidence
is Julian: replay 2 and replay 3 read the **same** quote —

> "Julian has not moved, yet his gaze finds mine across the clearing."

— as `retained` and as `forgot` respectively. Both are retained as regression fixtures
(`_tempt_fate_fixtures/extractor_regression/03_*` and `04_*`), and
`_tempt_outcome_extractor_regression_control.mjs` (19/19) asserts the contradiction so it cannot be
lost.

So the open question is no longer "can this prompt be tuned." It is **"does a stronger model obey
this same prompt."** That question is only answerable if the prompt does not move.

## What does NOT change

| | |
|---|---|
| messages | **byte-identical** to replay 3's recorded request — deep-equal against `extractor_only_2026-09-27_02-52-51/gate.jsonl`, not against a rebuild |
| temperature | 0.1 |
| max_tokens | 3200 |
| role | `STRUCTURE_GENERATOR` |
| prose | the retained 09-24 fixture (`run_2026-09-24_02-11-02_scene_a`), already paid for |
| criteria | the four pre-registered below, unchanged from replay 3 |
| production routing | **untouched** — `_extractTemptOutcome` keeps its Mistral-primary chain |

## The four provider-required changes, each documented

1. **Endpoint** `/api/mistral-proxy` → `/api/proxy`. Grok is not served by the Mistral proxy.
   Performed as a **harness redirect at the route boundary** (`route.fetch` → `route.fulfill`), not
   by editing production. The page still issues its own request to its own endpoint; the harness
   translates it, and the real upstream response is fulfilled back **unchanged**, so the page parses
   a genuine `/api/proxy` envelope with production's own code.
2. **Model pin** `model: 'ministral-8b-2512'` → `_sbModelOverride: 'grok-4.3'`. `preferredModel`
   would be reordered and re-resolved by `_resolveGrokModel`; `_sbModelOverride` is the allowlisted
   pin that names the **resolved** model, and `_orchestration.resolvedModel` echoes back what
   actually answered.
3. **`_noFallback: true` added.** Without it the server walks `STRUCTURE_GENERATOR`'s three-entry
   chain *inside this one client request* — three billable upstream attempts, invisible to any
   client-side pin. The Mistral body needed no such field, so this is an addition, not a translation.
4. **Role unchanged** at `STRUCTURE_GENERATOR` — already what the Mistral body sent, and already the
   chain that carries grok-4.3. Listed so the enumeration is complete.

Nothing else is sent. `reasoningEffort` is deliberately **not** specified, so the proxy's own default
for this model applies (`high`). Specifying it would be a fifth change and a weaker comparison.

`_tempt_outcome_extractor_grok_comparison_dry_proof.mjs` (**32/32**, zero dispatches) proves the
enumeration mechanically: it diffs the outgoing body's keys against the last paid run's body and
fails if any undocumented fifth difference rides along.

## Response handling, verified dry

`_extractTemptOutcome` reads `data.content`. `/api/proxy` never sets that key — it returns the raw
xAI body (`choices[0].message.content`) spread flat plus an `_orchestration` block. The bridge is the
Mistral branch's `d.content || d.choices[0].message.content`, which already handles both. The dry
proof feeds a **real-shaped** grok envelope (with `usage.completion_tokens_details.reasoning_tokens`
and `_orchestration.resolvedModel`) through the real extractor and confirms a complete report comes
back with the contract intact. Had that path not already worked, the comparison would have returned
"extractor returned no content" and been billed for nothing.

## Containment — a hole the dry proof found and closed

Translating only the first hop left the extractor's **own** tiers 2 and 3 to the generic branch,
which would have reserved and dispatched `grok-4-1-fast-reasoning` on `/api/proxy`: a different
model answering the comparison, and a second billable request the one-request cap never saw. In this
mode the translated hop is now the only lane that exists; every other request is refused before
dispatch and logged as `blocked-not-the-pinned-comparison`.

## Reservation allowance, and the uncertainty in it

| | tokens | rate | USD |
|---|---|---|---|
| prompt (censused) | 3,600 | $1.25/M | $0.004500 |
| completion (`max_tokens`) | 3,200 | $2.50/M | $0.008000 |
| **bounded total** | | | **$0.012500** |
| reservation ceiling | | | **$0.050000** |
| headroom | | | $0.037500 ≈ 15,000 reasoning tokens |

**The ceiling is headroom, not a limit.** xAI bills reasoning tokens as output and does **not** count
them against `max_tokens`, so no enforceable total-cost limit exists at this provider. The ledger can
refuse a request *before* it is sent; it cannot truncate one in flight. If grok-4.3 at effort `high`
reasons past ~15,000 tokens, the overrun is real and will appear on the receipt. The run report
records `reasoningTokens`, `completionOverMaxTokens` and a **measured** cost from the returned
`usage`, so the actual charge is reported rather than assumed.

Prompt rates are the standard tier; the long-context tier (2×) begins above 200k prompt tokens and
this prompt is ~2.6k, so it does not apply.

## Pre-registered criteria — unchanged from replay 3

Reported **separately**; a pass on one is not a pass on another.

1. **Parsing** — a single JSON object comes back, complete, not truncated.
2. **Citation validity** — every `evidenceQuote` appears **verbatim** in the accepted scene text.
   (Verbatim validation proves a quote exists; it never proves the quote supports the claim.)
3. **Schema validity** — `_validateTemptFateOutcomeReport` passes against the composite roster.
4. **Semantic grounding** — the decisive one. Every claim must be *supported* by its quote.
   Specifically, on this prose: **Julian's gaze is not evidence of memory in either direction.** The
   only grounded readings of Julian are `unaccountedParties` with `scopeMatch: undetermined`, or a
   disposition genuinely supported by other text. `retained` **or** `forgot` cited to the gaze is a
   **FAIL**, exactly as it was for Ministral. The comparison is not graded on agreeing with me — it
   is graded on not asserting what the prose does not establish.

This run **cannot** certify the extractor. A pass means one model obeyed the grounding rules once on
one sample; the extractor stays marked **not ready for reliable automatic canon commitment** either
way. A failure closes the "stronger model" hypothesis and moves the question to the contract itself.

## Not in scope

No scene generation. No commit, no pending resolution, no story mutation. No image route. No push.

## To run — requires this exact phrase

```
node _tempt_outcome_extractor_live_run.mjs --pin-grok --authorize \
  "run the grok 4.3 extractor comparison once on the unchanged prompt and retained prose, pinned to grok-4.3, one upstream attempt, $0.05 reservation"
```

Invoked bare (or with a wrong phrase) it prints the plan and exits 3 without dispatching. The phrase
is consumed **on execution, not on spend**: if the run dispatches and the transport fails, that is
NO DATA and the phrase is still spent.
