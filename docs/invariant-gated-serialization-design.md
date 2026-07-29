# Technical Design: Invariant-Gated Serialization

**Status:** DRAFT for review. No production code to be written until approved.
**Fixes:** [The Destiny/Fact Divergence Bug](./destiny-fact-divergence-bug.md).
**Enforces the invariant:** *No downstream narrative assumption may become canonical until its underlying narrative invariant has actually become true in the story.*

---

## 0. Design goal (non-negotiable)

Storybound's notion of destiny must never diverge from what the reader witnessed. Optimize for **preservation of narrative destiny**, NOT exact planner-event delivery. Author realization stays free; the *invariant* is what's protected.

---

## 1. Current architecture (what we're changing)

Two independent "what happened" tracks that can contradict each other:

| | DESTINY track (A-plot milestones) | FACT track (CommittedState) |
|---|---|---|
| unit | `{atScene, atPercent, kind, event, triggered}` (`event` = prose-y description) | `facts[]`, `pendingIntent`, `tableau` |
| advance | `_tickAPlot` @59738: `atScene <= turn → triggered=true` — **schedule-gated, no delivery check** | `_commitScene` @92281: verifier says DELIVERED → commit fact + clear pendingIntent; else keep pendingIntent — **delivery-gated** |
| side-effect | `_recordRelationalConsequence` → `_relationalConsequenceLedger` (status `active`) | `_commitTransition` → `facts[]` (provenance `delivered`) |
| downstream | `buildRelationalContinuityDirective` @59869 → `_binl_relationalContinuity` @277458 → **every continuation author fullSys** | consumed by `_llCommittedState` / continuity carriers |

**Per-scene realization link:** `_generateLiteraryPlotContract` @92460 derives a per-scene `state_change` from the current pending milestone (`_curMs`) and hands it to the author + the verifier. The verifier checks *exact-event* delivery of that `state_change`.

**The bug:** the milestone (destiny) advances on scene count, records `active` consequences, and injects them as an *instruction* to future authors ("operate CONSISTENT WITH this wound") — even when the fact track knows the beat was never delivered.

---

## 2. Target architecture

```
Story Destiny
   → Issue Destiny
      → NARRATIVE INVARIANTS   (planner emits these — testable truths, not prose events)
         → Scene Realizations   (author's free choice of HOW)
            → Author Prose
```

Single source of truth. A milestone's consequence becomes canonical (enters the ledger, conditions future prompts) **only when its invariant has been verified true in the rendered prose** — the same gate the FACT track already uses. Destiny and facts describe the same world.

---

## 3. Milestone representation: event → invariant

**Change the milestone schema** (generator `~57627`, mapping `~59364`):

```diff
  {
    atScene, atPercent, kind,
-   event: "Rowan publicly betrays Quinn.",        // miniature prose — the planner over-specifies HOW
+   invariant: {
+     statement: "Quinn irreversibly loses trust in Rowan through undeniable public evidence.",
+     precondition: "Quinn still trusts Rowan / no public evidence exists yet",   // the 'before' (for satisfaction test)
+     test: "Is it now true, on the page, that Quinn has irreversibly lost trust in Rowan via a public, external act?",
+     forbidden_branches: ["Quinn is physically harmed instead", "the loss is only internal/unwitnessed"]  // optional guardrails
+   },
+   suggested_realization: "Rowan publicly betrays Quinn.",   // OPTIONAL hint to the author; NOT canonical, NOT verified
    emotional_conductivity: "...",
-   triggered: false
+   state: "scheduled"                              // see §4
  }
```

- The planner's job becomes: **define what must become true**, not exactly how. `invariant.statement` is the sacred, serialization-load-bearing field. `suggested_realization` is a disposable hint (author may ignore it — that is not a failure).
- Generator prompt (`~57627`) rewritten to emit invariants with a `precondition` and an explicit satisfaction `test`, and to keep `kind`/`atScene`/amplitude for pacing.

---

## 4. Milestone lifecycle state machine

Replace `triggered: boolean` with an explicit lifecycle. States are **distinct** and never collapsed:

```
scheduled  ── the beat's atScene window is open; not yet attempted
   ↓
attempted  ── a scene tried to realize this invariant (state_change targeted it)
   ↓
substituted ── the author delivered a DIFFERENT irreversible event instead
   ↓            (branch: preserves invariant? → advance; else → stays here, flagged)
semantically_satisfied ── the invariant is now TRUE on the page (any realization)
   ↓
realized   ── satisfied AND its consequence is committed canonical (ledger + facts)
```

Only `semantically_satisfied`/`realized` may condition downstream prose. `scheduled`/`attempted`/`substituted` may **not**. This is the direct fix: the schedule can move a milestone to `attempted`, but only the **invariant verifier** can move it to `semantically_satisfied`.

`substituted` is retained as a first-class, studied state (per instrumentation, §8) — not swallowed into "missed."

---

## 5. Verifier changes

Today (`_commitScene` @92281): *"Did the prose DELIVER this exact proposed transition?"* → DELIVERED / PARTIAL / MISSED.

**New INVARIANT verifier** (semantic, not exact-event). Given the milestone `invariant` + the rendered scene prose, decide:

```json
{
  "invariant_status": "SATISFIED | PARTIAL | UNSATISFIED",
  "realization": "how the scene made it true (or why not), 1 sentence",
  "matched_via": "planned_realization | author_substitution | none",
  "substitution_preserves_invariant": true|false|null,   // only when matched_via=author_substitution
  "branch_risk": "none | competing_branch",              // competing_branch = an irreversible event that does NOT satisfy this invariant and diverts the arc
  "tableau": { ... }                                     // unchanged
}
```

Key properties:
- **Semantic, not literal.** "Rowan confesses" and "the crowd discovers the forged vows" both → SATISFIED (matched_via=author_substitution, preserves=true). "Quinn injures her hand" → UNSATISFIED, branch_risk=competing_branch.
- Reuses the existing verifier plumbing (`/api/chatgpt-proxy` gpt-4o-mini, jsonMode) — one call per scene, same cost profile as the current commit verifier (it **replaces** it, not adds).
- The current exact-event `dominant_replacement` telemetry is preserved for continuity/A-B, but is no longer the gate.

---

## 6. Serialization flow (the new gate)

Per scene, post-display (where `_commitScene` runs today):

```
scene generated + displayed
   ↓
identify the active invariant(s) whose atScene window is open
   ↓
INVARIANT VERIFIER (§5) on the rendered prose
   ↓
IF SATISFIED (planned OR substitution-that-preserves):
     milestone.state = semantically_satisfied → realized
     record consequence to the UNIFIED ledger (§7)   ← only here
     commit fact to CommittedState                    ← same gate
     future prompts inherit the consequence
ELSE (UNSATISFIED / PARTIAL / competing_branch):
     milestone.state = attempted | substituted (flag branch_risk)
     NO consequence recorded, NO fact committed
     invariant stays PENDING (a later scene may satisfy it — §9)
```

The scene counter alone never makes a narrative truth canonical. `_tickAPlot` is demoted to *scheduling/attempt bookkeeping* (open the window, mark `attempted`); it no longer sets `triggered=true` or records consequences.

---

## 7. Unify destiny + facts

The milestone ledger and CommittedState must stop being two realities.

- **Move** `_recordRelationalConsequence` out of `_tickAPlot` (schedule) and into the **invariant-satisfaction gate** (§6). A relational consequence is recorded **iff** its invariant was verified satisfied — exactly when a fact is committed.
- `buildRelationalContinuityDirective` @59869 continues to surface `active` consequences — but now every `active` consequence is, by construction, backed by a satisfied invariant. Future prompts can never inherit a consequence that contradicts verified reality.
- Longer term: `_relationalConsequenceLedger` becomes a *view* over CommittedState (facts carry their relational amplitude/consequence), rather than a parallel store. (Phase 3 — can be deferred; the delivery-gate in §6 already removes the divergence.)

---

## 8. Instrumentation (primary debugging surface — build FIRST, §10 Phase 0)

Per milestone, per scene, log/telemeter:
- `invariant.statement` (what must become true)
- current `state` (scheduled/attempted/substituted/semantically_satisfied/realized)
- `matched_via` (planned vs substitution)
- `substitution_preserves_invariant`
- `branch_risk` (competing_branch count)
- `scenes_pending` (how long an invariant has been open unsatisfied)

Answers the questions that matter: which invariants pending? satisfied? substituted? which substitutions preserved the invariant vs. created a branch? **This telemetry, added in Phase 0 alongside the OLD behavior, makes the current drift *visible* before any behavior changes** — and becomes the regression guard afterward.

---

## 9. Retry policy (no forced repetition)

If an invariant is still pending after its scene:
- Do **not** replay the same confrontation. The `pendingIntent`/replan machinery already avoids blind repeats; keep that.
- Allow **any later scene** to satisfy the invariant, via **any** realization. The invariant persists as an open obligation; the per-scene planner keeps steering toward it (the author directive names the pending invariant), but the story is free to reach it naturally, later, differently.
- Guard against starvation: if an invariant stays pending past a bound (e.g. `atScene + K`), escalate its steering pressure and/or emit a `[DESTINY-STARVATION]` telemetry event for review — do **not** silently fire it.

---

## 10. Migration strategy (phased, flag-gated, reversible)

Each phase is behind a kill switch; each is independently shippable and measurable. **No big-bang.**

- **Phase 0 — Observe (no behavior change).** Add the state machine (§4) *alongside* `triggered`, and the invariant verifier (§5) run in **shadow** (result logged, not gating). Add §8 telemetry. This *measures* how often schedule-firing diverges from invariant-satisfaction on real stories — turning the demo's deterministic proof into a production frequency (answers the open "reader-impact / how often" question's precursor). Flag: `window._invariantShadow`.
- **Phase 1 — Invariant representation.** Add `invariant` to milestone generation (§3), keeping `event`/`suggested_realization` for backward compat. Author directive begins naming the pending *invariant* (not just the event). Still schedule-gated. Flag: `window._milestoneInvariantsV1`.
- **Phase 2 — Delivery-gate the spine (the fix).** Move consequence recording behind the invariant gate (§6, §7); `_tickAPlot` stops auto-firing. Flag: `window._destinyDeliveryGate`. Kill switch restores current behavior instantly.
- **Phase 3 — Unify stores.** Collapse ledger ↔ CommittedState into one (§7 longer-term). Optional; the divergence is already gone after Phase 2.

Gate each phase-advance on the §11 success criteria + telemetry, not on gut feel.

---

## 11. Backward compatibility

- **In-flight stories** (milestones already `{event, triggered}`, no `invariant`): a fallback derives a minimal invariant from `event` (`test = "did an event equivalent to '<event>' become true on the page?"`), OR the story stays on legacy behavior via the phase kill switch. No saved story breaks.
- **CG / Famous-Fate / other engines** that read `m.triggered` or the ledger: keep `triggered` as a derived alias (`triggered = state === 'realized'`) during Phases 0–2 so no consumer needs simultaneous change. Downstream consumers (`_recordRelationalConsequence` readers @62356/66663/277458) are unchanged — they just receive fewer, *truthful* consequences.
- **Kill switches** mirror the existing convention (`_committedStateV0`, `_stateChangeSpineV0`, `_milestoneAnchorV0`, etc.).

---

## 12. Risks & open questions

1. **The band-aid was doing work.** Today the ledger is ~100% schedule-filled; it papered over missing beats and kept stories feeling connected. Delivery-gating makes the ledger sparser (only satisfied invariants). If satisfaction is low (~40% today), stories could feel *less* connected, not more — the false-but-present consequence removed with nothing true to replace it. **Mitigation:** the author directive must actively *steer toward the pending invariant* so satisfaction rate rises; Phase 0 measures the real satisfaction rate before we remove the band-aid. **This is the biggest risk and the reason for the phased rollout.**
2. **Semantic invariant verification is fuzzy.** An LLM judging "is the invariant now true?" needs calibration (esp. `substitution_preserves_invariant`). Phase 0 shadow-runs let us calibrate against human spot-checks before gating.
3. **Extra reasoning per scene.** The invariant verifier *replaces* the commit verifier (no net add), but the substitution/branch judgment is richer → watch latency/cost.
4. **Planner quality shifts.** Emitting good invariants is a different skill than emitting events; the generator prompt (§3) needs its own iteration (but this is prompt work *inside* the new architecture, not a return to prompt-tweaking the old one).
5. **Reader-impact still unproven.** We proved the divergence exists and steers prose; we have **not** proven it's the dominant cause of perceived drift. The blind reader read remains the deciding evidence and should run in parallel.

---

## 13. Success criteria (evaluate post-implementation)

Optimize for destiny preservation, NOT exact-event delivery. After the redesign:
- Does every scene permanently change something (real irreversible progress, tracked as satisfied/substituted invariants)?
- Do repeated arguments / emotional resets decrease?
- Does emotional escalation replace emotional reset?
- Do future scenes build only on events the reader actually witnessed (zero contradiction between ledger and CommittedState)?
- Does the story feel *inevitable* rather than merely well written? (blind reader read)
- (Diagnostic, expected: exact-event delivery may stay ~40% while long-range coherence improves — that's success, not failure.)

---

## 14. What I need from review before writing production code

- Sign-off on the **milestone-as-invariant** representation (§3) and the **state machine** (§4).
- Sign-off on **replacing** the commit verifier with the invariant verifier (§5) vs. running both.
- The **Phase 0 (observe/shadow)** step is safe and high-value — approve it to start (it changes no behavior and produces the production frequency data we're missing). Everything gated after Phase 0 awaits its results + your review.
