# Silence Attempt 2 — Real Paid Trace (2026-09-22)

Roman, after the author-side causal-legibility fix landed (dry): "A paid Silence retry is now
warranted... Run one paid Silence retry under the current corrected pipeline." One run, no image
calls, replay already-paid OAS/card material, stop after this one run regardless of outcome.

## Result — mechanically clean; the causal-legibility fix never engaged

Real cost: $0.1002536 / $0.45 ceiling. 5 physical requests. Author dispatched, real scene returned.

**Mechanics — all proven live again:**
- `chosen_aftermath_lane: "dohkar_preliminary_review"` — correct, no `[CG:PLANNER-GATE]` rejection.
- `obligationType: 'register'` correctly resolved; the dispatched directive used the distinct
  register wording; `li_pressure_actor` present and substantive ("Julian registers the rasp of
  teeth on lace as visible refusal to answer his accusation...").
- Julian's label resolved correctly (31 occurrences).

**Roman's verdict, preserved verbatim: "I would not count Silence attempt 2 as a failed test of
the causal-legibility directive. The directive never reached the author. It's a failed trigger
test."**

Confirmed directly: zero occurrences of "CAUSAL LEGIBILITY" anywhere in the real dispatched
request. Ran the real, unmodified `_causalLinkPlanTrigger` function against this run's own real
captured `state_change_precondition`: `"No preliminary review date or terms have been announced
after Julian's claim"` → returns `null`. Compare attempt 1's precondition, which literally said
"the assembly holds **charged silence**..." — this run's planner phrased the same underlying
situation without silence/refusal/withholding vocabulary in the `precondition` field specifically.

**The accepted plan still clearly describes a silence-driven scene elsewhere:**
- `tactical_move`: "Dohkar breaks **charged silence** with procedural scheduling to move
  confrontation into review"
- `posture_read`: "The reader's non-verbal rasp of teeth on lace and taste of woodsmoke and iron
  registers as sustained defiant **silence** under accusation."
- `li_pressure_actor`: "Julian registers the rasp of teeth on lace as visible **refusal** to
  answer his accusation..."

The precondition-only trigger (chosen last round specifically to avoid the Temptation attempt 11
false positive) is too narrow against natural planner phrasing variance — the SAME underlying
scene shape produced a precondition without trigger vocabulary this time, purely due to how the
planner happened to word it.

**Without the directive, the authored prose repeats the same failure mode as attempt 1** (not
worse, not better on this specific axis): the Dohkar's procedural announcement begins at beat 1,
before any beat establishes her silence; her silence is only referenced afterward (beats 10-11).
One genuine improvement unrelated to the fix: no near-verbatim repeated dilemma this time (attempt
1 repeated its closing line almost word-for-word; this run's beats 19 and 25 are distinct).

## Diagnosis to carry forward (not fixed in this document — see follow-up trace doc)

1. Attempt 2 did not test the CAUSAL LEGIBILITY directive because the directive never fired.
2. The accepted plan still clearly describes a silence-driven scene in `tactical_move`,
   `posture_read`, and `li_pressure_actor` — the underlying situation was correctly silence-driven;
   only the specific `precondition` field's wording lacked trigger vocabulary this run.
3. The precondition-only trigger was too narrow for natural planner phrasing variance. The fix
   should NOT broaden by scanning every planner field for silence/refusal/concealment vocabulary
   (that risks reopening the Temptation attempt 11 false positive, since manner-of-action fields
   like `tactical_move` can legitimately use words like "concealing" for a landed action). Instead,
   the trigger should read from the resolved lane/event-frame's own definition — which,
   independent of planner phrasing, deterministically encodes whether THIS lane is itself framed
   as a response to a non-action.

## What this does NOT do

- Does not edit the generated scene or its preserved artifacts.
- Does not retry Silence again.
- Does not fix the trigger yet — that is the explicit next step, tracked separately.

## Status

Real paid attempt, committed as evidence. `report_silence.json` / `scene2_raw_response_silence.txt`
(the fixed-name files) were restored to attempt 1's committed content via `git checkout --`
immediately after preserving this run under `_attempt2` filenames.
