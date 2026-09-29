# PILOT ADMISSION PREFLIGHT — free, capture-only · 2026-09-06

**Question.** For the exact intended three-scene pilot (corridor literary story, Modern / small town /
Billionaire / Enemies / Earnest / first person, intensity `low`, speculative preload off, production
tier routing, arm A block off vs arm B block on, same seed and inputs), can each arm reach its intended
Grok author for every scene without a governor refusal or a fallback? **Verdict: NO-GO** (§4).

**Method.** Two capture-only runs of the real client against the local dev server with every `/api/**`
POST answered locally by one proxy shape (`{content:'{}'}`) and recorded (endpoint, role, model, UTF-8
bytes of all messages, `max_tokens`, conservative reservation = bytes + max_tokens, admissibility against
`api/_mistral-governor.js` MODEL_LIMITS). No provider was contacted; no success was mocked as proof —
every "reachable" claim below is by code path, and every admission is arithmetic against the deployed
governor table. Files: `_validate_out/pilot_preflight_capture.json` (Scene 1 attempt via
`handleBeginStory`), `_validate_out/pilot_preflight_capture_continuation.json` (scenes 2 and 3 through the
real submit handler on a seeded Scene 1). Byte counts on the continuation are LOWER BOUNDS: the seeded
`state.sysPrompt` was a one-line stand-in; live it carries the story-specific prefix (measured 2026-08-15:
continuation author payload ≈ 380 k chars).

**Governor facts (deployed, `api/mistral-proxy.js` → `_mistral-governor.js`).** Admission reserves UTF-8
request bytes + `max_tokens` and refuses before dispatch when the reserve exceeds the model's TPM
(`reservation_exceeds_model_allowance`, HTTP 507, `governor:true`, terminal, no fallback inside the proxy).
`mistral-small-latest` / `mistral-small-2603`: **20,000 TPM**, 1 RPS. A model missing from the table is
refused outright (`mistral-medium-latest`, used only by the staged SD fallback, is not in the table).
Only `/api/mistral-proxy` is governed; `/api/proxy` (xAI) and `/api/chatgpt-proxy` have allowlists and
rate limits but no reservation governor. Keys present locally by name: XAI, MISTRAL, OPENAI, DEEPSEEK.

## 1 · Author routing for the pilot's scenes (the decisive part)

`orchestration-client.js::_grokLiteraryAuthor`: a scene is **premium** if `_sceneEditorialTier(state)
=== 'premium'` (app.js: `turnCount === 0`, climax, cliffhanger, Tempt), or `_currentSceneImportance` is
`apex`/`high`, or ST5/ST6, or an explicit first-meet/betrayal/revelation flag, or a complex world mode
(Glass House, Cursed, Thirst, simulation). Otherwise, with `window._smallAuthorEnabled !== false` (the
production default), **Mistral Small is the PRIMARY author** (`_mistralAuthor`, model
`mistral-small-2603`, the full author messages) and Grok is only the cross-provider **fallback** after a
Mistral failure ("[AUTHOR-FALLBACK] served=Grok (Mistral primary failed)").

| pilot scene | `turnCount` at build | editorial tier | primary author dispatched | observed reserve (lower bound) | governor |
|---|---|---|---|---|---|
| Scene 2 | 0 | **premium** — only because the tier rule reads `turnCount === 0` as "Scene 1" (comment: "Scene 1 only"; under the repaired invariant the Scene-2 build also has 0) | `/api/proxy` NARRATIVE_AUTHOR **grok-4.3** first | 132,558 (129,558 B + 3,000) | not governed — reachable as primary |
| Scene 3 | 1 | **normal** (`_currentSceneImportance` unset in a fling's scene 3; no flags) | `/api/mistral-proxy` **mistral-small-2603** first — twice (initial + the Scene-2+ validator's one retry) | **144,977** and **145,546** vs allowance **20,000** | **OVERSIZED → refused before dispatch (507, terminal)**; Grok reached only via the fallback branch |

Both arms are identical here; the block changes nothing about routing. The Mistral-primary refusal is
deterministic: even the lower-bound request is 7× the allowance; live it is ~10×.

## 2 · Every dispatch the pilot path attempts — continuation turn (scene 2; scene 3 identical except the author order)

| # | endpoint | role | model | bytes | max_tokens | reserve | governed | admitted | reachable |
|---|---|---|---|---|---|---|---|---|---|
| 1 | chatgpt-proxy | NORMALIZATION | gpt-4o-mini | 6,549 | 500 | 7,049 | no | — | yes |
| 2 | chatgpt-proxy | BACK_COVER_SYNOPSIS ("Previously…" recap) | gpt-4o-mini | 566 | 180 | 746 | no | — | yes |
| 3 | chatgpt-proxy | STRATEGY_PASS | gpt-4o-mini | 12,333 | 500 | 12,833 | no | — | yes |
| 4 | chatgpt-proxy | PRIMARY_AUTHOR (scene-spine planner) | gpt-4o-mini | 5,936 | 640 | 6,576 | no | — | yes |
| 5–6 | chatgpt-proxy | PRIMARY_AUTHOR (feature-rotation / description passes) | gpt-4o-mini | 31,215 / 63,525 | 2,500 / 3,000 | 33,715 / 66,525 | no | — | yes |
| 7 | **mistral-proxy** | **PROMPT_PREPROCESSOR** (continuation STAGE_CONTRACT skeleton) | mistral-small-latest | 16,477 | 2,300 | **18,777** | yes | **yes (1,223 under the 20,000 allowance)** | yes — but with ~6 % headroom; live `_buildPlanningRomanceContext` grows with the story |
| 8 | proxy | NARRATIVE_AUTHOR (scene author, premium path) | grok-4.3 | 129,558 | 3,000 | 132,558 | no | — | yes (Scene 2 only) |
| 8′ | **mistral-proxy** | (scene author, normal path) | **mistral-small-2603** | 130,937–142,546 | 3,000 | **133,937–145,546** | yes | **NO — oversized** | refused (Scene 3; and any non-premium scene) |
| 9 | proxy | NARRATIVE_AUTHOR (line-editor pass) | grok-4-1-fast-reasoning | 1,944 | 900 | 2,844 | no | — | yes |
| 10 | chatgpt-proxy | PRIMARY_AUTHOR (line-editor twin) | gpt-4o-mini | 1,944 | 900 | 2,844 | no | — | yes |
| 11 | mistral-proxy | mechanical-defect fix | mistral-small-latest | 706 | 3,000 | 3,706 | yes | yes | yes |
| 12 | chatgpt-proxy | PRIMARY_AUTHOR (mechanical-defect twin) | gpt-4o-mini | 706 | 3,000 | 3,706 | no | — | yes |
| 13–14 | mistral-proxy | LINE_EDITOR (`_proseLineEdit`, governor-aware: on refusal keeps original) | mistral-small-latest | 1,073 / 3,192 | 1,500 | 2,573 / 4,692 | yes | yes | yes |
| 15 | proxy | INTIMACY_SPECIALIST (ambient-soundscape classifier) | proxy default | 12,457 | 12 | 12,469 | no | — | yes |
| 16 | chatgpt-proxy | BACK_COVER_SYNOPSIS (jacket) | gpt-4o-mini | 4,579 | 380 | 4,959 | no | — | yes |

Speculative preload: off by pilot flag (would add one more full author dispatch per scene, same
routing). OAS: not entered at intensity `low` in these captures. Image/BFL dispatches: none in this
low-intensity literary capture (they appeared in the earlier Steamy seeded run and would be extra spend
there). Under stubs some passes may have run that a live turn would skip, and vice versa; the table lists
what the path attempted.

## 3 · Scene 1 (shared page) — partially enumerated, one unknown

Captured before the run aborted at the stage contract (the planner's stub reply is not a valid stage,
so the default abort fired — correct behavior): consume-fortune; NORMALIZATION ×2 (gpt-4o-mini, ~7 k);
PRIMARY_AUTHOR setup passes (gpt-4o-mini 12–68 k: bibles, R-plot, continuity architect, memory
extractor); **STRUCTURE_GENERATOR A-plot generator ×2 on grok-4-1-fast-reasoning (~64 k each)**;
INTIMACY_SPECIALIST soundscape classifier. **Not reached under stubs:** the Scene-1 stage/planner on
`mistral-small-latest` (`PROMPT_PREPROCESSOR`, `max_tokens = max(2400, budgetChars/3 × 1.25)`), whose
request size for a Modern corridor story is therefore **unmeasured here**. The only measurement on record
is the seeded First Sacrifice planner: **reserve 92,980 vs 20,000 → refused** (`pilot_protocol_v1.md`).
If the corridor planner is similarly sized, the shared Scene 1 is refused live as well; if it is under
~17 k bytes it is admitted. This is a second, independent unknown, not the basis of the verdict.

## 4 · Verdict

**NO-GO. Blocking role: the literary scene author for non-premium scenes — `_mistralAuthor` on
`mistral-small-2603` with the full author payload (≥131 k bytes, live ≈ 380 k chars) against a 20,000-token
allowance → `reservation_exceeds_model_allowance` on every such scene.** In the pilot that is Scene 3 in
both arms; Scene 2 escapes only because the editorial-tier rule treats `turnCount === 0` as "Scene 1". Grok
is reachable for Scene 3 solely through the cross-provider fallback after that refusal, which the admission
rule forbids. No workaround is proposed. No spend cap, call count or blind pack is issued.

For the record, the two conditions that would have to change before re-preflighting — stated, not
recommended, not done: the non-premium author route (`_smallAuthorEnabled` / `_sceneEditorialTier`, a
routing decision), and a measurement of the corridor Scene-1 planner reserve. Nothing was dispatched,
mocked as success, routed, or changed in this preflight.
