# Tempt Fate memory-erasure — Scene A: SEMANTIC FAILURE / PARTIAL GRANT (2026-09-23, `remain` branch)

**CLASSIFICATION (Roman): semantic failure — a partial grant, NOT a successful memory-erasure
outcome.** The scene produced a real supernatural memory alteration, but it narrowed
"everyone forgets the ceremony happened" into "the assembly forgets the twisted wish and the
interference." The ceremony, its institutional consequences, and the preliminary review all
remained intact — most witnesses still remembered enough of the ceremony to schedule its formal
review. Lirael's total exemption and Julian's suspicion are **asserted rather than earned**
(his is grounded only in stillness). The durable record then codified that unauthorized narrowing
as permanent canon.

**Cause, visible in the planner request:** it was simultaneously ordered to enact Tempt Fate *and*
to choose `chosen_aftermath_lane: dohkar_preliminary_review` as a HARD requirement. Grok reconciled
two contradictory hard orders the only way available — by weakening the wish until the predetermined
review could still happen. Fixed generically; see
`_tempt_fate_rupture_precedence_control.mjs` (23/23) and the ELEVENTH REVISION note in the
authorization sheet.

**Secondary, kept separate and NOT conflated with the above:** the scene also reads cold in its
romance register. That is a quality finding to pursue on its own terms; it is not the primary
failure and must not be used to explain or excuse it.

---

## Original run record (structural facts, unchanged)

Authorized: Scene A only, `remain` branch, additional hard cap **$0.20**, stop unconditionally after
Scene A, no Scene B, no images, no automated semantic approval. All conditions met.

**The semantic verdict is deliberately NOT rendered here.** This script made no such determination
and neither does this document — the prose is preserved at
`_tempt_fate_memory_erasure_live_run_out/scene_a_rendered_text.txt` for Roman's review, alongside
the model's own outcome report.

## The framing fix held in production

The defect this run existed to re-test is gone. Measured on the real request bodies:

| | Failed run (pre-fix) | This run (post-fix) |
|---|---|---|
| planner `ACTIVE INVOCATION THIS SCENE` | ✓ | ✓ |
| **author `ACTIVE INVOCATION THIS SCENE`** | **✗** | **✓** |
| **author historical `MEMORY CALLBACK`** | **✓ (wrong)** | **✗** |
| `temptFateOutcome` | `null` | populated |
| durable consequence committed | none | 1, attributed to `tfl_1` |

## Cost — inside the cap

| Role | Model | Status | Cost |
|---|---|---|---|
| wish classifier | `gpt-4o-mini` | 200 | $0.000049 |
| scaffold | `ministral-8b-2512` | 200 | $0.001143 |
| planner | `grok-4-1-fast-non-reasoning` | 200 | $0.013810 (ticks) |
| **author** | `grok-4-1-fast-reasoning` | 200 | $0.095741 (ticks) |
| gravity audit | `ministral-8b-2512` | 200 | $0.000686 |
| (post-scene) | `grok-4.20-0309-non-reasoning` | 200 | $0.004752 (ticks) |
| (post-scene) | `ministral-8b-2512` | 200 | $0.000406 |
| **Run total** | | | **$0.116587 of $0.20** |

6 tracked Scene A calls against a phase cap of 28. No retry, no legacy fallback, Bibles Tier-0.
**Zero real image dispatches** — every `/api/image`, `/api/bfl-kontext` and `/api/gemini-proxy`
attempt aborted at the gate. The artifact writer fix held: the run reached `safeExit` cleanly
instead of crashing as the previous one did.

**One item to flag rather than bury:** a model appears that is not in the sheet's census —
`grok-4.20-0309-non-reasoning`, $0.004752, in the post-scene phase. It is inside the cap and inside
the tracked phase, but it is **not** one of the tier lists §2 enumerates, so the census is
incomplete. That needs reconciling before the next authorization, exactly as the wish classifier did.

## What the model produced (evidence only, no verdict)

Prose, 2905 chars, 39 beats — `scene_a_rendered_text.txt`. Representative lines:

> Every First Favored present blinks at once, as if waking from the same shallow dream.
> The twisted wish, the turning heads, the misalignment itself — none of it registers on their faces now.
> No one mentions the wish. No one looks at me with the earlier accusation in their eyes.
> I feel the gap between what I know happened and what the room now accepts widening like a held breath.

The committed outcome record (`outcome_record.json`) reports `changed`: "the specific event of the
wish turning and the misalignment is no longer recalled by any witness"; `durability`: persists;
`establishedEvidence`: the assembly disperses with no reference to the twisted wish, and the Dohkar
names the review with no mention of the earlier accusation.

Its `knowledgeStates` speak directly to the open question §"Preserved wish text" raised — whether
"everyone" includes Lirael herself: protagonist **knows**, Seren **unaware**, presiding Dohkar
**unaware**, LI **suspects**. Whether the prose actually sustains that split is Roman's call.

## Status

Stopped after Scene A as authorized. Scene B not run and not reserved. This run spent **$0.116587**;
cumulative across all attempts is now **≈$0.2273**.
