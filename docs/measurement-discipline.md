# Measurement Discipline (Storybound CG evaluation)

The components below will all be replaced in time — the vision model, IQS v1.0, Benchmark A v1, the repair
planner. What should **not** change are the principles that govern them. This document is the durable layer:
the measurement discipline, distilled from the CG-evaluation investigation (2026-07).

## Five invariants

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

Related: `image-quality-spec.md`, `benchmark-A.md`, `sheet-defect-regressions.md`.
