# AUTHOR ROUTING — what the reader sees after the governor refusal, every affected route, and a compact decision · 2026-09-06

> **SUPERSEDED IN PART (same day):** §3's "gpt-4o terminal" is withdrawn — OpenAI is ruled out of the scene-author chain on price, and the existing silent gpt-4o fallback is itself a defect. The current policy is `author_routing_policy_v2.md`. §§1–2 (trace, affected routes) stand.

Read-only. Sources: `orchestration-client.js::_grokLiteraryAuthor / _mistralAuthor`, `app.js::_runCGScreenplayGen /
_completeStagedSceneFromScreenplay / _sceneEditorialTier`, `api/_mistral-governor.js`, `api/proxy.js`, `api/orchestrator.js`,
the two capture-only preflight runs (`_validate_out/pilot_preflight_capture*.json`) and one prompt-size measurement.

## 1 · The refusal, traced to the reader

**Trigger.** Any scene classed *normal* by `_isPremiumAuthorScene` (not `turnCount === 0`, not climax/cliffhanger/Tempt, no
apex/high importance, no ST5/ST6, no first-meet/betrayal flag, not a complex world) with `window._smallAuthorEnabled`
at its default. Under the repaired counter that is **every scene from Scene 3 on** (Scene 2 is "premium" only because the
tier rule reads `turnCount === 0` as Scene 1).

**Literary path (corridor stories, literary starters after unlock, Issue 2+):**
1. `_mistralAuthor` posts the FULL author messages to `/api/mistral-proxy` as `mistral-small-2603`: ≥131 k bytes measured
   with a stand-in prefix, ≈380 k chars live, + 3,000 `max_tokens`. Allowance 20,000. The governor refuses **before
   dispatch** (HTTP 507, `reservation_exceeds_model_allowance`, `governor:true`, terminal). Milliseconds, no spend.
2. `_mistralAuthor` throws; `_grokLiteraryAuthor` catches and runs the cross-provider branch → `grok-4.3` authors the scene
   → console `[AUTHOR-FALLBACK] served=Grok (Mistral primary failed)`. The Small-branch post-processing (metadata-tag
   strip) then runs on Grok prose; `state._authorPrevWasPremium = false` is recorded for the next scene's bridge logic.
3. **The reader sees a normal Grok-authored scene.** No toast, no visible delay. The Scene-2+ validator's one retry
   re-authors through the same path (second refusal, second Grok call). The speculative preload uses the same function.
4. If Grok also fails: `gpt-4o` as `PRIMARY_AUTHOR` (allowlisted in `api/orchestrator.js`) authors silently; if that fails
   the handler throws — toast "Proxy returned 200 but scene text is empty — scene not advanced." The literary handler
   never calls `_refundPendingSceneFortune` (only staged/GN paths do), so a charged, failed literary scene keeps its
   pending refund only for the 2-minute window those paths honor.
   → Net effect today: **cost and intent** (the "quiet scenes on Small" saving never happens; Grok pays for every scene,
   twice on retried ones), plus a dead Grok→Mistral escape hatch for the author. Not reader-visible.

**CG / staged path (First Sacrifice's launch format):**
1. The connecting-scene chain is Mistral-Small-first. Measured screenplay request for a First Sacrifice scene:
   **138,175 B system + 67,033 B user ≈ 205 k bytes** → refused before dispatch.
2. By design ("a governor refusal must not advance the provider loop") the ladder **stops** — Grok, DeepSeek, GPT are
   not tried. `_runCGScreenplayGen` returns null.
3. `_completeStagedSceneFromScreenplay`: ordinary scene → console "falling back to literary path for THIS scene only",
   **toast "Screenplay gen timed out — using literary path"** (false: nothing timed out), then the literary author for
   that scene → which is itself Mistral-primary → refused → Grok → **a prose page inside a comic-format story, no
   panels**, with `_cgScreenplayMode` left on so the next scene tries and fails the same way. First scene of a paid
   issue / alt-POV → "Try Again / Take Refund" popup instead; if the literary fallback also fails → toast "Retry: hit
   Submit again to use the literary path".
   → Net effect: **every non-premium CG scene degrades to literary prose with a misleading toast.** This is the
   reader-visible launch blocker.

## 2 · Every route touched by the 20,000-token allowance

| route | model | measured reserve | governor | what happens | reader-visible |
|---|---|---|---|---|---|
| literary scene author, normal scenes (main, validator retry, speculative preload) | mistral-small-2603 | ≥131 k (live ≈ 95 k tokens) | refused | Grok fallback | no (cost/intent) |
| CG screenplay author, normal scenes | mistral-small-latest | ≈ 205 k B | refused, ladder stops | literary prose page + wrong toast | **yes** |
| Scene-1 corridor planner (`PROMPT_PREPROCESSOR`, `max_tokens ≥ 2,400`) | mistral-small-latest | **unmeasured** (seeded starter: 92,980 → refused) | unknown | on refusal `_scene1QuotaBusy` terminal → Scene 1 does not mount | **yes if oversized** |
| continuation stage-contract skeleton | mistral-small-latest | 18,777 | admitted, ~6 % headroom | grows with the romance planning context; when refused the author runs without a skeleton | no (quality) |
| Mistral SD fallback (staged intimacy) | mistral-medium-latest | any | **UNCONFIGURED** — model not in the governor table | the "fallback" never works | no (dead path) |
| line-editor, mechanical fix, reflow, hot-open repair, body-bible reroll, glint grounding, portfolio | mistral-small-latest | 0.7–5 k (portfolio not re-measured) | admitted | fine; `_proseLineEdit` already keeps the original on refusal | no |
| Ministral 3B/8B/14B | — | — | limits known (1.3 M / 625 k / 937.5 k TPM) but **not in the proxy allowlist** (drafts unapplied) | unusable without a route change | — |
| Mistral Large / Medium | — | — | allowlisted in the proxy, **no governor entry** → refused | unusable until limits are read from the account page | — |

## 3 · The routing decision (compact; no code here)

Constraint that cannot be argued around: the scene author's payload is 5–20× the Small allowance, so **Mistral Small
can be neither primary nor fallback for the scene author**. Roman's stated policy — Grok and Mistral as each other's
fallback, gpt-4o-mini for mindless Mistral tasks — holds for the small passes and cannot hold for the author at 20 k TPM.
(Note: the Grok allowlist does carry non-reasoning models, `grok-4-1-fast-non-reasoning` and `grok-4.20-0309-non-reasoning`;
the narrative role is simply pinned to `grok-4.3`.)

| option | verdict |
|---|---|
| **A. Direct Grok for every scene author (literary and CG), gpt-4o terminal** | **Take for launch.** It is what literary readers already receive via the fallback, minus the refusal detour and the double Grok on retries; for CG it turns a broken scene into a working one. Cost delta vs. today's *served* reality ≈ 0 for literary; the never-realized Small saving (~$0.10/scene) is not lost because it never existed. |
| B. Higher-capacity Mistral route (Ministral 8B/14B) as primary for quiet scenes or as Grok's fallback | Structurally possible (governor knows the limits) but needs a proxy allowlist change and an author validation that has never been run; 14B failed the planner content bar twice. **Later A/B, not a launch move.** Medium/Large first need account-page limits entries. |
| C. Prompt/work splitting so the author fits Small | Not viable: 20 k tokens ≈ 80 k bytes including output; LIT-LITE, the previous attempt, was deprecated on 2026-08-25 for dropping the product's systems. Already true for the mindless passes, which all fit. |
| D. Tier-policy change (promote all scenes to premium) | Same effect as A for routing; separately, `_sceneEditorialTier`'s `turnCount === 0` now means the Scene-2 build, and the tier also drives lens/repair budgets — that semantic fix is its own decision. |

**Decision as recommended:** A now — scene authors Grok-primary on both engines, gpt-4o terminal, Mistral removed from
the scene-author chain until B is validated; Small stays primary for the sub-20 k passes with gpt-4o-mini as their fallback
per policy; the CG ladder's "stop on governor refusal" rule stays (it was right — the wrong part was putting an
impossible request first). Two follow-ups that are not part of this decision: measure the corridor Scene-1 planner
reserve (if oversized it cannot be Small either — the A-plot generator already runs on Grok fast-reasoning at ~64 k), and
give the Mistral SD fallback a real model or retire it.

## 4 · Pilot status
Still NO-GO until the author route is changed (any of A/B/D) and the Scene-1 planner is measured. Nothing dispatched,
routed, mocked or changed in this trace.
