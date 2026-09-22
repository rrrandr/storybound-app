# Attempt 10 Dry Fixes: Julian-Label Fallback and Lane-Gate Withhold-by-Correction (2026-09-22)

Roman, after attempt 10: "Attempt 10 exposed two dry-fixable issues before prose quality can be
tested." (1) the Julian-label fix was incomplete — a second fallback path in the OAS-snapshot
builder still resolves to generic "the love interest" in real dispatch. (2) prove, from the actual
fields, whether attempt 10's lane rejection is a false rejection or a genuinely weak plan, before
widening anything.

## Fix 1: the second Julian-label fallback path

Root cause, confirmed by tracing why the label fix from the prior pass didn't hold on a real
dispatch: `_relationalObligationForPosture`'s PRIMARY resolution path (`_relLedger`, read-only) has
nothing to read this early in a real run — no relationship ledger has been created yet by anything
— so it falls through to the FALLBACK path, `_oasSceneSnapshots[n].liName`. That field is populated
by a completely separate function (the OAS-archive builder, `public/app.js` ~line 200205), which had
its own, never-before-touched instance of the identical bug: `(state.storybeau && state.storybeau.name)
|| state.loveInterestName || 'the love interest'` — never checking the nested
`state.picks.identity.partnerName` this starter actually populates. The prior pass's fix only
touched `_relEnsureAnchors`; this is a second, independent location with the same defect class.

Fixed with the same generic fallback chain, same principle, second location:
`(state.storybeau && state.storybeau.name) || state.loveInterestName ||
(state.picks && state.picks.identity && state.picks.identity.partnerName) || 'the love interest'`.

**Proof, under the natural early-run state** (no forced ledger creation — the actual condition a
real dispatch hits, per Roman's explicit instruction): confirmed directly that `_relLedger()`
genuinely returns `null` this early with no prior ledger-creating call (not a hypothetical);
source-traced the exact fixed line's presence in `app.js`; and replicated that exact expression
(copy-pasted, not reimplemented) against the natural state shape (only the nested field set, no
`storybeau`, no top-level `loveInterestName`), confirming it resolves to "Julian." A full live-flow
re-trigger of the archive builder itself was judged disproportionate for a one-line fix and is
flagged as the one gap in this proof's strength, honestly, rather than overclaimed.

## Fix 2: diagnosing and closing attempt 10's lane rejection

**The actual fields, verbatim** (already reported after attempt 10, restated here for the record):
`chosen_aftermath_lane: "lirael_defensive_path"`. `tactical_move`: "Lirael lands a concrete
defensive concealment under Julian's temptation, shifting the assembly's assumption without naming
her stake." `state_change`: "Lirael folds the torn mouth-band into her sash without correcting the
Dohkar's assumption that she shaped the wish." `event_slots`: actor Lirael, action "folds the torn
mouth-band into her sash", target "the torn mouth-band", exit_state "the assembly now holds the
unchallenged assumption that Lirael shaped the wish for her own benefit." `aftermath_obligations`:
"The Dohkar's charge gains visible traction as Lirael's silence lets suspicion settle without
correction, tightening the procedural risk to her qualification before any formal inquiry opens."
`li_pressure_actor`: "Julian's gaze lingers on the folded band at her waist, the hunger in his eyes
sharpening as he registers her silence as an answer to his earlier accusation and waits for her to
name what she withholds."

**Judgment, not assumed**: this is the SAME real physical action as Temptation attempt 2's
already-accepted precedent (folding the mouth-band into the sash — the exact case
`withholdActionRx` was originally built for), paired with a genuine, described PUBLIC consequence
(the assembly's false assumption now stands unchallenged, narrowing her institutional standing via
the Dohkar's charge) — not a private, consequence-free avoidance beat. This satisfies "landed
defensive withholding/concealment action with public consequence." Rejected only because the
existing `withholdActionRx` required the literal word "what" after the non-disclosure verb; this
reply passively declines to correct a specific, already-established false assumption instead — a
distinct but equally concrete non-disclosure shape.

**The fix**: added one narrow, separate alternative to `withholdActionRx` —
`\bwithout correcting (?:the|his|her|their)\b` — requiring a determiner immediately after (so a bare
"without correcting" with no implied specific object does not qualify). Not a broadening of the
"what" pattern itself; a new, equally narrow trigger for a distinct real phrasing. Guarded by the
same, unchanged `hesitationRx` silence-check three lines below.

**Anti-gaming, proven, not assumed**: two new RED fixtures in
`_planner_function_gate_diagnosis_control.mjs` — (1) "stays silent, without correcting the
assembly's assumption" (the new trigger paired with actual hesitation vocabulary) is still rejected
— the existing guard is unaffected by the widening; (2) a landed action with the new trigger present
but NO described consequence anywhere (`aftermath_obligations` and `event_slots.exit_state` both
empty) is still rejected — via the pre-existing, untouched structural floor check.

## Proof

`_planner_function_gate_diagnosis_control.mjs` extended to attempt 10: `rejected: false` after the
fix (was `true` before); attempt 6 unaffected (still correctly `rejected: true`, genuinely weak,
left alone); attempt 9 unaffected (still `rejected: false` from the prior pass's fix). Both new
anti-gaming RED fixtures pass. `_relational_obligation_contract_control.mjs`: 39/39 (was 36/36 — 3
new checks for the natural-early-run-state label proof). `_scene2_lirael_defensive_path_lane_semantics_control.mjs`:
22/22, unchanged — no collision with the new `alone|solely|exclusively`/`without correcting`
triggers in any existing RED fixture (grepped before touching anything). `_continuity_spine_dry.mjs`:
69/80, identical 11 pre-existing failing test names, no additional failures.

## Important finding, NOT fixed here, flagged for Roman's decision

`_scene2_aftermath_lane_control.mjs` (22/22 before today) and `_scene2_planner_function_gate_control.mjs`
(10/10 before today) each now show ONE failure — both in the SAME place, both with the SAME cause:
their own "FULL-FLOW" real-dispatch sections use a Boundary-card submission whose stubbed planner
reply predates this session's relational-obligation work entirely and has no `li_pressure_actor`.
Before today, the target for that Boundary submission resolved to the generic "the love interest"
fallback string — which never literally appears in any real reply's own `present` array — so the
relational-obligation check's `targetPresent` guard could never match, and the check was silently
inert for every non-Temptation card, not just Boundary. Fixing the label bug (Fix 1, above) is
exactly what makes the target now correctly resolve to "Julian" — and, as a direct, correct
consequence, the relational-obligation check can now actually engage on Boundary too, exactly as
its own generic design always intended ("when a selected Fate-card... carries romantic, charged,
relational... pressure, the planner may not reduce it to plot logistics alone" — this was never
written as Temptation-only). The two older tests' own stubbed fixtures simply predate that gate and
don't supply the field it now correctly demands.

This is NOT a bug introduced by either fix in this pass — both fixes are correct and narrowly
proven against their own designated real data. It is a genuine behavioral change, correctly caused,
that these two specific pre-existing tests were not written to expect. Deliberately NOT touched
here — updating those tests' fixtures (or deciding the relational-obligation gate should NOT apply
to Boundary/other non-Temptation cards, which would be a different, larger decision) is outside the
scope Roman set for this pass ("fix only if the gate is demonstrably wrong... no retry") and is a
judgment call for Roman, not something to patch unilaterally.

## Status

Dry, committed. No provider or image calls. No candidate prose edits. Cache-buster bumped
(`?v=20260922h-liname-fallback-and-withhold-fix`). `_scene2_aftermath_lane_control.mjs` and
`_scene2_planner_function_gate_control.mjs` are left exactly as they were — their one new failure
each is explained above, not silently patched.
