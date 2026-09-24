# Scene 2 density baseline — 16 real scenes, no new spend

Dry, 2026-09-24. `_scene2_density_baseline_distribution.mjs`, zero provider dispatches.

**No paid baseline was needed.** 14 distinct real ordinary Scene 2 generations already exist across
five decision branches, all `grok-4-1-fast-reasoning` at `max_tokens: 8000`, generated
2026-09-20 → 09-22 — the same author, ceiling, scene slot and prompt era as both Tempt rupture runs.

| | beats | prose | ch/beat | dialogue | interiority |
|---|---|---|---|---|---|
| ordinary min | 23 | 915 | 31 | 0 | 0 |
| ordinary **median** | **26** | **1360** | **55** | **3** | **2** |
| ordinary max | 35 | 1532 | 64 | 8 | 6 |
| rupture 09-23 (pre-fix) | **38** | **2264** | 60 | 3 | 5 |
| rupture 09-24 (post-fix) | **18** | **796** | 44 | 3 | 3 |

## 1. The scene is anomalous on exactly one axis: beat count

18 beats is **below the entire ordinary range** (23–35), and 796 chars of prose is below the
ordinary minimum of 915. That much is real.

But **44 ch/beat sits inside the ordinary range** (31–64) and below the median of 55 only modestly.
Dialogue (3) is exactly the ordinary median. Interiority (3) is above it. **The scene is short
because it has fewer beats — not because its beats are terse.** My earlier "44 chars/beat, beat
length collapsed" framing was wrong: per-beat length is unremarkable.

## 2. The densest scene in the entire corpus is a RUPTURE run

The 2026-09-23 rupture produced **38 beats and 2,264 chars** — more beats than any ordinary sample
(max 35) and 48% more prose than the ordinary maximum (1,532). It is the only scene in all 16 that
actually hit the prompt's 30–38 target.

Rupture mode is not suppressing density. It produced the best sample we have.

## 3. The real defect is chronic and system-wide, not rupture-specific

The prompt demands *"TARGET ~28–45 tight beats"* and calls *"a thin <22-beat scene … a FAILURE"*.

**13 of 14 ordinary scenes fall below the 28-beat target** (median 26). Every branch — boundary,
reversal, temptation, silence, confession — under-delivers beat count against the prompt's own
stated floor. The prompt names this itself: *"Undershooting the beat count is the #1 CG miss."*

The 09-24 run is the tail of that chronic miss, not a new failure mode introduced by the precedence
fix.

Two other "rupture problems" also turn out to be baseline behaviour:

- **Suspended endings.** Only **6 of 14** ordinary scenes end on a non-modal completed action. 57%
  of ordinary continuations end the same way the rupture scene did.
- **Inert LI.** 4 of 14 ordinary scenes have the LI present with no anchored reaction beat —
  exactly the rupture scene's profile. The LI floor flags 3 of 14.

## 4. A concrete mechanism for the 09-24 outlier: reasoning burned the budget

| run | completion tokens | reasoning tokens | reasoning share |
|---|---|---|---|
| ordinary range | 4,576 – 6,255 | 356 – 1,016 | 14% – 21% |
| rupture 09-23 | 7,255 | 729 | 10.0% |
| **rupture 09-24** | **3,830** (lowest in corpus) | **1,308** (highest in corpus) | **34.2%** |

The post-fix run spent **a third of its output budget on reasoning** — more than double any other
sample's share — and emitted fewer completion tokens than any of the 16. It did not run out of
room against the 8,000 ceiling; it allocated its room differently.

This is the strongest mechanistic lead, and it is still n=1. It does point somewhere testable:
whatever the rupture path asks the model to *reason about* (wish adjudication, scope accounting,
the outcome report) competes with prose inside one completion budget.

Worth noting against that: the three outcome-contract fields added on 2026-09-24
(`targetPopulation`, `invokerExemption`, `unaccountedParties`) increase exactly that analytical
load. They landed **after** this run, so they are not its cause — but they push in the wrong
direction on the one axis that looks causal.

## 5. Wiring the QA layer needs calibration, not just a switch

Running the real (unwired) `_detectSceneAdequacyFailure` across all 16:

- **7 of 14 ordinary scenes FAIL**, almost all on the aftermath-vocabulary check.
- Both rupture runs fail, including the 38-beat one that is otherwise the best scene in the corpus.

So the detector cannot simply be switched on as a hard gate — at a 50% failure rate on known-good
ordinary output it would reject half the corpus, including the densest scene we have. Wiring it is
still right; doing so as a *blocking* gate without recalibrating the aftermath check first is not.

## Recommendation

**Still no paid call.** The baseline question is answered from retained evidence, and it moved the
target: the defect is chronic beat-count under-delivery across every branch, plus an n=1
reasoning-budget outlier — neither of which a new Scene A would isolate.

Dry work, in order:

1. **Add a beat-count floor** as a real check. It is the one axis where the 09-24 scene is provably
   out of family, and it is unenforced today.
2. **Recalibrate the aftermath check** against these 14 known-good scenes before wiring
   `_detectSceneAdequacyFailure` as anything blocking.
3. **Make the movement test modality-aware** — then re-measure; the 6/14 "lands an action" figure
   above already uses the corrected rule and shows the production regex is over-permissive.
4. **Investigate the reasoning-token share** on the rupture path, and weigh whether the outcome
   report should be a separate cheap call rather than sharing the author's completion budget.
