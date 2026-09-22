# Consequence-Requirement Fix: Prompt + Gate De-Escalation (2026-09-21)

Roman, after the deception + posture-echo-length fixes: "This fixes two specific false positives,
but another paid retry would still face the unresolved question: what actually changes because
Lirael makes her defensive move? Also, a four-letter word doesn't make a shared two-word phrase
meaningful evidence of copying. And missing 'tribunal' or 'procedure' vocabulary doesn't establish
that a scene failed to advance. These checks still risk confusing wording with storytelling."

Instruction: inspect the complete rendered planner prompt and the three retained Temptation plans
together; determine whether the defensive-path frame actually requires a consequence; fix the
generic planning instruction (not new canon, not a tribunal requirement) using the existing scene
function and exit state; review the gates for the same wording-vs-storytelling confusion; verify
with the retained attempts plus contrasting examples. Dry work only.

## 1. What inspecting the prompt actually found

`STARTER_PLANS.starter_first_sacrifice.scenes[2].eventFrameBySlot` maps each of the five Fate cards
to a required event. Reading all five side by side:

| slot | eventFrame (abridged) | reaction baked in? |
|---|---|---|
| silence | "...the Dohkar **breaks it procedurally**: he sets a preliminary review date..." | yes — an authority act, itself a reaction |
| reversal | "Julian **challenges** the presiding Dohkar's jurisdiction, **reframing** the accusation..." | yes — a contest implies a target/response |
| boundary | "Seren's family... **publicly demand remedy**..." | yes — a demand implies a response is coming |
| confession | "Julian's own confession destabilizes his position — the presiding Dohkar **reacts** to that shift..." | yes — explicitly states a reaction |
| **temptation** | "Lirael... does something that changes her tactical position..." | **no** — stops at the gesture |

Four of five frames are institutional/interpersonal by construction — "someone else acts" is baked
into their grammar. Only `temptation`'s frame (the one lane actually authored to be Lirael's own
proactive move, `lirael_defensive_path`) never asked for what happens BECAUSE of the move. This is
the missing obligation Roman asked me to find — not new canon, an oversight in how thoroughly this
one frame (of five) was specified relative to its siblings.

## 2. The three retained Temptation plans, read together

| attempt | action | consequence described? |
|---|---|---|
| 1 (hesitation) | "opens her mouth... then closes it" | not applicable — no landed action to have a consequence |
| 2 (mouth-band) | "folds the torn mouth-band into her sash" | thin — exit_state mostly restates the act itself |
| 3 (false account) | "tells the assembly the wish tested her alignment only" | **rich** — aftermath_obligations: "The Dohkar now weighs Lirael's false account against the bent wish; Seren's family visibly withdraws support; Julian watches the deflection without intervening"; exit_state: "the assembly now believes the wish was only an alignment test" |

Attempt 3 — the one draw the OLD gates rejected hardest — is actually the STRONGEST of the three on
exactly the dimension Roman is asking about: three named parties react, in different ways, and the
assembly's collective belief visibly changes. The gates were blind to this because none of that
prose happens to contain "tribunal," "procedure," "ruling," etc.

## 3. Fix 1 — the prompt: REQUIRED CONSEQUENCE (generic)

`public/app.js`, immediately after the existing `REQUIRED SCENE FUNCTION (HARD)` render (which
fires for any starter/scene that declares `sceneFunction` — not First-Sacrifice-specific plumbing):
a new, equally generic block —

> REQUIRED CONSEQUENCE (HARD, GENERIC — applies to whichever event above you land): landing an
> action by itself is not sufficient. Whatever Lirael (or whoever the scene's objective actor is)
> does, you must also show what happens BECAUSE of it — a real, observable reaction (from an
> institution, a bystander, or a concrete shift in what people believe, know, or are prepared to
> do) that changes her situation or narrows/expands her choices going forward, visibly moving
> toward this scene's own TARGET STATE below rather than stalling before it. An isolated gesture
> with no reaction and no resulting change in her position does not satisfy this scene's required
> function, no matter how concrete the gesture itself is.

Ties to the row's own `exitState` (rendered a few lines later as "TARGET STATE this scene leaves
the story in") — an existing field, not new canon — as the concrete anchor for what "a real
consequence" means, instead of inventing a First-Sacrifice-specific outcome or requiring every
branch to route through tribunal/procedure vocabulary (both explicitly ruled out by Roman).

## 4. Fix 2 — the gates: demote wording-only signals, add a structural floor

### 4a. Generic aftermath-vocabulary scan → diagnostic only

`_SCENE_AFTERMATH_VOCAB_RX`'s result (`aftermathVocabPresent`) is still computed and exposed on the
gate's return object (loggable, inspectable) but no longer independently pushes a rejection reason.
Replaced as the actual reject-capable mechanism by a structural floor: reject only if BOTH
`aftermath_obligations` AND `event_slots.exit_state` are completely empty. This is a genuine,
wording-independent schema-compliance fact (did the planner leave the two fields the schema
explicitly asks it to use for consequence content blank), not a vocabulary judgment — and it still
catches the one thing the old check's own stated purpose actually needed to catch (Roman, during
the Reversal gate-seam fix: "a procedural-sounding label with empty content"). A plan can no longer
dodge this floor by borrowing vocabulary anywhere, because vocabulary is no longer what it checks.

### 4b. Posture-echo bigram check → strength-graded, 3+-word floor for rejection

`_postureEchoBigram` rewritten to scan for the LONGEST shared word-run (up to 6 words) between the
reader's posture and the planner's proposed event, and grade it: `strong` only at 3+ shared words.
A 2-word match — even one clearing the earlier length fix (>=4-char word) — is still returned as a
diagnostic (`echoDiagnostic` on the result) but no longer causes rejection by itself. Real retry 5
evidence: its true positive ("...to burn for me..." / "...to burn for her...") is a shared
**three-word** run ("to burn for"), comfortably clearing this bar — the check's original purpose is
unweakened. Temptation retry 3's "let the" false positive never even reaches diagnostic status (its
only substantive word, "let," is 3 letters — below the length floor from the prior pass).

## 5. Proof

- **`_scene2_temptation_consequence_verification_control.mjs`** (NEW, 8/8) — the direct answer to
  Roman's verification request. Runs all three retained real Temptation attempts through the exact
  production-shape gate call (full lane menu + `requiredLaneId: 'lirael_defensive_path'`):
  - Attempt 1 (hesitation) — **still rejected** (no landed action; the consequence question is
    never reached).
  - Attempt 2 (mouth-band) — **not rejected** (unchanged from the prior pass).
  - Attempt 3 (false account) — **not rejected** — the headline result: this exact real draw would
    now reach the author, with `aftermathVocabPresent: false` confirmed on the result (proving zero
    curated vocabulary was used, and the plan passed anyway).
  Plus two contrasting synthetic fixtures built specifically to test the distinction Roman named:
  - CONTRAST-RED — a concrete, lane-satisfying action (conceals a specific object) with NO
    consequence described anywhere (generic vocab present elsewhere, deliberately, to prove it
    doesn't save the plan) — **still rejected**, via the structural floor specifically.
  - CONTRAST-GREEN — the same concrete action WITH a real, multi-party described consequence, using
    ZERO words from the generic vocabulary list — **not rejected**.
- **`_scene2_gate_seam_widened_scan_control.mjs`** (13/13, extended) — two new sections
  (STRUCTURAL-FLOOR-RED, VOCAB-FREE-GREEN) isolate the new floor from the lane check directly;
  RED-B/RED-C/COEXIST updated to reflect which check now does the rejecting (several fixtures that
  used to be caught by the generic check are still rejected overall, now via the lane check or the
  structural floor, whichever actually applies).
- **`_scene2_required_scene_function_control.mjs`** (20/20, extended) — three new assertions confirm
  the REQUIRED CONSEQUENCE block renders in the live dispatch, immediately after REQUIRED SCENE
  FUNCTION, states the causal chain, and ties to TARGET STATE. Retry 5's RED:ECHO fixture corrected
  to include its real (previously omitted) `event_slots.exit_state` — this real draw's one genuine
  problem was always the echo, not a missing consequence; it is now diagnosed as such with a single,
  clean reason instead of two conflated ones.
- **`_scene2_lirael_defensive_path_lane_semantics_control.mjs`** (22/22, extended) — REAL-DRAW
  section rewritten: Temptation attempt 3's real content is now proven NOT REJECTED AT ALL (not
  merely "the lane reason is gone" as the prior pass's narrower fix showed).
- Four other directly-affected pre-existing controls re-verified individually, no shell
  loops/redirects, each after adding a populated `slots.exitState` to a synthetic fixture that had
  never needed one under the old vocabulary-based floor (a fixture-update, not a behavior
  regression — each fixture's own event text already implied a real consequence; only the field
  carrying it structurally was missing): `_scene2_aftermath_lane_control.mjs` (22/22),
  `_scene2_event_frame_resolver_control.mjs` (26/26), `_scene2_planner_function_gate_control.mjs`
  (10/10, retry 4's old-schema fixture reworded to the new floor's message text — still correctly
  rejected, it never had either field to begin with).

## 6. What this does NOT do

- Does not retry Temptation live — no branch retry authorized alongside this fix.
- Does not touch Boundary's or Reversal's lane vocabulary.
- Does not remove the lane-content check, the required-lane check, or the hesitation/deception
  anti-gaming guards from the prior two passes — all independently re-verified unaffected.
- Does not hand-author a First Sacrifice outcome or require any branch to route through
  tribunal/procedure vocabulary — the new prompt clause and structural floor are both fully generic.
- Does not authorize Silence or Confession, or any image work.

## 7. What the next paid run would test

If Temptation is retried under this corrected gate, the open question is no longer "will the gate
falsely reject a legitimate defensive move" (three real draws' worth of false-positive classes are
now closed: hesitation-vocabulary-only, object-based concealment without the word "conceal",
deception phrasing, procedure-vocabulary absence, and short-bigram posture echo). The open question
becomes the one only a real paid run can answer: **given the new REQUIRED CONSEQUENCE prompt
instruction, does the model's next draw describe a genuinely stronger, more specific consequence
than attempt 2's did (closer to attempt 3's real multi-party reaction) — and if the author actually
runs, does the delivered PROSE deliver on what aftermath_obligations promises**, satisfying the
downstream `_detectSceneAdequacyFailure` check and the reader-facing scene-adequacy bar this whole
session has been building toward. That is not answerable dry.

## Status

Dry, committed. No provider or image calls. No branch retry. Temptation may be retried under this
corrected gate — separately authorized, not part of this pass.
