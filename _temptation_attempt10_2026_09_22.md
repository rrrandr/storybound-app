# Temptation Attempt 10 (Paid) — Under the Corrected Pipeline (2026-09-22)

Roman authorized one further paid Temptation retry under the fully corrected pipeline (live handoff
+ relational obligation + lane-gate exclusivity fix + LI-label fix), with six evaluation points.
One run, no image calls, no repair/resample, stop regardless of outcome.

## Cost and request count

**$0.0046468, 1 physical paid request** (the scene-spine planner, provider-authoritative via
`cost_in_usd_ticks`). The real author call never dispatched. Preserved:
`report_temptation_attempt10.json`, `console_tail_temptation_attempt10.txt`,
`partial_tracked_calls_temptation_attempt10.json`, `run_1790065464547.jsonl`. Fixed-name
`_temptation` files restored to attempt 4's committed content via `git checkout --` afterward.

## Evaluation, in the requested order

**1. Sanitized/byte-identical text, and Julian named (not generic)** — MIXED. Confirmed from the
real dispatched planner request body: the raw gaze/hands wording ("I keep my hands folded at my
waist and meet his eyes") is present and intact — the sanitize-once fix continues to hold. But the
relational-obligation directive still reads **"the love interest,"** not "Julian" — the label fix
from the prior pass did NOT take effect on this real dispatch.

Root-caused (dry, not fixed — see below): `_relationalObligationForPosture`'s PRIMARY resolution
path (`_relLedger(false)`, READ-ONLY) returns nothing if no relationship ledger has been created yet
for this story — which is the real, unforced condition at this point in a fresh session (my prior
dry proof of the label fix used `window._relEntityForName('Julian', {})` to FORCE the ledger into
existence first, a step that does not happen naturally this early in the real flow). Falling through
to the FALLBACK path (`_oasSceneSnapshots.liName`) hits a SEPARATE, previously-untouched instance of
the identical bug class: the snapshot builder's own `_liName` (`public/app.js` ~line 200205) reads
`state.storybeau.name || state.loveInterestName || 'the love interest'` — the same top-level-only
fallback chain, never checking `state.picks.identity.partnerName`, that the prior pass fixed only at
`_relEnsureAnchors`. The earlier dry proof was real but incomplete: it validated the fix in isolation
without proving the ledger actually exists naturally by the time a live dispatch needs it. **Not
fixed here** — Roman's instruction for this run was report only, stop regardless of outcome.

**2. Relationship-bearing obligation present in the planner prompt** — CONFIRMED. The full HARD
directive (unchanged text otherwise) is present verbatim in the real request, requiring
`li_pressure_actor` when the target is present.

**3. Clears both gates** — Clears the relational-obligation gate (the real reply includes a
substantive `li_pressure_actor`: "Julian's gaze lingers on the folded band at her waist, the hunger
in his eyes sharpening as he registers her silence as an answer to his earlier accusation and waits
for her to name what she withholds" — genuinely responsive, not a restatement of presence). Does
**NOT** clear the lane-instantiation gate.

**4. Exact gate and rejection reason (author did not run)**:
`[CG:PLANNER-GATE] REJECTED before author dispatch — the planner declared
chosen_aftermath_lane="lirael_defensive_path" but its own proposed event/tactical-move/
forces-choice/event-slots does not actually instantiate that lane's content.` Retried once
(`[CG:STALE-REJECTED]`), hit the identical judgment, stopped (`[CG:STALE-STOP]`).

The real plan this time: `state_change`: "Lirael folds the torn mouth-band into her sash without
correcting the Dohkar's assumption that she shaped the wish." `tactical_move`: "Lirael lands a
concrete defensive concealment under Julian's temptation, shifting the assembly's assumption
without naming her stake." `event_slots.action`: "folds the torn mouth-band into her sash",
`exit_state`: "the assembly now holds the unchallenged assumption that Lirael shaped the wish for
her own benefit."

Diagnostic observation only (not investigated or fixed this pass, per "stop after this one run"):
this phrasing is close to the exact real precedent (`withholdActionRx`'s own documented origin —
Temptation attempt 2's "folds the torn mouth-band into her sash without naming WHAT she lost," which
the gate accepts) but substitutes a specific noun phrase ("without naming her stake" /
"without correcting the Dohkar's assumption") for the literal word "what" the existing regex
requires. Worth a future dry pass; not acted on here.

**5. Judge the authored scene** — N/A. No scene was authored; the author never dispatched.

**6. Cost/request count** — reported above: $0.0046468, 1 physical request, provider-authoritative.

## Status

No code changes. Paid-run trace and preserved artifacts only, per Roman's explicit scope for this
run (report, don't repair). The live-handoff, relational-obligation, and sanitize-once mechanisms
all continue to hold under a fresh real dispatch. Two open items surface for a future, separately
authorized dry pass: the LI-label fallback gap in the OAS-snapshot builder (`_liName`, ~line 200205,
same bug class as the already-fixed `_relEnsureAnchors`), and the `withholdActionRx` phrasing-variant
gap noted above. Neither touched here.
