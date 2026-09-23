# Tempt Fate — fourth Codex/Roman pass: harness fully green, cost cap made executable

2026-09-24, fourth same-day pass. Roman: "close these two proof gaps" before presenting the live
authorization again — the harness's final assertion count, and an executable (not source-derived)
cost/request cap. No paid calls made.

## 1. The harness's final assertion count — explicit, all five required checks present

`_tempt_fate_memory_erasure_live_test_harness.mjs`: **30/30 dry checks passed** (was 24/24 — 6 new
assertions added this pass, all passing). Every one of Roman's five required checks is now present
and green:

- **Scene A reaches delivered persistence**: proven (section 5).
- **Exactly one outcome commits to the captured proposal ID**: new this pass —
  `durableCountAfterA === 1 && committedA.proposalId === ownedA.id`, checked against the SAME stable
  ledger-entry id captured before any await at generation start (the 2026-09-23 ownership fix), not
  a re-resolved "most recent" one.
- **A deliberately stale assignment still rejects and cannot commit**: new this pass, section 5b —
  runs the REAL, unmodified `_cgMintDeliveredAssignments`/`_cgAcceptDelivered` pair (the exact
  mechanism this session's prior pass repaired) inside the harness's own real, rich First-Sacrifice-
  hydrated state, not only the bare-state integration control. Mints twice (constructing a genuinely
  stale pair, exactly as the existing negative control does), confirms two distinguishable attempt
  ids, and confirms `_cgAcceptDelivered` still rejects the stale one. `_cgAcceptDelivered` itself
  remains untouched by the fix — this proves the fix didn't weaken it, inside the real seed context
  this time.
- **Scene B runs as an ordinary continuation and receives the committed durable consequence in both
  planner and author request bodies**: proven (section 6, both assertions).
- **No new Tempt invocation or duplicate commit occurs in Scene B**: new this pass —
  `state.tempt_fate_invoked_this_turn === false` throughout Scene B, plus an explicit
  `afterCommitB === 1` (not 2) and a check that the single durable entry is still Scene A's, not
  overwritten or duplicated.

## 2. The cost/request cap — redesigned to be executable, not content-classified

The prior pass's `_tempt_fate_memory_erasure_cost_audit.mjs` tried to force every role's cascade
inside ONE shared, interleaved `_runCGScreenplayGen` call, correlating each physical request back to
a logical role by regex-matching its own prompt text against several real, similarly-worded system
prompts sharing 2-3 endpoints — it never came out fully clean, and per Roman's finding, that's the
wrong approach: "may not rely on fuzzy content classification of same-endpoint requests."

**Redesigned this pass, dropping content classification entirely.** Every role's real underlying
function is window-exposed (confirmed by grep this pass — `_ensureCGScaffold`,
`_generatePCBodyBible`/`_generateLIBodyBible`/`_generateAntagonistBodyBible`,
`_generateLiteraryPlotContract`, `_commitScene`, `_auditSceneEmotionalGravity`,
`_authorFullScenePolicy`) and is now called DIRECTLY, one role at a time, each wrapped in its own
`gate.setPhase(roleTag, ceiling)` window. Because only one role's traffic is possible while that
phase is open, `gate.trackedCalls(roleTag)` is unambiguous ground truth — "Playwright request
identity plus the app's role/tier metadata, as the network-gate work already does" — not a guess
from prompt text. The gate's own ceiling additionally proves the cap is enforced: any attempt past
the declared ceiling is aborted by the gate itself.

**Result: 22/23 checks passed**, and two real findings surfaced along the way that a purely
source-derived static table would have missed:

- **`_generateLiteraryPlotContract`'s own internal "COMMIT SCENE" step calls `_commitScene` FIRST**,
  before the planner's own dispatch, whenever `state._priorSceneStateChange` is set — exactly Scene
  B's real condition. commitVerifier and scenePlanner are NOT two independently-triggerable roles at
  this call site; they are one real call chain (confirmed by watching an isolated "commitVerifier-B"
  test come back with zero tracked requests — not a bug, but `_commitScene`'s own idempotency guard
  correctly refusing a second commit the FIRST call, inside the SAME `_generateLiteraryPlotContract`
  invocation, had already completed). Re-tested as one combined phase, ceiling 6 (commitVerifier's 3
  tiers, then scenePlanner's 3), matching the real firing order — confirmed reaching exactly 6.
- **First Sacrifice's PC and LI Body Bibles are Tier-0 seed-derived — zero live calls** under normal
  conditions (`app.js` ~260106-260119, ~261781: "derive the foundation LOCALLY instead of firing a
  live call... falls through to live generation untouched on any refusal"). Confirmed via real
  console output (`[TIER0] pc/li body bible derived locally from seed — zero live calls`), not
  assumed. This lowers the REAL common-case cost below what a naive "every bible always cascades"
  static census would claim — reported honestly as "either 0 (the real common case for this starter)
  or the full 3-tier cascade if the seed data were ever insufficient," both counted as correct.

**The one remaining open item**: the antagonist Body Bible's isolated cascade test threw
`_ANTAGONIST_ARCHETYPES is not defined` when called directly outside the full app-boot sequence —
confirmed the variable IS declared (`app.js` ~264780, `window._ANTAGONIST_ARCHETYPES` at ~264798)
but the reference inside the generator (~262710/262825) is unqualified and, in this minimal-boot
test context specifically, resolves to nothing. Not resolved this pass (real effort-vs-value
tradeoff, disclosed rather than hidden) — whether this is a genuine scoping bug or an artifact of
calling the function outside its normal invocation sequence is unconfirmed. Does not affect the
dollar figure below: antagonist Body Bible is still costed at its full documented worst case (3
tiers, same rates as PC/LI) in the enforced ceiling, not assumed free.

**The reservation ledger genuinely blocks, demonstrated, not just documented** (section 4): continued
reserving worst-case phases past the real Scene A+B+both-retries total until the $0.40 ceiling was
exceeded, confirmed the ledger refused, and confirmed the refusal happened at the RESERVATION step —
`gate.trackedCalls` for the blocked phase is empty, meaning the real function was never even called.

**The enforced figure**: real Scene A worst case ($0.085268) + real Scene B worst case ($0.079913,
now correctly reflecting the combined commitVerifier+scenePlanner call chain) + Scene A's own real
bounded retry reservation ($0.070943) + Scene B's own real bounded retry reservation ($0.079743) =
**$0.334112 combined — computed by the SAME executable ledger this section proved blocks a real
dispatch, not a separate calculation.** This is now legitimately enforceable, not merely
source-derived: `_tempt_fate_memory_erasure_cost_audit.mjs`'s own ledger is the mechanism the
revised sheet's §3 ceiling describes, and it is the SAME class this pass demonstrated actually
refusing a phase before dispatch.

## Semantic limitation, restated per Roman's instruction

Unchanged, kept explicit: a delivered `temptFateOutcome` report is validated STRUCTURALLY
(`_validateTemptFateOutcomeReport` — shape/types, `delivered:true`) — there is no automated check
that the model's claimed `changed`/`establishedEvidence` content is semantically faithful to what
the rendered prose actually says. This is acceptable for a FIRST live test specifically because the
authorization includes human evaluation of both scenes' actual rendered text against their outcome
reports (§6 of the sheet) — not because the gap has been closed.

## Regression

`_tempt_fate_outcome_integration_control.mjs`: 70/70, unaffected (no `app.js` changes this pass —
confirmed via `git status`). `_tempt_fate_memory_erasure_live_test_harness.mjs`: 30/30 (was 24/24).
`_tempt_fate_memory_erasure_cost_audit.mjs`: 22/23 (redesigned; the one open item is disclosed
above, not blocking).

No paid calls, no live sample, no starter content altered, no outcome hand-authored, no forks used.
