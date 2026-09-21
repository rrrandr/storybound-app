# Scene 2 Capability Retry #7 — Real Result: INCONCLUSIVE, second real 502 + a harness observability gap (2026-09-20/21)

Authorized retry testing the required-scene-function contract on the fixed (quiet-period) harness,
same Boundary input as every prior retry. **Still did not test the contract** — a second real,
transient 502 from the Grok endpoint, and a newly-discovered harness gap in how the fallback attempt
gets tracked. Real cost: **$0.00.**

## What happened

The scene-spine planner's Grok-primary tier returned **HTTP 502** again — "An error occurred with
this application. NO_RESPONSE_FROM_FUNCTION" — after ~20.3 seconds. This is the SECOND consecutive
real retry (after retry #6) to hit a 502 from the same endpoint on the same call shape, which is
worth naming plainly: this may reflect a real, current reliability issue on the Grok/xAI serving
function for this specific model/role, separate from anything in this codebase.

**New finding, overturning part of retry #6's read:** the app's own console log (captured before the
now-routine fixed-filename restore) shows `_callTieredProvider`'s fallback logic firing correctly:

```
[TIERED:scenePlanner] primary/grok/grok-4-1-fast-non-reasoning failed: grok HTTP 502 ...
[TIERED:scenePlanner] attempt 2 tier=fallback provider=mistral model=ministral-8b-2512 fallbackReason="grok HTTP 502 ..."
```

The ministral-8b-2512 fallback WAS attempted — the tier-fallback code is not broken, contrary to
what retry #6 alone suggested. But no corresponding network request ever appears in the persisted
gate log, and the console capture ends right after that "attempt 2" line — no resolution (success or
failure) was ever recorded before the browser closed. The pacing delay before that fallback's actual
`fetch()` call is small (320ms, confirmed from source), so this isn't a slow-pacing issue.

## Diagnosis

This is a **harness observability gap**, distinct from and narrower than what the last harness fix
(commit `cc503c04`) addressed: the quiet-period fix correctly waits for new calls to APPEAR in the
tracked list, but this run shows a case where the app logged an attempt that apparently never made
it into that tracked list at all before the browser closed — a race between the app's async retry
logic and either Playwright's own request-interception timing or the script's browser-closure
sequence. Not fully pinned down without a live run to instrument further, which is out of scope
here (no follow-up retries).

**Widened as a precaution, dry, no provider calls:** `_e2e_network_gate.mjs`'s default quiet period
raised from 3s to 8s (`quietMs`, still overridable per call) — a larger safety margin against this
exact race recurring, though not a confirmed fix for its root cause.

## Evaluation, in the order requested — all N/A

1. Did the harness observe all fallback/retry attempts through real settlement? — **Partially.** It
   correctly wasn't fooled by retry #6's single-settled-call pattern this time — the earlier fix
   held. But it still missed the fallback attempt's own resolution.
2. Did the planner instantiate the required scene function? — **N/A**, no planner reply exists on
   either tier.
3-6. — **N/A** for the same reason. No capability evidence either way.

## Status

Not a capability result. Real cost: $0.00. Per Roman's explicit instruction, no further retry
follows this one. The required-scene-function contract remains untested against a real generation
after seven attempts — two structural-fix attempts (retries 1-4), two gate-catches (retry 5,
contract test retry attempted twice as 6/7), and now two consecutive real infrastructure failures.
Worth a real decision before an eighth attempt: whether to wait out what may be transient Grok
endpoint instability, investigate the harness race further with dedicated instrumentation (not a
live retry), or accept the small residual risk and try again.
