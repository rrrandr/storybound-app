# Continuation Scene Adequacy Requirements (2026-09-20)

Generic across **generated Scenes 2-10** for any story using the open-row continuation pipeline
(`_generateLiteraryPlotContract` → planner → `_authorFullScenePolicy` → CG/literary author) — not
First-Sacrifice-specific machinery. First Sacrifice contributes concrete canon and institutional
detail (e.g. the Answer's ownership rule); the adequacy standard itself belongs to the pipeline.

**Origin:** a real, paid Scene 2 generation for First Sacrifice
(`_scene2_repair_replay_sample_out/run_1789884119160.jsonl`, `grok-4-1-fast-reasoning`, real cost
$0.0870534) passed every existing mechanical/structural check — planner objective delivered,
collective-presence rule honored, forced-choice structure present — and still failed on human
read-through. See `_scene2_li_presence_repair_out/adequacy_downgrade_2026_09_20.md` for the full
critique. That failure is the origin of every requirement below; none are hypothetical.

## The seven requirements

1. **A full scene, not an extended reaction beat.** A generated continuation must cover real scene
   movement, not dwell inside a single moment stretched across many beats.
2. **Player decision as causal input, consequences beyond the immediate response.** The player's
   Say/Do/Fate posture must visibly shape the scene (this already works), but the scene must
   develop what happens *because of* that response, not just narrate the response itself at
   length.
3. **Scene-specific aftermath.** Relevant NPC reactions, institutional/social consequences,
   procedure or next-step setup where applicable, and concrete movement toward the next scene.
4. **Proportionate density.** Description, dialogue, interiority, and plot direction in proportion
   to a full CG/literary scene — not thin enough to pass mechanical checks while reading as
   underweight.
5. **A meaningful new choice or pressure point at the end** — not suspended mood. The scene must
   arrive at a genuine forward decision point, not stop on unresolved tension alone.
6. **Preserve canon/property/authority constraints** declared by the story's own seed — including,
   for First Sacrifice, that the Answer is never the protagonist's private sacrifice or personal
   property; it is a communal/institutional relic entrusted to offices (Provast, judges, warriors).
   Generically: any object a story's seed marks as protected/institutional must not be reframed as
   personal property by the delivered prose, regardless of which player branch produced the scene.
7. **Stage object possession/physical continuity explicitly** when a contested or entrusted object
   matters across an interruption or procedural step — don't let a character keep holding
   something the story's own events would have taken from them, without staging why.

## What's enforced automatically today vs. what's documented only

Three of these are encoded as **reject-only, deterministic** checks in
`_detectSceneAdequacyFailure` (`public/app.js`) — chosen because they're the ones that can be
checked without semantic judgment, not because they're the only ones that matter:

| Requirement | Automated? | Mechanism |
|---|---|---|
| 1 (full scene) + 3 (aftermath) | Partial — presence-only | Sub-check A: aftermath/procedure vocabulary must appear SOMEWHERE in the scene. Conservative: fires only on total absence; presence doesn't certify quality. |
| 6 (protected-object ownership) | Yes | Sub-check B: `STARTER_PROTECTED_RELICS` registry + violation pattern per registered object, sourced from the story's own aftermath-truth canon. |
| 5 (meaningful new choice, not suspended mood) | Partial — ending-only | Sub-check C: the scene's final beats must not be saturated with pure suspension vocabulary with zero completed forward-movement verbs nearby. |
| 2 (consequences beyond response), 4 (density), 7 (object continuity/possession staging) | **Not automated** | Genuinely requires semantic/literary judgment (how MUCH aftermath is enough, whether density is proportionate, whether continuity staging is coherent) — documented as a requirement, not encoded as a reject-only regex. A future LLM-judged adequacy pass could check these; not built here (would require a real provider call to validate, out of scope for this dry pass). |

## Design constraint: player-branch flexibility

None of the automated checks key on exact wording or a fixed scene shape — they check for
vocabulary/pattern *presence*, which two structurally different player branches (different
Say/Do/Fate posture, wholly different content) can both satisfy differently. Proven in
`_scene2_continuation_adequacy_control.mjs` (two synthetic "adequate" branches with substantially
different text both pass every check).

## Explicitly out of scope here

- No hand-authored or hand-fixed Scene 2 prose for First Sacrifice, now or ever — Scene 2 (and 3-10)
  must remain generated per player decision.
- No change to the live planner/author prompt text in this pass — these are post-hoc reject-only
  checks, not proactive prompt guidance. Wiring these requirements INTO the generation prompt
  itself (so the author is steered toward them from the start, not just checked after) is a
  reasonable next step but a separate decision — see the authorization sheet for the proposed next
  capability test.
- No new provider or image calls.
