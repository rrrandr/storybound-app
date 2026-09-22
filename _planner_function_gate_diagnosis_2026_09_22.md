# Planner-Function-Gate Diagnosis: Attempts 6 and 9 (2026-09-22)

Roman: "Two consecutive real attempts got as far as producing `li_pressure_actor`, then died because
the planner still didn't instantiate the declared aftermath lane strongly enough. That's the next
real bottleneck... First, dry-diagnose whether the gate is correct or too strict... Do not widen
regexes by default. First explain what concrete story event the plan actually proposed... Fix only
if the gate is demonstrably wrong. If the plan is genuinely weak, leave the gate alone and say so."

## Method

`_planner_function_gate_diagnosis_control.mjs` pulls Temptation attempts 6 and 9's REAL planner
replies from their own persisted, already-paid logs, builds the exact `stateChange`-shaped object
`public/app.js` itself builds from each reply (field-for-field, including `.slots` from
`event_slots` — the same normalization the real code applies before the gate ever runs), and calls
`window._detectPlannerFunctionGap` — the real, unmodified gate function, not a reimplementation —
against each, inside the real loaded app. No provider calls; both replies were already paid for.

## What each plan actually proposed

**Attempt 6** — `chosen_aftermath_lane: "lirael_defensive_path"`. `state_change`: "Lirael places The
Answer back in Julian's hands without speaking." `event_slots`: actor Lirael, action "places The
Answer back into Julian's hands", target Julian, exit_state "Lirael has visibly declined to answer
the Dohkar's charge before the assembly." `li_pressure_actor`: absent.

**Attempt 9** — same lane. `state_change`: "Lirael steps forward and tells the assembly the wish was
Seren's alone." `event_slots`: actor Lirael, action "addresses the assembly with a statement",
target "the assembly", exit_state "Lirael has publicly declared the wish was Seren's alone."
`li_pressure_actor`: "Julian's gaze sharpens at her words, the hunger in it flaring as he registers
her turning his accusation into a public challenge that draws every eye back to him" (present,
substantive).

## Gate result, before any change

Both: `rejected: true`, identical reason — "the planner declared chosen_aftermath_lane=
'lirael_defensive_path' but its own proposed event/tactical-move/forces-choice/event-slots does not
actually instantiate that lane's content." Matches the real console-tail warnings from both live
runs exactly.

## Judgment: attempt 6 — correct rejection, gate left alone

"Places The Answer back in Julian's hands WITHOUT SPEAKING" is a passive, silent gesture. None of
the lane's enumerated concrete moves (submits to procedure / demands terms / gathers proof /
conceals a specific fact-object-admission / gives a false-or-misleading account / flees / counter-
accuses / forces a procedural bind / names a protected constraint) is clearly instantiated — the
event describes returning an object while declining to answer, which reads as avoidance dressed in
a physical prop, not a landed tactical move. This is genuinely thin/weak, not a vocabulary-matching
gap. **Left alone.**

## Judgment: attempt 9 — demonstrably wrong rejection, fixed narrowly

"Lirael steps forward and tells the assembly the wish was Seren's alone" is a landed, external,
public, effect-bearing action: physical movement (steps forward) plus a declarative public
statement (tells the assembly) with a stated consequence (event_slots.exit_state: "Lirael has
publicly declared the wish was Seren's alone"; aftermath_obligations: "The assembly now holds a
public statement... Julian's reaction visibly tightens the political pressure on her standing").
This is squarely inside the lane's own label: "gives a false or misleading account to a public
audience with a real effect." It is also story-grounded, not just plausible-sounding: this seed's
own canon establishes the wish was genuinely spent BY Seren ON Lirael — asserting it was "Seren's
alone" is misleading by omission about Lirael's own stake, not a neutral restatement of fact.

Root cause of the false rejection: `deceptionRx`'s "tells + marker word" alternative
(`tells? [\s\S]{0,50}(?:only|falsely)`) only recognized "only"/"falsely" as the exclusivity/falsity
marker. The reply's own real word — "alone" — wasn't in the list, so neither `deceptionRx` nor any
other signal matched, despite the guard conditions (public target populated, described effect
populated, not intention-only) all being independently satisfied.

## The fix

`public/app.js`, `lirael_defensive_path`'s `deceptionRx`: widened the SAME already-guarded
alternative to also recognize `alone|solely|exclusively` alongside `only|falsely` — three synonyms
of the same exclusivity-claim concept, not a new mechanism. The existing target+effect+non-intention
guard (three lines below, unchanged) still gates acceptance exactly as before; this only extends
which WORD can trigger entry into that already-guarded check.

## Proof

- Re-ran the diagnosis control: attempt 9 now `rejected: false`; attempt 6 unaffected, still
  correctly `rejected: true` with the same reason.
- Re-ran all three pre-existing controls that exercise `_detectPlannerFunctionGap`, confirming zero
  regression across every previously-established RED/anti-gaming/coexistence fixture:
  `_scene2_lirael_defensive_path_lane_semantics_control.mjs` (22/22), `_scene2_aftermath_lane_control.mjs`
  (22/22), `_scene2_planner_function_gate_control.mjs` (10/10).
- Grepped all three suites for the newly-added words (`alone`/`solely`/`exclusively`) before
  touching anything — no existing RED fixture uses them, so the widening could not have silently
  broken an established anti-gaming case.
- `_continuity_spine_dry.mjs` re-verified: 69/80, identical 11 pre-existing failing test names,
  no additional failures.

## Separate: the cosmetic target-label fix (Julian, not "the love interest")

Root cause: `_relEnsureAnchors` (the always-populated roster LI anchor this session's
relational-obligation detector reads) only checked TOP-LEVEL `state.loveInterestName`/
`state.partnerName`. This starter — and dozens of other call sites across `app.js` (e.g. ~8213,
~40795, ~60578, ~66097) — actually populate the LI's name at the NESTED
`state.picks.identity.partnerName`. Brought into line with that same, already-established, generic
fallback chain (not First-Sacrifice-specific): `state.loveInterestName || state.partnerName ||
(state.picks && state.picks.identity && state.picks.identity.partnerName) || 'the love interest'`.

Proof: new section in `_relational_obligation_contract_control.mjs` constructs state with ONLY the
nested field set (no top-level fields at all — the shape the earlier passing test did NOT cover,
since it set the top-level field directly) and confirms the target now resolves to "Julian."
36/36 (up from 35/35 — one new check).

## What this does NOT do

- Does not touch the 11 pre-existing `_continuity_spine_dry.mjs` failures.
- Does not widen any OTHER regex in this gate (the "lands...concealment" verb-whitelist gap noted
  during diagnosis — signalRx's verb list doesn't include "lands" — was NOT touched, since
  attempt 9's rejection is already resolved by the deceptionRx fix alone; touching it would be
  scope creep beyond what was demonstrably necessary).
- Does not run any paid call, retry Temptation, or edit any candidate prose.
- Does not resolve whether the AUTHORED PROSE, once a plan finally clears every gate, actually
  delivers a good scene — that remains untested; no scene has been authored across attempts 6-9.

Two more local-environment gaps found and fixed along the way (unrelated to any code logic): the
Playwright browser binary for the non-`channel:'chrome'` launch path (`chromium_headless_shell`) was
missing after the earlier `playwright-core` reinstall — installed via this project's pinned
installer (`node node_modules/playwright-core/cli.js install chromium`, per
`project_playwright_pinned_install.md`, not `npx`).

## Status

Dry, committed. No provider or image calls. No candidate prose edits. Cache-buster bumped
(`?v=20260922g-lane-gate-exclusivity-fix`).
