# Scene-Spine Planner Terminal Tier + Harness Observation Fix (2026-09-21)

Roman, after two real, consecutive `NO_RESPONSE_FROM_FUNCTION` 502s from the Grok-primary planner
tier: "Given the role's importance, adding [a GPT-4o terminal] now makes sense... it should probably
use the same robust shape as the other important text paths." Dry work, no provider calls, no live
retry.

## 1. Confirmed chain before this change

Direct source read, `_generateLiteraryPlotContract` (`public/app.js` ~99980): exactly two tiers —
Grok primary (or ministral primary under the `window._scenePlannerEngine='ministral'` escape hatch)
→ ministral (or Grok) fallback → **stop**. No terminal tier, unlike the shared default
`_callTieredProvider` chain (mistral → grok → OpenAI terminal, used by the CG scaffold and the
commit verifier) and `_authorFullScenePolicy` (grok → ministral → gpt-4o terminal, used for the OAS
turn-reply and the Scene 2 structural-author call itself). The original "no OpenAI in this chain"
constraint (2026-09-10) was a deliberate choice made when this planner was a cheap, low-stakes
structural step — before it was identified as the one role that decides the actual next-scene event
(`_planner_role_ledger_2026_09_20.md`).

## 2-3. Fix: gpt-4o terminal tier added, gate unchanged

A `{ tier: 'terminal', provider: 'openai', model: 'gpt-4o' }` entry is now pushed unconditionally
after the existing two-tier construction, in both branches. No admission/size check — gpt-4o's
context window is far larger than this prompt could reach. The Planner Function Gate
(`_detectPlannerFunctionGap`) is untouched and runs identically regardless of which tier produced
the plan — it operates on `state._scenePlotContract.stateChange` after `_generateLiteraryPlotContract`
returns, with no tier-specific branching anywhere in that code path.

## 4. Proof

19/19, new `_scene2_planner_terminal_tier_control.mjs`:
- PRIMARY — Grok succeeding stops the chain; neither ministral nor gpt-4o is attempted.
- FALLBACK — Grok transport failure falls to ministral, which stops the chain before gpt-4o.
- TERMINAL — Grok AND ministral both failing falls through to gpt-4o, which succeeds; the app's own
  `window._providerTierLog` confirms all three attempts occurred in order (primary/fallback/terminal).
- GATE-ON-TERMINAL — a weak-but-valid plan sourced from the gpt-4o terminal tier specifically (retry
  4's real inadequate plan, replayed as if gpt-4o produced it) is still rejected before author
  dispatch — the gate gives no tier any special treatment.
- SOURCE — CG scaffold and the commit verifier confirmed untouched (separate, unchanged
  `_callTieredProvider` role tags).

All 8 pre-existing controls re-run green (104/104 total across the suite before this addition).

## 5. Harness observation fix — the real gap behind retries 6 and 7

Retry #7's preserved console evidence
(`_scene2_planner_fallback_console_evidence_2026_09_21.md`) proved `_callTieredProvider`'s fallback
logic fires correctly — the app logs `"[TIERED:scenePlanner] attempt 2 tier=fallback
provider=mistral..."` — but that attempt's resulting network request never appeared in the test
harness's tracked-calls log before the browser closed. The prior quiet-period fix (commit
`cc503c04`) only watches for NEW entries to appear in network tracking; it has no way to know an
attempt was DECLARED by the app before the corresponding request is dispatched or intercepted.

**Fix:** `waitForSettlement` (`_e2e_network_gate.mjs`) now accepts an optional
`expectedTierLogRole`. When supplied, it cross-checks the app's own ground-truth
`window._providerTierLog` (written synchronously by `_logProviderTierAttempt`, before any network
delay) against the network-tracked call count on every poll — if the app has logged more attempts
than the network layer has tracked, settlement is refused and the quiet timer resets, regardless of
how long the quiet period has already run. `_scene2_repair_replay_sample.mjs` now passes
`expectedTierLogRole: 'scenePlanner'` on its call.

**Proof, not just a plausible fix:** 3/3, new `_harness_tier_log_cross_check_control.mjs` —
directly simulates the exact race (a tier-log entry written with no corresponding network request
yet) rather than relying on a live retry to reproduce it:
- WITHOUT-CROSS-CHECK — a negative control reproducing the bug itself: omitting
  `expectedTierLogRole`, `waitForSettlement` resolves on the first tracked call alone, exactly the
  retry-7 shape.
- WITH-CROSS-CHECK — supplying `expectedTierLogRole`, `waitForSettlement` does NOT resolve (raced
  against a 2.5s timeout) while the tier log is ahead of tracking.
- RECONCILES — once the matching network call is dispatched and settles, `waitForSettlement`
  correctly resolves — the cross-check doesn't hang forever, only until parity.

## What this does and does not prove

Does prove: the exact race mechanism (an app-declared attempt outpacing network-layer tracking) is
now directly closable, verified against a simulated reproduction of the precise shape retry 7 hit —
not a guess at a longer timeout.

Does not prove: that this eliminates every possible harness observation gap, or that the next real
retry will see a clean multi-tier attempt through to conclusion — that still requires a real, live
run to confirm, which was not run in this pass (dry work only, no live retry, per scope).

## Status

Dry, committed, generic. No provider or image calls made in this pass. The Planner Function Gate,
worldTruths, OAS history, mouth-band continuity, cosmology ban, the Grok-primary policy, and the
Required Scene Function frame are all unchanged and confirmed coexisting. Retry sheet updated with
the new 3-tier chain and revised worst-case cost ceiling. No live retry authorized or run — on hold
per Roman's explicit instruction from the prior message.
