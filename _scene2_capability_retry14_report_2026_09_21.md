# Scene 2 Capability Retry #14 (2026-09-21, quality retry after LI presence floor)

Authorized scope: same Boundary input, deterministic event-frame resolver active (Boundary →
`family_accusation`), LI PRESENCE FLOOR directive active in the CG author prompt, no hard-reject
on LI-presence telemetry (none exists — that was correctly not built), all standing gates active,
$0.45/8-request ceiling, no follow-up retry on failure.

## Result: architecture held again, but a DIFFERENT, narrower structural rejection blocked the author before LI presence could even be tested

Real cost: $0.0082157 (2 physical requests). Both real planner attempts were rejected by the
OLDER, pre-existing `_validateLocalObjective` structural check — **not** by the Planner Function
Gate, **not** by anything related to LI presence, and **not** a repeat of any prior finding.

Both attempts (read verbatim from the persisted log):

- **Attempt 1**: `local_objective_actor: "Seren's family"` — rejected: this string is neither an
  individual roster member (Lirael/Seren/Julian/the presiding Dohkar) nor the row's one declared
  collective (`"the assembly"`) — the model spontaneously invented an undeclared collective label.
- **Attempt 2**: `local_objective_actor: "the assembly"` — rejected, console-confirmed:
  `"local_objective_actor is a collective presence, not an individual cast member: the assembly"`
  — this IS the row's declared collective, but `_validateLocalObjective` explicitly forbids any
  collective from being the actor, by design (collectives supply pressure/reaction, never agency).

Both attempts otherwise instantiated the resolved frame closely and consistently:
`state_change: "Seren's family steps out of the assembly and publicly demands remedy for what
the wish cost Seren."` — near-identical to retry 13's accepted plan and to the authored
`eventFrameBySlot.boundary` text. `chosen_aftermath_lane: "family_accusation"` both times.
Reserved/aftermath schema again fully correct both times (4/4, 4/4) — fourth consecutive
confirmation of that fix.

## Root cause (diagnosed, not yet fixed — no fix authorized this pass)

Retry 13's accepted plan set `local_objective_actor: "Lirael"` — attributing the scene's local
objective to Lirael's own agency (her open want draws the family forward), which satisfies the
individual-actor rule even though the event's grammatical subject is the family. Retry 14's two
attempts instead named the family/assembly directly as the actor — a more literal, and here
invalid, reading of "whose concrete act this scene exists to land." This is a genuine, narrow
tension between the `family_accusation` lane's own natural grammar (a GROUP acts) and the
pre-existing structural rule that `local_objective_actor` must be one individual roster member —
not something the event-frame resolver, the aftermath lane work, or the LI presence floor change
created; it is a previously-latent gap in how the OPEN ROW schema instructs the model to resolve
group-driven lanes, surfaced for the first time because this is the first lane whose natural actor
is a group. **Not fixed in this pass** — no dry work was authorized here beyond running and
reporting.

## Evaluation against the five authorized questions

**1. Does the planner still instantiate the Boundary → `family_accusation` frame?** Yes, both
times, consistently and closely — this part of the architecture held on a third real draw.

**2. Does the author preserve the successful aftermath/procedure/fallout structure?** Not
reachable — the author never ran.

**3-4. Does Julian get at least one meaningful moment... without hijacking the scene?** Not
reachable — no prose was generated, so the LI PRESENCE FLOOR directive was never actually tested
against a real completion this run.

**5. Does the scene preserve continuity/canon/OAS history and end with a real player choice?** Not
reachable.

## Cost

$0.0082157 spent (2 physical requests of 8 allowed), well under the $0.45 ceiling.

## Artifacts

- `_scene2_repair_replay_sample_out/run_1789973412781.jsonl` — full raw request/response log.
- `report_retry14.json`, `console_tail_retry14.txt`, `partial_tracked_calls_retry14.json` — this
  run's outputs under distinct filenames. Fixed-name fixture files confirmed clean via
  `git status` before the run, restored via `git checkout --` immediately after (verified clean
  again).

## Honest classification

This is not a regression from the LI presence floor change — that directive lives in
`_buildCGScreenplayUserPrompt` (the author's prompt), which this run never reached; the planner's
own prompt construction is untouched by that fix. It is a newly-surfaced, narrow finding: the
`family_accusation` lane's own natural grammar (a group acting) sits in tension with the
pre-existing individual-actor rule, and the model resolves that tension inconsistently across
draws — correctly on retry 13, incorrectly (in two different ways) on retry 14. This is now two
real samples on the SAME resolved frame with different `local_objective_actor` outcomes: one data
point of success, two of this specific failure mode. Not enough to call it a stable pattern, but a
real, well-isolated candidate for a future dry prompt fix (an explicit worked note near the OPEN
ROW schema instructions, showing that a group-driven lane still needs an INDIVIDUAL
`local_objective_actor` whose own agency drives it — mirroring retry 13's own accepted shape) —
not implemented here, per scope.

## Status

No follow-up retry run, per standing instruction. Report written and committed. Stopping here.
