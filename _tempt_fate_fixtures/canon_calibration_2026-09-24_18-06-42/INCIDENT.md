# Calibration attempt — NO DATA. Local function layer returned 502 on all eight.

**Authorized and run once, 2026-09-24. It produced no usable responses, so it answers nothing
about Mistral.**

## What happened

All eight fixtures failed identically:

```
[TIERED:canonAuditCalibration] all tiers exhausted — last error:
mistral HTTP 502 An error occurred with this application.
NO_RESPONSE_FROM_FUNCTION
```

| | |
|---|---|
| Dispatches | 8 of 8 permitted |
| HTTP statuses | **502 × 8** |
| Responses carrying provider usage | **0** |
| Usable responses | **0 / 8** |
| Reserved | $0.003960 |
| **Realized** | **$0** — the requests never reached Mistral |
| Verdict | **DO NOT ENABLE** (8 unavailable) |

Latencies: `8382ms, 22929ms, 2833ms, 991ms, 920ms, 752ms, 772ms, 786ms`.

## This is a local infrastructure failure, not a model result

`NO_RESPONSE_FROM_FUNCTION` is the local `vercel dev` function layer failing to answer — the same
class of failure this workstream hit on 2026-09-23, when accumulated `@vercel/node` workers took
down every provider route and an authorized restart fixed it.

The latency shape supports that reading: the first two calls hung for 8.4s and 22.9s, then every
subsequent call failed in under a second. That is a worker dying during the first requests and
failing instantly thereafter — not eight independent upstream errors.

Read-only diagnosis (no restart, no kill, no config change):

- `vercel dev` running as PID **94597**, up since 15:26, **194 minutes of CPU time**.
- Only **1** `@vercel/node` worker visible — so not the 28-worker pile-up of the previous incident,
  but the layer is unresponsive nonetheless.

## What the run DID prove

The containment and scoring behaved exactly as designed under total provider failure:

- exactly 8 dispatches, never more;
- primary tier only — no cascade to `grok-4-1-fast-reasoning`, so nothing could masquerade as
  Mistral;
- every fixture scored `unavailable`, and `unavailable` **never** counted as a pass;
- the corrected enable gate reported **DO NOT ENABLE** with the blocker named, rather than reading
  "0 false positives" as success. The pre-correction gate would have required all reds caught, and
  0 caught reds would also have failed — but the *usable-response* requirement is what makes this
  unambiguous.

## What remains unknown

**Everything the calibration exists to measure.** Whether `ministral-8b-2512` can classify canon
violations, whether it cites real facts, whether it returns valid JSON, and above all whether it
produces a valid-but-incorrect `pass` on a red — all still untested.

## Next step — NOT taken

A dev-server restart is the obvious candidate and is **not** performed here: restarting, killing or
reconfiguring the environment requires separate explicit authorization. The calibration is
re-runnable at any time for the same ~$0.004 once the function layer answers; nothing about the
runner needs to change.
