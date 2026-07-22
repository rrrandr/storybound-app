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
| **A2** | On-land / different non-human | `test/fixtures/benchmark-A/A2_land_firstfavored.png` | a human woman and a FIRST FAVORED (luminous humanoid, Weave-Script skin-glow, ORDINARY ears — NOT pointed, TWO legs — NO tentacles, bipedal) in a pale white weeping-willow forest, ON LAND — GRAVITY applies, figures stand/walk, do NOT float. A red twisted X-burst may appear on at most one panel. |
| **A3** | Urban / humans-only | `test/fixtures/benchmark-A/A3_urban_humans.png` | two ORDINARY HUMANS (a woman in a leather jacket, a man in a suit) confront each other on a rain-slicked modern city street at dusk — neon signage, glass towers, a crowd of pedestrians. No fantasy, no creatures; gravity applies. |
| **A4** | Interior / dialogue-heavy | `test/fixtures/benchmark-A/A4_interior_dialogue.png` | two ORDINARY HUMANS (Nora + Daniel) in a heated but non-violent CONVERSATION across a table in a contemporary café interior — both present every panel, other patrons behind. A still dialogue beat: no action, no weapons, no magic, no burst, no SFX. |

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

## Ground truth (labeled defects the instrument MUST recover)

Stability alone proved insufficient (see `measurement-discipline.md` invariant 6): the determinism test
returned USABLE ✓ on a classifier that was reproducibly *blind*. The fix is labeled ground truth — a
**recall floor**. Each fixture carries a hand-verified defect label; the instrument's sensitivity is judged
against these, not against its own consistency.

| Fixture | Ground-truth defects (verified by eye) | Recall floor |
|---------|----------------------------------------|--------------|
| **A1** underwater | **clean** — canon-correct Kwisheen (tentacles, coral hair), figures floating, red X-bursts are the canon twisted-wish beat, **no stray text**. Expected: `defects:[]`. | a *false* defect here = precision failure |
| **A2** land/FF | **TEXT — 4× text-leak (hard):** `PHASE: Orientation/Transformation/Decision/Threat` (p1–4), caption-box labels. Plus questionable SFX (`SING` p1, `STILL` p3). Expected: **≥4 text-leak.** **VISUAL — clean (0 defects).** ⚠️ CANON: **First Favored and Kwisheen do NOT have pointed ears** — pointed ears are *incorrect*; ordinary/round ears are correct. The instrument's earlier `[3,3,3,3]` species flag ("no pointed ears") was a FALSE POSITIVE caused by **wrong canon injected into the scene text by the harness author**, not a real defect — the render's round ears are correct. Continuity expected 0. Repair economics: a wrong (pointed) ear is NOT worth a dedicated Klein call — correct it only opportunistically if that character is already being repaired. Fixtures are NOT repaired. | a species flag citing *pointed ears* = wrong-canon regression (scene text must never assert pointed ears); a `continuity` flag = twins-ontology regression |
| **A3** urban humans | **TEXT — text-leak (hard):** neon sign reads **`DANIEL`** (a character's *name* in set-dressing signage). **Borderline (soft):** garbled nonsense neon (`DSDOSE`, `ONEANS`, `NEOL TIES`) — acceptable to flag, not required. **VISUAL — anatomy (localized, Klein-repairable, REAL):** the offering hand (p2) and the envelope-grip hands (p4) have extra/confused digits — milder than A4 but genuine (verified by eye; originally under-labeled "borderline"). Instrument flags `anatomy×2–3` near-deterministically. Otherwise two consistent humans, populated street, no burst. | missing `DANIEL` = text recall failure; missing the hand anatomy defects = visual recall gap (mild — count wobble 2↔3 is acceptable borderline-detection variance) |
| **A4** interior dialogue | **TEXT — clean (0 leaks).** **VISUAL — anatomy (localized, Klein-repairable, HARD):** Daniel's gesturing hands in p2 & p4 are genuinely **malformed — tangled/extra fingers** in a focal gesture → a real defect, Klein-inpaint target. (Originally mislabeled "clean" — instrument caught it; label was wrong.) Otherwise two consistent humans, populated café, no burst, no weapons. | recovering the malformed-hand defect = recall; a *manufactured* burst/SFX, a "dead empty background" flag on the calm interior, or an over-strict expression flag (e.g. calling a clearly-distressed face "neutral") = precision failure |

**Measured state (2026-07-21):** the single-pass classifier (both compressed and full prompt) recovers **0/4**
on A2 — a total recall failure on the most common real defect class. An **enumerate-first** prompt
(transcribe all visible text → classify each token) recovers **4/4**. Resolved by splitting the instrument
into a TEXT channel (enumerate-first) and a VISUAL channel (gestalt, no OCR) — see `measurement-discipline.md`.

### Permanent precision hazard: the "twins" ontology trap (A2)

A2 is preserved **specifically** as a standing precision probe. When the visual invariants were merged into
the enumerate-first prompt, it emitted **4× false `continuity`/"twins" defects** — reasoning *"the scene
says one protagonist, but I see two similar humans, therefore duplication."* That is not an OCR or IQS bug;
it is a **scene-interpretation heuristic**: the model treats *correct two-character casting* (human
protagonist + a First Favored who is also humanoid) as a duplication defect. This class of error tends to
**reappear after prompt edits**, so A2's visual ground truth is fixed at **0 visual defects** and any
`continuity` flag on it is a regression signal to investigate, never dismissed. Two DIFFERENT named
characters both present = correct casting, not twins.

## Expected behavior (acceptance, not perfection)

A healthy instrument returns, on this set: **no bogus species failures**, **no bogus buoyancy failures**,
**no demanded burst/SFX on the still beat (A4)** — while still catching any **real** stray-text leaks or
continuity breaks present in the frozen images. A run that comes back *perfectly clean on every sheet* is
itself suspect (the seed sheets contain known real text-leaks); that would indicate the instrument went
blind, not that the images are flawless.

Related: [`image-quality-spec.md`](./image-quality-spec.md), [`sheet-defect-regressions.md`](./sheet-defect-regressions.md).
