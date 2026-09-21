# Scene 2 Capability Sample: Reversal (2026-09-21)

Authorized scope: Reversal card as the first of a two-card branch capability plan
(`_scene2_four_card_branch_authorization_2026_09_21.md`), using the newly parameterized
`--slot=reversal` invocation, all standing gates/fixes active, $0.45/8-request ceiling, no
follow-up retry within this card.

## Result: architecture correct, gate-rejected for a real, subtle, newly-isolated reason — NOT clean

Real cost: $0.0104359 (1 physical request — a single planner draw; the app's own bounded retry
reused the cached objective, no second real call). The author never ran. Per Roman's own stop
condition ("If Reversal fails structurally, stop before Temptation and report"), Temptation is
**not** run this pass.

## Evaluation

**1. Is `local_objective_actor` = Julian, not Lirael or a collective?** Yes, cleanly:
`"local_objective_actor": "Julian"` — matches the documented role for this lane exactly, and
passed `_validateLocalObjective` (`[OBJECTIVE:ACCEPTED]`).

**2. Does Julian drive the scene without Lirael disappearing?** Not reachable — the plan never
reached the author, so no prose exists to evaluate this against. The planner's own `local_objective`
("Julian seizes control of the ruling by publicly challenging the Dohkar's jurisdiction over
Lirael's conduct before the assembly") and `posture_read` ("Lirael meets Julian's gaze without
retreat... turning his accusation back on him as she stands accused") suggest the *plan* keeps
Lirael actively present rather than sidelined — but this is a structural intention, not confirmed
prose.

**3. Do the gates pass for substantive reasons?** The plan passed `_validateLocalObjective` and the
lane-content check inside the Planner Function Gate (`chosen_aftermath_lane:
"julian_jurisdiction_challenge"`, and its `tactical_move` genuinely contains "jurisdiction" — the
lane's own `signalRx` matched). **It was rejected by a DIFFERENT, older check inside the same
gate**: the generic `_SCENE_AFTERMATH_VOCAB_RX` scan (built earlier this session, before the lane
system existed) found none of its own vocabulary (`tribunal|inquiry|hearing|summons|convene|
procedure|ruling|verdict|sentence|investigation|aftermath|consequences|recriminations`) inside the
three fields it actually scans (`tactical_move`, `state_change`/event, `forces_choice`). The word
"ruling" — which WOULD have satisfied it — appears in the reply, but in
`state_change_precondition` and `event_slots.exit_state`, two fields this particular regex pass
never reads.

**4-7. Not reached.** No author call, no prose, no continuity/LI-presence/end-choice evidence.

## Root cause (diagnosed, not fixed — no fix authorized this pass)

The generic aftermath-vocabulary check and the newer, lane-specific signal check are two
independent, ANDed gates — a plan must satisfy both. For `family_accusation` (Boundary, tested in
retries 12/13/14/15), this never surfaced as an issue because that lane's real content naturally
uses words the generic list already covers ("demands," implicitly "accus-"). `julian_jurisdiction_
challenge` is the first lane whose natural vocabulary ("jurisdiction," "challenge," "contest") only
partially overlaps the generic list, and the model — correctly instantiating the lane — happened to
place its one generic-list-matching word ("ruling") in a field outside the three the generic check
scans. This is a genuine, narrow, previously-latent gap between two gate mechanisms built at
different points this session, not a content-quality problem and not a regression from the
`--slot` parameterization or the card-click fix (both proven inert on architecture, confirmed here:
the actor/lane resolution worked exactly as designed).

## Cost

$0.0104359 spent (1 physical request of 8 allowed), well under the $0.45 ceiling.

## Artifacts

- `_scene2_repair_replay_sample_out/run_1789980064246.jsonl` — full raw request/response log.
- `report_reversal.json`, `console_tail_reversal.txt`, `partial_tracked_calls_reversal.json` — this
  run's outputs, written directly to their own slot-suffixed filenames by the newly parameterized
  script (confirmed via `git status`: none of the fixed-name fixture files were touched at all —
  the parameterization fix worked exactly as designed on its first real use).

## Honest classification

This is a clean, well-isolated NEGATIVE result at the gate layer, not a content-quality finding —
the architecture (deterministic frame resolution, actor/pressure-source role assignment) worked
correctly for a lane genuinely different in shape from Boundary's. The blocker is a narrow tension
between two independently-built gate checks, now surfaced for the first time because this is the
first lane whose signal vocabulary doesn't happen to overlap the older, generic check's word list
in the fields it scans. Per Roman's explicit stop condition, Temptation is not run this pass.

## Status

Reversal did not pass cleanly. Stopping before Temptation, per standing instruction. No follow-up
retry within this card. Report written and committed.
