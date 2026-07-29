# Does the milestone layer survive?

**Question (Roman):** a milestone is often *“A causes B”* — “Rowan publicly betrays Quinn” (A) → “trust breaks” (B) — and only B is serialization-relevant. Should the milestone layer exist at all?

**Answer: yes — but stripped of all semantic authority. It survives as a pure *Scheduler*.** The bug was never that milestones existed; it was that they were trying to be three things at once. Split those apart and the milestone keeps exactly one honest job: *when*.

---

## A milestone was conflating three different things

Today's `milestone = { atScene, atPercent, kind, event, triggered, emotional_conductivity }` fuses three concerns that have nothing to do with each other:

| in the milestone | what it really is | where it goes |
|---|---|---|
| `event` — "Rowan publicly betrays Quinn" | a specific **HOW** (one realization) | **deleted** — the bug's DNA (surface masquerading as destiny) |
| `atScene`, `atPercent`, `kind`, amplitude | **WHEN / how big** — pacing | the **Scheduler** (temporal only, never canonical) |
| (implicit) the truth the beat must establish | **WHAT must become true** | the **invariant** (atomic) |

The bug was these three fused, with the *schedule* (WHEN) allowed to make the *event* (a HOW) canonical, bypassing the *truth* (WHAT). **Splitting them apart is the redesign.** But the WHEN piece is not just a hint bolted onto an invariant — it deserves its own layer, because pacing is a real, independent problem: the same invariant lands at Scene 3 in one story and Scene 14 in another. That belongs somewhere.

---

## The architecture (five clean layers)

```
Story Goal            what the whole story must make true (few, large invariants)
   ↓
Issue Goal            the desired emotional arc, escalation profile, pacing preferences
   ↓
Narrative Invariants  the atomic truths + their dependency DAG + importance.
                       WHAT must become true. The only thing that can be canonical.
   ↓
Narrative Scheduler   (formerly "milestones") derives timing from the Issue's pacing prefs:
                       "attempt Invariant #3 around Scene 7." TEMPORAL ONLY.
                       Never defines truth · never becomes canonical · never injects consequences.
   ↓
Scene Realizations    the author writes (HOW — free, inside the invariant)
   ↓
Evaluation (three, not one — see below)
   ↓
Canonical World State single unified truth (destiny + facts are one store)
```

**Separation of concerns:** *goals define WHAT · the Scheduler suggests WHEN · the author decides HOW · the evaluator decides WHETHER it truly happened.* Pacing is now completely decoupled from truth — which is precisely what caused the original bug.

The Scheduler is the reformed `_tickAPlot`: it still says "around Scene 8, try to make Invariant X true," but that's the *end* of its authority. It cannot mark anything realized, cannot write the ledger, cannot advance the spine. Only the invariant evaluator can.

---

## Three evaluators, not one "verifier"

These are genuinely different problems and should be separable so the system can evolve:

1. **Realization matcher** — did the author produce one of the invariant's *equivalent realizations*? (diagnostic: is the author using the planner's preferred HOW, or its own?)
2. **Invariant evaluator** — did the underlying *truth* become true? Returns `{ status, confidence 0–1, importance, matched_via, reason }`. **This is the only gate.**
3. **Consequence extractor** — given the truth is now true, what new *canonical facts* exist because of it? (this is what feeds the unified world state, and only runs after #2 gates.)

Today all three are smeared across one commit verifier; naming them separately is what makes each independently improvable.

---

## Confidence *and* importance (two different axes)

The invariant evaluator separates **semantic certainty** from **narrative weight**:

```
status: SATISFIED   confidence: 0.97   importance: high
status: SATISFIED   confidence: 0.92   importance: low
```

- **confidence** = how sure the evaluator is that the truth became true.
- **importance** = how much the destiny spine depends on it. A `high` invariant is mandatory (starvation escalates, the arc waits); a `low` one is optional (the spine advances even if it never lands). *Failing a tiny invariant must not derail the whole destiny spine.*

---

## Dependencies are the biggest advance

The invariant graph is causal, not temporal: `TrustRebuilt depends_on TrustBroken`. The Scheduler may *want* to attempt rebuild at Scene 12, but if `TrustBroken` isn't `realized`, the Scheduler simply doesn't offer rebuild yet. Incoherence like "rebuilt a trust that never broke" becomes **unrepresentable**, not merely unlikely. A story is a graph, not a timeline.

---

## What we lose / must migrate

- Consumers reading `milestone.kind` (HEAVY/LITE routing) / `milestone.atScene` (pacing windows) read the **Scheduler's** derived schedule instead. Mechanical.
- `_tickAPlot` is not deleted — it is **demoted** into the Scheduler: it may still emit "attempt X around scene N," but loses every write to truth/ledger/state.
- The A-plot generator emits an **invariant DAG (with importance)** + **Issue-level pacing preferences**; the Scheduler turns the latter into a concrete attempt-order. Bigger than "add a field," but the [20 examples](./invariant-examples.md) show the target is writable.

---

## Recommendation

**Keep milestones — as a Scheduler with zero semantic authority.** Truth belongs exclusively to invariants; scene realization exclusively to the author; canonical state exclusively to the evaluator; and *when to try* exclusively to the Scheduler. That preserves the pacing concept (which is useful) while making the Destiny/Fact divergence **structurally impossible** — there is no longer any layer where WHEN can promote WHAT.
