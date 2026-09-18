# First Sacrifice — Locked Visual Storyboard (for review)

**Packet:** `_first_sacrifice_source_packet.json` v9.1.0-source-packet — `scene1_visual_storyboard` section
**Runtime source cross-checked:** `public/starter-scenes.js` `starter_first_sacrifice.imageAssets` / `imageOccurrences` (real evaluation, not restated by hand)
**Consistency proof:** `_first_sacrifice_visual_storyboard_control.mjs` — 13/13 (structural agreement only; does NOT judge visual rhythm — that is this document's purpose)
**Generated:** 2026-09-18 — no provider or image call made to produce this document

## Asset roster (5 real assets)

| Asset ID | Kind | Label | Used by occurrence(s) |
|---|---|---|---|
| `intro_lirael` | intro | Lirael | `intro_lirael` |
| `intro_seren` | intro | Seren | `intro_seren` |
| `intro_dohkar` | intro | The presiding Dohkar | `intro_dohkar`, `dohkar_interruption` |
| `intro_julian` | intro | Julian | `intro_julian` |
| `interaction_sheet_1` | sheet | Scene 1 interaction sheet (d1-d4) | `d1`, `d2`, `d3`, `d4` |

9 occurrences resolve across those 5 assets: 4 solo intros (full), 4 quadrants of the ONE shared interaction sheet, and 1 reuse (the Dohkar reprise, below). **No ninth asset is ever created.**

## Compact occurrence timeline

The actual visual sequence a reader moves through, at a glance:

```
  INTRODUCTIONS (beats 1-8)              INTERACTION SHEET (beats 9-20)            REPRISE
  ────────────────────────────           ──────────────────────────────            ───────
  [1] Lirael   (intro_lirael, full)       [9-10]  d1 — quadrant 0                   
  [2] Lirael   (intro_lirael, full)       [11-14] d2 — quadrant 1                   
  [3] Seren    (intro_seren,  full)       [15-17] d3 — quadrant 2                   [reprise] Dohkar
  [4] Seren    (intro_seren,  full)       [18-20] d4 — quadrant 3                     (intro_dohkar,
  [5] Dohkar   (intro_dohkar, full)                                                    close crop —
  [6] Dohkar   (intro_dohkar, full)       one shared 2x2 sheet asset                   SAME asset as
  [7] Julian   (intro_julian, full)       (interaction_sheet_1), split into              beats 5-6,
  [8] Julian   (intro_julian, full)       4 quadrants — ONE generation call             reused, not
                                          covers all 12 of these beats                  regenerated)
```

Rhythm: 4 characters introduced solo (2 beats each) → one 12-beat, 4-quadrant dramatic sequence (the rite, the wish, the twist, the charge, The Answer) → the OAS handoff → live one-on-one → Dohkar's interruption reprises his OWN intro portrait at a tighter crop, not a new image.

## Beat-by-beat (all 20)

| # | Dramatic function | Coverage id | Occurrence | Asset | Type | Treatment | Text kind |
|---|---|---|---|---|---|---|---|
| 1 | Dawn ceremony setting; Lirael in the sash and mouth-band, her first time as the responsible Sacrificiant, the personal stakes of her father's path. | `ceremony_setting` | `intro_lirael` | `intro_lirael` | intro | full | narration (70-90w) |
| 2 | Free interiority beat — Lirael's private physical/sensory experience of the moment (the band, the cold, the watching crowd). Original prose, not a restatement of slot 1. | _(free)_ | `intro_lirael` | `intro_lirael` | intro | full | narration — interiority (60-90w) |
| 3 | Seren kneeling, composed from months of rehearsal — establish her visible performance of poise. | `seren_kneeling_rehearsed` | `intro_seren` | `intro_seren` | intro | full | narration (60-90w) |
| 4 | Free interiority/private-exchange beat — a brief reassurance between Lirael and Seren through gesture or glance, not yet the wish. | _(free)_ | `intro_seren` | `intro_seren` | intro | full | narration — interiority (60-90w) |
| 5 | The presiding Dohkar calls for 'the cost' IN HIS OWN DIRECT SPEECH; Seren's actual quoted offering — a CONCRETE, irrevocable loss named with real particularity, not a poetic noun phrase. | `cost_offering_statement` | `intro_dohkar` | `intro_dohkar` | intro | full | dialogue (30-45w) |
| 6 | Free narration beat — Lirael's interior reaction to the SPECIFIC cost Seren just named; why it costs Seren something real. | _(free)_ | `intro_dohkar` | `intro_dohkar` | intro | full | narration (60-90w) |
| 7 | Julian introduced at the edge of the gathering — his stillness, his office, Lirael's private involuntary awareness of him. | `julian_introduced` | `intro_julian` | `intro_julian` | intro | full | narration (60-90w) |
| 8 | Free interiority beat continuing Julian's introduction — what Lirael notices about him and tries not to. | _(free)_ | `intro_julian` | `intro_julian` | intro | full | narration — interiority (60-90w) |
| 9 | Seren begins the invocation; for a few words Lirael is not afraid. | `invocation_begins` | `d1` | `interaction_sheet_1` | quadrant 0 of interaction_sheet_1 | quadrant (q0) | narration (60-90w) |
| 10 | Free interiority beat — Lirael's private state in the moment just before the wish bends. | _(free)_ | `d1` | `interaction_sheet_1` | quadrant 0 of interaction_sheet_1 | quadrant (q0) | narration — interiority (60-90w) |
| 11 | Seren's actual spoken wish, naming Lirael, IN HER OWN DIRECT SPEECH — plus (narration around it) Lirael's immediate recognition, through Seren's actual words/gaze/behavior, that her performed empathy masks self-aggrandizement. | `wish_and_sacrifice` | `d2` | `interaction_sheet_1` | quadrant 1 of interaction_sheet_1 | quadrant (q1) | dialogue (30-45w) |
| 12 | Free narration bridging into the twist — Lirael's felt anticipation as the misaligned wish takes hold. | _(free)_ | `d2` | `interaction_sheet_1` | quadrant 1 of interaction_sheet_1 | quadrant (q1) | narration (60-90w) |
| 13 | The twist as a concrete FORCE: a real, immediate physical/magical threat aimed at Lirael specifically, with real sensory detail — not merely 'the assembly turned to look.' | `wish_visibly_twists` | `d2` | `interaction_sheet_1` | quadrant 1 of interaction_sheet_1 | quadrant (q1) | narration (70-90w) |
| 14 | Witnessed residue remains, then an inexplicable arrest — abruptly checked before it fully lands, no cause given, Julian's own intervention never surfaced or implied. | `twist_unnaturally_arrested` | `d2` | `interaction_sheet_1` | quadrant 1 of interaction_sheet_1 | quadrant (q1) | narration (70-90w) |
| 15 | The presiding Dohkar's actual spoken charge — real quoted speech, not narrated summary — grounded in the visible residue the assembly just witnessed. | `public_charge` | `d3` | `interaction_sheet_1` | quadrant 2 of interaction_sheet_1 | quadrant (q2) | dialogue (30-45w) |
| 16 | Social fallout through a NAMED, SPECIFIC person's concrete action or actual speech (a family member stepping back, a guest's hand tightening, a real spoken line) — never a generic crowd reaction. Lirael becomes a real social target. | `social_fallout_family_reaction` | `d3` | `interaction_sheet_1` | quadrant 2 of interaction_sheet_1 | quadrant (q2) | narration or dialogue (either) (60-90w) |
| 17 | Free narration beat — Lirael's interior reckoning with her collapsing path, her attention still pulled toward Julian. | _(free)_ | `d3` | `interaction_sheet_1` | quadrant 2 of interaction_sheet_1 | quadrant (q2) | narration (60-90w) |
| 18 | Julian's actual spoken claim — he can hear she is aligned with her own innocence, states his INTENT to question her before them all. Statement of intent ONLY — do not dramatize the interrogation itself here. | `julian_claims_the_answer` | `d4` | `interaction_sheet_1` | quadrant 3 of interaction_sheet_1 | quadrant (q3) | dialogue (30-45w) |
| 19 | Free narration — the physical handoff of The Answer, Julian closing her hands around it. | _(free)_ | `d4` | `interaction_sheet_1` | quadrant 3 of interaction_sheet_1 | quadrant (q3) | narration (60-90w) |
| 20 | Free narration — Lirael's final interior beat before the OAS handoff; what she feels holding The Answer. | _(free)_ | `d4` | `interaction_sheet_1` | quadrant 3 of interaction_sheet_1 | quadrant (q3) | narration (60-90w) |

## OAS handoff

After beat 20, the scene hands off to the LIVE one-on-one (`endsAt: 'oas_interrupt'`). Cue: *"Julian, the Provast, closes Lirael’s fingers around The Answer and says he will question her in front of the assembly."* — no image occurrence of its own; the reader is already looking at the d4 quadrant (beat 18-20's asset) when this fires.

The live OAS exchange is player-driven — not authored, not part of this storyboard.

## The Dohkar reprise (explicit)

When the Dohkar interrupts the live interrogation, the scene shows him again — **this is the SAME `intro_dohkar` asset used at beats 5-6, cropped to a tighter `close` treatment.** It is occurrence `dohkar_interruption`, the 9th and final occurrence — there is no 9th generated image anywhere in this scene.

| Field | Value |
|---|---|
| Occurrence id | `dohkar_interruption` |
| Asset id | `intro_dohkar` (identical asset to beats 5-6, not regenerated) |
| Treatment | `close` (a zero-cost crop, not a new generation) |
| Placement | NOT a numbered beat — fires during the LIVE OAS interruption, after beat 20 hands off to the one-on-one and the Dohkar cuts the interrogation off. Mounted alongside the existing d3 interruption plate (the wide 'assembly turns / charge' quadrant), never replacing it. |
| Real wiring | `starter-scenes.js` → `oasHandoff.interruptionPortrait = 'dohkar_interruption'`, mounted by `_mountIntimateInterruption` through the structured renderer (`_mountImageOccurrence`) — never markup in the interruption's authored prose. |

Also present alongside the reprise (unchanged, pre-existing): the `d3` plate — the wide "assembly turns / charge" quadrant — as the establishing image for the interruption moment. The Dohkar close-up is additive, not a replacement.

---
*This document is generated, not authored — `_render_first_sacrifice_visual_storyboard.mjs`. Re-run after any packet or starter-scenes.js change to this scene.*