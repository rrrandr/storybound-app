# The one capped live check — prepared, NOT run — 2026-10-06

**No spending is authorized by this document.** It exists so the check can be dispatched on one
word, with its bounds already fixed.

## The conclusion I am stopping on

> **The failure no longer reproduces after restarting `vercel dev`. Its historical cause remains
> unknown.**

A freshly launched runtime now passes the actual response path, which supports the stale-process
explanation without proving it — that test also replaces the real provider with a mock. I am not
treating the historical root cause as a prerequisite for the controlled check, and I have stopped
investigating a process that no longer exists.

## What the check is

One exchange through the restarted runtime, then stop. Not a full issue run.

```
SB_OPENING_BRANCH=run SB_EXIT_AFTER=1 SB_CEILING=<cap> node _fs_live_sequence.mjs
```

`SB_EXIT_AFTER=1` takes the scripted reader exit after **one** model-backed exchange, so the run
ends at the interruption rather than continuing into scenes.

**What it would establish:** that the live response path works again — a real provider response
received, parsed, with a usage receipt. **What it would not establish:** that the story pipeline is
fixed. Prose quality, repetition and the ten-scene corpus all remain unmeasured.

## What is captured

Already built in, no new work needed:

- every request and response body under `wire/`, and `calls.json` with model, tokens, cached
  tokens, ticks and the measured dollar figure;
- `x-vercel-id` and other request identifiers on any infrastructure failure, written to
  `infra_failure.json`;
- `_vercel_dev.log` for the matching server-side lines — **this time it should be copied aside
  immediately after the run**, since it rotated on the last incident and cost the correlation;
- per-turn reply evidence: the call whose **complete dialogue+action pair** matched the rendered
  turn, or an explicit `NOT A MODEL EXCHANGE`.

## The two outcomes

| | |
|---|---|
| **The runtime error returns** | the infrastructure stop fires on the **first** one, refuses every further dispatch including fallbacks, retains the reservations, and halts. Demonstrated: 84 dispatched before the fix → 22 dispatched / 11 refused after. |
| **A valid model response arrives** | the live response path is working again. Reported with the receipt, and nothing more is claimed. |

## The obstacle: the current ceiling cannot fund it

| | |
|---|---|
| exposure now | **$1.9456497** |
| remaining under the $2.00 ceiling | **$0.0543503** |
| one exchange, from measured data | **≈ $0.07–0.09** |

One OAS author call measured **$0.060311** (46,068 in / 283 out) in the run that did return
receipts, plus the opener at $0.005293 and a few sub-cent calls. **$0.0543503 is not enough**, so
the check would be refused at admission under the present ceiling.

Two ways forward, both yours:

1. **Raise the cumulative ceiling to about $2.15** — roughly $0.15 of headroom above current
   exposure, enough for one exchange plus a retry.
2. **Reconcile the unresolved $1.1072741 first** against real billing, which would free most of it
   if the true spend is far below the retained estimates.

I am not proposing a write-off, and additional authorization would not make unknown charges
disappear.

## Ledger, unchanged

receipted **$0.8383757** + unresolved **$1.1072741** = **$1.9456497**.
