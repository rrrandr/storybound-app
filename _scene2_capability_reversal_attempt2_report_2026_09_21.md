# Scene 2 Capability Sample: Reversal, Attempt 2 (2026-09-21, after the gate-seam fix)

Authorized scope: re-run Reversal under the corrected `_detectPlannerFunctionGap`, second of the
two-card branch plan, `--slot=reversal`, all standing gates/fixes active, $0.45/8-request ceiling,
no follow-up retry within this card. Supersedes nothing — Attempt 1
(`_scene2_capability_reversal_report_2026_09_21.md`) is preserved as the honest original record of
the gate-seam finding; this is a fresh, separately-authorized draw.

## Result: FULL SUCCESS — the gate-seam fix held, and the harder LI-centering question was answered well

Real cost: **$0.133368** (4 physical requests: planner, author, and two real post-processing
calls — all correctly tracked in-memory this run; `reconciledFromLog: false`, the reconciliation
safety net wasn't even needed). The author ran and produced a full 35-beat scene.

## Evaluation against the six authorized questions

**1. Objective actor should be Julian.** Yes: `"local_objective_actor": "Julian"`.

**2. Chosen aftermath lane should be `julian_jurisdiction_challenge`.** Yes, exactly.

**3. Lane content should instantiate jurisdiction/procedure/consequence in the full planner
contract.** Yes, and spread exactly where Attempt 1 revealed the gap: `tactical_move` — "Julian
publicly seizes jurisdiction over the accusation"; `state_change_precondition` — "Julian has not
yet challenged the Dohkar's authority to rule on Lirael's conduct"; `event_slots.exit_state` —
"Julian now holds authority to rule on Lirael's conduct"; `aftermath_obligations` — "leaving
Lirael's Dohkar qualification under new institutional scrutiny." This is direct, real confirmation
that the widened scan is reading exactly the fields it was built to read — not a coincidence of a
differently-worded draw.

**4. Corrected generic aftermath scan should no longer false-reject valid content.** Confirmed
empirically, not just by the dry control: the plan passed on the first real draw this run, and the
author actually ran.

**5. If author runs, Julian may drive the scene, but Lirael must remain the player-centered point
of experience.** Yes — this is the most interesting real finding of the sample. Every beat is
filtered through Lirael's own first-person sensory/emotional experience: "The Answer rests heavy
in my hands," "I feel every gaze," "My mouth-band lies torn at my feet," "I stand exposed," "I
almost speak. / The words stay behind my teeth." Julian and the presiding Dohkar carry the
EXTERNAL plot — a real three-way institutional contest, Julian claiming jurisdiction
("As Provast, I claim jurisdiction") against the Dohkar's resistance ("This is not your place,
Provast" / "You overstep") — but Lirael is never reduced to a bystander: she is the one whose body
and breath the reader inhabits throughout, and the scene's own closing beat makes her authorship
explicit: "Julian's gaze finds mine. / **The choice remains mine alone.**" Julian drives pressure;
Lirael still owns the decision. This directly answers the inversion risk Roman named going in.

**6. Continuity/canon/OAS history preserved; real end choice.** Yes. Mouth-band torn (referenced
twice, wardrobe and a direct beat), The Answer held, no reserved id touched (`price_identified`,
`inquiry_opened`, `julian_counter_wish`, `julian_obscuring_wishes` all correctly `"untouched"` and
never named in the beats). The scene draws a real, non-contradictory distinction rather than
reversing established canon: Julian's own line — "The rite is yours. The ruling on her conduct is
mine." — claims jurisdiction over the RULING specifically, leaving the Dohkar's established
rite-authority (`inquiry_authority_claimed`) intact while adding a genuine new institutional
complication. Real end choice: `decisionGateBeatIdx: 34`, branch_a (claim openly) vs branch_b
(stay silent), matching the row's own `decision_axis`.

## One minor, honestly-noted craft observation

Julian's dialogue lines are attributed to `"speaker": "li"` (the schema's generic love-interest
role token, matching `li_position`/`li_expression`/`li_wardrobe` elsewhere in the same reply) —
consistent with how "protagonist" is used for Lirael throughout the same document, and distinct
from how Seren/the presiding Dohkar are named literally (they're fixed side characters, not the
two per-story role slots). This appears to be the schema's normal, expected convention rather than
an error — this is simply the first sample where the LI role slot actually produced dialogue at
all (retries 13 and 15 never gave Julian a line), so it's the first time this convention could even
be observed in practice.

## Cost

$0.133368 spent (4 physical requests of 8 allowed), well under the $0.45 ceiling.

## Artifacts

- `_scene2_repair_replay_sample_out/run_1789981507927.jsonl` — full raw request/response log for
  this (second) attempt.
- `report_reversal.json`, `scene2_raw_response_reversal.txt` — this attempt's outputs, written by
  the parameterized script directly to the slot-suffixed filenames (no fixed-name fixtures
  touched). Attempt 1's summary files were preserved beforehand as
  `report_reversal_attempt1.json`/`console_tail_reversal_attempt1.txt`/
  `partial_tracked_calls_reversal_attempt1.json` — the first attempt's record is not lost.

## Honest classification

A clean, full success — architecture, gate-seam fix, and the harder "LI drives pressure without
erasing the player" romance-craft question all held together on one real draw. This is now the
THIRD real sample this session (after Boundary/retry 13, Boundary/retry 15) to reach a captured,
canon-consistent, well-ended scene, and the first to test a lane where the LI himself is the
structural actor. One sample, not proof of reliability across further draws of this same lane —
but a genuinely positive, informative one.

## Status — proceeding to Temptation

Per the standing two-card authorization ("If Reversal reaches author and is clean, proceed to
Temptation under this same authorization"), Reversal is clean. Temptation is now authorized to
run next, under the same scope, ceiling, and no-follow-up-retry discipline.
