# Scene 2 Capability Retry #9 — Real Result: local environment clean, real content progress, blocked by a NEW, narrow schema bug (2026-09-21)

First retry run on the cleaned local dev environment, full 3-tier planner chain, same Boundary
input. **The infrastructure problem is gone — both real planner calls succeeded (HTTP 200).** This
is the best real result of the whole multi-day effort on content quality, but it still didn't reach
the author, for a new and different reason than anything seen before.

## Real cost and usage

| Call | Model | Cost |
|---|---|---|
| scene2-planner, attempt 1 | grok-4.3 (requested grok-4-1-fast-non-reasoning) | $0.01010215 |
| scene2-planner, attempt 2 (app's own bounded retry) | grok-4.3 | $0.00452485 |
| **Total** | | **$0.014627** |

2 physical requests, both real, both HTTP 200, both on the Grok-primary tier (no fallback needed —
first genuinely clean run). Well under the $0.48/≤8 ceiling. Full log:
`_scene2_repair_replay_sample_out/run_1789965359643.jsonl`.

## Evaluation, in the order requested

**1. Did the local serverless layer behave normally? — YES, cleanly.** Zero 502s anywhere in this
run. Both real planner dispatches returned real content with real usage/cost data. The environment
cleanup held.

**2. Did the planner chain complete correctly, including fallback if needed? — Fallback wasn't
needed and so wasn't exercised.** Grok primary succeeded on both real attempts (the initial one and
the app's own bounded retry after the first was rejected — see below). The chain's PRIMARY path
worked correctly; ministral/gpt-4o were never reached because nothing failed at the transport level
this time.

**3. Did the planner instantiate the required Scene 2 function before applying Boundary posture? —
YES, clearly, both times.** Both real replies populate the new `scene_function_instantiated` field
with real, specific content: *"Institutional pressure through preliminary public accusation and
assembly judgment on the Sacrificiant's conduct"* (attempt 1); *"institutional pressure via public
alignment declaration that converts the Dohkar's charge into visible standing risk before any formal
inquiry"* (attempt 2). Both `aftermath_obligations` fields carry real, new consequence content:
attempt 1 — *"her Dohkar qualification is visibly at risk in front of Seren's family and peers, with
no ruling yet issued"*; attempt 2 — *"the presiding Dohkar's review gains a concrete target."* This
is the first time in nine real attempts the planner has explicitly engaged the required-function
frame with content this specific.

**4. Did it avoid echoing raw Fate-card phrasing as the central event? — Mostly, with one partial
regression.** Attempt 1's `state_change` ("The presiding Dohkar turns to the assembly and asks who
among them saw Lirael twist the rite for her own gain") does not literalize "burn" at all — a real,
clean translation. Its `posture_read` still references "her desire for him to burn," but correctly
as posture/register framing, not as the event itself. Attempt 2 drifts back part-way toward the
retry-5 pattern: `state_change` — "Lirael declares her desire for Julian before the assembly" — a
desire-declaration close to the raw posture, though it never uses the word "burn" literally.

**5. Did it choose an allowed event lane with aftermath/procedure/social fallout/investigation
pressure? — YES, both times, explicitly.** Both plans land in the seed's own sanctioned
"preliminary review / political pressure" lane, not the immediate-confrontation loop every prior
real attempt stayed inside.

**6. If the author runs, prose/continuity checks — N/A. The author never ran, and this is NOT a
Planner Function Gate rejection.** Both real plans were rejected by a different, earlier, pre-
existing validator: `_validateLocalObjective`'s reserved-events completeness check. Both replies
returned `"reserved": {}` — an empty object — instead of the four required IDs
(`price_identified`, `inquiry_opened`, `julian_counter_wish`, `julian_obscuring_wishes`) each mapped
to `"untouched"`/`"touched"`, which the planner's own system prompt explicitly requires
(`"reserved" (object: every RESERVED id → "untouched" or "touched")`). Confirmed from the real
console log: `[CG:STALE-STOP] ... local objective not accepted: reserved event price_identified
(scene 3): no status declared; reserved event inquiry_opened (scene 4): no status declared; ...` —
the SAME failure, both attempts. My Planner Function Gate (`_detectPlannerFunctionGap`) never even
ran — this rejection happens earlier, in the pre-existing stale-objective path.

## Reading

This is real, meaningful evidence the required-scene-function work is doing what it was built to
do — the planner is engaging the actual mapped story function instead of hijacking the scene from
the Fate-card's surface phrase, on its own, unprompted by any content-level rejection. What's
blocking it now is narrower and more mechanical than anything the last several passes addressed: a
schema-completeness gap in a field (`reserved`) that predates all of this session's fixes and isn't
new — the model is returning valid JSON that's simply missing required content in one field. Worth
its own investigation (why now, specifically — possibly the added `scene_function_instantiated`/
`aftermath_obligations` fields are crowding out attention to `reserved` in the same JSON payload) and
its own fix, separate from anything already built.

## Status

Not shipped, not patched — the author never ran. Preserved as the ninth real capability sample, and
the first to fail on a genuinely new, narrow, well-diagnosed cause rather than repeating an old one.
Per Roman's explicit instruction, no further retry follows this one.
