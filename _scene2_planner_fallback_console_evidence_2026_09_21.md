# Preserved Console Evidence — Scene 2 Retry #7 Fallback Attempt (2026-09-21)

Roman: "Preserve the console evidence showing the ministral fallback attempt was initiated." This
run's `console_tail.txt` was read directly (before the routine fixed-filename restore overwrote it)
during retry #7's investigation. The relevant lines are reproduced here verbatim so the evidence
survives independent of conversation context. Source: `_scene2_repair_replay_sample_out/
run_1789962853411.jsonl`'s companion console capture, retry #7, 2026-09-21.

## What this proves

`_callTieredProvider`'s tier-fallback logic (`public/app.js`) correctly detected the Grok-primary
planner tier's HTTP 502 and logged a second attempt on the ministral-8b-2512 fallback tier — the
planner-policy code is doing what it was built to do. This directly overturns the "the fallback did
not fire" reading that retry #6's report (written without this console evidence, since that run's
console capture was restored via `git checkout` before being read) had implied.

## Verbatim excerpt (console_tail.txt, lines 195-212 of that run's capture)

```
Failed to load resource: the server responded with a status of 502 (Bad Gateway)
[TIERED:scenePlanner] primary/grok/grok-4-1-fast-non-reasoning failed: grok HTTP 502 An error occurred with this application.

NO_RESPONSE_FROM_FUNCTION

[TIERED:scenePlanner] attempt 2 tier=fallback provider=mistral model=ministral-8b-2512 fallbackReason="grok HTTP 502 An error occurred with this application.

NO_RESPONSE_FROM_FUNCTION
"
Failed to load resource: net::ERR_FAILED
[BFL] Retry failed (flux-2-klein-9b-preview): Failed to fetch
[IMAGE-GEN] {"provider":"BFL-Klein","context":"li-face-reveal","reached":false,"blockedBy":"Network","status":"FAILED","promptLength":5005,"promptPreview":"PRIMARY DIRECTIVE: Depict the scene exactly as described. Scene and anatomy rules are authoritative. SUBJECT MATTER (HAR...","timestamp":"2026-09-21T03:54:59.025Z","error":"Failed to fetch"}
[IMAGE-GEN] {"provider":"OpenAI","context":"li-face-reveal","reached":true,"blockedBy":"None","status":"ATTEMPTING","promptLength":3509,"promptPreview":"PRIMARY DIRECTIVE: Match the established graphic novel rendering style exactly. This scene must visually match prior pan...","timestamp":"2026-09-21T03:54:59.025Z"}
[IMAGE-GEN] {"provider":"OpenAI","context":"li-face-reveal","reached":false,"blockedBy":"None","status":"META","promptLength":21,"promptPreview":"styleAuthority: Genre","timestamp":"2026-09-21T03:54:59.025Z"}
Failed to load resource: net::ERR_FAILED
[OpenAI] Error: Failed to fetch | attempt 1
```

The `[IMAGE-GEN]`/`[BFL]`/`[OpenAI]` lines interleaved above are unrelated background noise from this
same run's earlier replayed phases (portrait/panel image attempts for the candidate opener,
correctly blocked by the network gate's fail-closed image handling) — included only because they sit
adjacent to the relevant lines in the captured tail, not because they bear on the planner fallback.

## What is NOT in this evidence

The console capture (`consoleLines.slice(-200)`, the last 200 lines at the moment the script called
`safeExit`) ends shortly after the "attempt 2" line above. No resolution of the ministral fallback
attempt — success, a further failure, or any HTTP status — is recorded anywhere in this capture. The
network gate's own persisted log (`run_1789962853411.jsonl`) also shows no `/api/mistral-proxy`
request of any kind after the Grok 502. Whether the browser closed before the fallback's `fetch()`
call was even issued, or issued-but-not-yet-registered by Playwright's request interceptor, is not
distinguishable from this evidence alone — an open question, not resolved here.

## Status

Preserved as source evidence, not re-interpreted beyond what it actually shows. See
`_scene2_capability_retry7_report_2026_09_20.md` for the full retry account and
`_scene2_capability_retry6_report_2026_09_20.md` for the corrected retry #6 framing this evidence
informed.
