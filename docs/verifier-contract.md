# CG Perception Verifier — frozen contract

> **Verifier v1.0** · frozen 2026-07-21 · validated on Benchmark A v1 (4 domains) · model `gemini-2.5-flash`

This is the **architectural boundary** between *perception* and *decision policy*.

```
                image
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
   TEXT channel        VISUAL channel
 (enumerate-first,    (roster-first,
  FX-exclusion)        gestalt, no OCR)
        └─────────┬─────────┘
                  ▼
        canonical defect vocabulary
                  ▼
        ═══════ FREEZE (this contract) ═══════
                  ▼
            Repair planner  ← confidence, corroboration, Klein/regen, cost live HERE
```

**Perception answers "what defects are present?"** — nothing about what to do with them.

> **Design principle: the verifier owns semantic evidence, not execution metadata.**
> Class, panel, and an explanatory note are *evidence*. Confidence, priority, repair method, corroboration,
> and structured localization are *execution metadata* — how automation should act on the evidence. The
> freeze line runs exactly between them. And freeze only fields whose representation the benchmark has
> actually validated: it validated class + panel + prose note; it has **not** validated a canonical
> structured-localization format, so that format is not frozen here.

## The frozen output contract — deliberately MINIMAL

```ts
VerifierOutput {
  defects: Array<{
    class: "text-leak" | "anatomy" | "species" | "continuity" | "burst" | "expression" | "buoyancy" | "background",
    panel: 1 | 2 | 3 | 4,   // TL=1 TR=2 BL=3 BR=4
    note:  string           // brief prose: what is wrong AND where (e.g. "the man's left hand, panel 2, has extra fingers"). text-leak's note carries the lettered text.
  }>
}
```

**Why minimal — an empirical law, not a style choice.** Enriching the *per-defect* output schema
**perturbs perception**. Adding a `confidence` field (Step 6 attempt) and later adding structured
`location` + `rationale` fields (freeze-prep attempt) **each** changed *which* defects the model reported —
new false positives (A2 burst "dominating") and new detections (A1 Kwisheen hand) that the validated minimal
prompt did not produce. Forcing the model to justify/structure each finding makes it hunt harder. Both were
caught by preregistered benchmark hypotheses. Therefore:

> **The perception contract carries only `{class, panel, note}`. Every enrichment — `confidence`, structured
> `location`, `repair_method`, `corroboration`, `priority`, `severity` — is added DOWNSTREAM by the planner,
> which consumes this minimal output. This is what lets the planner's interfaces be redesigned without ever
> reopening benchmark validation.**

`note` is prose and *naturally includes location* ("the man's left hand, panel 2"); the planner derives a
structured repair region from it (parse, or a targeted follow-up localization query on a confirmed defect —
itself a planner concern that never touches the frozen perception prompt).

## The two channels (frozen prompts)

- **TEXT channel** — enumerate-first: transcribe every piece of *lettering*, then classify each as `sfx-ok`
  or `text-leak`. Hardened with the **graphic-marks-are-not-text** rule (burst X-strokes, hatching, motion
  lines are art, not letters) — an *ontology* boundary, not an OCR fix.
- **VISUAL channel** — roster-first (establish the cast before judging duplication, which killed the "twins"
  ontology FP), gestalt, **no OCR**. Emits the 7 visual classes. `anatomy` (malformed hands/limbs, LOCALIZED)
  is distinct from `continuity` (duplication/identity/costume, cross-panel) — the split that routes hands to
  Klein and, as a confirmed side effect, eliminated the A4 expression FP and stabilized detection.

The channels run independently; their `defects` arrays are unioned. Provenance (which channel found a defect)
is retained so a future regression localizes to a channel, not "the verifier."

## What the repair planner adds (next milestone — NOT frozen)

```ts
RepairDecision {
  defect:                 VerifierOutput.defects[i],
  location:               BoundingRegion,               // structured repair target, DERIVED from defect.note (± a targeted localization query)
  confidence:             "high" | "medium" | "low",    // high → auto-repair, low → corroborate/ignore
  repair_method:          "klein" | "regen" | "none",    // localized → Klein inpaint; structural → regen
  corroboration_required: boolean
}
```

Note `location` lives here, not in `VerifierOutput` — adding it to perception perturbed detection (see above).

## Validation status at freeze

Passed **Benchmark A v1** (A1 underwater/Kwisheen, A2 land/First-Favored, A3 urban humans, A4 interior
dialogue) via a preregistered one-variable-at-a-time isolation:
- text-leak recall: A2 `PHASE` ×4, A3 `DANIEL` name-in-signage — both recovered, deterministic.
- anatomy recall: A3 + A4 malformed hands recovered (verified real by eye).
- zero false positives on A1/A2; no expression/burst/species/continuity FPs post-refactor.
- deterministic on A1/A2/A4; A3 `anatomy` count wobbles 2↔3 — accepted as *extent* noise, not *existence*
  (the defect is always found).

**Change control:** editing a frozen prompt, adding/removing a class, or changing the contract shape bumps
the Verifier version and requires a full Benchmark A re-run under a fresh preregistered hypothesis. See
`measurement-discipline.md` and `benchmark-A.md`.

## ⚠️ Known false positive — the multi-instance / anatomy FP (v1.1 backlog)

**The frozen oracle is not infallible.** Discovered 2026-07-22 (Roman, ground-truth authority): the VISUAL
channel flags **two overlapping correct hands** (two people's hands near each other) as **one malformed hand
with "too many fingers"** → a spurious `anatomy` defect. Same failure family as the **twins ontology bug**:
mistaking a legitimate MULTI-INSTANCE arrangement for a SINGLE-OBJECT defect.

**⚠️ The obvious v1.1 fix BACKFIRED (2026-07-22).** Adding an "enumerate the hands before judging" STEP to the
visual prompt (the roster-first medicine that cured twins) did NOT reduce hand FPs — it **regressed the clean
fixtures** (A1/A2 went 0 → `anatomy=2`) while A3/A4 kept flagging. Cause: this is the **enrichment-perturbs-
perception law** (see `measurement-discipline`) — adding hand-focused instructions *primes the model to hunt
hands harder*, so more anatomy flags appear everywhere. Reverted. **Lesson: the anatomy FP is NOT fixable by a
quick prompt clause; more prompt text makes it worse.** Real options (deferred, careful): (a) a focused
anatomy *second-opinion* pass (a separate call that only adjudicates a flagged region: "one malformed hand, or
two overlapping correct hands?"), or (b) **policy** — treat `anatomy` flags as presumed-FP and route them to
*surface-for-human-review*, never auto-repair, given the current unreliability. Until then, do not trust or
auto-act on `anatomy`.

**How it slipped past validation — a cautionary tale.** A4 would have caught it, but the label was
**corrupted**: originally labeled *clean* (correct), then **relabeled "real defect" to match the instrument's
flag** — moving ground truth to the classifier's output, the exact anti-pattern the discipline forbids. The
oracle's "validation" on that case was therefore **circular**. Lesson: **the oracle is an instrument, not
ground truth; a human authority overrides it; never move a label to match a flag.**

*Silver lining that held:* a false positive still can't clear a real fix (there is nothing to fix), so every
repair attempt on the phantom defect **rolled back** — the monotonic guarantee bounded the damage to wasted
compute, never a degraded sheet. A false-positive oracle wastes money; it cannot harm the product.

**Authority ruling 2026-07-22 — narrowly stated (do not over-generalize).** *On the corrected Benchmark A
fixtures,* every reviewed **text** flag corresponded to a true defect (`PHASE:` captions, the `DANIEL`
name-sign, and bad SFX `STRIKE`/`SING`/`STILL`), while every reviewed **hand-`anatomy`** flag corresponded to
the same **multi-instance false-positive class**. This is a small, benchmark-specific sample — it does **not**
establish an overall accuracy for either channel. The actionable read: **treat `anatomy` on multi-hand /
multi-character panels as presumed-FP until v1.1**, and note the text flags here were all real. (Text
*defects* are fixed upstream in generation, not by the verifier — see `feedback_cg_signage_foreshadowing`
and `feedback_cg_sfx_onomatopoeia`.)

## Out of scope for v1.0 (intentionally deferred, NOT unfinished)

Verifier v1.0 deliberately does **not** define these — they are the repair planner's job, and each was
observed to perturb perception when pushed into the verifier output:

- **confidence** (high/medium/low trust)
- **repair priority**
- **repair method** (Klein inpaint vs regeneration)
- **corroboration policy** (when to seek a second opinion)
- **structured localization** (a canonical bounding-region format)

Their absence is a decision, not a gap. Anyone extending this should add them to `RepairDecision`, never to
`VerifierOutput`.

## Appendix — frozen prompts (Verifier v1.0, verbatim)

Preserved here so the frozen instrument survives independent of any scratch harness. `${scene}` is the
per-fixture expected-content parameter.

**TEXT channel:**
> You judge ONLY the lettering in a Storybound 2x2 comic sheet (panels TL=1 TR=2 BL=3 BR=4). Ignore anatomy, poses, colour, backgrounds — another stage owns those.
> GRAPHIC MARKS ARE NOT TEXT: the jagged X-strokes of a wish/twist BURST, hatching, motion/speed lines, sparkles, impact stars, or scratch marks are ART, not lettering — do NOT transcribe them. Only real LETTERING that forms a word, label, or piece of signage counts as text.
> SCENE context: ${scene}
> STEP 1 — TRANSCRIBE: list every piece of real LETTERING visible (words, labels, signage, sound-effect words), verbatim, with its panel. If a mark is a graphic effect (burst stroke, hatching, motion line) rather than a letter forming a word, SKIP it.
> STEP 2 — CLASSIFY each item: a valid comic SOUND EFFECT (onomatopoeia) matching an action actually depicted in that panel → "sfx-ok"; OR stray text — a caption box, a "PHASE: X" label, a phase/panel/instruction word, a title, or a word for no depicted action → "text-leak" (Storybound art must contain NO caption boxes and NO labels).
> Output ONLY JSON: {"visible_text":[{"panel":N,"text":"...","verdict":"sfx-ok"|"text-leak"}],"defects":[{"panel":1-4,"class":"text-leak","text":"..."}]}. Every text-leak in visible_text MUST also appear in defects. No prose.

**VISUAL channel:**
> You are the ACCEPTANCE-QA gate for the VISUALS of a Storybound 2x2 comic sheet (panels TL=1 TR=2 BL=3 BR=4). Production acceptance, not art critique. Do NOT read, transcribe, or judge any lettering/text/SFX — a separate stage owns text; pretend the words aren't there.
> SCENE (judge the render against THIS): ${scene}
> For ANY imperfection the ONLY question: "Would this image be REGENERATED or REPAIRED in production?" If no, NOT a defect.
> STEP 1 — CAST ROSTER: list each DISTINCT character visible across the whole sheet, by appearance. A comic shows the SAME characters repeatedly across panels — a character recurring in multiple panels is EXPECTED and is NEVER duplication.
> STEP 2 — evaluate the HARD VISUAL INVARIANTS; report ONLY these:
> • species: a character drawn as the WRONG species / its defining anatomy absent.
> • anatomy: a MALFORMED body part on a character — a hand/fingers tangled, with extra or missing digits, a claw, or a disembodied/floating hand; a warped limb or facial feature. LOCALIZED. A malformed hand or a missing/extra limb is ANATOMY, NOT continuity.
> • continuity: a SINGLE character drawn TWICE WITHIN ONE panel (true twins), OR a character's face/hair/build/clothing/colour/weapon changing between panels. (Recurrence across panels is NOT a defect; two DIFFERENT characters present is correct casting. A malformed body part is ANATOMY, not continuity.)
> • burst: a wish/twist burst wrong — wrong colour/place, dominating a panel, or a standalone emblem.
> • expression: a blank/wooden face on a character in an emotional beat.
> • buoyancy: a figure planted on the ground where the scene has no gravity (or floating where gravity applies).
> • background: a dead, empty panel missing the life the world should have.
> SOFT — NEVER report alone: tentacle count, minor variation, stylization, dramatic posing, composition.
> Output ONLY JSON {"roster":["..."],"defects":[{"panel":1-4,"class":"...","note":"brief"}]}. No prose.

Related: `image-quality-spec.md`, `benchmark-A.md`, `measurement-discipline.md`, `project_sheet_production_layer`.
