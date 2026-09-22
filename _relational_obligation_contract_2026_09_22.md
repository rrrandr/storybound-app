# Relational Obligation Contract — Generic Fate-Card/Say-Do Interaction Requirement (2026-09-22)

Roman, after the paid Temptation attempt 5 sample (context now verifiably reaches both the planner
and the author, in the real dispatched request bodies): "This run proves the live handoff plumbing
works, but Temptation still fails the actual product requirement: the planner chose a valid Lirael
defensive-path objective while allowing that objective to crowd out the player's romantic/charged
submission and Julian's response to it... The card choice has to shape both the aftermath lane and
the LI/romance pressure. Otherwise the system can technically obey plot while emotionally ignoring
the player."

And, on scope: "Make this generic across Storybound starters, not First-Sacrifice-only... Do not
hard-code 'Julian must respond' as a global rule... Build a general 'relationship-bearing card must
produce a relationship-bearing consequence' contract, then let each starter define who/what bears
that relationship pressure."

## What attempt 5 actually showed

The planner's real, accepted JSON (`chosen_aftermath_lane: "lirael_defensive_path"`,
`local_objective: "Lirael tucks the torn mouth-band into her sash..."`) built the ENTIRE scene
around institutional concealment. Julian was correctly present (roster/`present` both name him) and
did speak — satisfying the pre-existing, separate LI PRESENCE FLOOR (author-side, "at least one
meaningful moment") — but his two lines ("the Provast's question still waits for its answer"; "The
inquiry will ask what you have not said here") never engaged the Temptation submission itself
("Let the wind of your breath unravel me, as I've unraveled yours by oath.") at all. The gap: LI
PRESENCE FLOOR guards against an ABSENT LI; nothing guarded against a PRESENT LI who never responds
to what the reader actually did.

## The fix — generic mechanism, story-specific content

All in `public/app.js`:

1. **`_relationalObligationForPosture(s, act, dia)`** (new). A scene follows a relationship-bearing
   submission when `act`/`dia` — what the planner is about to reason over — is BYTE-IDENTICAL to the
   scene ledger's own most recent `oas_interrupt` commit. That commit is written ONLY by
   `_commitIntimateInterruption`, which fires ONLY inside the open-one-on-one-scene
   intimate-interruption mechanism — for a selected Fate-card OR fully custom typed Say/Do,
   identically. Detected by DATA IDENTITY, not scene-number arithmetic (this codebase's
   scene-numbering is its own known-fragile area — 4 of the 11 pre-existing
   `_continuity_spine_dry.mjs` failures are scene-number/turnCount mechanics).

   Target resolved generically, never a hardcoded name: PRIMARY — the roster's own
   `anchorRole==='li'` anchor entity, which `_relEnsureAnchors` ALWAYS creates for any story, label
   sourced from `state.loveInterestName`/`partnerName` (whatever that starter's actual LI is
   called); FALLBACK — the archived OAS snapshot's own `liName`, for when the relationship ledger
   isn't available. Returns `null` (no obligation) when neither resolves.

2. **`_validateLocalObjective(reply, eff, relObligation)`** — extended with an additive third
   param. Reject-only, mechanical (non-empty + a minimum length — never a semantic-quality
   judgment, matching every other check already in this function): when `relObligation` is set AND
   its target is among the reply's OWN declared `present` cast, `li_pressure_actor` must be present
   and substantive.

3. **Planner prompt** — a dedicated, HARD schema-request block for `li_pressure_actor` fires
   whenever `_relObligation` is set, phrased entirely around the resolved `targetLabel` (a
   variable) — never a literal character name. Decoupled from the aftermath-lane menu system
   entirely, so it fires for any starter whether or not that starter uses aftermath lanes at all.
   The field already existed (`li_pressure_actor`, added 2026-09-21) but was optional and, per its
   own comment, "telemetry only; not read by any gate or validator yet" — the prior unconditional
   optional mention is suppressed when the new HARD block already covers the same field, avoiding
   two contradictory instructions in one prompt.

4. **`_buildLiveHandoffDirective`** gains section 4, surfacing the accepted plan's own (now
   validated) `li_pressure_actor` to the author as a HARD commitment — this field previously never
   reached the author's prompt at all, despite existing since 2026-09-21.

5. **`_sanitizeCommittedInterruptionText(text)`** (new, applied inside
   `_commitIntimateInterruption`) — a real, independently-found defect: Temptation attempt 5's own
   committed `action` field was literally `"**"` and `dialogue` retained its full
   `*"...quoted line..."*` wrapper, verbatim, all the way into the author's own prompt.
   Root-caused: the batch-preview format wraps `action` in `**bold**` and `dialogue` in
   `*"quoted"*` (despite the prompt explicitly saying not to); the authoritative parser
   (`_parseBatchFatePreview`, `orchestration-client.js`) strips only leading/trailing QUOTE
   characters, never markdown emphasis; a separate, pre-existing sanitizer
   (`_sanitizeFatePreviewLine`) mis-strips the doubled-asterisk action wrapper down to a bare `"**"`
   rather than removing it (a distinct defect, not touched here) and, empirically, leaves the
   dialogue wrapper untouched. The new function is a correct, independent last line of defense,
   applied at the single authoritative commit point every source (a card clicked as-is, an edited
   card, or fully custom typed text) passes through — holds regardless of which upstream path the
   final text took.

## Proof — `_relational_obligation_contract_control.mjs`, 35/35

Sections A-H, using Temptation attempt 5's OWN real, already-paid planner reply and card text as
the RED fixture (per Roman: "Keep First Sacrifice as the red fixture using Temptation attempt 5"):

- **A. SANITIZER** — the real `"**"` and `*"...quoted..."*"` artifacts clean correctly (to `""` and
  the quoted sentence respectively); ordinary text, a mid-sentence `*aside*`, and edge cases
  (empty/null/single stray asterisk) are all handled correctly without mangling legitimate content.
- **B. DETECTOR** — both the PRIMARY (roster LI anchor, exercised against real `window.state` —
  every real caller passes `s===window.state`) and FALLBACK (`_oasSceneSnapshots.liName`,
  exercised on a fully isolated object) resolution paths correctly resolve "Julian"; non-matching
  act/dia and a ledger with no `oas_interrupt` entry both correctly return `null`.
- **C. VALIDATOR BITES RED** — Temptation attempt 5's REAL, unmodified planner reply is REJECTED,
  with a reason naming both the relational obligation and Julian specifically; every pre-existing
  check on this real reply still passes (only the new check fires) — proving the new check adds
  exactly one failure mode, not a regression on the others.
- **D. VALIDATOR GREEN** — the same real reply, with a substantive `li_pressure_actor` added,
  PASSES; a trivially thin placeholder ("He watches.") is still rejected — non-empty alone is not
  enough.
- **E. NOT ENFORCED WHEN TARGET ABSENT** — no rejection when the target isn't in the reply's own
  declared `present`.
- **F. GENERICITY** — a synthetic non-First-Sacrifice fixture (LI="Corvin", a completely different
  lane/objective) exercises the identical RED/GREEN behavior through the SAME validator function;
  source-traced to confirm `_relationalObligationForPosture` and the new planner schema-request
  block contain zero hardcoded character names anywhere — only the `targetLabel` variable.
- **G. HANDOFF SECTION 4** — appears only when `stateChange.liPressureActor` is set, absent
  otherwise, sections 1-3 unaffected either way.
- **H. COMMIT-POINT SANITIZATION** — `_commitIntimateInterruption`, fed the REAL raw markdown-wrapped
  card text, commits clean `r.action`/`r.dialogue`, and the ledger entry itself (what the planner
  and `_extractRecentOASExchangeLines` both read) carries the same clean text.

One real test-design bug found and fixed while building section B itself (not a production bug): an
initial attempt used a fully isolated local object as `s` throughout, but `_relLedger`/
`_relEnsureAnchors` read `window.state` internally regardless of any passed-in parameter (matching
this codebase's own existing convention — not something changed here) — every REAL caller already
passes `s===window.state`, so this only affected the artificial test construction, not production
behavior. Fixed by testing the PRIMARY path against real `window.state` (saved/restored around the
test) and the FALLBACK path against a genuinely isolated object, proving both real paths separately
rather than one path against a mismatched fixture.

## Regression

`_scene2_live_handoff_directive_control.mjs` (49 checks, directly exercises
`_buildLiveHandoffDirective` and, via a real card click + Submit, `_commitIntimateInterruption`):
49/49 after this change — the new sanitizer does not disturb any existing assertion (the dialogue
text's core content survives sanitization; no existing assertion checks the action field's specific
wording).

`_continuity_spine_dry.mjs` (80 checks): 69 passed / 11 failed BEFORE this change (git-stash
baseline, this session's earlier pass) and 69 passed / 11 failed AFTER, identical failing test names
both times (S6, N1, R2, G3, R2d, G2, G6, R3, R5, R5b, R6a). **No additional failures** — the 11 are
pre-existing (scene-numbering/turnCount/speculative-preload/story-gravity mechanics) and were not
touched.

## What this does NOT do

- Does not touch the pre-existing LI PRESENCE FLOOR (author-side, 2026-09-21) — this adds a
  planner-side, validated commitment alongside it, not a replacement.
- Does not fix `_sanitizeFatePreviewLine`'s own pre-existing bug (the on-screen card preview can
  still show a mangled `"**"` before Submit) — only the COMMITTED text (what reaches the ledger,
  the handoff, and the author) is now guaranteed clean. Flagged, not expanded into.
- Does not touch the 11 pre-existing `_continuity_spine_dry.mjs` failures.
- Does not run any paid call, retry Temptation, or edit any candidate prose.

## Status

Dry, committed. No provider or image calls. No candidate prose edits. Cache-buster bumped
(`?v=20260922e-relational-obligation-contract`).
