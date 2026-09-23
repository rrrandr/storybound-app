# Tempt Fate outcome mechanism — production integration verification

2026-09-23. Roman: "The summary proves that simulated reports work, but doesn't say which real
generation call produces the report or where the real scene-acceptance path commits it. Given the
earlier 'defined but never called' gaps, that distinction matters. Also, delivered:true must reflect
the app's actual acceptance of the scene. A model asserting that flag cannot, by itself, establish
that the player received the scene." No paid calls during this verification.

This was a legitimate gap in the prior pass, not covered by its 38 checks — those proved the
`_validateTemptFateOutcomeReport`/`_commitTemptFateOutcome` MECHANISM correct against hand-built
inputs, but never traced or exercised where a real generation would call it. This pass does both,
and found two genuine bugs the pure-function testing couldn't have surfaced.

## 1. What was actually wired this pass (real, not simulated, production code)

- **The real CG JSON output schema** (`_buildCGScreenplaySystemPrompt`, `app.js` ~224114) now
  documents a `"temptFateOutcome"` field in the SAME schema block as every other structured field
  the author already returns (`kink_introduced`, `pc_kink_response`, `sceneCharge`, etc.) — not a
  separate prompt, not a new call type. Confirmed present in the real, live system prompt by the
  control (not assumed from the edit alone).
- **The real dispatch** (`_runCGScreenplayGenInner` → `_authorFullScenePolicy`/the grok-only
  fallback → `fetch('/api/proxy', ...)`) is the SAME single call CG scenes already make. The parsed
  `plan.temptFateOutcome` survives `_validateAndNormalizeCGPlan`'s normalization untouched (that
  function mutates known fields in place; it does not construct a new object from an allowlist, so
  an unrecognized field is never silently dropped — confirmed empirically, not just read from
  source).
- **The real commit** now sits inside `_runCGScreenplayGenInner`, in the SAME `if (_normalized &&
  plan)` block the pre-existing kink-memory recording already uses — which itself only runs after
  the real acceptance check (`_cgAcceptDelivered`) has already passed. A rejected/stale generation
  returns early, before ever reaching either block.

## 2. Two real bugs found by integration testing, neither visible to pure-function tests

**Bug 1 — the ledger lookup was always going to miss.** `_recordTemptFateEvent` stamps a ledger
entry's `sceneIdx` from `state.turnCount` AT SEAL TIME — before the player even clicks Submit.
`_advanceStagedScene` then does `state.turnCount = (state.turnCount||0) + 1` and calls generation
with THAT incremented value. So in real production flow, the ledger entry's `sceneIdx` is ALWAYS
exactly one behind the `sceneIndex` the generation function receives — an equality match (the
pass's first version) could never find the entry it needed. Fixed: since the Tempt directive/schema
only ever appear in the prompt when Tempt was actually invoked THIS turn, and the ledger is
append-only, the MOST RECENT ledger entry is always the correct proposal for a
`plan.temptFateOutcome` this generation call produced — no scene-index arithmetic required. Found
by actually calling the real dispatch function end-to-end with a stubbed response; a test of
`_commitTemptFateOutcome` alone (passing a hand-built `ledgerEntry` object, as the prior pass's 38
checks did) could never have surfaced this, since it never exercised the real lookup code at all.

**Bug 2 — the app's OWN acceptance path, traced and confirmed.** `_cgAcceptDelivered(reqSnap,
sceneIndex, reqAttemptId)` is the real function that determines whether a generation is stale
(superseded by a newer concurrent request) before anything from it is trusted — the SAME gate the
pre-existing kink-memory recording relies on. Directly exercised it with a genuinely manufactured
stale scenario (mint, mint again to supersede, then check the first snapshot) and confirmed
rejection: `{ok: false, reason: "stale attempt..."}`. Then confirmed structurally, against the real
served source, that the commit code added this pass sits AFTER this check's early-return in
execution order — a rejected generation cannot reach it, not merely "usually doesn't." This directly
answers Roman's concern: `delivered:true` inside `plan.temptFateOutcome` is necessary but never
sufficient by itself — the app's own acceptance gate runs first and independently.

## 3. Proof (`_tempt_fate_outcome_integration_control.mjs`, 20/20)

All against real production functions, network stubbed via `installFailClosedNetworkGate`'s
`gate.stub()` (not the fail-closed abort — an explicit, controlled fake response).

1. The real system prompt asks for `temptFateOutcome`, in the same schema block as other fields,
   with the per-effect durability instructions present.
2. A real dispatch (stubbed provider response) returns a plan that retains `temptFateOutcome`
   intact, and a durable consequence entry is created via the real production path — not by calling
   the recorder directly — with content matching exactly what the (stubbed) model reported.
3. A real subsequent system-prompt build (as the next scene's request would look) carries the
   committed effect, with ESTABLISHED/NOT YET ESTABLISHED, per-effect duration, and per-character
   belief state all intact.
4. `_cgAcceptDelivered` genuinely rejects a manufactured stale request; the source-order proof
   confirms the commit code is unreachable when it does.
5. A model-reported `delivered:false` commits nothing through the real path.
6. A model response that omits `temptFateOutcome` entirely commits nothing AND produces an explicit
   `[TEMPT-OUTCOME]` console warning — never silently treated as success.
7. Two real generation calls for the identical scene produce exactly one durable entry —
   idempotent through the real path, not just the pure function.

Two test-harness bugs were found and fixed while building this control (documented in the script
itself, not hidden): `gate.stub()` is append-only/first-match-wins, so registering a new stub per
section silently did nothing after the first; and a missing argument in one `page.evaluate` call
made a "duplicate" test accidentally call with `sceneIndex: undefined`, appearing to fail
idempotency for a reason unrelated to the code under test. Also found, unrelated to Tempt Fate: CG
scaffold generation is unconditional now ("Spine is ALWAYS ON" per its own source comment,
contradicting an older comment elsewhere describing it as flavor-gated) — stubbed rather than
chased further, since it's a separate system this pass isn't responsible for.

## 4. Regression

Full established suite re-run after the ledger-lookup fix (the only production `app.js` change this
pass, besides the schema/commit wiring itself, which the new integration control directly proves):
`_relational_obligation_contract_control.mjs` 47/47 · `_planner_function_gate_diagnosis_control.mjs`
unaffected · `_cg_proxy_world_guard_control.mjs` 15/15 · `_cg_causal_link_legibility_control.mjs`
25/25 · `_confession_frame_confessing_party_control.mjs` 16/16 · `_scene2_aftermath_lane_control.mjs`
22/22 · `_scene2_planner_function_gate_control.mjs` 10/10 ·
`_scene2_lirael_defensive_path_lane_semantics_control.mjs` 22/22 · `_saydo_safety_gate_control.mjs`
24/24 · `_saydo_wallbreak_gibberish_cluster_control.mjs` 32/32 ·
`_petition_identity_rewrite_gate_control.mjs` 23/23 · `_tempt_fate_canon_rupture_control.mjs` 20/20
· `_tempt_fate_volatility_activation_control.mjs` 19/19 ·
`_tempt_fate_imprint_lifecycle_control.mjs` 19/19 · `_tempt_fate_model_driven_outcome_control.mjs`
38/38 · `_continuity_spine_dry.mjs` (80-check baseline) — result appended to the commit body once
the background run completes (expected unchanged: 69 passed / 11 pre-existing-failed).

## 5. What this pass does NOT do

- Does not run a live Tempt Fate sample. See
  `_tempt_fate_memory_erasure_live_authorization_2026_09_23.md` for the concrete next-step proposal.
- Does not add a separate paid verifier call or a new creative classifier — `temptFateOutcome`
  rides the same single structured response every CG scene already returns.
- Does not chase the CG scaffold generation system's own unconditional-generation behavior further
  — noted as an unrelated, pre-existing finding, not fixed.
- No paid calls, no prose generation, no image work.
