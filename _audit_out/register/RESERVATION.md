# Corrected reservation — FS live sequence (Scene 1 fixed · OAS · Scenes 2-4)

No dispatch. No ceiling approved. This replaces my earlier estimate, which was wrong three ways.

## Corrections to what I said before

1. **"$0.29/scene from the 2026-10-02 run" was wrong.** That run's actual exposure was
   **$0.890120** for 10 scenes, 9 generated. $2.90 was the AUTHORIZATION CEILING, not the bill.
   I quoted a ceiling as if it were a measurement.
2. **My retry total silently excluded OAS.** $1.098450 doubled planner/author/verifier and left
   OAS at one attempt. Stated properly below.
3. **MY OAS FIGURE WAS 7x TOO LOW.** I priced an OAS turn at $0.013050 from a 30,000-char bound
   I invented. The REAL assembled request is ~244,000 characters.

## The OAS, measured from the real assembled requests (provider-free, no paid probe)

The visible dialogue is short. The request is not: the system message is 2,804 chars and the
USER message carries ~241,000 chars of story context, re-sent EVERY TURN.

| turn | chars | model | prompt tokens | max_tokens | estimate |
|---|---|---|---|---|---|
| opener | 4,970 | mistral-small-latest | 1,243 | 180 | $0.002675 |
| 1 | 243,966 | grok-4-1-fast-reasoning | 60,992 | 400 | $0.093288 |
| 2-8 | ~245,000 | grok-4.20-0309-non-reasoning | ~61,300 | 400 | ~$0.093750 ea |

Arithmetic per turn, from `_fsc_cost_guard.estimateUsd`: 244,000 chars ÷ 4.0 chars/token =
61,000 prompt tokens x $0.00000125 = $0.076250, plus 400 max_tokens x 1.5 reasoning multiplier
= 600 x $0.0000025 = $0.001500, totalling $0.077750, x 1.2 safety margin = **$0.093300**.

**The input dominates: ~98% of each OAS turn is the context sent in, not the reply.**

* one opener + seven exchanges: $0.002675 + 7 x $0.093596 = **$0.657847**
* the 9-call OAS this harness actually drove: **$0.751445**

## Full sequence

| line | unit | n | one attempt |
|---|---|---|---|
| Scene 1 (fixed, hand-authored) | — | 1 | $0.000000 |
| OAS opener | $0.002675 | 1 | $0.002675 |
| OAS exchanges | $0.093596 | 8 | $0.748768 |
| planner | $0.023175 | 3 | $0.069525 |
| author | $0.126000 | 3 | $0.378000 |
| verifier | $0.007800 | 3 | $0.023400 |
| | | | **$1.222368** |

**Retry policy, stated:** one bounded retry for EVERY line above, OAS included →
**$2.444736**. Excluding OAS retries it would be $1.973600; I am not proposing that, because an
OAS turn is the single most expensive call in the sequence and silently leaving it unretried is
how my first estimate went wrong.

## Setup — UNPRICED, and the ceiling does not prove completion

The deferred setup at genesis unlock dispatches, at minimum: recap, PC bible, LI bible,
why-this-pair, R-PLOT, A-PLOT (observed twice), A-plot compression, antagonist bible,
WOUND->LI swap test, the opening scene-structure planner, and the CG scaffold. I have their
REQUEST SHAPES from the provider-free harness but no per-call rate for the cheap models several
of them use, and the one measured all-in figure ($0.890120) cannot be decomposed into setup
versus scenes.

**So: a ceiling bounds SPENDING. It does not establish that the sequence COMPLETES within it.**
If setup is more expensive than assumed, the budget guard stops further dispatch and the run
ends part-way. I am not claiming coverage I cannot show.

## Unmeasured exposure

Any call DISPATCHED without a receipt — transport failure, abandoned response, a tier that fired
before the fallback — is exposure that no ledger sees. `recordDispatchedNoResponse` exists for
exactly this and the run will use it, but the honest statement is that measured spend is a LOWER
BOUND on exposure, not the whole of it.

## Recommended ceiling

**$3.00**, which covers one retry on every line ($2.444736) plus roughly $0.55 of headroom for
unpriced setup. A tighter **$1.60** covers one attempt per line plus a little setup headroom, and
means a single bad response ends the run rather than retrying.

`cost_in_usd_ticks` from the provider is authoritative over every figure above.

## A finding worth separating from this run

**The OAS costs more than all three generated scenes combined** ($0.75 against $0.47) because it
re-sends ~241,000 characters of context on every turn for a 400-token reply. That is a standing
cost characteristic, not a property of this test, and it is worth its own look independent of
whether this sequence is authorized.
