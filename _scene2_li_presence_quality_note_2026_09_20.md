# Scene 2 — LI Presence Quality Note (2026-09-20)

**Sample:** `_scene2_repair_replay_sample_out/run_1789884119160.jsonl` /
`scene2_raw_response.txt` — the real, paid Grok Scene 2 author response (`grok-4-1-fast-reasoning`,
authoritative cost `$0.0870534` from `usage.cost_in_usd_ticks`). Preserved unchanged; nothing in
this note or the accompanying control modifies it.

## Classification: a romance/CG craft failure, not a structural failure

Everything upstream of prose worked as designed: the planner's local objective was delivered, the
"the assembly" collective stayed background-only (never dialogue, never a named individual — the
2026-09-20 collective-presence repair holds in real output), and the scene lands on a real forced
choice with no opt-out branch. The planner→author handoff, the repaired token budget, and the
collective-presence rule are **not** implicated by this finding.

The failure is narrower and sits entirely in the author's prose layer: Julian, the load-bearing
love interest, is textually present but never textually *felt*.

## The finding

Julian is the grammatical subject of exactly 4 of the scene's 26 beats (idx 7, 11, 16, 22). All 4
use the same unanchored inert-negation/stillness template, and none carries an emotional,
sensory, or relational modifier:

```
[7]  Julian does not move.
[11] Julian's hands remain steady around the Answer.
[16] Julian does not speak.
[22] Julian's gaze does not waver.
```

That's 4/4 (100%) of his own beats rendered as pure negation. By contrast, the structured metadata
the SAME author call produced for him is not flat at all — `visualState.li_expression:
"intense_focused"` (declared once, never overridden, so it holds for the whole scene), and phase 2's
`other_postures.li: "standing apart, gaze on Lirael"` explicitly directs his attention at her. None
of that declared intensity or direction ever reaches the beat-level narration the reader actually
sees. The gap is specifically between what the schema says he's doing and what the prose says he's
doing — the beats describe the *absence* of motion, never the *presence* of feeling.

## What this is not

- Not a demand that Julian talk more. A controlled, silent, still Julian is a legitimate romantic
  register — restraint can be the point.
- Not a demand to remove negation phrasing outright — "does not move" paired with a felt anchor
  ("a leash he holds by will") is fine; the finding is about the repeated, *unanchored* form
  becoming his only register, not about any one line.

## Detector built (dry, telemetry-only)

`public/app.js`: `_detectLIPresenceDominance(screenplay, {liName, minBeats, dominanceThreshold})`
— never rewrites prose (a validator that rewrites is a competing author). Flags when a
named-LI-subject beat set is dominated (default ≥60%, minimum 3 beats) by unanchored
inert-negation/stillness forms. Scoped by construction to an individually-named LI — a collective
subject (the assembly, a crowd) is never evaluated by this rule at all.

Proven, `_li_presence_dominance_repair_control.mjs`:
- **RED** — the real sample flags: 4/4 Julian beats, 100% unanchored, exactly idx 7/11/16/22.
- **GREEN** — the same 4 lines rewritten with an anchor (jaw, knuckles, a held gaze) do not flag.
- **GREEN** — an actively-written Julian (no negation forms) does not flag.
- **EXEMPT** — the real sample's own 4 assembly beats (`goes still`, `waits`, `holds its breath`)
  are structurally identical in form but are never evaluated for Julian's rule; running the same
  detector aimed explicitly at "the assembly" shows it *can* see that pattern — the exemption is a
  deliberate scoping choice, not blindness to the pattern.
- **GUARD** — a single inert Julian beat (below the count minimum) does not flag — sparse presence
  is a different problem from dominance.

See the accompanying authorization sheet for the proposed (not yet run, not yet authorized) paid
repair pass.
