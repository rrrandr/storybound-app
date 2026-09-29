# VOID RUN — not a result

**HTTP 504 after 91,541ms. The upstream hang guard tripped at 90s. No scene returned.**
**C1–C4 are UNTESTED by this run. Nothing is passed and nothing is failed.**

## What happened

The request reached xAI and the provider did not respond within the proxy's 90-second hang guard:

```
[SPECIALIST-PROXY] Trying model 1/1: grok-4-1-fast-reasoning
[SPECIALIST-PROXY] Model grok-4-1-fast-reasoning TIMED OUT after 89977ms (>90000ms hang guard)
[SPECIALIST-PROXY] Entire model chain exhausted.
```

`_noFallback` held — the chain was one entry and nothing else was tried.

| | |
|---|---|
| status | **504** |
| latency | **91,541ms** |
| body | 202 bytes, the proxy's own timeout error |
| scene | **0 chars, 0 beats** |
| receipt | **none returned** |

## Cost — UNKNOWN, and NOT claimed as zero

**This is materially different from the two `spawn EBADF` voids.** Those never reached the provider —
no attempt line was logged and the failure was a local spawn error, so $0 was a safe reading.

Here the provider WAS reached and spent ~90 seconds on the request. No usage was reported, so there
is no measured figure. Providers do not generally bill an unreturned completion, but **I cannot prove
that from this evidence and will not record $0.** Recorded as: **dispatched, no receipt, cost
unknown, possibly non-zero.**

Spend to date with this run excluded: **$0.641** measured across seven receipted calls.

## The harness behaved correctly

- the pre-dispatch guard permitted the call ($0.128895 ≤ $0.150000)
- persist-before-evaluate wrote `raw.txt` and `receipt.json` before any scoring
- the **void gate** refused to score an empty response and exited 5 — no green checks on nothing
- `VOID.json` records the upstream error verbatim

Nothing in this run needs fixing. It is an upstream timeout, not a defect.

## Status

The hypothesis under test — whether *"Either path will cost standing"* recurs now that the brief's
last payment framing is gone and the scanner can see any tense — remains **untested**.

The $0.15 authorization was consumed on execution. **A retry needs a fresh go.**
