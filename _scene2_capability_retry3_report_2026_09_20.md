# Scene 2 Capability Retry #3 — Real Result (2026-09-20, CORRECTED)

**Correction, same day:** the original version of this document said priorities 1-3 "passed cleanly."
That was wrong. Retry 3 is not a prose-quality near miss — it failed on immediate continuity and
canon ingestion, on top of the (real, smaller) adequacy-check gap already documented. Roman caught
this from the read-through PDF; see `_scene2_skeleton_handoff_trace2_2026_09_20.md` for the full
trace and dry fixes that followed. This document is corrected in place rather than left standing.

Authorized retry testing root cause C's fix (the open-row planner now receives seed worldTruths and
explicit register framing before it derives its event), same Boundary card, same Say/Do as retries
#1 and #2. Capability evidence about the generator, **not** a claim the prose is approved or ready
to ship.

## Real cost and usage

| Call | Model | Cost |
|---|---|---|
| scene2-planner | ministral-8b-2512 | $0.0008022 |
| scene2-structural-author | grok-4.3 (requested grok-4-1-fast-reasoning) | $0.0837684 |
| emotional-gravity audit | ministral-8b-2512 | $0.00063285 |
| image-style extraction | gpt-4o | $0.0427675 |
| **Total** | | **$0.127971** |

4 physical requests — well under the $0.45 / ≤8-request ceiling. OAS turn-reply and Fate-Card were
replayed from the already-paid original run, zero new cost.

Full raw log (untouched, unique filename): `_scene2_repair_replay_sample_out/run_1789933193165.jsonl`.
Raw author response: `_scene2_repair_replay_sample_out/scene2_raw_response_retry3.txt`.

## Corrected verdict: FAILED on continuity and canon ingestion, not a prose near-miss

**1. Root cause C's fix (worldTruths reaching the planner) worked as designed, but real production
already had a broader continuity channel this test never exercised.** The planner did stop
literalizing "burn" into fire — that specific fix held. But separately: the real, canonical Scene 1
package (`public/starter-scenes.js`, `STARTER_SCENE1.starter_first_sacrifice.emitted`) explicitly
states `openState.pcCondition: "mouth-band torn away, ceremonial sash still on..."` and
`obligations: ["Julian... has ALREADY questioned her... It happened; it is not re-staged."]` — this
is real, already-authored continuity data. Confirmed by direct dry probe
(`_baked_emitted_probe.mjs`): when `state._bakedEmitted` is populated the way real production
populates it (`_hydrateBakedStoryState`, called when the baked Scene 1 is displayed — well before
any player interaction), the Scene 2 planner's prompt DOES correctly receive "mouth-band torn away"
and "not re-staged" as binding facts. **`_scene2_repair_replay_sample.mjs` — the replay script used
for all three retries — never calls this hydration step, so `state._bakedEmitted` stayed `null`
across retries 1, 2, AND 3.** This is a real replay-harness bug, not (on this specific point) a
confirmed production bug — but it means retry 3's planner ran on an artificially impoverished
prompt, missing continuity data real production supplies. Retry 3's opening beats ("The sash knot
gives under my fingers." / "The mouth-band falls against my collarbone...") stage the mouth-band as
freshly removed, directly contradicting the canonical Scene 1 end-state — a real, visible continuity
break in the delivered prose, caused by an untested-until-now harness gap. Fixed in
`_scene2_skeleton_handoff_trace2_2026_09_20.md`.

**2. The live OAS exchange itself never reaches the Scene 2 planner, in the harness OR in real
production.** Confirmed by direct code trace: the planner's OPEN ROW prompt (`app.js`,
`_generateLiteraryPlotContract`) never reads `state.intimacyDialogue.liTurnHistory` — only the
FINAL submitted action/dialogue line, with zero summary of what was actually said during the live
flirty back-and-forth (Julian's actual reply, her actual response, how the tension escalated). This
is a real production gap, not a harness artifact — the Fate-card generator (`orchestration-client.js`)
already has an equivalent block (`_authoredOASBlock`, reading the last 3 `liTurnHistory` turns) that
the Scene 2 planner never got. Retry 3's Dohkar-interrogation scene doesn't acknowledge or build on
anything specific that happened in the live OAS exchange — a real, separate continuity gap from #1.

**3. The Fate-card generator has zero worldTruths/canon awareness — confirmed by direct code trace,
not inference.** `orchestration-client.js`'s `generateIntimateFatePreviewsBatch` (the function that
produced "I want you to burn for me, as the First-Favored did for the old gods") has no call to
`_activeSeed`, no reference to `worldTruths`, and no Fatelands-specific cosmology guard anywhere in
its ~340-line prompt. This matches an existing, disclosed, not-yet-wired canon fact (session memory
`project_fatelands_oaths_and_idioms.md`, Roman 2026-09-19): "there is no God in the Fatelands, only
Fate... real-world religious idioms are off-canon." The generator has a PRECEDENT for exactly this
kind of world-specific lexical guard — a static "GLASS HOUSE IS CONTEMPORARY MODERN SPEECH... BANNED
in Glass House fate previews: aperture, resonance..." block already ships for a different world —
but nothing equivalent exists for Fatelands. The "old gods" line was never caught because nothing
was ever looking for it.

## What actually passed, honestly re-stated

- No literalized fire/pyre in the NARRATED prose (the register-aware planner fix, root cause C,
  genuinely worked on this specific axis).
- `relicViolations: []` — the Answer's institutional ownership was not contradicted.
- Real dialogue appeared for the first time (6 of 24 beats).

None of these are "clean passes" on the broader question of whether the generator produced a
continuity- and canon-correct scene — they are narrower, real, still-standing results inside a
scene that independently failed on stale prior-state handling and illegal world-lore leakage.

## Status

Not shipped, not patched, not hand-authored. Preserved as a third real, now-correctly-classified
FAILED capability sample. Per Roman's explicit instruction, no further paid retry follows this one
until the dry fixes below are in place and proven.
