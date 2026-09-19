# Incident Record — Unstubbed `/api/*` Requests During Vertical-Slice Control Development

**Date:** 2026-09-19
**Source:** Building `_first_sacrifice_fate_card_scene2_control.mjs` (First Sacrifice Fate Card → Scene 2 vertical slice)
**Method:** Reconstructed entirely from terminal/console output already produced during this session's earlier runs. No new network calls, test runs, or provider requests were made to compile this record.

## What happened

Provider stubbing for the vertical-slice control was implemented at the function level only — wrapping every function on `window.StoryboundOrchestration`. This missed a real call path: the CG scaffold generator (`_ensureCGScaffold` → `_runEnsureCGScaffold` → `_buildCGScaffold`) issues its request through a separate "tiered provider policy" mechanism (`public/app.js`, `_logProviderTierAttempt` / the `[TIERED:...]` log family) that calls `fetch('/api/mistral-proxy', ...)` directly — entirely outside the `StoryboundOrchestration` object the function-level stubs wrapped.

This was discovered mid-session from a control run's console output showing `[CG:SCAFFOLD] generation start` / `[TIERED:scaffold] attempt 1 tier=primary provider=mistral model=ministral-8b-2512` with no network-level gate yet in place. A hard, network-level gate (`page.route('**/api/**', ...)`, fulfilling every request with fixed stub content) was added immediately after, before any further control runs.

## What the retained evidence directly establishes

- **Confirmed log lines:** exactly **3** occurrences of `[TIERED:scaffold] attempt 1 tier=primary provider=mistral model=ministral-8b-2512` appear anywhere in the retained console output from this session. All 3 are from the **same** control run — the first run executed *after* the network-level `page.route` gate was installed. Each is immediately followed by:
  `[CG:SCAFFOLD] generation FAILED — scene proceeds without scaffold: scaffold JSON parse failed: Unexpected token 'E', "[E2E-STUB N"... is not valid JSON`
  The `"[E2E-STUB N"` fragment is this control's own fixed stub response body (`[E2E-STUB NETWORK RESPONSE]`) — direct, positive evidence that all 3 of these were intercepted by the gate and none reached a real provider.
- **Role/model (these 3):** role=`scaffold`, tier=`primary`, provider=`mistral`, model=`ministral-8b-2512` (explicit in the log line itself).
- **Provider response / usage record (these 3):** none — the response body was the stub's own fixed text, not provider output; no real usage record was generated.
- **State change (these 3):** none — `s.cgScaffold` was never set (the log line itself states the scene proceeded without a scaffold).
- **Exact timestamps:** unknown for every attempt, gated or not. `_logProviderTierAttempt` records `at: Date.now()` into `window._providerTierLog`, but that in-page array was never read out via `page.evaluate` before the browser closed at the end of each run, and no console line printed a wall-clock time. No log file was written to disk during this work — the only surviving record is the terminal output already shown in this conversation.

## What is genuinely unknown

The submit → scaffold code path is unconditional once a real Submit succeeds (no guard in `_advanceStagedScene` → `_ensureCGScaffold` would block it), and at least one control run reached a real Submit *before* the network gate existed. Whether that run (or any other pre-gate run) actually dispatched a `/api/mistral-proxy` request — and if so, how many times, at what time, whether a real response was received, whether any usage was recorded on the account behind the local `/api/mistral-proxy` proxy, or whether any state changed as a result — is **unknown**. The retained console output for those specific runs is a fixed-size tail dominated by later reload/boot noise and does not contain a directly-quotable scaffold/TIERED log line for them. This cannot be resolved without either a persisted, timestamped log (none exists) or a new network-facing check (which is out of scope for this record per instruction).

## Correction to this session's earlier, looser disclosure

Earlier in this session, the real-time disclosure described "2-3 earlier debugging runs" reaching the real endpoint "unstubbed." That was a reasonable caution to raise in the moment, but this rigorous re-read of retained evidence does not support a specific count of genuinely unguarded attempts — the only attempts directly evidenced in retained output were already intercepted. The accurate position is: **the exact count, timing, and outcome of any pre-gate `/api/mistral-proxy` request is unknown from currently available evidence** — not "2-3." This record supersedes that earlier, looser framing.

## What changed as a result

A permanent, reusable, fail-closed network gate now exists for real-browser controls in this repo: `_e2e_network_gate.mjs`. See its own header and `_e2e_network_gate_control.mjs` for the proof that a request matching no explicitly registered stub is aborted locally before it ever leaves the browser — never silently passed through, and never reaching a real provider.
