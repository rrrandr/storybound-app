# Does the milestone layer survive?

**Question (Roman):** a milestone is often *“A causes B”* — “Rowan publicly betrays Quinn” (A) → “trust breaks” (B) — and only B is serialization-relevant. So should the milestone layer exist at all, or collapse into: **Story Goals → Issue Goals → Narrative Invariants → Scene Realizations**?

**Answer: it dissolves. Recommend removing the milestone as a distinct semantic layer.** Here's the reasoning.

---

## A milestone was conflating three different things

Today's `milestone = { atScene, atPercent, kind, event, triggered, emotional_conductivity }` bundles three concerns that have nothing to do with each other:

| in the milestone | what it really is | where it belongs |
|---|---|---|
| `event` — "Rowan publicly betrays Quinn" | a specific **HOW** (one realization) | **deleted** — this is the bug's DNA (surface masquerading as destiny) |
| `atScene`, `atPercent`, `kind`, `emotional_conductivity` | **WHEN / how big** — pacing & arc shape | the **Issue's pacing**, applied as a *soft target* |
| (implicit) the truth the beat must establish | **WHAT must become true** | the **invariant** (atomic unit) |

The whole bug is that these three were fused, and the *schedule* (WHEN) was allowed to make the *event* (a HOW) canonical — bypassing the *truth* (WHAT) entirely. **Splitting them apart is the redesign.** Once split, "milestone" names nothing left over — each piece has a better home.

- The **WHAT** becomes the invariant. Atomic.
- The **HOW** becomes the author's equivalent-realization class (soft; never stored as destiny).
- The **WHEN/how-big** becomes a pacing *hint*, owned by the Issue, attached to an invariant as a target position — **and, crucially, it can never gate.** That single demotion (WHEN → soft target, not a trigger) *is* the fix.

## The revised architecture

```
Story Goals            what the whole story must make true (few, large invariants)
   ↓ decomposes into
Issue Goals            an ARC SHAPE (rhythm of amplitudes across the issue's scenes)
                        + an invariant DAG assigned to positions in that shape
   ↓
Narrative Invariants   the atomic unit — a testable irreversible truth, carrying:
                        { statement, precondition, test, anchor, modality,
                          equivalent_realizations,  boundary,
                          depends_on: [invariantId…],   ← causality edges
                          pacing: { target_scene, kind, amplitude },  ← SOFT hint, never a gate
                          state: scheduled→attempted→substituted→semantically_satisfied→realized }
   ↓
Scene Realizations     what the author actually wrote (free, inside the invariant)
```

There is no milestone object. The Issue Goal owns the **shape** (pacing/rhythm) and the **graph** (which invariants, in what dependency order); each invariant is self-contained truth. This is exactly your four-layer hierarchy.

## Why this is strictly better

1. **It structurally prevents the bug.** WHEN is now a soft property attached to an invariant — there is no code path where a scene counter can promote anything to canonical. The only promoter is the invariant verifier.
2. **Causality becomes explicit** (your dependency point). `#17 rebuild-trust depends_on #11 break-trust`. The engine refuses to schedule an invariant whose dependencies aren't `realized`. A whole class of incoherence ("rebuilt a trust that never broke") becomes *unrepresentable*, not just unlikely. This is the DAG that makes it a **narrative-causality language**, not a checklist.
3. **Pacing gets healthier for free.** The Issue owns the arc's *shape* (amplitude rhythm) independent of any specific event landing on a specific scene. A beat can realize late without the shape breaking — *slower to destiny, never false to destiny*.

## What we lose / must migrate (the honest cost)

- Consumers that read `milestone.kind` (HEAVY/LITE routing) or `milestone.atScene` (pacing windows) move to read the invariant's `pacing.{kind,target_scene}`. Mechanical.
- `_tickAPlot` doesn't get "fixed" — it **goes away**. Its job (advance the arc on scene count) was the bug. Pacing pressure + the invariant gate replace it.
- The A-plot generator now emits an **invariant DAG with a pacing shape**, not a milestone list. Bigger prompt change than "add an invariant field," but the [20 hand-written examples](./invariant-examples.md) show the target is writable.

## Recommendation

**Adopt the four-layer model; drop "milestone" as a concept.** Keep it only as an informal word for "an invariant + its pacing hint" in conversation, never as a distinct object with an `event`. This is more radical than the original design (which kept milestones as thin invariant-containers) — but it removes the exact seam the bug lived in, and it's the honest conclusion of "the invariant is the atomic unit of destiny."

**One thing to decide before cementing:** does `pacing` live *on* each invariant (simple), or does the **Issue Goal** own a shape and *assign* target positions to invariants (cleaner separation of WHAT from WHEN)? I lean toward the Issue owning the shape — it keeps the invariant purely about truth, and makes "the arc's rhythm" a first-class, tunable object separate from any one beat. But that's the next redline.
