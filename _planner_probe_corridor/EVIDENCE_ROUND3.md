# Corridor sample, round 3 — after `c8d08fc` (three template corrections)

One sequential corridor planner-only sample. **$0.00308 · 17,940 in / 648 out · `finish_reason:
stop` · 1 attempt, no retry · 0 Grok requests dispatched · 0 escaped.**

## Result: **ACCEPTED**

| | |
|---|---|
| structural normalization | nested `scene_skeleton` lifted (`ENVELOPE:NORMALISED`) |
| stage resolution | `settingOwner=planner`, `presenceOwner=planner` → pending → `STAGE:RESOLVED` WHERE `"guild hall loft"`, onStage `[Lirael]` |
| roster resolution | allowed `[Lirael]`; staged `["Lirael:IN_PERSON"]` — **no invented identity** |
| offstage | `Julian` (mention-only) excluded from C+ and fusion ✓ |
| environmental contract | `["the loom frame", "a bolt of undyed cloth", "the shutters propped open"]` — 3 concrete, distinct |
| C+ | exactly 1, for the 1 staged IN_PERSON entry, `first_mention=true`: *"steps into the loft, the blue shawl pulled tight across her shoulders"* |
| E+ | `{target:"the loom frame", axis:"ritual"}` — **a declared element** ✓ |
| fusion | `{Lirael, the loom frame, "her fingers brush the warp threads, steadying herself against the familiar weight"}` — concrete ✓ |
| angle-heuristic rejections | 0 |

Every constraint that had been ignored in prose was honoured once it was in the template. Third
consecutive confirmation of the same rule: `first_mention` → `environment_elements` → the roster.

> The inline scorecard printed during the run shows ✗ for "one C+ each" and "E+ canonical". That
> scorer grounds against the **pre-resolution** stage (planner-owned WHERE is empty until resolved)
> and is stale, as in round 2. The verified values above come from the raw response and the
> product's own logs; the product ACCEPTED the plan.

> "Grok calls: 3" means three author attempts **blocked at the route layer** after validation
> passed and the pipeline moved on. Nothing reached the server or xAI; nothing was billed.

## One quality caveat — not a validity failure, but it should not be buried

The returned `environment_elements` are **verbatim identical to the example in my own prompt**
(`app.js:253725`):

```
✓ "environment_elements": ["the loom frame", "a bolt of undyed cloth", "the shutters propped open"]
```

The planner copied the exemplar rather than inventing elements for its own scene. "Guild hall loft"
makes a loom plausible, so nothing here is incoherent — but this is exemplar anchoring, and this
project already has standing evidence that exemplars prime output and that addition hurts
(`feedback_bans_vs_exemplars`, the subtraction experiments). Left unchanged, corridor openings will
tend to converge on looms and undyed cloth.

Recommended before this ships widely — but deliberately **not** applied now, because it would
change the shared prompt again and invalidate this result: replace the concrete example with a
shape-only hint (e.g. `["<a fixture>", "<a material or surface>"]`) and re-sample once.

## Status

- **Corridor: validated** — correct staging, no invented identities, grounded E+, concrete fusion.
- **Seeded First Sacrifice: 2/2 accepted** and untouched by all corridor work.
- Free suites: delivery **109**, universal **60**, compat **12**.
- Total probe spend across all rounds: **$0.0248**. Zero Grok requests dispatched, ever.

**Ready for the full First Sacrifice prose run** on the stated gate. The exemplar caveat above is
the one thing I would want decided first, since fixing it later means re-running whatever the prose
test produces.
