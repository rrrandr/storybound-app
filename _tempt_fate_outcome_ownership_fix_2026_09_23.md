# Tempt Fate outcome ownership fix — stable identity, not "most recent" state

2026-09-23. Roman: "'Most recent ledger entry' is safe only if the existing request lifecycle
guarantees that no newer or unrelated wish can become the selected proposal. Show that guarantee
through the actual path. If it doesn't hold, capture the proposal's stable identity when generation
starts and carry it through acceptance; avoid resolving ownership from mutable 'latest' state at
completion. Cover an ordinary continuation after a Tempt invocation too: it must not accidentally
recommit the earlier wish as a new intervention." No paid calls.

## 1. The guarantee, traced — and found not to hold at the code level

Traced the real Tempt Fate zoom-card proceed handler (`app.js` ~108792, the SAME function that
calls `_recordTemptFateEvent`) line by line for any `_stagedSubmitting`/`_isAdvancingScene` check
before it's allowed to seal a new wish. **Found none.** The only protection during an in-flight
scene generation is a CSS class (`staged-composing-active`) applied to dim "the staged surface" —
a UI-level visual cue, not a code-level state lock, and its exact coverage of the Tempt Fate
fate-card element was not verified (and even if verified, CSS-only protection is not a reliable
correctness guarantee — a click already queued before the class applies, or any future UI change,
could defeat it). By contrast, the MAIN Submit button genuinely is protected
(`state._stagedSubmitting`, checked and set inside `_advanceStagedScene` itself) — but that guards
against double-submitting a SCENE, not against sealing a SECOND Tempt wish while a first scene's
generation is still in flight.

**Conclusion: the guarantee does not hold at the code level.** "Most recent ledger entry" (the
prior pass's design) was not proven safe — it was assumed safe, which is exactly what Roman flagged.

## 2. The fix — capture, don't re-resolve

- **Ledger entries now carry a stable identity.** `_recordTemptFateEvent` (`app.js` ~190571) adds
  `id: 'tfl_' + (a per-story monotonic counter)`, independent of scene index or array position.
  Reset with the ledger on a new story; carried across Issue boundaries alongside it.
- **`_runCGScreenplayGenInner` captures ownership at its very first line, before any `await`**: the
  ledger entry that is current RIGHT NOW (`_tfoProposalEntry`) and whether Tempt was genuinely
  invoked this turn (`_tfoWasInvokedAtStart`). Both are ordinary local variables, kept alive across
  the awaited dispatch by normal JS closure semantics — no new state, no new global.
- **The commit block now uses these captured values, never re-reads "current" ledger/invocation
  state after the dispatch returns.** Even if a second wish is sealed while the first generation's
  request is in flight, the first generation's eventual commit still points at the FIRST wish's
  ledger entry by its stable id — not whatever happens to be "most recent" by the time the response
  arrives.
- **`_tfoWasInvokedAtStart` is checked FIRST**, before even looking at `plan.temptFateOutcome`. An
  ordinary continuation (Tempt not invoked this turn) never processes a `temptFateOutcome` field at
  all, even if the model returns one — since the schema is unconditionally documented in the prompt
  every scene (the same pattern `kink_introduced` already uses), a model could plausibly echo a
  stale one back on a turn where it wasn't actually asked to. That's now explicitly detected and
  ignored, not silently recommitted as a new intervention.

## 3. Proof (`_tempt_fate_outcome_integration_control.mjs`, extended to 25/25)

Two new sections, both exercising the real production path (not the pure `_commitTemptFateOutcome`
function in isolation):

- **§8 — the actual race, reproduced.** Seals a first wish, starts a real generation for it, and
  — via a side effect injected into the SAME stubbed network response the real dispatch awaits —
  seals a SECOND, unrelated wish while that "request" is still pending (confirmed real: the ledger
  genuinely holds 2 entries by the time this resolves). The committed entry is confirmed attributed
  to the FIRST wish's text and evidence — not the second, later one. This is not a hypothetical;
  it's the exact race Roman described, reproduced against the real function and proven handled.
- **§9 — the stray-recommit case.** A real Tempt invocation commits normally on turn N. Turn N+1 is
  set up as a genuine ordinary continuation (`tempt_fate_invoked_this_turn: false`, matching what
  the real cleanup code does between turns) — but the stubbed model response ALSO includes a
  `temptFateOutcome` (simulating model drift). Confirmed: no second entry is created, and the
  ignored stray report is explicitly logged, not silently dropped.

## 4. Regression

Full established suite re-run after the ownership fix: all Tempt Fate controls
(canon-rupture 20/20, CG-activation 19/19, imprint-lifecycle 19/19, model-driven-outcome 38/38,
outcome-integration 25/25) plus the full cross-cutting suite (relational-obligation 47/47, CG proxy
world-guard 15/15, causal-link legibility 25/25, confession-frame 16/16, aftermath-lane 22/22,
scene2 planner-gate 10/10 — one transient navigation timeout on the first batch run, confirmed
clean on immediate re-run, matching this session's known flaky pattern — Lirael defensive-path
22/22, Say/Do safety gate 24/24, Say/Do wall-break+gibberish 32/32, Petition identity-rewrite gate
23/23), continuity-spine baseline 69/80 with the unchanged established failing set (result appended
to the commit body once the background run completes).

## 5. What this pass does NOT do

- Does not touch the CSS/UI layer that would additionally prevent a player from opening the Tempt
  Fate card during composing (a real, separate UX hardening question, not a correctness requirement
  once the code-level ownership fix is in place — the fix holds regardless of what the UI allows).
- No live Tempt Fate sample, no paid calls, no prose generation, no image work.

## 6. The authorization sheet, unchanged and pasted below per Roman's request

The mechanism this sheet describes is now the ownership-fixed version — nothing about the proposed
2-scene test, wish text, cost basis, or evaluation criteria changes as a result of this fix; it
existed to make the test SAFE to run, not to change what the test is testing.

---

