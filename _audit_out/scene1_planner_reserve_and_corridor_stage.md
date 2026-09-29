# SCENE-1 OPENING PLANNER — governor reservation measured, and a second finding: unseeded Scene 1 cannot start · 2026-09-06

Free, capture-only (`_scene1_planner_reserve.mjs`; artifacts `_validate_out/scene1_planner_reserve.json`,
`_validate_out/scene1_planner_reserve_modern_trace.json`). Every pre-pass was answered by the dry suite's
shape-faithful role fixtures (sliced verbatim from `_scene1_skeleton_delivery.mjs`), so production BUILT and
dispatched the opening planner request; that request was captured (UTF-8 bytes of both messages + `max_tokens`
= the governor's conservative reservation) and answered with the generic fixture, after which the flow stopped
at its own validation by design. No provider was contacted.

## 1 · Planner reservation vs the Mistral Small allowance (20,000)

| configuration | model | system B | user B | max_tokens | **reserve** | verdict |
|---|---|---|---|---|---|---|
| Modern corridor (pilot config) **with a scene mission seeded** the way the suite's own unseeded arm does | mistral-small-latest | 4,283 | 74,100 | 2,400 | **80,783** | **OVERSIZED — refused before dispatch** |
| seeded First Sacrifice (consistency check; prior measurement 92,980 on the pre-edit seed) | mistral-small-latest | 4,283 | 77,188 | 2,921 | **84,392** | **OVERSIZED — refused before dispatch** |

The opening planner is 4× the allowance regardless of world; the size is the request's cast, canon and stage
sections, not the seed. On a refusal the reader's Scene 1 does not mount; the begin-story handler shows the quota
message ("…couldn't start this story…" + retry-after when the governor gives one; an oversized reservation is
terminal, so "Please try again shortly."), refunds the issue purchase, and clears the busy flag. So on
committed code, **any Scene 1 that reaches the planner is refused on Mistral Small.** (Scene 1 through the
seeded starters today is baked and never reaches it; Famous Fate and any generated story would.)

## 2 · Second finding — an unseeded Scene 1 aborts BEFORE the planner on committed code

With the purchase gate passed and every setup pass answered (canonicalizer ×2, character sheets, R-plot,
A-plot generator on Grok fast-reasoning, A-plot compression, antagonist bible, wound-swap test, scaffold ×3),
the Modern corridor run with **no** seeded mission ended:
`[SCENE1:STAGE:UNRESOLVED] stage contract unresolved — no authoritative stage: scene 1 has neither a seed
sceneOne nor an assignment row nor a validated generated stage` → `[SCENE1:SCAFFOLD] skipped` → no planner,
no author, `_scene1SkeletonFatal` set → the handler's catch: issue purchase refunded, alert "Fate stumbled — your
story didn't start, so your Fortunes have been refunded. Please try again." Retrying repeats it.

Why, structurally (committed `main`, commit `c8d08fc` "fix(scene1): put the staging constraints in the
template…", 2026-08-25: "STAGE RESOLVED BEFORE THE PROMPT… NO SILENT FALLBACK"):
- the stage must resolve **before** the planner prompt is built (`_sceneStageContract(state, 1)`), from one of
  three sources: seed `sceneOne` (only First Sacrifice has one), an assignment row (`STARTER_PLANS` — only
  `starter_first_sacrifice` exists — or the corridor scene mission), or a validated generated stage
  (`_cpGeneratedStage`, written only by the continuation skeleton `_generateSceneSkeleton`, which Scene 1 never calls);
- the corridor scene mission (`_sceneMissionCurrent` / `_scene1Mission`) is set in exactly one place, **from the
  opening planner's own reply** (`plan.scene_mission`), i.e., after the step that requires it. `window._lockedSceneMission`
  is read as a fallback but nothing in either client file sets it.
⇒ For every Scene 1 with no seed and no plan row — generated corridor stories in every world, and Famous Fate
(no plan row, no baked opening) — the stage is unresolvable, and Scene 1 aborts with a refund. First Taste and
Glass House do not hit this only because their Scene 1 is baked prose; their first continuation goes through
the continuation skeleton, which does produce a generated stage.

Evidence quality: executable under shape-faithful fixtures twice (the first stub-only capture aborted at the same
fault after 15 real setup dispatches; the fixture run aborted after 16), plus the committed-code reading above.
Not yet confirmed against live telemetry — Roman should check production logs for `[SCENE1:STAGE:UNRESOLVED]`
/ `_markInvocationFatal` since 2026-08-25 before treating it as certain. If confirmed, it is a launch blocker
independent of, and upstream of, the planner-size refusal: the corridor and Famous Fate cannot start at all.

## 3 · What this changes in the routing decision
- The Scene-1 opening planner cannot stay on Mistral Small in any form of the pilot or the launch: 80–85 k
  reserved against 20 k. It needs a route with no 20 k reservation (the A-plot generator already runs the same
  size class on Grok fast-reasoning, ungoverned) or a higher-capacity Mistral route with a governor entry — a
  route decision, not made here; either way it also needs the planner's content bar re-run on the new route.
- Before any of that, the stage-before-prompt rule needs a Scene-1 source for unseeded stories: a pre-planner
  mission generator, or the stage-resolution order changed so the planner may produce the mission it is asked
  to require. That is a product/structure decision (it reverses part of c8d08fc's "no silent fallback"
  stance), not something to slip in with the routing change.

## 4 · Status
No code, calls, routes, prompts or commits changed. Pilot: **NO-GO** on three independent grounds — the
non-premium scene author on Mistral Small (§ author routing), the opening planner on Mistral Small (§1), and the
unseeded Scene-1 stage abort (§2, pending live confirmation).
