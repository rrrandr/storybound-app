# Benchmark A — permanent regression suite for the measurement instrument

> **Benchmark A v1** · fixtures: A1, A2 seeded (A3, A4 pending) · 2026-07-21
>
> The fixture set is itself **versioned**. Swapping, adding, or re-rendering a fixture bumps the benchmark
> version (v1 → v2) — you are consciously starting a new measurement regime, not silently redefining
> "Benchmark A." The complete measurement tuple recorded with every result is:
> ```
> Benchmark A v1  |  IQS v1.0  |  Prompt v1.0  |  Model: gemini-2.5-flash
> ```
> If any one of the four changes, the numbers before and after are not directly comparable.

**Frozen forever.** These sheets never change. They are not a quality benchmark for the *renderer* — they
are the control that lets us tell **"the images changed"** from **"the instrument changed"** whenever the
[Image Quality Specification](./image-quality-spec.md) or the classifier prompt is edited.

> Run Benchmark A after **every** change to IQS or the classifier prompt. Record the version triple with the
> result: `IQS vX.Y | prompt vX.Y | model gemini-2.5-flash`. If counts move while the images are byte-identical,
> the *instrument* moved — that is the signal Benchmark A exists to surface.

## Composition

Four sheets spanning deliberately distinct visual domains, so the instrument is exercised across the axes
that produced its historical false positives (species anatomy, physics/buoyancy, cast continuity, stray text).

| ID | Domain | Fixture | Frozen scene context (the "expected content" parameter) |
|----|--------|---------|--------------------------------------------------------|
| **A1** | Underwater / non-human | `test/fixtures/benchmark-A/A1_underwater_kwisheen.png` | a human woman and a KWISHEEN (tentacle-bodied — humanoid torso, coral-dreadlock hair, tentacles instead of legs, humanoid face) in drowned coral ruins, UNDERWATER — figures FLOAT (no gravity). A red twisted X-burst may appear on at most one panel. |
| **A2** | On-land / different non-human | `test/fixtures/benchmark-A/A2_land_firstfavored.png` | a human woman and a FIRST FAVORED (luminous humanoid, pointed ears, Weave-Script skin-glow, TWO ordinary legs — NO tentacles, bipedal) in a pale white weeping-willow forest, ON LAND — GRAVITY applies, figures stand/walk, do NOT float. A red twisted X-burst may appear on at most one panel. |
| **A3** | Urban / humans-only | *(to render)* | two ordinary humans in a modern city street at dusk — humans only, no fantasy creatures, gravity applies. Tests the instrument on a mundane domain with none of the fantasy cues. |
| **A4** | Interior / dialogue-heavy | *(to render)* | two humans in a quiet interior conversation (romance beat) — low action, emotional expression is the load-bearing element. Tests expression-legibility and the *absence* of action/SFX (no burst, no SFX should be demanded). |

**A1 and A2 are seeded** (downscaled to ~1400px; the classifier reads them fine and Gemini downsamples
internally regardless). **A3 and A4 require one render each** — paid, so gated on an explicit go. Until then
Benchmark A runs on the two orthogonal domains already proven (underwater/floating non-human vs.
land/bipedal non-human), which alone exercise the species and buoyancy axes in opposition.

## Why these four

Each domain removes a cue the instrument might be leaning on:
- **A1 vs A2** — floating non-human vs. grounded bipedal: catches a classifier that hardcodes "tentacles" or
  "must float." (A2 already passed this: 0 species / 0 buoyancy false-flags.)
- **A3** — no fantasy at all: catches a classifier that only knows how to judge fantasy scenes.
- **A4** — dialogue over action: catches one that *manufactures* action defects (a demanded burst/SFX) where
  the beat is deliberately still, and shifts the load to expression-legibility.

## Expected behavior (acceptance, not perfection)

A healthy instrument returns, on this set: **no bogus species failures**, **no bogus buoyancy failures**,
**no demanded burst/SFX on the still beat (A4)** — while still catching any **real** stray-text leaks or
continuity breaks present in the frozen images. A run that comes back *perfectly clean on every sheet* is
itself suspect (the seed sheets contain known real text-leaks); that would indicate the instrument went
blind, not that the images are flawless.

Related: [`image-quality-spec.md`](./image-quality-spec.md), [`sheet-defect-regressions.md`](./sheet-defect-regressions.md).
