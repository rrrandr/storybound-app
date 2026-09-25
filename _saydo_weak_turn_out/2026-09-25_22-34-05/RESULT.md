# Attractor verification — BOTH FIXES WORKED; canon IMPROVED, not clean

Run 2026-09-25 20:1x. Identical seed, branch and input to the failed weak-turn sample; the only
change is the two dry fixes. **Realized $0.011575** of $0.20. 26 beats, 1,747 chars, 94.0s.
Mechanical 9/9.

**This is fix verification, not a second weak-turn sample.** The weak-turn verdict stands rejected.

## 1. The prompt fix WORKED — at the planner

`reservedInPlan = null`. The accepted plan stages no reserved content: **no conveners, no date, no
timeframe, no The Open, no terms**. `deterministicBlocked = null` — the guard never needed to fire,
because the planner did not propose the proceeding. The attractor was broken at source, not fenced.

Prior two samples, same seed: *"will convene in three days at the Open, where a Chayr and two
Dohkars will hear the matter"* and *"will convene in the following tenday, convened by the presiding
Dohkar and two Dohkars."* This run: *"Lirael's conduct during the rite will be formally reviewed"*
and *"The review will proceed under institutional authority."* That is the permitted pressure the
rewritten lane asks for.

## 2. The modality fix WORKED live — the weak-turn FAIL is now a PASS

The dialogue acknowledgement that failed before:

```
PROTAGONIST: "I don't know."
The words leave my mouth muffled by the gossamer band, small and uncertain.
The Dohkar does not pause.
```

Spoken **verbatim**, as an **attempted utterance**, **muffled by the seal** — one of the exact
softenings the directive names — and **visibly received**: the Dohkar registers it and continues
anyway. Previously the same input became silence and interiority.

Uncertainty also held: she says the words and makes no decision; the scene moves entirely through
the Dohkar and the assembly.

## 3. Canon — IMPROVED, NOT CLEAN

The prose still names the reserved body:

> *"The matter will be placed before a Chayr and two Dohkars."*

No date, no venue, no convening verb — materially weaker than either prior sample — but **the
composition the seed reserves for late Issue 1 is still named on the page.** Whether naming a future
body constitutes it is a judgement call; it is not clean.

**And the guard cannot catch this**, by design: `_detectReservedContentBreach` inspects the
**accepted plan**, and the plan was clean. The author introduced the composition at prose time,
downstream of every gate. That is an architectural gap this run exposed, not a regression.

## A defect in my own check, disclosed

The runner reported `proseMarkers=1`. That is **wrong** — there are **two** distinct markers
(`chayr`, `two dohkars`). My regex lacked the `/g` flag, so `String.match` returned a single-element
array and the count was capped at 1. Combined with `proseConvenes=false` (my verb list did not
include *"placed before"*), the assertion passed and reported the prose as clean.

**The assertion agreed with the thing it was meant to catch.** The finding above comes from
recounting by hand, not from the check. Not fixed here — no change was made on the basis of this
result.

## Summary

| | |
|---|---|
| Prompt fix (attractor at source) | **WORKED** — plan clean, guard unneeded |
| Modality fix (dialogue acknowledgement) | **WORKED** — verbatim, muffled, received |
| Deterministic independence | exercised — checks ran with the auditor off, nothing to reject |
| Canon | **IMPROVED, NOT CLEAN** — composition still named in prose |
| My attractor check | **DEFECTIVE** — under-counted markers; disclosed above |
