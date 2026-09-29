# UNSEEDED SCENE 1 — PLANNER-OWNED STAGE REPAIR (dry, no provider calls) · 2026-09-07

Decision it implements (Roman, 2026-09-06): *the opening planner owns the mission/stage for
unseeded Scene 1. Run it first, validate its structured mission/stage output, then resolve the
stage contract. Seeded stories retain their authored stage; baked starters remain verbatim. If the
planner's output is invalid, fail and refund.* No new pre-planner call.

## 1 · What was broken (committed code c8d08fc, deployed 2026-08-30)

`_sceneStageContract` resolved the Scene-1 stage BEFORE the opening planner ran. An unseeded story
has no seed `sceneOne`, no assignment row and no generated stage yet, so the contract faulted
("no authoritative stage") and `handleBeginStory` threw `Scene 1 aborted:` ahead of the planner —
a circular prerequisite. The throw sits at function level, ahead of the inner `try` (opens at
app.js 268029), so it reached the OUTER `catch (beginErr)`, which only refunded a pending scene
fortune and alerted for quota. The issue purchase was never refunded and the reader saw nothing.
Production exposure: none (Supabase idle since 2026-08-30; see `supabase_confirmation_audit_scene1_stage.md`).

## 2 · The repair (public/app.js)

| piece | where | what |
|---|---|---|
| `_cpIssuedRefs(state)` / `_cpStageContractBlock(refs)` | extracted verbatim from `_generateSceneSkeleton` | the continuation skeleton's ISSUED-REFS + STAGE_CONTRACT prompt block, now reusable; skeleton calls the helpers (request bytes unchanged: 16,477 / 16,459) |
| provisional planner-owned stage | Scene-1 pre-prompt block | when unseeded AND the fault is "no authoritative stage": `_plannerOwnedStage = true`, PC-only on stage, `environmentOwner:'planner'`; log `[SCENE1:STAGE:PLANNER-OWNED]` |
| planner prompt | Scene-1 template | appends the STAGE_CONTRACT block + "SCENE MISSION (REQUIRED in this mode)" — same contract the continuation skeleton already answers |
| envelope | `_reconcileOpeningEnvelope(envelope, fields, { allowTopLevel })` | `stage_contract` admitted at top level only in planner-owned mode |
| post-parse | after `_envelope = _rec.envelope` | requires non-empty `scene_mission`; ingests `stage_contract` via `_cpIngestGeneratedStage(…, sceneNum 1, pcId)` into `state._cpGeneratedStage['1']`; re-resolves `_stage`; recomputes eligible cast / labels / fusion PC / narrator; any failure → `_poFail` (fail-closed) |
| `_sceneStageContract` generated branch | 127166–127210 | accepts a generated stage when there is no assignment row or the row is a scene-mission; resolves refs to identities (PC record, ledger display label); splits presence (`CP_PRESENT_MODES` → on stage, else off stage); **sets `out.pending = true`** so `_resolveStageFromPlan` attaches the planner's `opening_setting` + ≥2 `environment_elements` (or faults) |
| fail and refund | outer `catch (beginErr)` | if `beginErr._scene1SkeletonFatal`: `await _refundIssuePurchase()`, quota wording when quota applies, else the existing honest "Fate stumbled — … refunded" alert, then `showScreen('setup')` |

Not changed: seeded stories (authored stage keeps precedence; S1/S2 prove identical behaviour),
baked starters (`_renderBakedScene1` / `_commitBakedScene` untouched, S3 static), the governor,
any model, any route, any prompt outside the planner-owned mode.

## 3 · Controls (`_scene1_stage_order_dry.mjs`, dev server, shape-faithful mocks)

13 checks · 13 passed · 0 failed (`_validate_out/stage_order_run2.log`).

| id | proves |
|---|---|
| G1 | the planner request is BUILT and dispatched for an unseeded story — no pre-planner abort |
| G2 | the request carries STAGE_CONTRACT, ISSUED REFS (`pc:self` first, then the A-plot antagonist ref) and the mission rule |
| G3 | valid reply → stage re-resolved from `generated:planner_stage`, on stage `["Testa"]`, author dispatched, no fatal |
| G4 | Scene 1 mounted: one page, ledger entry p1, no refund, no dialog |
| G5 | the planner's `scene_mission` became the corridor mission |
| R1 / R1b | no `stage_contract` → fatal names the rejected stage, NO author, NO page; refund POST (`refund_issue_purchase_literary`, 60) + honest dialog observed |
| R2 | unissued ref → whole contract rejected, fail-closed, refund |
| R3 | empty `scene_mission` → fail-closed before the author, refund |
| R4 | roster mismatch → rejected by the existing `staged_characters` rule |
| S1 / S2 | seeded: planner-owned mode not entered; generic reply fails at the envelope exactly as before |
| S3 | static: baked path untouched; contract keeps plan-scene precedence |

## 4 · Regression suites after the repair

| suite | result |
|---|---|
| `_continuity_spine_dry.mjs` | 80 / 80 |
| `_assignment_verify.mjs` | all green |
| `npm run verify:baked` | 120 / 120 |
| `npm run verify:scene1` | green |
| `_pilot_preflight_capture.mjs` (SEED_ONLY) | continuation skeleton requests 16,477 / 16,459 bytes — byte-identical to the pre-repair record |
| `_scene1_skeleton_delivery.mjs` | first rerun 402 / 403: X13b counted the guard arm's new refund POST as an unknown route (the guard arm aborts Scene 1 on purpose, so the refund is the intended new behaviour). Harness taught `/api/refund-fortune` and given X13b-refund (refund exactly once in the guard arm, never in the main arm). **Second rerun 404 / 404** (`_validate_out/rerun2__scene1_skeleton_delivery.log`) |

## 5 · What this does NOT do

- Does not admit the planner anywhere: the Scene-1 corridor planner still reserves 80,783–84,392
  tokens against a 20,000 TPM allowance on Mistral Small and is refused (`scene1_planner_reserve_and_corridor_stage.md`).
  The repair fixes the ORDER and the fail-closed path; admission is the held routing decision.
- Does not invent any starter canon or reader truth; the planner authors the mission from the
  story's own inputs and the harness fixture is test-only.
- Nothing committed; cache-buster bumped to `app.js?v=20260907a-scene1-planner-stage`.
