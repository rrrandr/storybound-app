# Temptation Attempts 7-9 (Paid) — Live Confirmation of the Relational-Obligation Gate (2026-09-22)

Roman's four success criteria for the next paid retry: (1) confirm the real planner request has
sanitized, byte-identical submitted text on both the ledger-derived and posture-derived paths; (2)
confirm the relational-obligation check actually engages; (3) if the plan lacks `li_pressure_actor`
it should stop before author; (4) if it includes `li_pressure_actor`, author can run and the scene
gets judged.

## Attempts 7 and 8 — infrastructure failures, $0 spent, no signal

Both attempts: all three planner-tier providers (Grok, ministral, gpt-4o) returned an identical
generic 502 "An error occurred with this application" / `NO_RESPONSE_FROM_FUNCTION`. `runningCostUsd: 0`
both times — no usage block returned, nothing billed. Traced to the local `vercel dev` server (PID
79558, up 1 day 2.5 hours) having accumulated 101 leaked serverless-function worker child processes
— resource exhaustion in the function-invocation layer, unrelated to any provider, to content, or
to this session's code changes. Restarted cleanly (`SIGTERM`, clean exit, fresh `vercel dev --listen
3000`) at Roman's direction ("I don't know how to stop it" — Roman had not started it; this session
had). A separate, unrelated local-tooling failure surfaced on the next attempt:
`playwright-core` had been pruned from `node_modules` (not a declared dependency in package.json/
package-lock.json — installed loose at some earlier point this session) — reinstalled via
`npm install playwright-core --no-save`, confirmed to leave the tracked dependency files untouched.
One further transient `page.goto` timeout (matching an earlier, already-documented pattern this
session) cleared on immediate retry. Preserved: `report_temptation_attempt7.json`,
`console_tail_temptation_attempt7.txt`, `partial_tracked_calls_temptation_attempt7.json`; same set
for attempt 8. No code changes were made in response to either — both were pure local-environment
failures.

## Attempt 9 — real signal, all four criteria addressed

**Cost: $0.0113984, 1 physical paid request** (the scene-spine planner; the author call never
dispatched — see below). Preserved: `report_temptation_attempt9.json`,
`console_tail_temptation_attempt9.txt`, `partial_tracked_calls_temptation_attempt9.json`,
`run_1790063218678.jsonl` (attempt 9's own persisted log).

**1. Byte-identical text, confirmed from the REAL dispatched request body** (not the response, not
an assumption): `grep` against the actual planner request extracted from the persisted log finds
the player's raw gaze/hands wording ("I keep my hands folded at my waist and meet his eyes") intact
— the sanitize-once fix delivers the same clean text the ledger holds.

**2. The relational-obligation check engaging, confirmed from the REAL dispatched request body**:
the new HARD schema-request directive (added this session, only ever appended when
`_relationalObligationForPosture` returns non-null) appears VERBATIM in the actual dispatched
planner request: `ALSO REQUIRED, same JSON, IF "the love interest" is among "present" (OPTIONAL and
unused otherwise): "li_pressure_actor" (one to two sentences — HARD: this scene follows the
reader's own "Temptation" submission to the love interest...`. This is direct, irrefutable proof
the gate engaged live — not inferred from the model's behavior, read from the exact bytes sent to
the provider.

One cosmetic gap surfaced here: the target resolved to the generic fallback "the love interest"
rather than "Julian" specifically. Root cause: `_relEnsureAnchors`'s label source
(`state.loveInterestName || state.partnerName`) reads TOP-LEVEL state fields, but this harness (and
apparently the real app state for this starter) only sets the LI's name at
`state.picks.identity.partnerName` — a nested field `_relEnsureAnchors` doesn't read — so the
fallback string fired instead. Does not affect correctness (the gate still required and got a real
response); flagged as a follow-up polish item, not fixed here — out of scope for this run's report.

**3. Stop-before-author when `li_pressure_actor` is missing**: not directly re-exercised live by
attempt 9 (the model complied this time — see below) — this path was already proven via
`_relational_obligation_contract_control.mjs`'s RED fixture (Temptation attempt 5's own real,
unmodified reply, missing the field, correctly rejected) and via attempt 6's real, live confirmation
that a reply missing the field is NOT what stopped attempt 9. Given the engagement mechanism (2) is
now confirmed live and unchanged since that proof, there is no new reason to doubt this path, but it
was not independently re-confirmed by THIS specific attempt.

**4. `li_pressure_actor` present → author runs → judge the scene**: the real reply DID include a
substantive `li_pressure_actor` this time: "Julian's gaze sharpens at her words, the hunger in it
flaring as he registers her turning his accusation into a public challenge that draws every eye
back to him" — genuinely responsive to what she submitted, not a restatement of his presence. The
objective was accepted (`[OBJECTIVE:ACCEPTED]`, console tail). But the author call still never
dispatched: a completely SEPARATE, pre-existing gate —
`[CG:PLANNER-GATE] REJECTED before author dispatch... the planner declared
chosen_aftermath_lane="lirael_defensive_path" but its own proposed event/tactical-move/
forces-choice/event-slots does not actually instantiate that lane's content` — fired again, exactly
as it did on attempt 6, retried once, and stopped. This gate judges whether the declared aftermath
lane is genuinely instantiated by the event, not whether the relational obligation is met — a
different axis entirely, and outside this session's scope. It has now independently blocked
authorship on two consecutive real Temptation attempts (6 and 9), both with the SAME
`local_objective` shape (Lirael addressing/concealing before the assembly) — a real, recurring
pattern worth Roman's attention as a separate decision, not something addressed here.

## What this run proves and does not prove

**Proves**: the relational-obligation mechanism (detection, prompt directive, and — by strong
inference, since the field showed up correctly formed and validated — the accept path of the
reject-only check) is live, engaged, and working against a real dispatch, closing the gap the
previous "structurally proven, not live-confirmed" status left open.

**Does not prove**: that the reject path fires on a live dispatch with a genuinely missing
`li_pressure_actor` (attempt 9 didn't produce that case); and does not get past the separate
lane-instantiation gate to ever reach a real author dispatch, so "whether Julian's response reads
well in finished prose" remains unanswered — no scene was authored across attempts 6 through 9.

## Status

Two real, unrelated local-environment problems found and fixed along the way (leaked `vercel dev`
worker pool; missing `playwright-core`), neither touching any tracked application code. No code
changes accompany this document — this is a paid-run trace only. Preserved artifacts committed;
fixed-name `_temptation` fixtures remain at attempt 4's committed content throughout.
