# VOID RUN — not a result

**HTTP 502 `NO_RESPONSE_FROM_FUNCTION`, 729ms, empty body. No scene was returned.**
**C1–C4 are UNTESTED by this run. Nothing is passed and nothing is failed.**

## What happened

The local dev server hit `Error: spawn EBADF` and could not spawn the proxy function handler. It
returned 502 before the request reached the provider.

| | |
|---|---|
| status | **502** |
| latency | **729ms** |
| body | 68 bytes — `An error occurred with this application. NO_RESPONSE_FROM_FUNCTION` |
| scene | **0 chars, 0 beats** |
| receipt | **none returned** |

## Cost

**No receipt came back, so there is no measured figure to log.** The evidence indicates **$0**:

- 729ms against 35,373–47,829ms for every real generation on this path — two orders of magnitude
  too fast for an upstream round trip.
- `_vercel_dev.log` records the failure as `spawn EBADF` — the function never executed, so no
  provider call was made from it.
- No `[SPECIALIST-PROXY]` attempt line was logged for this request at all; every prior paid call
  logged `Trying model 1/1` followed by a latency and status.

**Stated as evidence, not as a receipt.** I cannot produce a usage record proving $0, only the
absence of any record that it was charged.

## The real finding — a defect in MY harness

**This run printed `C1 (mechanical): PASS` and `C3: clean` on an empty string.** Content scanners
look for forbidden material; nothing contains no forbidden material, so a void response scored as
obedient. **An absent violation is not an obeyed instruction.**

Only C2 caught it, and only incidentally — presence failed because no roster member appears in an
empty scene.

**Fixed:** `_fsc_c4_run.mjs` now gates on `status === 200` AND a parseable plan with at least one
beat, BEFORE any scoring. A void response prints `RUN VOID — NOT SCORED`, writes `VOID.json`, and
exits 5. Pinned by six assertions in `_fsc_scoring.mjs` (68/68), including one that reads the
runner's own source to confirm the gate precedes scoring.

## Status

The absence clause remains **unverified against the model**. The authorization was consumed on
execution; a retry needs a fresh go.
