# Measurement Discipline (Storybound CG evaluation)

The components below will all be replaced in time — the vision model, IQS v1.0, Benchmark A v1, the repair
planner. What should **not** change are the principles that govern them. This document is the durable layer:
the measurement discipline, distilled from the CG-evaluation investigation (2026-07).

## Six invariants

1. **Version every layer of measurement.**
   Benchmark, specification, prompt, and model each define part of the measurement regime. A result is only
   meaningful with its full tuple: `Benchmark A v1 | IQS v1.0 | Prompt v1.0 | Model gemini-2.5-flash`.
   Counts are comparable only *within* a fixed tuple.

2. **Separate evidence from interpretation.**
   A changed prompt is evidence of *version sensitivity* — not evidence of *runtime nondeterminism*. Name
   which hypothesis a given observation actually supports before acting on it. (The R2/R3 5/3→0 shift
   followed a prompt restructure; it was miscalled "run-to-run instability" until this rule was applied.)

3. **Treat missing evidence as unknown, never as success.**
   `INCOMPLETE` is a first-class outcome. A quota 429 is not a pass; an empty result set is not "stable"; an
   unparsed response is not "clean." Absence must surface, never smooth over. *(This principle caught a real
   harness bug: an all-failed determinism run was collapsing to "STABLE ✓".)*

4. **Validate on orthogonal distributions before generalizing.**
   Passing a *new* visual domain is stronger evidence than repeatedly passing the original one. Seek the
   distribution that removes the cue the instrument might be leaning on. (First Favored / land removed the
   "must have tentacles / must float" cues; 0 false-flags there is the strong result.)

5. **Share one specification across the pipeline.**
   The verifier asks "which clauses are violated?"; the repair planner asks "which violated clauses can I
   fix?" Both derive from the *same* IQS so they cannot diverge. See `image-quality-spec.md`.

6. **Stability is not validity — validate RECALL against labeled ground truth.**
   Determinism, low false-positive rate, and cross-domain "no false flags" are all measures of *precision
   and consistency*. An instrument that returns "clean" to everything scores perfectly on all of them — and
   detects nothing. Validity requires the opposite check: seed the benchmark with **known, labeled defects**
   and confirm the instrument *recovers* them. A green verdict whose criterion you have not tested against
   ground truth is not evidence. *(Learned the hard way: the determinism test returned USABLE ✓ — sd=0,
   20/20 — on an instrument reproducibly blind to four `PHASE:` caption-box text-leaks. Caught by looking at
   the image, not by the automated verdict. 2026-07-21.)*

## An engineering heuristic (not a law) — split before you make it smarter

> **When one evaluator exhibits contradictory behavior across tasks, first ask whether you've accidentally
> combined multiple measurement problems into a single instrument.**

Nearly every large gain in this milestone came from *splitting a responsibility*, not from making a
component smarter: species before identity; structural generation before rendering; benchmark separate from
specification; determinism separate from validity; OCR separate from IQS; and finally text reasoning
(exhaustive enumeration) separate from visual reasoning (gestalt judgment). The bake-off is the clearest
case — a single prompt asked to do both under-performed at both, and the fix wasn't a better prompt, it was
recognizing two different cognitive workloads wearing one mask. When an instrument is erratic, suspect a
hidden second job before you reach for more capability.

## The validation ladder (prove these in order — each is necessary, none sufficient alone)

| Property | Question | Status (2026-07-21) |
|---|---|---|
| **Availability** | Does the harness run against a live environment? | ✅ (preflight gate) |
| **Determinism** | Same input → same output? | ✅ (sd=0, 20/20) |
| **Precision** | Are reported defects usually real? | looks good (low false-positive) |
| **Recall** | Does it find the defects that matter? | ❌ text-leaks: 0/4 on Benchmark A2 |
| **Decision validity** | Would the dashboard drive the *right* engineering decision? | not yet (blocked on recall) |

Reproducibility was proven before sensitivity. That is not *wrong* — it just means the earlier rungs were
climbed while a lower rung (recall) was still broken. The green verdicts above Recall are all real; they
answer narrower questions than "is the instrument valid?"

## Why this is the lasting artifact

Each milestone in the investigation **reduced uncertainty before increasing automation**:

- production image generation → *canonically conditioned*
- image quality → *a versioned specification*, not an intuition
- evaluation → *a measurable, reproducible process*, not a prompt
- automation (the repair loop) → *deliberately deferred* until its foundation could be frozen

The repair loop, when built, is therefore not a leap of faith — it is the next layer resting on an
evaluation system that already knows how to tell you **when it is wrong**, and to distinguish *which* layer
moved (renderer vs. evaluator vs. standard).

## The determinism gate (pre-registered)

The last validation before the repair milestone answers one binary question:

> Can `Benchmark A v1 × IQS v1.0 × Prompt v1.0 × gemini-2.5-flash` be treated as a **reproducible
> measurement instrument**?

**Protocol** (`_classifier_determinism.mjs`): freeze every layer (IQS, prompt, benchmark, model, parser,
aggregation); run the frozen fixtures **N = 10** times; record — per fixture — total defects, defects by
class, structural vs. localized, high-severity, JSON parse-success, and total mean/sd/min–max.

**Success criterion — defined *before* the run, not fitted after.** The instrument is *usable* iff, per
fixture:

1. parse success == 100%,
2. no **major** class (present in ≥⌈N/2⌉ runs) ever appears/disappears between runs (classes at count ≤1 may flicker),
3. every stable class has `max − min ≤ 2` across runs,
4. no verdict flip (a fixture whose median total ≥ 3 never returns a clean run; a median-0 fixture never spikes).

The human framing this operationalizes: **"would two engineers reading only the dashboard reach the same
decision every run?"** — *not* bit-for-bit numeric equality.

**Stop rule.** Run it **once**, when quota resets.
- **Pass** → freeze the measurement layer; the repair milestone may begin.
- **Fail** → do **not** tune the repair loop. Investigate the source of variability first — everything
  downstream inherits it.

> ⚠️ **Necessary but not sufficient (2026-07-21).** The first real run returned USABLE ✓ (perfect
> determinism, sd=0, 20/20) on an instrument that reproducibly **misses** blatant text-leaks. Note the
> precise reading: **the determinism verdict was correct** — it established *reproducibility*, exactly what
> it measured. It simply did not establish *validity*, which this criterion never checked (invariant 6). A
> scale that reads 5 kg low is perfectly deterministic and perfectly uncalibrated; both facts hold at once. Before the repair
> milestone opens, the gate must add a **sensitivity floor**: the instrument must recover the labeled
> ground-truth defects in Benchmark A (see `benchmark-A.md` → "Ground truth"). Confirmed root cause of the
> text-leak blindness: a single-pass "report defects" prompt lets the model wave past `PHASE:`/caption-box
> text as legitimate comic furniture; a **transcribe-all-text-then-classify-each-token** (enumerate-first)
> prompt recovers every leak. Fix pending; do not treat the classifier as validated for text-leak recall.

Related: `image-quality-spec.md`, `benchmark-A.md`, `sheet-defect-regressions.md`.
