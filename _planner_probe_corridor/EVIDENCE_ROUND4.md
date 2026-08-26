# Corridor sample, round 4 — after `ef73ad0` (exemplar removed + scorecard repaired)

One sequential corridor planner-only sample. **$0.00312 · 17,985 in / 700 out · `finish_reason:
stop` · 1 attempt, no retry · 0 Grok requests dispatched · 0 escaped.**

**Result: REJECTED** — *"planner owned the setting and returned no opening_setting"*

## Both fixes are confirmed working

**Exemplar fix — worked.** The planner returned four elements, **none of which appear anywhere in
the prompt**:

```
original  "ceremonial table"
original  "glowing summons"
original  "board member's lectern"
original  "ancient tapestries"
```

The old nouns (`loom frame`, `undyed cloth`, `shutters propped open`) are gone from the prompt, the
shape-only placeholder is in the template, and the returned elements are concrete and specific to
the scene the planner chose. Copying is not happening any more.

**Scorecard fix — worked.** The card printed `not computable: no resolved stage (aborted before
resolution)` and `inline/product agreement: CONSISTENT`. It no longer prints ✗ marks for things the
product did not judge, and the harness would have exited non-zero had the two disagreed.

## The actual failure: envelope field distribution, not content

The planner split the spine across two levels. `opening_spine` kept six fields; everything else
landed at the envelope's **top level**:

| | `opening_spine` | top level |
|---|---|---|
| kept | `pressure_source_type`, `pressure_source`, `hook_object`, `opening_beat`, `rising_beats`, `decision_beat` | — |
| moved out | — | `pc_career`, **`opening_setting`**, **`environment_elements`**, `li_texture_beat`, `interlocutor_placement`, `pc_self_presentation_beat`, `scene_want`, `scene_mission`, `reader_state`, `pc_body_callback`, **`staged_characters`**, `scene_skeleton` |

Everything needed was present and correct:

- `opening_setting`: `"guildhall antechamber"`
- `environment_elements`: 4 concrete, distinct, scene-specific
- `staged_characters`: `["Lirael"]` — roster-compliant, **no invented identity**
- C+: 1 entry, `first_mention=true`, *"clutches the summons to her chest, knuckles white against the glow"*
- E+: `{glowing summons, damage}` — a declared element
- fusion: `{Lirael, glowing summons, "She tries to fold the summons, but the edges resist like living skin and the glow intensifies along the seams."}`
- Julian excluded; zero angle-heuristic rejections

The plan was rejected because `plan.opening_setting` was read from `opening_spine`, where the model
had not put it.

## Assessment — stop patching fields one at a time

This is the **third** appearance of one phenomenon: the model treats the top-level object and
`opening_spine` as interchangeable containers. We have already lifted `scene_skeleton` (round 2) and
`staged_characters` (round 3) individually. Round 4 shows the drift is not per-field — it is the
whole spine.

Patching `opening_setting` and `environment_elements` next would be a fourth isolated patch against
a defect whose shape we now understand, and a fifth field would follow.

**Proposed instead — one generalized reconciliation, same narrow rules already accepted:**

For each field the spine contract declares, if it is absent from `opening_spine` and present
exactly once at the envelope's top level, move it into `opening_spine` unchanged. Abort if a field
appears in both places (even if equal). Never fabricate a missing field. Log every move. This is the
rule already applied twice, applied once for all spine fields instead of one at a time — structural
recovery only, and the roster/grounding/angle validators remain the final authority on content.

I have **not** applied this, per the standing instruction to report before proposing another
isolated patch — and because this proposal is deliberately *not* isolated, it is a change in
approach and worth your decision.

## Status

- Free suites: delivery **109/109** · universal **60/60** · compat **12/12**.
- Seeded First Sacrifice: **2/2 accepted** (round 2, unaffected by corridor work).
- Corridor: content correct, blocked only by envelope structure.
- Total probe spend to date: **$0.0311**. Zero Grok requests ever dispatched.

No production code changed in response to this sample. No paid prose run. Nothing pushed.
