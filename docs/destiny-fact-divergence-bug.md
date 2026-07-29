# The Destiny/Fact Divergence Bug

*(a.k.a. Split-Reality Serialization)*

**One sentence:** *The destiny spine advances independently of verified narrative reality, causing future scenes to inherit consequences for events that never occurred.*

---

## The architectural invariant this bug violates

> **No downstream narrative assumption may become canonical until its underlying invariant has been satisfied in the story itself.**

This rule transcends any model, prompt, or verifier. Any redesign of the serialization layer should be evaluated against it. If Storybound keeps this invariant, it avoids an entire class of serialization bugs as the system evolves.

---

## What is proven vs. what is open

**Proven (deterministic, on the production code paths):**
> The serialization layer can inject downstream assumptions that **contradict verified narrative reality** — and it does so as an *active instruction* to future authors, not passive storage.

This does **not** depend on Grok, GPT, prompt wording, or verifier heuristics. Swap every model tomorrow and the bug remains. It is an architectural bug, not a model behavior.

**Open (a reader-impact question, not an architectural one):**
> How often does that contradiction *materially* affect generated prose / reader experience? — Requires a blind reader read; not yet measured.

---

## The mechanism: two contradictory realities

Storybound maintains two independent notions of "what happened," and they can disagree:

```
DESTINY track  (A-plot milestone spine)      FACT track  (CommittedState)
─────────────────────────────────────        ──────────────────────────────
scene count reaches milestone.atScene         verifier judges the scene
        ↓                                              ↓
_tickAPlot: m.triggered = true                 DELIVERED → commit fact
   (NO delivery check — schedule only)         MISSED   → NO fact; pendingIntent kept
        ↓                                              ↓
_recordRelationalConsequence → ledger          CommittedState correctly says
   (status = active)                              "it didn't happen"
        ↓
buildRelationalContinuityDirective surfaces it
        ↓
rides into EVERY continuation author's fullSys
   → future authors are TOLD it happened
```

When the author writes *loss* instead of the scheduled *betrayal*:
- The **fact track** honestly holds "not delivered" (keeps trying).
- The **destiny track** fires the milestone on schedule anyway and tells every subsequent author to write *consistent with* the betrayal.

They are not merely different data structures. They are two contradictory realities, and downstream the destiny track wins.

### Code locations (as of 2026-07-29, `public/app.js`)

- **Schedule-gated firing (the root):** `_tickAPlot()` ~L59738 — `if (m && !m.triggered && m.atScene <= turn) { m.triggered = true; … _recordRelationalConsequence({ sourceMilestoneEvent: m.event }) }`. No delivery condition.
- **Delivery-gated fact track (the honest one):** `_ensureCommittedState` / commit hook ~L92279-92313 — `DELIVERED → commit fact + clear pendingIntent; else → no commit`.
- **The active instruction (the harm):** `buildRelationalContinuityDirective()` ~L59869 emits `ACTIVE RELATIONAL CONSEQUENCES … Characters must operate CONSISTENT WITH active wounds`, wired into the continuation author `fullSys` as `_binl_relationalContinuity` ~L277458. (Also consumed at ~L62356 "R→A RECIPROCITY" and ~L66663 `consequence_ledger`.)

---

## Why it's insidious (and why the stories never collapsed)

With 0–20% exact-event delivery, one would expect incoherence fast. It didn't happen — stories stayed readable, emotionally engaging, competent. This bug is *why*: the system effectively says **"the betrayal must have happened by now,"** and quietly supplies that assumption to every subsequent scene.

It is a remarkably robust band-aid. It also means the story can **feel coherent while slowly diverging from what the reader actually witnessed** — exactly the kind of drift readers struggle to articulate ("well written, but going nowhere").

This is qualitatively worse than a stale cache: the false event is not just *remembered*, it *actively steers* every future author.

---

## Reproduction (deterministic, no generation)

```
node ./_destiny_fracture_demo.mjs      # requires the app running on localhost:3000
```

Output (real code paths; a milestone "Rowan publicly betrays Quinn" scheduled at scene 1, not delivered):

```
DESTINY track:  milestone.triggered = true        ← fired on schedule
                ledger consequence = "Quinn's trust in Rowan shatters" [active]
FACT track:     facts committed = 0                ← betrayal was NEVER delivered
                pendingIntent still open = true    ← system KNOWS it didn't happen
CONSUMPTION:    buildRelationalContinuityDirective() surfaces to later authors:
   "ACTIVE RELATIONAL CONSEQUENCES … Quinn's trust in Rowan shatters — she can no
    longer rely on him (status=active) … Characters must operate CONSISTENT WITH
    active wounds…"
```

Evidence trail: live multi-scene runs (`_destiny_live_trace.mjs`) confirmed the **injection** happens with real milestones + real generation (the active consequence enters the ledger and persists across scenes); the **consumption** half was closed deterministically via the code path + the exposed consumer, rather than by relying on a lucky live capture.

---

## Redesign direction

Not "make the author obey the planner." The planner is *gravity* — it exists to create inevitability. The fix is to enforce destiny as an **invariant**, not assert it on a schedule:

1. **Gate the spine on the invariant becoming true**, verified *semantically*, not on the exact event. "Rowan confesses" and "the crowd finds his forged vows" both satisfy the invariant *"Rowan irreversibly loses Quinn's trust via an undeniable public act"*; "Quinn injures her hand" does not. (Avoids three scenes forcing the same betrayal — do NOT gate on exact-event match.)
2. **Milestone state machine**, not a boolean: `scheduled → attempted → substituted → semantically_satisfied → realized_in_prose`. Keeps *intent*, *verification*, and *narrative reality* distinguishable, and makes "substituted" an explicit object of study.
3. **The planner emits invariants, not miniature prose events.** Redraw the hierarchy: **Story Destiny → Issue Destiny → Narrative Invariants → Scene Realizations → Author Prose.** There is no "planner event" layer — that is where the confusion began.

**Prediction:** redesigning around invariants may leave exact-event delivery roughly unchanged (~40%), but should improve **long-range coherence** dramatically — because the author is asked to satisfy a narrative *truth*, not reproduce a specific *event*. Those are very different optimization problems.

---

## Provenance

Discovered during the narrative-momentum investigation (2026-07). See working memory `project_narrative_momentum_investigation.md` for the full arc (delivery measurement → author sovereignty / competing transitions → milestone representation → this bug). Related: the production reliability fix `af455da` (proxy hang-guard) was found along the way and is independent of this bug.
