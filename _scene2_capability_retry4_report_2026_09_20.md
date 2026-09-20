# Scene 2 Capability Retry #4 — Real Result (2026-09-20)

**The first valid retry against the intended state.** Retries 1-3 ran on a replay harness that never
populated `state._bakedEmitted` (so the planner never saw the mouth-band's real end-state), never
surfaced the live OAS exchange, and used a Fate-card generator with no Fatelands cosmology guard.
All three gaps are now fixed and dry-proven (`_scene2_skeleton_handoff_trace2_2026_09_20.md`). This
is the first real generation to run against the actually-intended prompt state. Same Boundary card,
same Say/Do as retries 1-3. Capability evidence, not approved prose.

## Real cost and usage

| Call | Model | Cost |
|---|---|---|
| scene2-planner | ministral-8b-2512 | $0.00095 |
| scene2-structural-author | grok-4.3 (requested grok-4-1-fast-reasoning) | $0.08533 |
| scene classification tag | grok-4.20-0309-non-reasoning | $0.00474 |
| image-style extraction (×3) | gpt-4o | $0.04617 + $0.04372 + $0.04675 |
| emotional-gravity audit | ministral-8b-2512 | $0.00038 + $0.00064 |
| **Total** | | **$0.228671** |

8 physical requests (hit the ceiling exactly, did not exceed it) — under the $0.45 combined ceiling.
More calls fired than retries 1-3 (extra image-style/classification passes) — real run-to-run
variance in downstream fallback behavior, disclosed, not concerning at this cost level.

Full raw log: `_scene2_repair_replay_sample_out/run_1789937410539.jsonl`. Raw author response:
`_scene2_repair_replay_sample_out/scene2_raw_response_retry4.txt`. Fixed-name fixture files
(`scene2_raw_response.txt`/`report.json`) were overwritten by the run and restored via
`git checkout`, same discipline as retries 2 and 3 — confirmed clean before and after.

## Confirmed: all three fixes reached the real live prompt

Grepped directly against the real planner dispatch: `RECENT OAS EXCHANGE` present (with the real
live turn text — Julian's actual line, her actual reply — verbatim), `mouth-band torn away` present,
`WORLD TRUTHS (canon` present. The planner's own `stage_issued_objects` output correctly lists
"Lirael's torn mouth-band" — it now knows the band is off, not on.

## Evaluation, in the order requested

**1. No silent mouth-band/sash-restraint reversion — PASS.** No mention of the mouth-band being worn,
tied, or falling anywhere in the 24 delivered beats. `_detectEstablishedStateReversion`:
`establishedStateReversion: []`.

**2. No gods/old gods language — PASS.** Zero religious vocabulary anywhere in the delivered prose.
`_detectFatelandsCosmologyViolation`: `cosmology.failed: false`.

**3. The planner acknowledges the live OAS exchange as already happened — WEAK / NOT CLEARLY
DEMONSTRATED.** The data reached the planner correctly (confirmed above), but the planner's own
`posture_read` and `state_change` don't visibly draw on it — both are built entirely from the
Fate-card dialogue ("burn for me...") with no clear reference to Julian's actual live line ("The
hunger in your gaze called louder than the rite itself..."). Beat 4's "The words I spoke earlier
still hang in the air between us" is ambiguous — it could mean the live OAS exchange or just the
Fate-card line spoken moments earlier in this same scene. Receiving the data is necessary but was
not, on this attempt, sufficient to prove the planner used it. A real, honest finding: reaching the
prompt doesn't guarantee a smaller model draws on it.

**4. The scene moves into consequences/procedure/investigation/fallout instead of replaying
accusation — FAIL, but not a literal retread either.** The scene doesn't re-ask Julian's original
"accusation through desirability" questions — it stages something structurally new (Lirael declares
"this is the one I lost," turning the wish's misalignment onto Julian himself, shifting the
assembly's attention to him). That is real, if modest, forward movement within the same beat. But it
never leaves the assembly / the same immediate moment — no family reaction, no procedural next step,
no time-skip, nothing matching "preliminary review, political pressure, investigation, concealment,
or flight" from the seed's own sanctioned lanes. `_detectSceneAdequacyFailure`:
`aftermath.present: false`, same reason as retries 2 and 3.

**5. Protected world facts remain binding — PASS.** `relicViolations: []`. The Answer is present and
handled ("The Answer is warm in my hands") but never claimed as her own sacrifice.

**6. Prose quality — mixed, same shape as retry 3.** 24 beats, 2 dialogue (fewer than retry 3's 6,
still non-zero). Real interiority and LI pressure (Julian's stillness, the silver script). Ending
again lands on suspended interiority rather than a completed action: "I must decide whether the
interference was mine to name or theirs to assume." `ending.suspensionVocabPresent: true`,
`movementVerbPresent: false` — the same ending-suspension gap flagged in retry 3, unresolved by
today's fixes (which targeted continuity/canon, not this).

## Overall verdict

`_detectSceneAdequacyFailure`: **still FAILED** — `aftermath.present: false` and the suspended
ending, same two reasons as retry 3. But the three specific, evidenced structural bugs this retry
was authorized to test are now confirmed fixed in a real, live, paid generation, not just a dry
control: no mouth-band reversion, no cosmology leak, world facts held. The remaining gap is
different in kind from what's been fixed so far — the planner receives the right data but doesn't
reliably act on all of it, and it defaults to extending the current confrontation rather than
advancing into the seed's own sanctioned next-lanes. That is a real, still-open capability question,
not a wiring gap this session's fixes were built to close.

## Status

Not shipped, not patched, not hand-authored. Preserved as a fourth real capability sample. Per
Roman's explicit instruction, no further retry follows this one.
