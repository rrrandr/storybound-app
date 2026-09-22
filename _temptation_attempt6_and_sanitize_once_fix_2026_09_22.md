# Temptation Attempt 6 (Paid) and the Sanitize-Once Fix (2026-09-22)

Roman: "I'd say the next paid Temptation retry is now warranted, with the same constraints: no
images, no image prep, no repair/resample, stop after one run."

## The paid run

`node _scene2_repair_replay_sample.mjs --slot=temptation` (attempt 6). Preconditions confirmed
before running: dev server up, no orphaned Playwright Chrome, fixed-name `_temptation` output
files git-clean (holding attempt 4's committed content).

**Real cost: $0.0110384, exactly 1 physical paid request** (the scene-spine planner, `max_tokens:
1200`). The real author call (`max_tokens: 8000`) never dispatched — not because it failed, but
because the harness's own `PHYSICAL_REQUEST_CEILING`/settlement wait correctly gave up once no
further real request arrived, and the run's `exitReason` recorded that the author call never
settled. Preserved: `report_temptation_attempt6.json`, `console_tail_temptation_attempt6.txt`,
`partial_tracked_calls_temptation_attempt6.json`, `run_1790060088963.jsonl` (attempt 6's own
persisted log, uniquely timestamped). The fixed-name `_temptation` files were restored to attempt
4's committed content via `git checkout --` afterward. `scene2_raw_response_temptation.txt` was
never touched this run (no scene was ever authored, so nothing was written there).

## What actually happened (traced from the real, persisted log — not guessed)

The real planner reply (extracted from `run_1790060088963.jsonl`) had NO `li_pressure_actor` field
at all — `chosen_aftermath_lane: "lirael_defensive_path"`, `local_objective: "Lirael places The
Answer back in Julian's hands without speaking"` — the same institutional-only pattern as attempt
5, once again with Julian genuinely listed in `present`.

**First hypothesis, checked and REJECTED**: that this session's new relational-obligation validator
(`_validateLocalObjective`'s reject-only check) correctly caught this and blocked authoring. The
console tail disproves it directly: `[OBJECTIVE:ACCEPTED] scene 2 ... — "Lirael returns The Answer
to Julian..."` — the objective was accepted. The real blocker was a completely different,
pre-existing gate: `[CG:PLANNER-GATE] REJECTED before author dispatch... the planner declared
chosen_aftermath_lane="lirael_defensive_path" but its own proposed event/tactical-move/
forces-choice/event-slots does not actually instantiate that lane's content` — followed by one
retry (`[CG:STALE-REJECTED]`) that hit the identical judgment again, then `[CG:STALE-STOP]...
stopped; resumable; no engine switch`. This is `_detectPlannerFunctionGap` (or an equivalent,
pre-existing lane-instantiation quality gate), unrelated to this session's work, correctly doing
its own job and consuming the run's only real request before an author dispatch could ever be
attempted.

**The real finding, traced further**: my own relational-obligation check should ALSO have fired
here (Julian present, `li_pressure_actor` absent) but did not — `_openAccept.ok === true` proves
`_relObligation` was `null` for this planning pass, meaning the detector's byte-identity match
between `_posture.action`/`_posture.dialogue` and the ledger's `oas_interrupt.act`/`.dia` failed.

## Root cause

`_commitIntimateInterruption` sanitizes its own `action`/`dialogue` params
(`_sanitizeCommittedInterruptionText`, this session's earlier fix for the real `"action":"**"`
artifact) — but the Submit handler (`public/app.js` ~line 169260) reads `action`/`dialogue` once
from the DOM, then uses that SAME unsanitized pair for TWO separate purposes: `_commitIntimateInterruption(action,
dialogue)` (which internally sanitizes its own copy for the ledger) AND, immediately after,
`_advanceStagedScene(action, dialogue)` (the RAW, still-unsanitized pair) — which flows, unchanged
through `_completeStagedSceneFromScreenplay` → `_runCGScreenplayGen` → `_generateLiteraryPlotContract`
→ `_recordScenePosture` (confirmed, by reading its source, to be a pure verbatim passthrough — no
internal sanitization of its own) into `_posture.action`/`_posture.dialogue`. The ledger entry
ends up sanitized; `_posture` ends up raw. Two different values for the same real submission,
where the detector needs them identical. This divergence was introduced by this session's own
earlier sanitizer fix — a real, second-order consequence, only surfaced by putting the corrected
pipeline through a REAL paid dispatch.

## The fix

`public/app.js`, the Submit handler: sanitize `action`/`dialogue` ONCE, in place, immediately
before either consumer is called — `if (_intrPending) { action = _sanitizeCommittedInterruptionText(action); dialogue = _sanitizeCommittedInterruptionText(dialogue); }` — so `_commitIntimateInterruption`
and `_advanceStagedScene` read the exact same JS variables afterward. `_commitIntimateInterruption`
re-sanitizing an already-clean value is a no-op (confirmed idempotent, section A of this session's
own control). Gated on `_intimateInterruptionPending()` so an ordinary (non-interruption) turn's
input is never touched.

## Proof

Structural, not a live re-dispatch (a full live re-confirmation would need another paid call, out
of scope for a dry follow-up — see Status below):

1. **Same-variable guarantee**: `action`/`dialogue` are reassigned once, then read by both
   consumers in the same synchronous block — no code path between the two reads can diverge them.
2. **`_sanitizeCommittedInterruptionText` is idempotent** — proven in `_relational_obligation_contract_control.mjs`
   section A ("ordinary text with no markdown wrapper is completely untouched"), re-run 35/35 after
   this fix.
3. **`_recordScenePosture` is a verbatim passthrough** — read directly from source
   (`action: String(action || ''), dialogue: String(dialogue || '')`, no internal transformation),
   confirming nothing downstream of the Submit handler can re-introduce a divergence.

A live-browser attempt to observe this end-to-end (temporary diagnostic instrumentation, since
removed) found that `_scene2_live_handoff_directive_control.mjs`'s own simulated flow never reaches
the "open row" planner code path at all (unrelated to this fix — a pre-existing gap in that
control's fidelity to the real harness, not investigated further here, out of scope for this
correction) — so it could not be used to observe the fix directly. The structural proof above does
not depend on that control and is unaffected by the gap.

## Regression

`_relational_obligation_contract_control.mjs`: 35/35, unchanged. `_scene2_live_handoff_directive_control.mjs`:
49/49, unchanged (this fix does not touch anything that control's own — narrower — flow exercises).
`_continuity_spine_dry.mjs` re-verified via the same git-stash A/B methodology: 69/80 before and
after, identical 11 pre-existing failing test names. No additional failures.

## What this does NOT do

- Does not re-attempt the paid Temptation retry — Roman's instruction was to stop after one run.
- Does not fix or investigate the pre-existing `[CG:PLANNER-GATE]` lane-instantiation gate that
  actually blocked attempt 6's author dispatch — a separate, real mechanism, working as designed,
  outside this session's scope.
- Does not fix `_scene2_live_handoff_directive_control.mjs`'s gap (not reaching the open-row path)
  — flagged, not expanded into.
- Does not run any paid call, retry Temptation, or edit any candidate prose.

## Status

Dry, committed. No provider or image calls beyond the one authorized paid run already reported.
Cache-buster bumped (`?v=20260922f-relobl-sanitize-once`). The relational-obligation contract's
correctness against a REAL live dispatch remains structurally proven but not re-confirmed by a
second paid attempt — that would be the natural next authorized step, not taken here.
