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


---

# OUTCOME AND CORRECTIONS — appended 2026-10-06

## The check ran, and the live response path is restored

0 `NO_RESPONSE_FROM_FUNCTION` (the void run: 29 of 29), 0 application fallbacks, receipts on every
Grok call, and a real model reply attributed by the complete-pair matcher. **I have stopped
investigating the historical runtime failure** and will only return to it if it recurs.

## Cost attribution, corrected

My "one exchange measured $0.083266 all-in" was wrong in both directions — it **excluded**
receiptless exposure and **included** later scene-planning work:

| scope | receipted | retained estimates | total exposure |
|---|---:|---:|---:|
| calls 1–7 — the opening / OAS exchange | $0.066215 | $0.005718 | **$0.071933** |
| calls 8–12 — subsequent scene work | $0.017052 | $0.003488 | **$0.020540** |
| **the entire check** | **$0.083266** | **$0.009207** | **$0.092473** |

So **one opening/OAS exchange cost $0.071933 of exposure**, and the whole check $0.092473.

## The planned stopping point failed

This plan promised the run would stop at the interruption. **It did not.** `SB_EXIT_AFTER` controls
when the *dialogue* exits, not when the *run* ends, so the runner continued into scene generation
and **the ceiling — not the intended stopping point — prevented the author dispatch.** The ceiling
did the plan's job by accident.

**Fixed:** `SB_STOP_AT=handoff` ends the run after the OAS has resolved, archived and had its
interruption submitted, and **before the run-or-remain branch is serviced** — since servicing that
branch is what triggers Scene 2. Verified provider-free, no paid rerun:

```
*** STOPPING AS PLANNED — SB_STOP_AT=handoff ***
    reached: resolved=true · archive=1 · interruptionPresent=true · interruptionSubmitted=true
    model-backed exchanges: 1 · scripted exit: scripted reader text exit
    the run-or-remain branch was NOT serviced, so no scene work was triggered.
  model calls dispatched : 7
```

(The first version of that stop threw `Cannot access 'oasFinal' before initialization`, because
`oasFinal` is built *after* the decision is serviced. The provider-free verification caught it.)

## The contradictory banner is gone

`ledger.spendReport` kept its own accumulator that this runner never fed, so it printed
`MEASURED (receipts): $0.000000` and `UNMEASURED: none — every dispatch returned a receipt` while
the per-call roll-up showed $0.083266 receipted and **seven** receiptless calls. It has been
removed; the per-call accounting is now the only spend figure printed.

## The $0.85–$0.95 full-run estimate is WITHDRAWN

It was an extrapolation of the old nine-scene average and covered none of the rest. Nine scenes at
that average alone account for ~$0.83, **before** the opening OAS exchanges, previews, planning,
verification, setup and the retry policy. What is actually measured:

| component | measured |
|---|---:|
| one opening/OAS exchange | **$0.071933** exposure |
| nine generated scenes, 2026-10-02 average | **$0.09195 receipted each** — planner+author receipts only |

**Not established:** the total for a full run. Six OAS exchanges at the measured rate would be
roughly $0.43 of exposure on their own, and the scene average excludes the receiptless verifier and
preview traffic that the 76-call census showed. **Expected spend and reserved exposure are
different numbers**, and the guard reserves conservatively — so a ceiling has to cover the
reservation, not the expectation. I am not offering a figure that promises completion.
