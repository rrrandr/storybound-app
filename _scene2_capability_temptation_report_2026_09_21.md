# Scene 2 Capability Sample: Temptation (2026-09-21)

Authorized scope: Temptation card as the second of the two-card branch plan
(`_scene2_four_card_branch_authorization_2026_09_21.md`), run because Reversal reached author and
was clean, `--slot=temptation`, all standing gates/fixes active (including the just-committed
gate-seam widening), $0.45/8-request ceiling, no follow-up retry within this card.

## Result: genuine content-level rejection — the gate worked correctly this time, NOT a repeat of the Reversal gate seam

Real cost: $0.0104284 (1 physical request). The author never ran. Unlike Attempt 1 of Reversal,
this is **not** a false rejection from an unread field — both the (now-widened) generic scan and
the lane-content check independently found no real signal anywhere in the accepted contract,
including the newly-added fields.

## Evaluation

**1-2. Objective actor / lane.** Correct: `local_objective_actor: "Lirael"`,
`chosen_aftermath_lane: "lirael_defensive_path"` — matching the documented role assignment for
this card exactly.

**3. Did the plan instantiate the lane's content?** No. The proposed `state_change`: "Lirael opens
her mouth to name the true reason then closes it." This is genuinely thin — an internal,
non-committal gesture, not a concrete defensive action (submitting to procedure, gathering proof,
concealing something specific, moving toward flight, counter-accusing, or forcing a procedural
bind — the lane's own menu of real actions). The reply's own `tactical_move` uses the word
"concealment" ("staging Lirael's first internal weighing of concealment under assembly
pressure") — close to, but not the same word as, the lane's `signalRx` vocabulary
(`conceal`/`conceals`, not `concealment`) — a narrow regex-stemming gap worth flagging honestly,
but not the primary issue: even reading generously, "opens her mouth then closes it" describes
hesitation, not a landed defensive action. This is the specific risk Roman named going in:
"Temptation... has no family/institution pressure safety net... The scene must still move
aftermath forward rather than becoming pure flirtation or mood." On this draw, it leaned toward
mood.

**4. Did the corrected generic scan avoid a FALSE rejection?** Yes — confirmed by inspecting every
newly-added field (`state_change_precondition`, `event_slots.action`/`exit_state`,
`aftermath_obligations`) directly: none contain any of the generic check's vocabulary
(`tribunal|inquiry|hearing|summons|convene|procedure|ruling|verdict|sentence|investigation|
aftermath|consequences|recriminations`) either. This is a real absence of signal across the WHOLE
widened contract, not a repeat of the Reversal gate seam (where real signal existed but sat in an
unread field). The fix committed this session is doing exactly its intended job here: reading
everything, and correctly finding nothing.

**5-6. Not reached.** The author never ran; no prose, no continuity/LI-presence/end-choice
evidence.

## A narrow, honestly-noted regex observation (not actioned this pass)

`tactical_move` contains "concealment" (a noun); the lane's `signalRx` only matches
`conceal`/`conceals` (verb forms), the same class of stemming gap found earlier this session
("procedural" vs "procedure"). Whether widening the regex to also catch "concealment" would have
changed this specific outcome is genuinely unclear — even granting that match, the underlying
`state_change` itself ("opens her mouth... then closes it") is still a hesitation beat, not a
landed action. Not fixed here — no dry work beyond running and reporting was authorized this pass.

## Cost

$0.0104284 spent (1 physical request of 8 allowed), well under the $0.45 ceiling.

## Artifacts

- `_scene2_repair_replay_sample_out/run_1789981747565.jsonl` — full raw request/response log.
- `report_temptation.json`, `console_tail_temptation.txt`, `partial_tracked_calls_temptation.json`
  — written directly to their own slot-suffixed filenames; no fixed-name fixtures touched.

## Honest classification

A clean, informative negative result — the gate-seam fix is confirmed working correctly in BOTH
directions now: it let a genuinely-instantiated plan through on Reversal's real content, and it
correctly rejected a plan whose content stayed thin on Temptation's. This validates the fix did
not become overly permissive. The finding matches Roman's own stated risk for this specific card:
without institutional or family pressure to lean on, the model's first real draw produced mood/
hesitation rather than a landed defensive action.

## Status

Per the two-card authorization's stop condition ("If [a card] fails structurally, stop... and
report"), this session's two-card branch plan concludes here: **Reversal clean, Temptation not
clean.** No follow-up retry within Temptation. Silence and confession remain untested and
unauthorized.
