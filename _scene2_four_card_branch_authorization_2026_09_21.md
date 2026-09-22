# Four-Card Branch Capability Authorization Sheet (2026-09-21)

Roman, after retry 15 and the harness fix: "My recommendation: test the other four Fate-card
frames before images... Boundary already taught us that a single card path can hide a lot of
branch-specific failure modes: bad lane selection, actor/pressure confusion, weak LI presence,
canon leakage... I'd do four branch capability samples first, one each, with strict
no-followup-retry discipline." This is a **planning document only** — no provider calls, no image
calls, no story retries. Produced, committed, and stopped for separate authorization per Roman's
explicit instruction.

## Why this is needed

Retry 15 is one clean sample on ONE of five fate-card frames (Boundary → `family_accusation`).
Four other frames exist, each resolving to a different lane with different role assignments, none
tested live:

| Card | Resolved lane | `objectiveActor` | `pressureSource` | Event frame (verbatim, `public/app.js`) |
|---|---|---|---|---|
| `temptation` | `lirael_defensive_path` | Lirael | *(none)* | "Lirael is tempted toward concealment: she catches herself weighing whether to let Julian's version of the accusation stand unchallenged rather than name what actually happened — a real choice to conceal or reveal something specific, not another round of the Dohkar's question about whether she shaped the wish." |
| `silence` | `dohkar_preliminary_review` | the presiding Dohkar | *(none)* | "The charged silence after Julian's public claim is what prompts the presiding Dohkar to break it procedurally: he sets a preliminary review date and names its terms before the assembly disperses, moving the confrontation off the ritual floor and into procedure." |
| `reversal` | `julian_jurisdiction_challenge` | Julian | *(none)* | "Someone seizes control of who gets to rule here: Julian challenges the presiding Dohkar's jurisdiction, reframing the accusation as his own to answer rather than Lirael's — a real jurisdictional contest over authority, not another question put to Lirael." |
| `confession` | `dohkar_preliminary_review` | the presiding Dohkar | *(none)* | "Julian's own confession destabilizes his position as accuser — the presiding Dohkar reacts to that shift by setting formal terms and a date for review rather than letting the interrogation continue informally." |
| `boundary` (done) | `family_accusation` | Lirael | Seren's family | tested live, retry 15 — succeeded |

Two of the four untested cards (`silence`, `confession`) share a lane with each other but not with
Boundary — a real, different test of whether `dohkar_preliminary_review`'s own signal/role
guidance holds up on two independent draws. `reversal` is the only lane where **Julian himself** is
the `objectiveActor` — a materially different test of the LI PRESENCE FLOOR directive (Julian
driving the scene's own objective, not just present with a restrained moment) and of whether the
actor/pressure-source prompt correctly omits `pressure_source` guidance when a lane has none.
`temptation` is the only lane where Lirael is the actor with no institutional or family pressure at
all — a concealment/interiority-driven frame, structurally the thinnest test of "aftermath movement"
since it turns on a private choice rather than a public confrontation.

## Mechanism

`_scene2_repair_replay_sample.mjs` currently hardcodes the Boundary slot
(`page.click('#gnCardMount [data-fate-card-slot="boundary"]')`, line ~272) and a fixed
`REAL_SAY`/`REAL_DO` pair. The OAS turn-reply and Fate-Card-batch phases (0-2) are replayed from
the SAME already-paid 2026-09-19 log for every card — that log's Fate-Card batch response covers
all 5 slots in one generation, so no new OAS/Fate-Card spend is needed for any of the four new
cards; `REAL_SAY`/`REAL_DO` (the player's OAS dialogue, which precedes and is independent of which
card is later selected) are also reused unchanged across all 5.

**Planned mechanism (not yet built — a dry, zero-cost prep step once this sheet is authorized):**
parameterize the existing script to accept a target card slot (e.g.
`node _scene2_repair_replay_sample.mjs --slot=temptation`, defaulting to `boundary` for backward
compatibility with every existing invocation and committed report referencing it), rather than
forking four near-duplicate scripts that could drift out of sync with future harness fixes (like
the correlation/reconciliation fix just committed). One canonical script, one place to fix bugs.

## Per-card expected request path

Same pipeline shape for every card, since none of this session's fixes are card-specific:

1. **Planner** (`/api/proxy` or fallback tier, ≤1200 max_tokens): Grok primary → ministral-8b-2512
   fallback → gpt-4o terminal (unchanged 3-tier chain). Prompt carries that card's resolved
   REQUIRED EVENT FRAME + actor/pressure-source guidance (or none, for the 3 cards with no
   `pressureSource`) + the reserved/aftermath schema block + LI PRESENCE FLOOR (author-prompt side
   only, not the planner's).
2. **Gate check** (`_validateLocalObjective` then the Planner Function Gate, including the
   resolved-lane check): reject-only, zero additional spend if it rejects. One bounded retry
   (reuses the cached objective, no second real planner draw) if the FIRST plan is rejected, then
   stops resumable if the retry is also rejected — same machinery proven across retries 5-14.
3. **If accepted → Author** (`/api/proxy`, max_tokens 8000): the real scene-generation call.
4. **If the author settles → post-processing** (speaker/casting/structural validation — 0 to ~5
   further real calls, per the observed range: retry 15 had 2 post-processing calls totaling
   $0.0406, retry 13 had 6 totaling ~$0.134). No image calls in any of this — confirmed by the
   script's own design (Phase 3 is the only real-lane phase; no image provider is ever
   allow-listed).

Historical real-cost range this pipeline has actually produced (all real samples this session,
same architecture): **gate-rejected, no author** ≈ $0.008–$0.011 (retries 11, 12, 14 — one or two
planner calls only); **author reached, full success** ≈ $0.096–$0.136 (retries 13, 15).

## Per-card evaluation (the seven questions, applied to each card)

1. Did the deterministic resolver select that card's own correct lane (per the table above)?
2. Is `objectiveActor`/`pressureSource` valid — an individual for the actor, never a collective,
   and (for `silence`/`reversal`/`confession`/`temptation`, which have no `pressureSource`) no
   spurious pressure-source invented where none belongs?
3. Do both gates (`_validateLocalObjective`, Planner Function Gate incl. the lane-content check)
   pass for substantive reasons — real content matching the resolved frame, not just a satisfied
   label?
4. If the plan is valid, does the author actually reach and produce prose?
5. Is continuity/canon/OAS history preserved (mouth-band, The Answer, the Dohkar's claimed
   authority, no reserved id touched)?
6. Is Julian's presence meaningful without hijacking — especially load-bearing for `reversal`,
   where Julian IS the objective actor (a different question there: does HE get to drive the scene
   without Lirael disappearing, the inverse of Boundary's concern)?
7. Does the scene end on a real player pressure/choice, consistent with the row's own
   `decision_axis`?

## Ceilings

Reusing the SAME, already-proven per-run shape (`PHASE_CEILINGS_USD`, `COMBINED_CEILING_USD`,
`PHYSICAL_REQUEST_CEILING` in `_scene2_repair_replay_sample.mjs`) — **unchanged**, applied
independently per card:

- Per-card ceiling: **$0.45 combined** (`scene2-planner: $0.05`, `scene2-author: $0.40`), **8
  physical requests**.
- **Combined worst-case across all 4 cards: $1.80 / 32 physical requests** — the true sum only if
  every card independently maxes out its own ceiling, which no real sample has ever done.
- **Realistic expected combined cost**, based on the actual observed range above: roughly
  $0.03–$0.55 for all 4 cards together (low end: all 4 gate-rejected like retries 11/12/14; high
  end: all 4 reach the author like retries 13/15) — stated as a planning estimate, not a promise;
  each card's real total will be reported honestly regardless of which end it lands near.

## Stop conditions

- **No follow-up retry within a card** if that card's one authorized real attempt fails (gate
  rejection, author-unsettled, or any infra fault) — identical to the standing rule already
  applied to every retry 5-15.
- **Each card is its own separately-authorized run** — this sheet is NOT itself an authorization
  to run any of the four; Roman decides after reading it whether to authorize all four, one at a
  time, or none. No card runs without its own explicit "authorize one Scene 2 capability retry
  for card X" message, matching the standing per-retry authorization discipline.
- **Pause and report immediately, do not proceed to the next card, if**: (a) any infra-class
  fault recurs (a 502 pattern, a `spawn EBADF`-style local fault, a harness discrepancy the new
  correlation/reconciliation fix doesn't resolve); (b) a card's real sample reveals a NEW
  structural or gate defect (as opposed to a content-quality note) — that gets its own dry-fix
  pass, exactly as retries 12/14 did, before any further card is attempted.
- **Combined-spend checkpoint (suggested, not a hard rule)**: after either 2 cards or $0.50
  cumulative real spend, whichever comes first, pause and report a running summary before
  continuing — gives Roman a natural checkpoint without requiring a hard stop.

## How costs will be reported

Using the now-fixed, dual-layer accounting (object-identity correlation in `_e2e_network_gate.mjs`
+ persisted-log reconciliation in `_scene2_repair_replay_sample.mjs`, both proven
11/11): each card's run produces its own `report.json` (via the script's normal write path) whose
`runningCostUsd` is now trustworthy without manual recovery. Each card gets its own capability
report (`_scene2_capability_<card>_report_2026_09_21.md`, mirroring every retry report this
session) stating real cost, real request count, and the seven-question evaluation. The
authorization sheet (this file, or `_scene2_continuation_capability_retry_authorization_2026_09_20.md`
via a new addendum) gets one addendum per card, same pattern as retries 10-15.

## Where artifacts will be saved

Same directory, `_scene2_repair_replay_sample_out/`, with the SAME fixed-name-file protection
discipline already established for every retry (`report.json`, `console_tail.txt`,
`partial_tracked_calls.json`, `scene2_raw_response.txt` are existing committed red fixtures for
prior dry controls — `git status` confirmed clean before every real run, extracted to a
uniquely-named file immediately after, restored via `git checkout --`, re-confirmed clean).
**New per-card naming convention** (distinct from the `_retryN` suffix used for sequential
Boundary attempts, since these four are organized by CARD, not by retry sequence):
`report_<card>.json`, `console_tail_<card>.txt`, `partial_tracked_calls_<card>.json`,
`scene2_raw_response_<card>.txt` (e.g. `report_temptation.json`) — plus the run's own uniquely
timestamped `run_<epoch>.jsonl`, which never collides with anything.

## What is NOT authorized by this sheet

- No provider or image calls of any kind.
- No card is run without its own separate, explicit authorization message.
- No change to `_validateLocalObjective`, the Planner Function Gate's core logic, or any lane's
  `objectiveActor`/`pressureSource`/`signalRx` — this pass tests the EXISTING, already-built
  architecture against four new inputs; it does not modify it.
- No image-pipeline work of any kind — that remains a separate, later decision per Roman's own
  framing ("Not all today if you're tired... I'd prove the branch system before spending image
  money").

## Status

Planning document only, as committed. Superseded by execution below — Roman authorized Reversal
first, then Temptation only if Reversal was clean.

## Addendum — Reversal run (2026-09-21)

Prep (`--slot` parameterization + card-click reliability fix) built, dry-proven 23/23
(`_scene2_repair_replay_sample_slot_param_control.mjs`), and committed before any live call, per
instruction. Reversal then run as its own isolated live sample: $0.0104359, 1 physical request.
`local_objective_actor: "Julian"` and `chosen_aftermath_lane: "julian_jurisdiction_challenge"`
both resolved correctly — the architecture worked. The plan was rejected by the Planner Function
Gate's older, generic aftermath-vocabulary check (independent of the newer, lane-specific check,
which DID pass) — a genuine, narrow, previously-latent gap between two gate mechanisms, not a
content-quality problem. Full account: `_scene2_capability_reversal_report_2026_09_21.md`.

**Per the explicit stop condition ("If Reversal fails structurally, stop before Temptation and
report"), Temptation is NOT run this pass.** No follow-up retry within Reversal, per standing
instruction.

## Addendum — gate seam dry-fix (2026-09-21)

Roman, after reviewing Reversal: "This sounds like a stale generic check is now fighting the more
precise lane system... it needs to be aware of the richer schema." Diagnosed as a genuine gate
blind spot, not a Reversal content failure — see `_scene2_gate_seam_widened_scan_trace_2026_09_21.md`
for the full trace. `_detectPlannerFunctionGap`'s older, generic aftermath-vocabulary check now
also reads `state_change_precondition`, `event_slots.action`/`exit_state`, and
`aftermath_obligations` (newly carried into `stateChange` — it was requested in the schema but
never parsed before this fix) — deliberately EXCLUDING `chosen_aftermath_lane` (an id, not prose)
and `scene_function_instantiated` (the documented real gaming vector from retry 11). The
lane-content check and posture-echo check are completely unchanged. Proven 7/7,
`_scene2_gate_seam_widened_scan_control.mjs` — using Reversal's own real reply as the GREEN
fixture (no longer rejected), retry 11's real reply as a no-regression RED fixture, and two
synthetic adversarial fixtures proving the old check's "label only, no content" protection
survives the widening.

**Status**: dry fix only, no branch retry run. Reversal may now be retried or the fixed gate
otherwise revalidated live — not yet done, pending separate authorization. Temptation remains
paused until Reversal is confirmed clean under the corrected gate.

## Addendum — Reversal re-run, clean (2026-09-21)

Reversal run again under the corrected gate: $0.133368, 4 real calls, author reached and
produced a full scene. `local_objective_actor: "Julian"`, `chosen_aftermath_lane:
"julian_jurisdiction_challenge"` both correct; the plan's consequence language (spread across
`tactical_move`/`state_change_precondition`/`event_slots.exit_state`/`aftermath_obligations`,
exactly the fields the gate-seam fix added) passed the corrected generic scan on the first real
draw. Julian drove the scene's external institutional contest while Lirael's first-person
POV/interiority remained the throughline, closing on her own agency ("The choice remains mine
alone"). Continuity/canon preserved, no reserved id touched, real end choice. Full account:
`_scene2_capability_reversal_attempt2_report_2026_09_21.md`.

**Reversal is clean. Per the standing two-card authorization, proceeding to Temptation next.**

## Addendum — Temptation, not clean; two-card plan concludes (2026-09-21)

Temptation run once: $0.0104284, 1 real call, author never ran. `local_objective_actor: "Lirael"`
and `chosen_aftermath_lane: "lirael_defensive_path"` both correct, but the proposed content
("Lirael opens her mouth to name the true reason then closes it") stayed genuinely thin — a
hesitation beat, not a landed defensive action. Both the widened generic scan and the unchanged
lane-content check correctly found no real signal anywhere in the full contract — a GENUINE
content-level rejection, not a repeat of Reversal's gate-seam finding (confirmed by direct
inspection of every newly-added field; none contain the generic check's vocabulary either). One
narrow regex-stemming observation noted (`"concealment"` vs the lane's `conceal`/`conceals`
pattern) but not actioned. Full account: `_scene2_capability_temptation_report_2026_09_21.md`.

**Per the two-card plan's stop condition, this concludes it: Reversal clean, Temptation not
clean.** No follow-up retry within Temptation. Silence and confession remain untested and
unauthorized — the original four-card plan's third and fourth cards.

## Addendum — `lirael_defensive_path` lane-semantics dry-fix (2026-09-21)

Roman: "The lane needs to require a landed defensive move... 'Opens her mouth and closes it' is
not a move." Diagnosed as a genuine lane-semantics weakness (not harness/gate-seam) — see
`_scene2_lirael_defensive_path_lane_semantics_trace_2026_09_21.md` for the full trace, including a
real near-miss caught while building the "concealment" stemming fix (a naive widening would have
made the lane wrongly accept Temptation's own real "weighing of concealment" phrasing — fixed to
require active-voice context instead). The `temptation` slot's event frame and the lane's own
label/`signalRx` now explicitly require a landed, external, observable action; hesitation,
silence, and "almost speaking then stopping" are explicitly ruled out. Boundary's and Reversal's
lanes are completely untouched. Proven 12/12,
`_scene2_lirael_defensive_path_lane_semantics_control.mjs`, plus four directly-affected
pre-existing controls re-verified individually with zero regressions
(`_scene2_aftermath_lane_control.mjs` 22/22, `_scene2_event_frame_resolver_control.mjs` 26/26,
`_scene2_gate_seam_widened_scan_control.mjs` 7/7, `_scene2_planner_function_gate_control.mjs`
10/10).

**Status**: dry fix only, no branch retry run. Temptation may now be retried under the fixed lane
— not yet done, pending separate authorization. Silence and confession remain untested and
unauthorized. No image work of any kind.

## Addendum — Temptation retry 2: fix worked on content, blocked by a narrower vocabulary gap (2026-09-21)

Temptation run again under the fixed lane: $0.01100215, 1 real call, author never ran. Genuinely
different result from Attempt 1 — `local_objective_actor: "Lirael"`, `chosen_aftermath_lane:
"lirael_defensive_path"` both correct, and the actual content was a real landed action this time:
"Lirael folds the torn mouth-band into her sash without naming what she lost" — a concrete,
specific, external, observable defensive move, not hesitation. The `hesitationRx` diagnostic
correctly did not fire. It was blocked by a narrower, different limitation: the lane's fixed
vocabulary list doesn't cover "executes... concealment" (an unlisted verb) or the natural-prose
mouth-band action itself (which never uses the literal word "conceal"). Two candidate fixes noted
for a future pass (widen the verb whitelist; extend the lane-content check to also read
`event_slots.action`, mirroring the generic-check widening) — neither actioned this pass. Full
account: `_scene2_capability_temptation_attempt2_report_2026_09_21.md`.

**Per the standing "no follow-up retries if it fails" rule, this concludes the Temptation retry.**
No further retry on Temptation, Silence, or Confession. Images remain untouched.

## Addendum — lane-check field-widening dry-fix (2026-09-21)

Roman: "That's not a story failure. That's the gate being too lexical again... fix the gate, dry,
exactly like Reversal: inspect the full planner contract, especially `event_slots.action`, and
accept concrete action evidence when the prose itself instantiates the lane." Actioned the two
candidate fixes noted (but not run) in the retry-2 addendum above, plus a second, independent gap
found while proving the fix against the real sample: the generic aftermath-vocabulary check ALSO
missed this exact real content on a separate stemming gap ("procedural" vs "procedure"). Both
fixed. Full diagnosis and fix: the addendum to
`_scene2_lirael_defensive_path_lane_semantics_trace_2026_09_21.md`. Classification note added to
`_scene2_capability_temptation_attempt2_report_2026_09_21.md`. Proven 16/16 (updated
`_scene2_lirael_defensive_path_lane_semantics_control.mjs`, including a new GREEN fixture built
from Temptation attempt 2's own real reply, and dedicated fixtures proving the "executes" and
"without naming what" conditional-corroboration/silence-guard logic each hold their anti-gaming
line). Four directly-affected pre-existing controls re-verified individually with zero real
regressions (`_scene2_aftermath_lane_control.mjs` 22/22, `_scene2_event_frame_resolver_control.mjs`
26/26, `_scene2_gate_seam_widened_scan_control.mjs` 7/7 after fixing one fixture whose filler text
had accidentally become a true positive under the new stemming, `_scene2_planner_function_gate_control.mjs`
10/10).

**Status**: dry fix only. **Temptation may now be retried or revalidated under the fixed gate** —
not yet done, pending separate authorization, per "Do not retry Temptation yet." Silence and
Confession remain untested and unauthorized. No image work of any kind.

## Addendum — Temptation retry 3: corrected gate still rejected, on a third phrasing gap plus an unrelated posture-echo false positive (2026-09-21)

Temptation run again under the field-widened gate: $0.00500405, 1 real call, author never ran.
Real cost + a genuinely different draw again — not hesitation, not the mouth-band. The model chose
an active false public statement ("Lirael tells the assembly the wish tested her alignment only")
as its defensive move. Rejected on three joined reasons: the GENERIC check (real absence of
vocabulary in this draw's own contract — a legitimate finding), the LANE-content check (deception
phrasing matched none of the existing patterns — a new gate gap), and the posture-echo check (fired
on the common two-word bigram "let the" — a separate, pre-existing, previously-untouched check).
Full account: `_scene2_capability_temptation_attempt3_report_2026_09_21.md`.

## Addendum — deception + posture-echo-length dry-fix (2026-09-21)

Roman: "Temptation is telling us something useful now... it's finding plausible defensive moves,
but the gate is still too phrase-driven to recognize the variety... 'gives a false public account'
is a legitimate defensive/concealment action... A two-word overlap made of common words should
never block a plan." Two fixes:
1. `lirael_defensive_path` gains `deceptionRx` (false-account/lies-to/deceives/misleads phrasing),
   trusted only when corroborated by a named public target, a described effect, and NOT
   intention-only phrasing ("decides to lie") — closing the same private-resolve risk as "weighing
   of concealment."
2. `_postureEchoBigram` now requires at least one word in a shared bigram to be 4+ characters before
   it can block a plan — "let the" no longer fires; Retry 5's real "burn for"/"to burn" true
   positive is unaffected.

Full diagnosis and fix: the second addendum to
`_scene2_lirael_defensive_path_lane_semantics_trace_2026_09_21.md`. Classification note added to
`_scene2_capability_temptation_attempt3_report_2026_09_21.md`, explicitly preserving the GENERIC
check's vocabulary-absence finding and the specificity diagnostic's thinness finding for this draw
as real, unfixed observations. Proven 21/21 (updated
`_scene2_lirael_defensive_path_lane_semantics_control.mjs`) and 16/16 (updated
`_scene2_required_scene_function_control.mjs`, new RED:ECHO-FALSE-POSITIVE section using retry 3's
real posture + planner text). Four directly-affected pre-existing controls re-verified individually
with zero regressions (`_scene2_aftermath_lane_control.mjs` 22/22,
`_scene2_event_frame_resolver_control.mjs` 26/26, `_scene2_gate_seam_widened_scan_control.mjs` 7/7,
`_scene2_planner_function_gate_control.mjs` 10/10).

**Status**: dry fix only. Temptation may now be retried or revalidated under the corrected gate —
not yet done, pending separate authorization. Silence and Confession remain untested and
unauthorized. No image work of any kind.

## Addendum — consequence-requirement fix: prompt + gate de-escalation (2026-09-21)

Roman: "another paid retry would still face the unresolved question: what actually changes because
Lirael makes her defensive move? ... missing 'tribunal' or 'procedure' vocabulary doesn't establish
that a scene failed to advance ... a shared bigram containing a four-letter word is not sufficient
proof ... Keep uncertain lexical signals diagnostic unless a stronger, independently supported
contract violation warrants rejection."

**Correction to the prior addendum**: the generic aftermath-vocabulary check's rejection of
Temptation attempt 3 was NOT a real, preserved finding as previously classified — it was ALSO a
gate false positive (the draw's aftermath_obligations/exit_state genuinely describe a rich,
three-party consequence, just not in the check's curated words).

Two fixes:
1. **Prompt**: inspecting all five `eventFrameBySlot` entries side by side showed four of five
   already bake in a reaction by construction (Dohkar sets a review; Julian challenges; family
   demands; Dohkar reacts to confession) — only `temptation`'s frame stopped at the gesture. A new,
   fully generic REQUIRED CONSEQUENCE prompt block (renders for any starter/scene using this
   mechanism, tied to the existing `sceneFunction`/`exitState` fields, no new canon, no tribunal
   requirement) now states this explicitly.
2. **Gates**: the generic vocabulary scan is demoted to diagnostic-only (exposed as
   `aftermathVocabPresent`, no longer gating); replaced by a structural floor (reject only if BOTH
   `aftermath_obligations` and `event_slots.exit_state` are completely empty — a schema-compliance
   fact, not a wording judgment). The posture-echo check now requires a 3+-word shared span to
   reject (a single 2-word match, even a "meaningful-length" one, is diagnostic only) — retry 5's
   real "to burn for" (3 words) still fires; a weaker 2-word overlap no longer can.

Verified directly against Roman's own framing: **NEW**
`_scene2_temptation_consequence_verification_control.mjs` (8/8) runs all three retained real
Temptation attempts through the production-shape gate together — attempt 1 (hesitation) remains
correctly inadequate; attempts 2 (mouth-band) and 3 (false account, the headline result) are BOTH
now accepted, attempt 3 with `aftermathVocabPresent: false` confirmed — plus two contrasting
synthetic fixtures proving "a concrete action without consequential movement remains inadequate"
and "a concrete action with consequential movement needs no special vocabulary." Full diagnosis:
`_scene2_consequence_requirement_trace_2026_09_21.md`. Classification note updated (again) on
`_scene2_capability_temptation_attempt3_report_2026_09_21.md`. Six other directly-affected controls
re-verified individually, zero real regressions (several fixtures needed a populated
`slots.exitState` added — a fixture update to match the new floor, not a behavior change, since
each fixture's own event text already implied the consequence its exitState now states
structurally): `_scene2_lirael_defensive_path_lane_semantics_control.mjs` (22/22),
`_scene2_gate_seam_widened_scan_control.mjs` (13/13, two new sections),
`_scene2_required_scene_function_control.mjs` (20/20, three new assertions),
`_scene2_aftermath_lane_control.mjs` (22/22), `_scene2_event_frame_resolver_control.mjs` (26/26),
`_scene2_planner_function_gate_control.mjs` (10/10).

**Status**: dry fix only. Temptation may now be retried or revalidated under the corrected gate +
prompt — not yet done, pending separate authorization. Silence and Confession remain untested and
unauthorized. No image work of any kind.

## Addendum — Temptation attempt 4: first full end-to-end draft, real cost $0.1449127 (2026-09-21)

Roman: "Now a full Temptation test is worthwhile... Treat gate acceptance as mechanical evidence
only... Do not repair or resample after this operation." Ran once. **The gate accepted the plan for
the first time and the author ran** — real landed defensive action (conceals the mouth-band),
genuine institutional escalation (the Dohkar's dialogue sharpens from procedural to direct demand),
correct forced-choice ending matching the seed's decision axis, continuity preserved. Honest
weakness found on independent evaluation (not a gate signal): Julian's engagement is passive
throughout — the reader's own chosen physical beat (holding his gaze) is not delivered — independently
corroborated by the pipeline's own separate "emotional gravity" auditor (`desire_verdict: "COLD"`).

A scope finding: one of the four physical calls ($0.0452025, ~31% of total cost) was an
**image-style-extraction** call via gpt-4o, outside this run's explicit "no image-style extraction"
authorization — the harness's real-path allowlist was not audited against that new clause before
running. No image was actually generated. Not repaired this pass, per "do not repair or resample" —
reported directly instead. Full account: `_scene2_capability_temptation_attempt4_report_2026_09_21.md`.
Full human read-through PDF generated automatically:
`~/Desktop/First_Sacrifice_Scene2_Temptation_Attempt4_ReadThrough.pdf`.

**Status**: this concludes the authorized Temptation run. No repair, no resample, no further
Temptation retry this pass. Silence, Confession, and images remain untouched and unauthorized.
