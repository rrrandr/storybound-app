# Runtime Policy

The architecture answers *what the layers are*. This answers *how the runtime behaves* — the part that was still hand-wavy. A story is a **graph, not a timeline**, so runtime is graph-walking: which node to attempt, what to do when one won't complete, and when a node no longer applies.

Nothing here is "importance." Relevance is not authored; it's a **runtime status**.

---

## 0. Invariant runtime status (replaces "importance")

Every invariant is in exactly one status, decided at runtime from the canonical world state:

| status | meaning | offerable to the author? |
|---|---|---|
| `blocked` | ≥1 `depends_on` invariant is not yet `realized` | no |
| `available` | all dependencies `realized`, not yet satisfied | **yes** |
| `partial` | attempted, begun-but-not-irreversible (sub-state of available) | yes (with escalation) |
| `realized` | SATISFIED at high confidence + canonical + closed | no (done) |
| `obsolete` | retired without realization (§3) | no |

The **available set** = every `available`/`partial` invariant. This set *is* the author's freedom (§1).

---

## 1. Who chooses the next invariant — the Scheduler (explicit)

The **Scheduler** owns *what to attempt next*. Nothing else does. Each scene:

1. Compute the **available set** (deps all `realized`).
2. If empty → no destiny attempt this scene (a legitimate breather/relationship beat); log it.
3. Rank the available set:
   - **overdue first** — invariants past their Issue-pacing `target_scene`, most-overdue first (pacing pressure);
   - then **critical-path** — prefer the invariant that unblocks the most downstream invariants (keeps the graph flowing);
   - tie-break by `target_scene`.
4. The **top-ranked** invariant is the one the author directive **steers toward**.

**Author sovereignty lives inside the available set.** The author may satisfy *any* available invariant, not only the steered one. If it naturally lands available-invariant B while A was steered, the evaluator **credits B** — that is not a miss, it's freedom. Only an irreversible event that satisfies *no* available invariant is a `competing_branch` (flagged, not credited). This is the principle made runtime: *free inside the available set; outside it, serialization does not bend.*

> So: **Scheduler proposes (ranked) · author realizes any available one · evaluator confirms & attributes.** The author choosing a different available invariant than steered is success, not failure.

---

## 2. Starvation & replanning (when a beat won't complete)

The top available invariant stays unsatisfied across scenes. Policy is a bounded escalation — **never silently offer forever (a treadmill), never silently mark it satisfied (the original bug):**

```
each scene it is top + unsatisfied:  ESCALATE steering (foreground it harder)   [track scenes_overdue]
at K scenes overdue (K≈4, tunable):  FORCE once — allocate a window where this invariant is the
                                        DOMINANT narrative objective (pressure, not a mandate)   [DESTINY-FORCE]
still unsatisfied:                    REPLAN — re-express the SAME truth via a more reachable path
                                        (statement is sacred; only realization/precondition re-derived)  [DESTINY-REPLAN]
past K_max:                           RETIRE (→ obsolete/impossible, §3/§4) + flag for review   [DESTINY-STARVATION]
```

**FORCE is pressure, never a mandate.** It does *not* tell the author "you MUST satisfy Invariant A in this scene" — that would recreate the original over-constrained-author problem the whole design exists to kill. It allocates another attempt window where satisfying the invariant becomes the scene's *dominant* narrative objective. The author remains free to satisfy it through any equivalent realization — or an unexpected but valid one. The Scheduler raises narrative pressure; it never dictates prose.

Replan is not "invent a new destiny" — the invariant's `statement` (the truth) is never rewritten; only its reachability/`suggested_realization` is re-derived, because persistent starvation usually means the beat was *unstageable from the current state*, not wrong.

---

## 3. Obsolescence (a runtime truth, not planner metadata)

An invariant becomes `obsolete` when the evolving canonical state makes it moot — **this is exactly why "importance" can't be authored: relevance is emergent.** Two triggers, checked cheaply each scene against canonical state:

- **Precondition contradicted** — the invariant's `precondition` can no longer be true (e.g. *"Quinn loses trust in Rowan"* but Rowan is now dead/gone → the precondition *"Quinn trusts Rowan"* is moot).
- **Superseded** — a `realized` invariant already achieved the downstream purpose this one served (often a credited substitution).

On obsolescence: retire it, re-resolve its downstream `depends_on` edges (a dependent that required the retired node is itself freed or obsoleted), log `[DESTINY-OBSOLETE]`. The arc keeps walking the graph.

---

## 4. Impossible-invariant retirement

- **Generation-time** (cheap, first line of defense): validate each invariant — testable? has a precondition? entities exist? reachable in one scene from plausible state? (reuse the Scene-1 delete-test discipline). Reject & regenerate malformed ones.
- **Runtime backstop**: an invariant that survives generation but proves unsatisfiable (starvation → force → replan all fail past `K_max`, and it isn't obsolete) is flagged `[INVARIANT-IMPOSSIBLE]`, retired, and the arc falls back to its `suggested_realization` as a soft objective so the story continues. **An invariant never blocks the arc forever.**

---

## 5. The narrow first implementation (the validation gate — for approval)

Per the review: don't rebuild the whole serialization engine; prove the design on one slice against real stories.

- **Scope:** ONE flavor, ONE issue. Recommend **First Sacrifice** (arcane_binding / Fatelands) — the harness already bootstraps it headlessly and its arc is a clean romance-fantasy shape. (First Taste / Modern is the simpler fallback.)
- **Build behind a flag** (`window._invariantRuntimeV0`), for that flavor only — the legacy milestone/`_tickAPlot` path stays untouched for everything else:
  - a hand-authored **invariant DAG** — start at **five nodes**, not twenty: `A dependency established → B trust extended → C trust broken → D sacrifice made → E trust rebuilt` (linear `depends_on` chain) + Issue-pacing preferences. A five-node graph that works over real prose validates the architecture; a five-node graph that fails is vastly easier to debug than a twenty-node one.
  - the **Scheduler** (§1 priority + §2 starvation);
  - the **one gating evaluation** (§5 of the design) + the runtime **status/DAG/obsolescence** checks (§0/§3);
  - the **unified canonical world state** (destiny + facts, one store).
- **Shadow the legacy system (log-only).** For the prototype flavor, keep the old milestone/`_tickAPlot` spine *running but inert* — it advances nothing canonical; it only **logs what it would have done**. Every scene then yields an immediate A/B: legacy-scheduled beat vs. invariant actually realized, old relational ledger vs. new canonical state, and the downstream author-prompt diff. These comparisons are the fastest way to see the divergence disappear (or catch the prototype misbehaving).
- **Validate over ~1 issue (~6–8 scenes, real generation):**
  - Can the Destiny/Fact divergence reproduce? (target: **no** — `_destiny_fracture_demo` becomes impossible by construction.)
  - Do downstream scenes reference **only realized** truths?
  - Does the arc still feel **inevitable** (blind reader read)?
  - Side-by-side vs. the milestone path on the same setup.

This is the smallest slice that validates the design against real Storybound prose. **It is production code + paid generation, so it waits for your go** — but it's the right next move: the architecture is settled enough that more polishing has diminishing returns compared with one real run.

---

## Status of the runtime questions

| question | answered? |
|---|---|
| who prioritizes pending invariants | §1 — the Scheduler, explicitly (author free inside the available set) |
| starvation / replanning | §2 — escalate → force → replan → retire, all logged; truth never rewritten |
| obsolescence | §3 — runtime status from canonical state (why "importance" can't be authored) |
| impossible-invariant retirement | §4 — generation validation + runtime backstop to soft objective |

Remaining before code: your redline of the [20 invariants](./invariant-examples.md), and your go on the narrow implementation scope (§5).
