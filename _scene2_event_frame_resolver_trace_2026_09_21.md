# Starter Event-Frame Resolver (2026-09-21)

Roman, after retry 12: "That's the point where I'd stop trying to prompt the planner into doing
the job... The planner is not failing because it lacks a lane menu. It's failing because the
event-deciding step is still too generative for a starter scene that has a known issue skeleton...
For starter scenes with an explicit issue skeleton / aftermath lane menu, stop asking the model to
choose the central event from scratch. Deterministically select or constrain the lane/event frame
before the model sees the authoring task." Dry work only, no provider calls, no live retry.

## 1. Real gap this closes

Retry 12: the planner declared `chosen_aftermath_lane: "lirael_defensive_path"` — a VALID id from
the free-choice menu — while its actual `state_change` ("The presiding Dohkar turns to Lirael and
demands she state before the assembly whether she shaped Seren's wish") has the Dohkar as actor,
demanding an answer, not Lirael taking any defensive action. The prior lane-content check (this
session's earlier fix) correctly rejected it, but the model was still the one DECIDING which lane
to attempt from an open menu — exactly the "too generative" step Roman named.

## 2. Fix — deterministic resolution, not a freer prompt

`_resolveStarterEventFrame(row, state)` (`public/app.js`, near `_detectPlannerFunctionGap`): a
pure function, no model call. Keys off `state._intimateInterruption.selectedSlot` — the fate-card
slot (`temptation`/`silence`/`reversal`/`boundary`/`confession`, `_INTR_SLOTS`) the READER already
clicked before the planner ever runs. This is not new plumbing — every starter's intimate-
interruption UI already records this. Player agency lives entirely in which card the reader
picked; the resolver only removes the model's LATER chance to re-litigate that choice into
inventing (or mislabeling) its own event.

`STARTER_PLANS.starter_first_sacrifice.scenes[2]` now declares `eventFrameBySlot` (a mapping for
all 5 slots, each reusing one of the SAME 5 `aftermathLanes` ids already built this session — never
a 6th lane) and `defaultEventFrame` (fallback for an unset/unrecognized slot). Example: slot
`"boundary"` → lane `family_accusation`, event frame "Lirael's open, unretreating want is what
draws Seren's family forward: they step out of the assembly and publicly demand remedy... NOT
another round of the Dohkar asking whether she shaped the wish."

### Prompt (`_generateLiteraryPlotContract`)

When a frame resolves, a new REQUIRED EVENT FRAME block REPLACES the free-choice REQUIRED
AFTERMATH LANE MENU block entirely (not both — one or the other): it states this is "NOT a choice
among options," gives the concrete event obligation, and requires `chosen_aftermath_lane` to be
EXACTLY the resolved id. When no frame resolves (row lacks the new fields, or the resolver itself
returns null), the OLD free-choice menu still renders — fully backward compatible, inert for any
starter/scene that doesn't opt in.

### Gate (`_detectPlannerFunctionGap`)

New `opts.requiredLaneId` parameter: when supplied, a declared lane that differs from the required
one — even a valid, menu-listed lane — is rejected BEFORE the content-signal check runs, citing
the mismatch explicitly ("the reader's own card selection deterministically resolved this scene to
lane X"). The gate call site recomputes the required lane itself via
`_resolveStarterEventFrame(_oeRow, state)` rather than trusting anything in the reply — the model
cannot spoof which lane was required. Inert when `opts.requiredLaneId` is absent (old free-choice
gate behavior, including the content-signal check, is completely unchanged).

## 3. Proof — 26/26, new `_scene2_event_frame_resolver_control.mjs`

- **SETUP** — the real row resolves slot `"boundary"` → `family_accusation` with the authored
  event text; an unrecognized slot and a missing interruption record both fall back to
  `defaultEventFrame` (`dohkar_preliminary_review`); a row without the new fields resolves to
  `null` (generic no-op).
- **RED-A** — retry 12's real reply, WITH the resolved required lane supplied, is rejected citing
  the wrong-lane mismatch specifically (not just a content-signal reason).
- **RED-B** — the SAME real reply, WITHOUT a required lane, is still rejected — but for the OLD
  content-mismatch reason — proving old free-choice behavior is fully preserved when no frame
  resolves.
- **GREEN** — a synthetic reply that declares AND instantiates the resolved lane
  (`family_accusation`, Seren's family publicly demanding remedy) is accepted.
- **ABSENCE** — no wrong-lane rejection language ever appears when `requiredLaneId` is not
  supplied.
- **PROMPT** — clicking the real Boundary card in the live app records `selectedSlot: "boundary"`
  in state (the real determinism input); the live planner dispatch carries the REQUIRED EVENT
  FRAME block naming `family_accusation` and the authored text, the schema line requires that
  exact id, and the OLD free-choice menu text does NOT also render (replaced, not duplicated).
- **COEXIST** — REQUIRED SCENE FUNCTION, the reserved/aftermath schema block, WORLD TRUTHS, RECENT
  OAS EXCHANGE, and IMMUTABLE AFTERMATH (mouth-band) all still render.
- **FULL-FLOW** — with the real pipeline stubbed to return retry 12's real (pre-fix) reply on every
  attempt, the author is NEVER dispatched, the console warning names the resolved lane explicitly,
  and the pipeline ends resumable.

Full pre-existing 13-control suite re-ran green with zero regressions.

## Status

Dry, committed, generic (the resolver mechanism is reusable by any starter scene; the 5-slot ->
lane/frame mapping is First Sacrifice's own authored data, reusing its own existing lane menu, no
new canon). No provider or image calls. No live retry run in this pass. A future retry on this
same Boundary input would be the first real test of whether the model, given a single
deterministically-resolved frame instead of any choice at all, actually writes into it — the
model's remaining job is prose, dialogue, interiority, argument, and local complications within a
fixed event, not deciding the event.
