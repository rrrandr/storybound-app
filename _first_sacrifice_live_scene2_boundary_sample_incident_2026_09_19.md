# Incident Record — Live Scene 2 Boundary Sample: Dispatched, Then Client-Side Cancellation Made Its Result/Cost Unknown

**Date:** 2026-09-19
**Status:** inconclusive, potentially billed operation. Not a model failure. Not retried.
**Method:** Reconstructed from the retained terminal output of the one run
(`_first_sacrifice_live_scene2_boundary_sample.mjs`) and the one file it wrote before exiting
(`_first_sacrifice_live_scene2_boundary_sample_out/FAILED_console_tail.txt`). No new network calls,
provider calls, or server probes were made to produce this record. No cost or billing outcome is
inferred anywhere below — every gap is marked `unknown`.

---

## What was authorized

One live, explicitly-authorized Scene 2 continuation for First Sacrifice: real OAS opener → one
real live exchange turn → real interruption + real fate-card preview batch → the reader selects the
real, freshly-generated **Boundary** fate card → real Submit → real Scene 2 CG-screenplay author
call (Grok primary, per the routing policy shipped earlier this session).

## Per-role outcome, from retained evidence only

| Role | Route/model (from retained request evidence) | Outcome | Confidence |
|---|---|---|---|
| `oas-opener` | `/api/mistral-proxy`, `model: "mistral-small-latest"` — the exact request body (full system prompt, user prompt truncated by this run's own 4000-character console-dump cap) was printed and is retained in this session's transcript | **DISPATCHED** (a real request genuinely left the browser — confirmed by the printed request body). Whether it returned, what it returned, and its cost are **unknown** — the diagnostic dump was truncated before any `status`/`responseBody` field printed. The UI's later phase-advance to `awaiting_first_response` is **not** reliable evidence of success: `_fireIntimacyOpener`'s `finally` block advances that phase unconditionally on `d._authoredFrame` being present, regardless of whether the opener call itself succeeded — a fail-open UI design, not proof of a good response. | dispatch: confirmed. Outcome: unknown. |
| `oas-turn1-reply` | Route/model not individually captured in what was printed (the diagnostic dump was capped before reaching this entry) | **CONFIRMED COMPLETED.** The real reply text was printed verbatim ("Your gaze lingered on me through the rite, Lirael. Did you summon rescue with that look, or was it merely the pull you wield without meaning to?"), and `state.intimacyDialogue.phase` reached `normal_reply_rendered` — a state this code only reaches after successfully parsing a real response. | Confirmed completed. |
| `fate-card-preview-batch` | Route/model not individually captured (same reason) | **CONFIRMED COMPLETED.** The real, freshly-generated Boundary card preview text was printed verbatim, and `state._intimateInterruption.phase` reached `cards_open` with a populated `cards` object — again only reachable after a real, parsed response. | Confirmed completed. |
| `scene2-cg-screenplay-author` | Not captured — the diagnostic dump never reached this entry before the run's own 4000-character print cap | **DISPATCH LIKELY BUT NOT DIRECTLY EVIDENCED.** Submit was clicked; the phase ceiling for this role was open (3); the code path from Submit to the first tier's `fetch('/api/proxy', ...)` is synchronous with no artificial delay. No confirmed request record, no response, no usage, no cost. The script's own wait loop (fixed 150-second wall clock, polling `state._sceneCaptures[1].originalOutput`) never observed a populated capture and gave up, closing the browser. **`_authorFullScenePolicy` (the new routing function) has no per-tier client-side timeout** — an `await fetch(...)` with nothing racing it — so a genuinely slow-but-real response (Grok generating an 8000-token screenplay can legitimately take 70–90+ seconds) may simply still have been in flight when the browser was closed. | Dispatch: likely, not confirmed. Outcome: **unknown-after-client-close.** Cost: **unknown** — not inferred. |

## What is explicitly NOT claimed here

- **Not a model failure.** No evidence anywhere in this record shows Grok, ministral-8b-2512, or gpt-4o refusing, erroring, or timing out server-side. The only confirmed failure is client-side: this run's own harness closed the browser before observing settlement.
- **Not a cost figure.** No usage block was captured for the `oas-opener` or `scene2-cg-screenplay-author` roles. Applying `TEXT_PRICING` rates to a token count that was never observed would be inventing a number; none is given.
- **Not evidence the operation is safe to silently repeat.** The one authorization for this specific Boundary-posture Scene 2 sample is treated as consumed by this attempt, dispatch outcome unknown notwithstanding. No retry occurred and none is planned without fresh, separate authorization.

## Root cause (client-side only, per the retained evidence)

1. `_authorFullScenePolicy` (shipped earlier this session) has no per-tier timeout race — each tier's `await fetch(...)` can wait indefinitely on a slow-but-live provider.
2. The live-sample harness's own overall wait was a single fixed 150-second wall clock, chosen without accounting for (1) — Grok's own documented generation time for an 8000-token screenplay (70–90+ seconds) leaves very little margin once opener/turn/card-batch overhead is included.
3. On reaching that wall clock, the harness called `browser.close()` unconditionally, with no check for whether an approved request was still in flight, and no persisted record of the dispatch to fall back on.
4. The harness's own diagnostic dump (`gate.realCalls()`, sliced to 4000 characters and only written to disk on the SUCCESS path) meant that even the partial evidence that did exist (the full `oas-opener` request) was captured by luck of ordering, not by design — the `scene2-cg-screenplay-author` entry, if one existed, was never reached before truncation, and nothing was persisted to disk at all on this failure path.

## What changed as a result

The harness (`_e2e_network_gate.mjs`) was rewritten to remove all four of these gaps: every approved
request is persisted to disk the instant it is released (not only on success); its settlement
(response or terminal network error) is appended the instant it is observed; waiting is done via
explicit settlement events with no total deadline (a watchdog reports "still pending" on a cadence
without ever closing anything); and the browser is never closed while `gate.hasUnsettled()` is true.
See `_e2e_network_gate_delayed_capture_control.mjs` (17/17, dry) for the proof, and
`_e2e_network_gate.mjs`'s own header for the full contract.

**No further live operation has been authorized or attempted.**
