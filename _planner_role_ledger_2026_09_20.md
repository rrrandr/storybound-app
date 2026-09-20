# Planner-Role Ledger — Trace Before Any Policy Change (2026-09-20)

Roman: "Before changing planner policy, trace the planner roles precisely." Dry, no provider calls,
no policy change made in this pass — answers the seven questions against real code and real retry
logs.

## 1-4. The failed Retry 4 planner call, precisely

**Function:** the scene-spine/open-row planner inside `_generateLiteraryPlotContract`
(`public/app.js` ~99330-100003) — specifically the `_scSys`/`_scUsr` prompt built there, dispatched
at line ~99919 via `_callTieredProvider('scenePlanner', _scMessages, { tiers: _scTiers })`.

**Model/chain in Retry 4:** confirmed from the real persisted log — dispatched to
`/api/mistral-proxy`, served by `ministral-8b-2512`, 200 status, no fallback triggered.

**Chain shape (from source, `_scTiers` construction, ~99906-99916):** conditional on
`window._scenePlannerEngine === 'grok'` (an existing, unchanged experiment toggle, default unset):

- **Default (unset, what Retry 4 actually ran):** `ministral-8b-2512` PRIMARY (only if
  `_ministral8bGovernorAdmits` — a static token/rate reservation check — admits this exact prompt) →
  `grok-4-1-fast-reasoning`-class FALLBACK. Deliberately a custom 2-tier chain, no OpenAI terminal
  (an explicit constraint from a 2026-09-10 decision, preserved through a 2026-09-20 repair that
  added the Grok fallback after a real rate-limit incident).
- **If toggled:** Grok primary, ministral-8b-2512 fallback.

**When does Grok fallback actually fire?** Only on transport/parse failure at the ministral tier —
a non-2xx response, a network error, or (implicitly, via `_callTieredProvider`'s general contract)
unparseable content. **There is no quality- or adequacy-based fallback.** A ministral reply that
parses cleanly and passes `_validateLocalObjective` (structural completeness — has a
`local_objective`, has `posture_read`, actor is a real roster name, etc.) is accepted regardless of
whether its proposed event actually serves the scene's dramatic function. Retry 4's ministral reply
parsed cleanly and passed that check — it never had a reason to fall back. This is exactly the gap
the new Planner Function Gate (below) closes, but the gate does NOT itself route the bounded retry
to a stronger model — it re-runs the SAME tier order, so a second consecutive ministral draw could
plausibly repeat the same shape of failure. Worth a follow-up decision, not assumed here.

## 5. Scope of this planner

`_generateLiteraryPlotContract` is called from exactly two sites: the CG continuation path
(`~229875`) and a second site (`~305541`, the literary continuation path) — the SAME scene-spine
planner mechanism serves both engines, for any scene with `sceneIndex > 0`. The OPEN ROW branch
specifically (`_curMs._open`) fires only when a scene row is authored with `objective: 'reader'` and
no hand-written `goal` — for First Sacrifice that is Scene 2 only (scenes 1, 3+ carry authored
`goal` text), but the mechanism itself is generic: any starter's open-row scene, at any scene index,
runs through the identical planner code and chain.

## 6-7. Other planner-like roles — a short ledger

| Role | Function / file | Decides actual next-scene story direction? | Model chain (confirmed from source) | Adequacy-based escalation exists? |
|---|---|---|---|---|
| **Scene-spine / open-row planner** | `_generateLiteraryPlotContract`, app.js ~99330 | **Yes — this is the role that failed.** Chooses the scene's one binding EVENT/state_change/forces_choice. | ministral-8b-2512 primary (governor-gated) → Grok fallback. No OpenAI terminal (deliberate). | No — transport/parse failure only. |
| **CG scaffold** | `_buildCGScaffold`/`_ensureCGScaffold`, app.js ~219933 | No — once-per-story thematic/structural infrastructure (`runThesis`, `issueArcs`, `motifBank`, `voiceAnchors`, `characterIcebergs`); shapes the STORY's available material, not any one scene's concrete event. | ministral-8b-2512 primary → Grok fallback → Claude/OpenAI terminal (the shared default `_callTieredProvider('scaffold', ...)` 3-tier policy). | No — transport/parse failure only. |
| **Commit verifier** | `_commitScene`, app.js ~98999, `_callTieredProvider('runtimeCommitVerifier', ...)` | No — grades whether the ALREADY-DELIVERED prose fulfilled the PRIOR scene's committed contract; a structural check on the past, not a decision about the future. | Same shared default 3-tier policy (ministral → Grok → OpenAI). | N/A — it's a checker, not a direction-decider. |
| **Full-scene / structural author** | `_authorFullScenePolicy`, app.js ~5090 (used for both the OAS turn-reply and the Scene 2 structural-author dispatch itself) | Decides HOW the planner's event is dramatized (prose), not WHAT happens. | Grok (`grok-4-1-fast-reasoning`) primary → ministral-8b-2512 (governor-gated) → gpt-4o terminal. | N/A — already the strongest available tier as primary. |
| **Fate-card batch** | `generateIntimateFatePreviewsBatch`, orchestration-client.js ~6564 | Indirect — generates the player-facing CHOICE OPTIONS (including the "burn for me... old gods" line) that the scene-spine planner then reads as posture. Doesn't decide the scene's event, but supplies the raw material that shapes it. | Tiered (mistral → grok → openai, per its own "PROVIDER POLICY (Roman 2026-09-16)" comment). | No. |
| **A-plot init** | `initAPlot` | Yes, but at a much coarser grain — sets the story-wide goal/stakes/clock once, early; not a per-scene decision. | Not traced in this pass (out of scope — not implicated in Retry 4). | Not traced. |

**Bottom line, evidence-based:** exactly ONE role decides the actual content of the next scene —
the scene-spine/open-row planner — and it is the cheapest tier (ministral-8b-2512) by default,
escalating only on service failure, never on plan quality. Every other traced role either checks/
structures existing direction (scaffold, commit verifier) or executes a direction already decided
(the author). The Fate-card generator is a partial exception: it doesn't decide the scene, but its
own output quality (today, fixed for the cosmology leak specifically) feeds directly into what the
real direction-decider sees.

## Recommendation

Roman's hunch is confirmed by the trace, not just plausible: the one role that chooses the actual
next story event is currently the cheapest model, with no capability-aware escalation. Two real,
independent, now-fixed structural gaps (missing worldTruths, missing continuity data) already
proved that starving this planner of DATA causes bad plans; Retry 4 then proved that even with full
data, this specific model, at this tier, can still choose a weak plan.

Given the Planner Function Gate (this pass) now stops a bad plan before the ~90x-more-expensive
author call fires, the immediate, lowest-risk move is: **ship the gate now** (done, see below),
and treat a planner model/policy upgrade as a separate, explicit decision — not bundled into this
pass, per "no policy change yet."

For that separate decision: a real cost comparison, using Retry 4's actual planner-call token
counts (prompt_tokens: 5468, completion_tokens: 858) — real ministral-8b-2512 cost was $0.00095;
the SAME call on `grok-4-1-fast-reasoning`'s published per-token rate would cost approximately
**$0.00898** (≈9.4× more per planner call, but still under a cent, against a scene whose author
call alone already runs ~$0.085-0.09). Switching this ONE role to Grok-primary would add roughly
$0.008 per scene — a small absolute increase. Whether that buys a meaningfully better plan is not
something this trace can answer without a real, paid, controlled comparison (same posture, same
data, planner-only on Grok vs. ministral) — which would itself need separate authorization.

**Not recommended without further evidence:** upgrading every planner-adjacent role (scaffold,
commit verifier) to Grok — those don't decide story direction, and Roman's own instinct ("don't
make every tiny verifier Grok") is well-supported by this trace.

## Status

Dry, no provider calls, no policy change made. The Planner Function Gate (rejects an inadequate
plan before author spend) is implemented and proven in this same pass — see
`_scene2_planner_function_gate_control.mjs`. The Grok-planner question is now well-evidenced for
Roman to decide, not decided here.
