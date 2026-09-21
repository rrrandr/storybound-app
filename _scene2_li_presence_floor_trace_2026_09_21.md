# LI Presence Floor (2026-09-21)

Roman, after retry 13 (the first architecturally-successful Scene 2 sample): "Boundary Scene 2
generation now works architecturally... But it's not 'finished content' yet, because the quality
gap is exactly the one that matters for a romance CG: Julian is barely alive in the scene... The
next dry step is to add LI presence as a required authoring axis for generated continuation
scenes, not just as a post-hoc detector." Dry work only, no provider calls, no live retry, no
hand-edit of retry 13's real prose.

## 1. What retry 13 actually showed

The real captured scene has exactly ONE beat where Julian is the grammatical subject: "Julian has
not moved." No dialogue attributed to him, no anchored/felt reaction. Everything else about the
scene is genuinely good (see `_scene2_capability_retry13_report_2026_09_21.md`) — the gap is
narrow and specific: the LI contributes nothing to a scene he's physically present in.

## 2. Why the existing LI-presence detector didn't catch this

`_detectLIPresenceDominance` (built earlier this session) judges the QUALITY of beats that
already mention the LI — flagging when >=60% of them are flat/unanchored — but requires
`minBeats: 3` LI-subject beats before it evaluates anything at all. Retry 13 has exactly ONE
Julian-subject beat, so that detector correctly returns `flagged: false` (not enough data to
judge quality) even though the real problem — the LI barely exists in the scene — is genuine.
This is a different axis: not "are the LI's beats written well" but "does the LI have ANY
meaningful contribution when present at all."

## 3. Fix

### Detector: `_detectLIPresenceFloor` (new, `public/app.js`, near `_detectLIPresenceDominance`)

Reject-only, never rewrites. Given a screenplay + `opts.liName`:

- If no `liName` is configured, or the LI is never mentioned in the scene's `phases`,
  `visualState.other_characters_present`, or any beat text — not flagged, no requirement
  ("absent or genuinely irrelevant" is respected literally, not assumed).
- If the LI IS present, requires at least one of: a dialogue beat with `speaker === liName`, or a
  beat where the LI is the grammatical subject AND matches the SAME, already-proven
  `_LI_PRESENCE_ANCHOR_RX` vocabulary the dominance detector uses (restrained pressure — a
  tightened jaw, a locked gaze, held stillness — counts as meaningful; it does not need to be
  dominant or resolving).
- Otherwise flagged, citing the LI's name and that neither dialogue nor an anchored reaction was
  found.

### Prompt: LI PRESENCE FLOOR directive (`_buildCGScreenplayUserPrompt`, the real CG continuation
author's user prompt — not the planner)

Renders only when a love-interest name is configured AND the scene is a continuation
(`sceneIndex > 0`) — inert for genuine Scene 1 openers and any story with no LI. States the
requirement explicitly as a floor, not a takeover: at least one meaningful moment (dialogue,
felt reaction, refusal, intervention, procedural move, or a charged silence the room reacts to),
explicitly NOT a requirement to dominate the scene, rescue the protagonist, or speak more than
once, and explicitly inert if the LI genuinely isn't in the scene.

This is prevention (shapes generation), not just detection — per Roman's explicit instruction not
to rely on post-hoc reporting alone. The detector is exposed (`window._detectLIPresenceFloor`)
for future QA/reporting use; it is NOT wired as a hard post-author reject-and-retry gate in this
pass — that would double the author's real spend on every scene that falls short of the floor, a
separate architecture decision this pass wasn't asked to make.

## 4. Proof — 15/15, new `_scene2_li_presence_floor_control.mjs`

- **RED** — retry 13's real captured scene (read verbatim from its persisted output) is flagged:
  Julian present, no dialogue, no anchored beat.
- **GREEN-A** — the same real scene, with ONLY the one Julian beat edited to add restrained,
  anchored pressure ("Julian's jaw tightens, but he does not move to stop them.") is NOT flagged —
  proves restraint counts, dominance is never required.
- **GREEN-B** — the same real scene, with ONLY one dialogue line added for Julian, is NOT flagged
  — proves dialogue alone also satisfies the floor.
- **ABSENCE-A** — a scene where the LI never appears in phases/visualState/beats at all is NOT
  flagged (`liPresent: false`).
- **ABSENCE-B** — no LI configured at all is NOT flagged.
- **PROMPT** — the real `_buildCGScreenplayUserPrompt` renders the LI PRESENCE FLOOR directive for
  a continuation scene with an LI configured, names the LI, states the restraint/no-dominance
  language explicitly, and does NOT render for a Scene 1 opener or when no LI is configured.
- **COEXIST** — CONTINUATION — AFTERMATH/CONSEQUENCE PACE still renders alongside.

Full pre-existing 14-control suite re-ran green with zero regressions.

## Status

Dry, committed, generic (the mechanism is reusable by any starter/story with an LI; no
First-Sacrifice-specific text). No provider or image calls. Retry 13's real captured prose was
NOT hand-edited — the report's honest findings stand as recorded; this pass changes the prompt
going forward, not the historical sample. No live retry run in this pass.
