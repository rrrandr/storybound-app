# Scene 2 Skeleton Handoff — Trace and Fix (2026-09-20)

Roman, after retry-2's `_detectSceneAdequacyFailure` FAILED verdict: "Scene 2 should not be
inventing its whole job from the Fate-card text alone... prove the issue skeleton reaches Scene 2
and becomes binding scene obligations." This traces the five points he asked for, directly against
the real retry-2 log (`_scene2_repair_replay_sample_out/run_1789930729650.jsonl`), and finds a
third, more precise root cause than beat-kind diversity — now dry-fixed and proven.

## The five questions, answered against the real log

**1. What issue-level skeleton exists for First Sacrifice after Scene 1?**
`STARTER_PLANS.starter_first_sacrifice.scenes[n=2]` (an OPEN ROW — no hand-authored goal, by
design: Scene 2 is meant to be generated from the player's posture, not scripted). It carries:
4 `aftermathTruths`, a `requiredTruth`, an `exitState` ("RESOLVED: the words came true and everyone
can see how. NEW PROBLEM: Lirael's standing is at risk and the cost is still uncounted."), a
`decision_axis` ("claim the interference openly vs let the assembly keep its assumption"), 6
`vectors` (affordances, not a menu), and seed-level `worldTruths` (canon, story-wide) — including
one that names exactly what early scenes MAY carry: "accusation, preliminary review, political
pressure, investigation, concealment, or flight" and one that says the formal inquiry itself is
"LATE-ISSUE-1 content, not an early scene's."

**2. Does that skeleton reach the Scene 2 planner?** Partially. Grep-verified against the real
planner dispatch (`run_1789930729650.jsonl`, idx 47, 12,248-char prompt): `aftermathTruths`,
`requiredTruth`, `exitState`, `decision_axis`, `decision_consequence`, `vectors`, and a "FORBIDDEN
INVENTIONS" clause (no new named characters, factions, magical rules, ritual mechanics, locations,
or stakes) were ALL present. **But the seed's `worldTruths` (canon) were not** — zero occurrences of
"WORLD (established", "STORY GROUND TRUTH", or any worldTruths text anywhere in that prompt.

**3. Does the planner convert the skeleton into concrete obligations?** Yes, partially and
unevenly. The real planner response's `forces_choice` echoes `decision_axis` ("claim the
interference... or letting Julian take it"/"claiming the interference was Julian's doing") — but
the `state_change` it invented to carry that choice was **"Julian ignites the pyre beneath Lirael's
feet"** — a literal ritual-burning execution, appearing independently, near-identically, in BOTH
the original failed run and retry-2. Traced to its source: the reader's real submitted Fate-Card
dialogue for this turn was **"I want you to burn for me, as the First-Favored did for the old
gods"** (the BOUNDARY axis card — romantic/tension-escalation flavor text from the intimacy engine,
paired with "mark her with the sacrifice-ash"). The planner's own `posture_read` for the ORIGINAL
run says outright: *"now the words must be taken literally in front of everyone"* — it chose a
literal reading of intimate, metaphorical dialogue as a literal instruction to invent a new
physical event. This directly contradicts an existing worldTruth ("THE RITE HAS NO MAGICAL
MACHINERY... responsive ceremonial fire" is explicitly named ABSENT; "ends in celebration... Do NOT
default to disaster, apocalypse, curses, or world-ending stakes") and crowds out the SAME seed's
explicit guidance for what this exact scene may carry instead ("preliminary review... political
pressure... investigation"). The planner had no way to know this — it never received worldTruths.

**4. Do those obligations reach the author as binding, not optional?** Yes — confirmed, and this is
exactly the mechanism working as designed (root cause A/B's fix): the author's EVENT CONTRACT is
HARD ("the planner owns the EVENT, you own DRAMATIZATION"). The author faithfully dramatized the
planner's invented pyre event. The author's OWN prompt does carry the full worldTruths block
(5,797 chars, confirmed present verbatim, via a separate, later builder,
`_buildSeedContextDirective`/`_continuitySpineBlock`) — but by then the EVENT is already locked; the
author is bound to dramatize it, not to re-derive a different, more world-truth-consistent event.

**5. Does the adequacy detector check skeleton advancement, or just vibe?** `_detectSceneAdequacyFailure`
correctly failed retry-2 on "no aftermath/procedure/consequence-movement signal found" — a real,
useful, but downstream symptom check. It does not (and given this trace, should not need to) check
skeleton advancement directly — the more precise fix is upstream, at the point the event gets
invented, not a new downstream check.

## Diagnosis

Not "beat-kind diversity" as the primary cause (that remains a real, disclosed, secondary
contributor — a scene starved for dialogue has no vehicle to *deliver* consequence even once it has
room to). The primary, better-evidenced cause: **the open-row planner invents the scene's one
binding EVENT before it has ever seen the seed's own canon, and nothing told it that Fate-Card
dialogue is emotional/rhetorical register rather than literal instruction.** A weaker model
(ministral-8b-2512), told only "derive from the reader's actual posture" with a charged, metaphorical
line as its only concrete input, took it literally and invented a canon-violating ritual — twice,
independently, from the identical line — then the EVENT CONTRACT correctly, faithfully bound the
author to it. This matches Roman's diagnosis: "the scene planner is not converting the skeleton
into required local beats" — more precisely, the planner converts *part* of the skeleton
(decision_axis) while free-inventing the physical event from mis-registered posture text, because
the one constraint that would have blocked the invention (worldTruths) never reached it.

## Fix (dry; `public/app.js`, OPEN ROW planner prompt, ~line 99517-99532)

Two additions to the same `_ob` array the planner's user prompt is built from, inserted BEFORE the
reader's Say/Do line:

1. **WORLD TRUTHS block** — the seed's real `worldTruths`, sourced from `_activeSeed(s)` (the SAME
   accessor the author's own builder already uses — no new data, no First-Sacrifice-specific code),
   rendered as "canon — already true; your invented state_change must NOT contradict these...".
   Generic: fires for any starter with `worldTruths`, absent otherwise.
2. **REGISTER (HARD) framing**, appended right after the reader's Say/Do line — explicit: Say/Do
   (including Fate-Card dialogue) is the reader's emotional/rhetorical posture, never a literal
   instruction to invent a new physical event, ritual, mechanic, or environmental fact "even when it
   uses concrete or violent imagery."

Proven 13/13, `_openrow_planner_worldtruths_control.mjs` — WORLD TRUTHS PRESENT (the real, specific
worldTruths the invented event actually violated, verbatim, including the "preliminary review...
investigation" guidance it should have used instead), REGISTER PRESENT, ORDER (both render before
the posture line — ground before posture), COEXIST (every pre-existing OPEN ROW field —
aftermathTruths, reserved, exitState, decision_axis, the real posture dialogue itself — still
present, unaffected). Root causes A and B's existing controls re-run green (8/8, 12/12) — this fix
does not touch the author-side prompt builders.

## What this does and doesn't prove

Does prove: the planner will now see canon (including the exact guidance for what this scene may
carry) and an explicit warning against literal posture-reads, BEFORE it locks the scene's one
binding event — closing the specific, evidenced mechanism that produced the invented pyre/burning
event in two independent real runs.

Does not prove: that a next real attempt will produce an adequate scene — a smaller model can still
invent something else ungrounded, and the disclosed beat-kind-diversity gap (zero dialogue as a
delivery vehicle for consequence) is unchanged. Both remain testable only by a further real,
authorized retry — not run here (dry work only, per scope).

## Status

Dry, committed, generic. No provider or image calls made in this pass. Beat-kind diversity remains
a real, disclosed, secondary gap — not promoted to primary cause, not fixed here.
