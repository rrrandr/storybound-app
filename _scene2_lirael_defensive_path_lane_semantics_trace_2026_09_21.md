# lirael_defensive_path Lane-Semantics Fix (2026-09-21)

Roman, after the Temptation sample: "The issue is that `lirael_defensive_path` is too broad. It
allows 'almost acts / withholds / hesitates' to masquerade as defense. The lane needs to require a
landed defensive move... 'Opens her mouth and closes it' is not a move." Dry work only, no
provider calls, no image calls, no branch retry, no forks.

## 1. Root cause

Two compounding issues, both in `public/app.js`:

- The `temptation` slot's authored `eventFrame` text literally said "she catches herself weighing
  whether to let Julian's version of the accusation stand unchallenged" — an internal-weighing
  frame, not a landed-action requirement. The model's real reply
  ("Lirael opens her mouth to name the true reason then closes it") is close to a direct
  dramatization of that exact text.
- The `lirael_defensive_path` lane's `signalRx` and label never explicitly ruled out hesitation as
  satisfying the lane.

## 2. Fix

- **`temptation`'s `eventFrame` rewritten** to require "a real, external, observable action, not
  stay inside a moment of internal weighing," explicitly naming "she almost says it, then doesn't"
  as insufficient.
- **The lane's `label` rewritten** with the same explicit negative rule, and its move-list
  expanded per Roman's own list: submit to procedure, demand specific terms, gather proof, conceal
  a specific fact/object/admission, move toward flight, counter-accuse, force a procedural bind,
  name a protected constraint.
- **A new `hesitationRx`** (diagnostic only — see below) added to the lane definition.
- **A new hesitation-specific note** in the gate's rejection message when a lane's `hesitationRx`
  matches but its `signalRx` doesn't — turns a generic "no signal found" into an actionable "this
  reads as hesitation, not a landed action."

## 3. The stemming fix, and a real near-miss caught while building it

Task 4 asked to recognize "concealment" (the model's own real word) as related to "conceal,"
**without broadening so far that vague secrecy/mood passes** — Roman's own explicit caution.

A first-pass fix simply added `ment` as an optional suffix
(`conceal(?:s|ment|ed|ing)?`). Testing it against Temptation's OWN real `tactical_move`
("staging Lirael's first internal weighing **of concealment**") showed this would have made the
lane check **wrongly accept** the exact sample this fix exists to reject — "weighing of
concealment" is abstract/thematic, not a description of an actual concealment event happening.

Fixed instead to require "concealment" in an **active-voice context**: a verb phrase committing to
it ("commits to concealment," "chooses concealment," "turns to concealment") or immediately naming
its object ("concealment of [something]"). Bare "weighing of concealment" — nothing there commits
to the act or names its object — does not match. `conceals`/`concealed`/`concealing` (the verb
forms) are unchanged, since active-voice grammar already makes those hard to use abstractly.

## 4. Proof — 12/12, new `_scene2_lirael_defensive_path_lane_semantics_control.mjs`

- **RED** — Temptation's real hesitation-only content (read verbatim from its persisted log) is
  still rejected, now with a reason that specifically names it as hesitation rather than a generic
  "no signal found."
- **GREEN** — a synthetic plan where Temptation's posture modulates a real landed move (concealing
  a specific fact) is accepted.
- **STEMMING** — "concealment" (noun, standalone, in an active-voice context) now satisfies the
  lane on its own.
- **NEW-VOCAB** — "demands specific terms" and "names a protected constraint" (two of Roman's
  explicit additions) each independently satisfy the lane.
- **ANTI-GAMING** — Temptation's own exact real phrasing ("weighing of concealment"), isolated on
  its own, is confirmed to STILL fail the lane check — the specific near-miss this pass caught and
  fixed, proven as its own standalone assertion.
- **COEXIST** — Boundary's real accepted content (`family_accusation`) and Reversal's real accepted
  content (`julian_jurisdiction_challenge`) still pass their own, completely untouched lanes.
- **PROMPT** — the real, live planner dispatch for the `temptation` slot carries the rewritten
  event frame and its explicit negative rule.

Directly-affected pre-existing controls re-verified individually (per Roman's explicit instruction
to avoid shell loops/redirects this pass): `_scene2_aftermath_lane_control.mjs` (22/22),
`_scene2_event_frame_resolver_control.mjs` (26/26), `_scene2_gate_seam_widened_scan_control.mjs`
(7/7), `_scene2_planner_function_gate_control.mjs` (10/10) — all green, zero regressions.

## 5. What this does NOT do

- Does not retry Temptation live — no branch retry was authorized alongside this fix.
- Does not touch Boundary's or Reversal's lanes (`family_accusation`,
  `julian_jurisdiction_challenge`) at all.
- Does not touch `_validateLocalObjective`, the generic aftermath-vocabulary scan, or the
  posture-echo check.
- Does not authorize Silence or Confession, or any image work.

## Status (as of the original pass, superseded below)

Dry, committed. No provider or image calls. No branch retry. A future retry on Temptation
(separately authorized) would be the first real test of whether the fixed lane, given a fresh
planner draw, produces a genuinely landed defensive move instead of hesitation.

---

## Addendum (2026-09-21): Temptation attempt 2 retried the fixed lane and hit a NARROWER,
## DIFFERENT gap — the lane-content check's field set and vocabulary were too lexical

That retry (`_scene2_capability_temptation_attempt2_report_2026_09_21.md`) proved the fix above
worked on CONTENT: the model stopped producing hesitation and produced a genuine landed action —
"Lirael folds the torn mouth-band into her sash without naming what she lost." But the gate still
rejected it. Roman: "That's not a story failure. That's the gate being too lexical again... fix the
gate, dry, exactly like Reversal: inspect the full planner contract, especially
`event_slots.action`, and accept concrete action evidence when the prose itself instantiates the
lane."

### Root cause — TWO independent gaps, not one

Diagnosis while fixing this turned up a correction to the ORIGINAL attempt-2 report: the real
rejection was **compound**, not lane-only as first reported. The console log's actual gate message
(`[CG:PLANNER-GATE] REJECTED...`) carries both reasons joined by `|`:

1. **Lane-content check gap**: the check read only the narrow `tactical_move`/`event`/
   `forces_choice` text. The real landed action lived in `event_slots.action` ("folds the torn
   mouth-band into her sash") and `event_slots.exit_state` ("Lirael has concealed her reason for
   the wish..."), both unread. `tactical_move` said "Lirael **executes** a concrete defensive
   concealment," and "executes" wasn't on the verb whitelist.
2. **Generic aftermath-vocabulary check gap (a separate check, not previously suspected for this
   sample)**: `aftermath_obligations` said "...carries visible **procedural** weight..." —
   "procedural" is not a substring of "procedure" (they diverge after "procedur"), so the old
   `procedure\b`-only pattern missed it, the same stemming-gap class as "concealment"/"conceal"
   found in the first lane-semantics pass. This is a genuinely NEW finding beyond what the
   attempt-2 report originally diagnosed — surfaced only once the field-widening fix was tested end
   to end and the GREEN-2 fixture (the real reply, unmodified) still failed for a reason the lane
   fix alone did not explain.

### Fix

- **Lane-content check now reads a widened `laneCombined`** = narrow `combined` +
  `event_slots.action` + `event_slots.exit_state` — mirroring the Reversal gate-seam fix, but kept
  narrower than the generic check's widening (deliberately excludes `precondition` and
  `aftermathObligations` for the LANE check specifically, since those are open self-report prose a
  model could pad with lane-flavored vocabulary while the real event stays inert; `event_slots` is
  a structured, mechanistic decomposition of the same central event, not padding).
- **`executesRx` + conditional corroboration**: "executes...concealment" is accepted only when
  `event_slots.action` is independently populated with real content — never in isolation, per
  Roman's explicit task-4 requirement ("do not let 'executes a concealment' pass by itself if no
  action is described elsewhere").
- **`withholdActionRx`** — a new, GENERALIZABLE pattern ("without naming/revealing/explaining/
  saying/disclosing what") recognizing the grammatical shape "landed action + explicit
  non-disclosure" directly, rather than requiring the literal word "conceal." Kept OUT of the shared
  `signalRx` and checked separately with a silence-guard: it only counts when the same text does
  NOT also match the lane's `hesitationRx` silence-cluster — closing a hypothetical gaming vector
  ("says nothing, without revealing what she knows" — silence wearing the phrase as a wrapper).
- **Generic check stemming**: `_SCENE_AFTERMATH_VOCAB_RX`'s `procedure` alternative widened to
  `procedur\w*`, catching "procedural"/"procedurally"/"procedures" — same institutional-vocab
  category as the existing word, low gaming risk.

### Proof — 16/16, `_scene2_lirael_defensive_path_lane_semantics_control.mjs` (updated)

New sections added beyond the original 12: **GREEN-2** (Temptation attempt 2's real, unmodified
content — the mouth-band fold — now passes, confirmed via TWO independent signals: `exit_state`'s
"concealed" now reachable by the original `signalRx`, and `withholdActionRx` matching "without
naming what" in `state_change`); **EXECUTES** (bare "executes...concealment" alone still rejected;
corroborated by a populated `event_slots.action`, accepted); **ANTI-GAMING-2** ("without revealing
what" paired with "says nothing" — silence wearing the phrase — still rejected, proving the
silence-guard holds). All original 12 assertions (RED, GREEN, STEMMING, NEW-VOCAB, ANTI-GAMING,
COEXIST, PROMPT) still pass unchanged.

One fixture bug found and fixed during regression re-verification (not a real regression): the
GATE SEAM WIDENED-SCAN control's RED-B fixture used "Nothing **procedural** has happened yet..." as
intentionally vocabulary-free filler text — the stemming fix now correctly matches "procedural," so
that filler accidentally became a true positive. Reworded to genuinely vocabulary-free filler
("Nothing has happened yet in this moment worth mentioning"); no change to gate behavior itself.

Directly-affected pre-existing controls re-verified individually, no shell loops/redirects:
`_scene2_aftermath_lane_control.mjs` (22/22), `_scene2_event_frame_resolver_control.mjs` (26/26),
`_scene2_gate_seam_widened_scan_control.mjs` (7/7, after the fixture fix),
`_scene2_planner_function_gate_control.mjs` (10/10) — all green.

### What this does NOT do

- Does not retry Temptation live — no branch retry authorized alongside this fix.
- Does not touch Boundary's or Reversal's lanes, or any other lane's signal vocabulary.
- Does not add `executes` to the shared abstract-noun verb whitelist unconditionally — it stays
  gated on corroboration.
- Does not widen the LANE check to read `precondition`/`aftermathObligations` (unlike the generic
  check) — that boundary is deliberate, to keep the lane check resistant to self-report padding.
- Does not authorize Silence or Confession, or any image work.

### Status

Dry, committed. No provider or image calls. No branch retry. Temptation may be retried or
revalidated after this fix — separately authorized, not part of this pass.
