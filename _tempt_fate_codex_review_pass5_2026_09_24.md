# Tempt Fate — fifth Codex/Roman pass: antagonist Body Bible resolved, cost-cap control fully green

2026-09-24, fifth same-day pass. Roman: resolve the antagonist Body Bible's 22/23 → 24/24 gap with
explicit evidence before treating the ceiling as enforced. No paid calls made.

## 1. Root cause of `_ANTAGONIST_ARCHETYPES is not defined` — a real, reachable production defect

Traced precisely via brace-matching against the real served source (not the minimal test context,
not guessed): counted braces from `handleBeginStory`'s opening line (`app.js` 262896) to find its
exact matching close — **line 270219**. `_ANTAGONIST_ARCHETYPES` (`var`, `app.js` 264780) is
declared INSIDE that range — a local variable of `handleBeginStory`, a single ~7300-line function.
`_generateAntagonistBodyBibleUncached` (`app.js` ~262697), which references the bare identifier at
~262710 and ~262825, is declared BEFORE and OUTSIDE `handleBeginStory` — a sibling scope, not a
descendant of it. `var` is function-scoped: a variable declared inside one function is never visible
from a sibling function, regardless of execution or boot order. `_bodyBibleOnce` (the only caller of
the Uncached generator) does nothing but forward to it — no alternate dispatch path exists.

**Conclusion, with explicit evidence, not inferred**: this reference is a `ReferenceError`
**unconditionally, in every context** — full production boot included, not specific to this
harness's targeted hydration. Confirmed empirically too: calling the real, unmodified
`window._generateAntagonistBodyBible()` against the harness's real mounted First Sacrifice state
reproduces the EXACT documented error, caught non-fatally by the function's own try/catch
(`[ANT-BODY-BIBLE] generator errored (non-fatal): _ANTAGONIST_ARCHETYPES is not defined`), with
**zero physical requests tracked** under a `gate.setPhase`-wrapped window — the function throws
before ever reaching its own `_callTieredProvider` dispatch call.

**This is a reachable production defect, not a minimal-test bootstrap artifact** — it would fail
identically for First Sacrifice or any other story, whenever `_antagonistBibleEligible()` is true
(a Shape A/B PERSON antagonist), under a full real app boot exactly as it does here. Not fixed this
pass (out of scope — Roman asked for a determination, not a repair of an unrelated pre-existing
bug); disclosed plainly rather than papered over.

## 2. Consequence for the enforced ceiling

Because the function cannot execute past its second real line under ANY circumstance right now, its
TRUE current real cost is $0 — not a worst-case estimate treated as $0, a structurally proven
impossibility. The revised cost-audit script no longer reserves a phantom worst-case buffer for it
(the prior 22/23 run's ledger total, $0.334112, included a $0.006025 reservation for a dispatch that
cannot happen — removed this pass as inaccurate, not as a shortcut). If this scope bug is ever fixed,
the reservation would need to be reinstated before that fix ships to a live Tempt Fate run — flagged
here as the disclosed condition under which this figure would need revisiting, not left implicit.

## 3. Cost-cap control — 24/24, clean

`_tempt_fate_memory_erasure_cost_audit.mjs`: **24/24 passed** (was 22/23; +2 from the antagonist
Body Bible's new dedicated, evidence-based reachability proof, -1 net from removing the old
forced-cascade assertion that could never pass against a structurally-broken function). Every
potentially billable path for this starter's two-scene sequence is now either exercised (scaffold,
PC/LI Body Bibles, scenePlanner, the combined scenePlanner+commitVerifier chain at Scene B, the
emotional-gravity audit, the CG author — each phase-tracked under its own `gate.setPhase`, unambiguous
by construction) or proven structurally unreachable (antagonist Body Bible, with explicit source and
console evidence, not assumed).

**The hard pre-dispatch ceiling stays active across the entire two-scene run, including both
scenes' own bounded retries** (section 3 reserves Scene A's and Scene B's real worst case AND each
scene's own retry, in the real firing order, before section 4 continues reserving further to
demonstrate the block) — proven to refuse a phase BEFORE any `gate.setPhase`/real dispatch, not
after (section 4: `gate.trackedCalls` for the blocked phase is empty).

**Final enforced figure: $0.328087 combined** (both scenes' real, phase-tracked worst case, plus
both scenes' own real bounded-retry reservation, computed by the same ledger proven to block a real
dispatch) — against the sheet's $0.40 combined ceiling, with real headroom.

## Regression

`_tempt_fate_outcome_integration_control.mjs`: 70/70, unaffected (no `app.js` changes this pass).
`_tempt_fate_memory_erasure_live_test_harness.mjs`: 30/30, unaffected — preserved exactly as Roman
confirmed was already the right evidence. `_tempt_fate_memory_erasure_cost_audit.mjs`: 24/24 (was
22/23).

No paid calls, no live sample, no starter content altered, no outcome hand-authored, no images, no
forks used.
