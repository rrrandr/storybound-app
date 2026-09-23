# Tempt Fate memory-erasure — first real capability result (2026-09-23, `remain` branch)

The authorized run completed. Scene A **generated and delivered**. The test produced its first
genuine narrative-capability result, and the result is a **failure of the mechanism**, located
precisely: the planner and the author were told two different things about the same wish in the
same generation.

## What was run

Wish: **"everyone forgets the ceremony happened."** Branch: **`remain`** (Lirael remains to see
where Julian was taking her), recorded by a real click before the seal. Neutral Say/Do:
"Lirael closes her eyes for a long moment, then opens them again."

## Cost — within every declared limit

| Role | Model | Status | Cost |
|---|---|---|---|
| wish-classifier | `gpt-4o-mini` | 200 | no usage block returned; bounded by its $0.001 reservation |
| scaffold | `ministral-8b-2512` | 200 | $0.0011001 |
| scenePlanner | `grok-4-1-fast-non-reasoning` | 200 | $0.01348465 (provider ticks) |
| **author** | `grok-4-1-fast-reasoning` | 200, 61,689 in / 5,509 out, 51.8s | $0.09339215 (provider ticks) |
| gravity audit | `ministral-8b-2512` | 200 | $0.00065295 |
| **Scene A total** | | | **$0.108630** against its $0.20 ceiling |

**4 real dispatches for Scene A** against a phase cap of 28. No retry fired, no legacy planner
fallback fired, Body Bibles resolved Tier-0 with zero calls. Scene B was never attempted, so the
combined spend is **≤ $0.1096** against the $0.40 cap. One `/api/image` attempt was aborted by the
gate; **zero image dispatches**.

## The result: the rupture did not land

The author produced a competent, coherent 29-beat scene — and it is the *opposite* of the wish.
The ceremony is emphatically remembered throughout:

- *"The rite stands. The ruling on the Sacrificiant's conduct is mine."*
- *"A preliminary review will convene tomorrow at the council hall."*
- *"I remember the way he questioned me before the assembly."*
- *"The Dohkar's interruption still rings in my ears."*
- *"Tell the assembly the truth or let them believe what they saw."*

The scene followed the seed's scheduled aftermath lane (`dohkar_preliminary_review`) as if no wish
had been made. And `temptFateOutcome` came back **explicitly `null`** — not omitted, nulled.

## Root cause: the wish was delivered to the planner as active and to the author as history

This is not a wiring failure in the sense the earlier passes chased — the wish text *did* reach both
payloads (2 occurrences in the author system prompt, 2 in the author user prompt). The failure is
that the two layers were given **contradictory framings of the same wish in the same generation**:

- **Planner** (`STRUCTURE_GENERATOR`, `grok-4-1-fast-non-reasoning`) received:
  `TEMPT FATE — ACTIVE INVOCATION THIS SCENE (HARD — supersedes the CURRENT MILESTONE ... The
  event/state_change MUST land this wish's actual invocation/effect ...)` — built at `app.js:100286`,
  gated on `_tcInvoked && _tcWish`. Confirmed present: exactly 1 occurrence in the run's request log,
  in the planner dispatch.
- **Author** (`grok-4-1-fast-reasoning`) received instead:
  `TEMPT FATE — MEMORY CALLBACK (HARD — scale=mass, sealed 1 scene(s) ago)` — built at
  `app.js:190933` — plus the schema note that `temptFateOutcome` is *"ONLY meaningful when a Tempt
  Fate rupture is active THIS scene ... null when Tempt Fate was not invoked this scene."*
  **`ACTIVE INVOCATION THIS SCENE` appears zero times in the author's system prompt and zero times
  in its user prompt.**

So the author did exactly what it was told. Given "this is a historical Tempt being recalled, and the
outcome field is null when Tempt was not invoked this scene," returning `null` and writing a
callback-flavoured continuation is **correct behaviour for the prompt it actually received**. The
model is not the defect.

**The likely mechanism of the split** (stated as the leading hypothesis, not as proven): the wish is
recorded at seal time with `sceneIdx: 0` (turnCount was 0 when Proceed was clicked), while the scene
generated is scene 1. The author-side builder computes `sealed 1 scene(s) ago` from that difference
and classifies the wish as history, whereas the planner-side check reads the live
`tempt_fate_invoked_this_turn` flag, which was still true. Two consumers of the same event, two
different notions of "this scene." Confirming that precisely requires tracing both builders'
scene-index inputs — not done here, because it is a separate defect from the one this run was
authorized to test.

## Why six dry passes never caught this

The dry harness asserts the author request carries `PLAYER WISH` + the wish text, and passes 30/30 —
but it sets `state.tempt_fate_invoked_this_turn = true` immediately before calling
`_runCGScreenplayGen` directly. That bypasses whatever transition, between seal and author-prompt
construction, reclassifies the wish as historical. Every dry control in this workstream shares that
shortcut. **This is a case of the standing delivered-to-wrong-layer principle: the value reached the
payload, so "wired" looked true, while the layer that had to ACT on it was told it was inert.**

## Harness defect in this run (no data lost)

The live script assumed `state.scenes[last]` was a string and crashed on `fs.writeFileSync` after
Scene A had already settled and the outcome check had already decided to stop. Consequences:

- **Nothing was lost.** Every artifact except the final human-readable text file had already been
  written: raw author output, both prompts, the full request/response log, the outcome record, the
  tracked-call costs. The missing file was regenerated from the preserved raw output by
  `_tempt_fate_extract_scene_text.mjs`.
- The run still stopped before Scene B, which is the correct outcome here — but it stopped by
  crashing rather than through the clean `safeExit` path, so that behaviour was not actually
  exercised. That is a real gap in the script, not a cosmetic one.

## Status

The authorization is consumed. Cumulative real spend across all five attempts: **≈$0.1107**.

What this run established: providers and the function layer are healthy; the corrected UI order
works end to end against real providers; Scene A generates; and the Tempt Fate rupture **does not
land**, for a specific and fixable reason that no dry control could have surfaced.

Not established, and deliberately not attempted: whether an ordinary Scene B would inherit a
committed outcome — there was no committed outcome to inherit.
