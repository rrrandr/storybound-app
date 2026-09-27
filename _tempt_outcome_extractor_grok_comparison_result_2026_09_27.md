# Grok 4.3 extractor comparison — RUN EXECUTED, RESULT LOST TO A HARNESS HANG

Run id `2026-09-27_03-51-34`. Phrase **consumed on execution**.
Evidence: `_tempt_fate_fixtures/extractor_only_2026-09-27_03-51-34/`

## Verdict on the four pre-registered criteria: NO DATA

| criterion | result |
|---|---|
| 1. parsing | **NO DATA** |
| 2. citation validity | **NO DATA** |
| 3. schema validity | **NO DATA** |
| 4. semantic grounding | **NO DATA** |

The provider answered successfully. The harness then lost the answer before writing it to disk. This
is a **paid run with no usable result**, and the cause is entirely mine.

## What IS established — provenance, verified server-side

From `_vercel_dev.log`, preserved as `server_receipt_evidence.log` in the run directory:

```
[SPECIALIST-PROXY] _noFallback — chain reduced to ONE entry: grok-4.3
[SPECIALIST-PROXY] Role: STRUCTURE_GENERATOR, Model chain: grok-4.3
[SPECIALIST-PROXY] Trying model 1/1: grok-4.3
[PROXY] SB model override -> grok-4.3 (effort high)
[SPECIALIST-PROXY] latency=9979ms model=grok-4.3 effort=high (chain="grok-4.3") status=200
[SPECIALIST-PROXY] ✓ Model grok-4.3 succeeded
```

- **Returned model: grok-4.3.** The `_sbModelOverride` pin resolved as intended, confirmed by the
  proxy's own `SB model override -> grok-4.3` line rather than inferred from the request.
- **Upstream attempts: 1.** `_noFallback` reduced the chain to one entry and the server logged
  `Trying model 1/1` once. No second attempt appears anywhere in the log.
- **Reasoning effort: high** — the proxy's own default for this model, as prepared.
- **The redirect worked end to end.** No `[MISTRAL-PROXY]` line appears after the grok block: the
  page's request to `/api/mistral-proxy` was translated at the route boundary and never reached the
  Mistral endpoint. Production routing was not changed, and the last two `[MISTRAL-PROXY]` usage
  lines in the log belong to the earlier Ministral replays, not to this run.
- **One provider request total**, matching the one-request cap and the single reservation.

## What was lost, and why

`_e2e_network_gate.mjs:waitForSettlement` computes

```js
const allSettled = !tierLogAhead && relevant.length > 0 && relevant.every(isSettled);
```

`relevant` is the set of calls the **gate** tracked under the phase. In grok-comparison mode my
route handler terminates the request itself (`route.fetch` → `route.fulfill`), so the gate's real
pass-through lane never tracks it: `relevant.length === 0`, `allSettled` can never become true, and
the function — documented as "never gives up on its own… never decides it FOR them by timing out" —
spun for 80 minutes.

The hang sits **after** the work: `gate.jsonl` shows the phase opening at `…106287` and closing 15
seconds later at `…121077`, so `runExtractorOnly` had already returned with the parsed result. But
`report.json`, `extractor_raw_response.json` and the prompt dumps are all written *after* settlement,
and the result lived only in the hung process's memory. Killing the process was the only way to end
it, and that destroyed the response. It is not recoverable: the gate log holds only the two phase
records, and the page state was deliberately never mutated.

This is the same class of self-inflicted harness failure as the earlier gibberish attempts — the
result was never in danger from the provider, only from the instrument.

## Cost

**Not measurable locally.** `/api/proxy` logs latency and status but not usage, and the `usage` block
(including `completion_tokens_details.reasoning_tokens`) came back inside the response body that was
lost. The run report's measured-cost field was never written.

- Reserved: **$0.012500** (one grok-4.3 request, 3600 in + 3200 out), against the $0.050000 ceiling.
- Bounded estimate only: the prompt is ~2,600 tokens (≈$0.0033 at $1.25/M). Completion is unknown and
  includes reasoning tokens at effort `high`; 9,979ms of latency suggests moderate reasoning. A total
  in the region of $0.007–$0.013 is plausible and is an **estimate, not a measurement**.
- **The xAI console is the ground truth for this charge.** One request, ~03:51 local, model grok-4.3.

## Status unchanged

The extractor remains **not ready for reliable automatic canon commitment**. This run neither
supports nor refutes the "stronger model" hypothesis — it produced no evidence about grok-4.3's
semantic grounding at all. Ministral prompt tuning for this role stays closed.

## Not done, deliberately

No retry, no fallback, no second request, no story mutation, no production routing change, and **no
harness fix** — per the run instruction to stop. The one-line change that would prevent a recurrence
(the grok route must register its translated call with the gate, or the runner must not wait on a
settlement it can never observe) is identified above and left unapplied.
