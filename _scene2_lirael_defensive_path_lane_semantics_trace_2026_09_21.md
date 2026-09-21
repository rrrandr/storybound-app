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

## Status

Dry, committed. No provider or image calls. No branch retry. A future retry on Temptation
(separately authorized) would be the first real test of whether the fixed lane, given a fresh
planner draw, produces a genuinely landed defensive move instead of hesitation.
