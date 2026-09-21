# Four-Card Branch Capability Authorization Sheet (2026-09-21)

Roman, after retry 15 and the harness fix: "My recommendation: test the other four Fate-card
frames before images... Boundary already taught us that a single card path can hide a lot of
branch-specific failure modes: bad lane selection, actor/pressure confusion, weak LI presence,
canon leakage... I'd do four branch capability samples first, one each, with strict
no-followup-retry discipline." This is a **planning document only** — no provider calls, no image
calls, no story retries. Produced, committed, and stopped for separate authorization per Roman's
explicit instruction.

## Why this is needed

Retry 15 is one clean sample on ONE of five fate-card frames (Boundary → `family_accusation`).
Four other frames exist, each resolving to a different lane with different role assignments, none
tested live:

| Card | Resolved lane | `objectiveActor` | `pressureSource` | Event frame (verbatim, `public/app.js`) |
|---|---|---|---|---|
| `temptation` | `lirael_defensive_path` | Lirael | *(none)* | "Lirael is tempted toward concealment: she catches herself weighing whether to let Julian's version of the accusation stand unchallenged rather than name what actually happened — a real choice to conceal or reveal something specific, not another round of the Dohkar's question about whether she shaped the wish." |
| `silence` | `dohkar_preliminary_review` | the presiding Dohkar | *(none)* | "The charged silence after Julian's public claim is what prompts the presiding Dohkar to break it procedurally: he sets a preliminary review date and names its terms before the assembly disperses, moving the confrontation off the ritual floor and into procedure." |
| `reversal` | `julian_jurisdiction_challenge` | Julian | *(none)* | "Someone seizes control of who gets to rule here: Julian challenges the presiding Dohkar's jurisdiction, reframing the accusation as his own to answer rather than Lirael's — a real jurisdictional contest over authority, not another question put to Lirael." |
| `confession` | `dohkar_preliminary_review` | the presiding Dohkar | *(none)* | "Julian's own confession destabilizes his position as accuser — the presiding Dohkar reacts to that shift by setting formal terms and a date for review rather than letting the interrogation continue informally." |
| `boundary` (done) | `family_accusation` | Lirael | Seren's family | tested live, retry 15 — succeeded |

Two of the four untested cards (`silence`, `confession`) share a lane with each other but not with
Boundary — a real, different test of whether `dohkar_preliminary_review`'s own signal/role
guidance holds up on two independent draws. `reversal` is the only lane where **Julian himself** is
the `objectiveActor` — a materially different test of the LI PRESENCE FLOOR directive (Julian
driving the scene's own objective, not just present with a restrained moment) and of whether the
actor/pressure-source prompt correctly omits `pressure_source` guidance when a lane has none.
`temptation` is the only lane where Lirael is the actor with no institutional or family pressure at
all — a concealment/interiority-driven frame, structurally the thinnest test of "aftermath movement"
since it turns on a private choice rather than a public confrontation.

## Mechanism

`_scene2_repair_replay_sample.mjs` currently hardcodes the Boundary slot
(`page.click('#gnCardMount [data-fate-card-slot="boundary"]')`, line ~272) and a fixed
`REAL_SAY`/`REAL_DO` pair. The OAS turn-reply and Fate-Card-batch phases (0-2) are replayed from
the SAME already-paid 2026-09-19 log for every card — that log's Fate-Card batch response covers
all 5 slots in one generation, so no new OAS/Fate-Card spend is needed for any of the four new
cards; `REAL_SAY`/`REAL_DO` (the player's OAS dialogue, which precedes and is independent of which
card is later selected) are also reused unchanged across all 5.

**Planned mechanism (not yet built — a dry, zero-cost prep step once this sheet is authorized):**
parameterize the existing script to accept a target card slot (e.g.
`node _scene2_repair_replay_sample.mjs --slot=temptation`, defaulting to `boundary` for backward
compatibility with every existing invocation and committed report referencing it), rather than
forking four near-duplicate scripts that could drift out of sync with future harness fixes (like
the correlation/reconciliation fix just committed). One canonical script, one place to fix bugs.

## Per-card expected request path

Same pipeline shape for every card, since none of this session's fixes are card-specific:

1. **Planner** (`/api/proxy` or fallback tier, ≤1200 max_tokens): Grok primary → ministral-8b-2512
   fallback → gpt-4o terminal (unchanged 3-tier chain). Prompt carries that card's resolved
   REQUIRED EVENT FRAME + actor/pressure-source guidance (or none, for the 3 cards with no
   `pressureSource`) + the reserved/aftermath schema block + LI PRESENCE FLOOR (author-prompt side
   only, not the planner's).
2. **Gate check** (`_validateLocalObjective` then the Planner Function Gate, including the
   resolved-lane check): reject-only, zero additional spend if it rejects. One bounded retry
   (reuses the cached objective, no second real planner draw) if the FIRST plan is rejected, then
   stops resumable if the retry is also rejected — same machinery proven across retries 5-14.
3. **If accepted → Author** (`/api/proxy`, max_tokens 8000): the real scene-generation call.
4. **If the author settles → post-processing** (speaker/casting/structural validation — 0 to ~5
   further real calls, per the observed range: retry 15 had 2 post-processing calls totaling
   $0.0406, retry 13 had 6 totaling ~$0.134). No image calls in any of this — confirmed by the
   script's own design (Phase 3 is the only real-lane phase; no image provider is ever
   allow-listed).

Historical real-cost range this pipeline has actually produced (all real samples this session,
same architecture): **gate-rejected, no author** ≈ $0.008–$0.011 (retries 11, 12, 14 — one or two
planner calls only); **author reached, full success** ≈ $0.096–$0.136 (retries 13, 15).

## Per-card evaluation (the seven questions, applied to each card)

1. Did the deterministic resolver select that card's own correct lane (per the table above)?
2. Is `objectiveActor`/`pressureSource` valid — an individual for the actor, never a collective,
   and (for `silence`/`reversal`/`confession`/`temptation`, which have no `pressureSource`) no
   spurious pressure-source invented where none belongs?
3. Do both gates (`_validateLocalObjective`, Planner Function Gate incl. the lane-content check)
   pass for substantive reasons — real content matching the resolved frame, not just a satisfied
   label?
4. If the plan is valid, does the author actually reach and produce prose?
5. Is continuity/canon/OAS history preserved (mouth-band, The Answer, the Dohkar's claimed
   authority, no reserved id touched)?
6. Is Julian's presence meaningful without hijacking — especially load-bearing for `reversal`,
   where Julian IS the objective actor (a different question there: does HE get to drive the scene
   without Lirael disappearing, the inverse of Boundary's concern)?
7. Does the scene end on a real player pressure/choice, consistent with the row's own
   `decision_axis`?

## Ceilings

Reusing the SAME, already-proven per-run shape (`PHASE_CEILINGS_USD`, `COMBINED_CEILING_USD`,
`PHYSICAL_REQUEST_CEILING` in `_scene2_repair_replay_sample.mjs`) — **unchanged**, applied
independently per card:

- Per-card ceiling: **$0.45 combined** (`scene2-planner: $0.05`, `scene2-author: $0.40`), **8
  physical requests**.
- **Combined worst-case across all 4 cards: $1.80 / 32 physical requests** — the true sum only if
  every card independently maxes out its own ceiling, which no real sample has ever done.
- **Realistic expected combined cost**, based on the actual observed range above: roughly
  $0.03–$0.55 for all 4 cards together (low end: all 4 gate-rejected like retries 11/12/14; high
  end: all 4 reach the author like retries 13/15) — stated as a planning estimate, not a promise;
  each card's real total will be reported honestly regardless of which end it lands near.

## Stop conditions

- **No follow-up retry within a card** if that card's one authorized real attempt fails (gate
  rejection, author-unsettled, or any infra fault) — identical to the standing rule already
  applied to every retry 5-15.
- **Each card is its own separately-authorized run** — this sheet is NOT itself an authorization
  to run any of the four; Roman decides after reading it whether to authorize all four, one at a
  time, or none. No card runs without its own explicit "authorize one Scene 2 capability retry
  for card X" message, matching the standing per-retry authorization discipline.
- **Pause and report immediately, do not proceed to the next card, if**: (a) any infra-class
  fault recurs (a 502 pattern, a `spawn EBADF`-style local fault, a harness discrepancy the new
  correlation/reconciliation fix doesn't resolve); (b) a card's real sample reveals a NEW
  structural or gate defect (as opposed to a content-quality note) — that gets its own dry-fix
  pass, exactly as retries 12/14 did, before any further card is attempted.
- **Combined-spend checkpoint (suggested, not a hard rule)**: after either 2 cards or $0.50
  cumulative real spend, whichever comes first, pause and report a running summary before
  continuing — gives Roman a natural checkpoint without requiring a hard stop.

## How costs will be reported

Using the now-fixed, dual-layer accounting (object-identity correlation in `_e2e_network_gate.mjs`
+ persisted-log reconciliation in `_scene2_repair_replay_sample.mjs`, both proven
11/11): each card's run produces its own `report.json` (via the script's normal write path) whose
`runningCostUsd` is now trustworthy without manual recovery. Each card gets its own capability
report (`_scene2_capability_<card>_report_2026_09_21.md`, mirroring every retry report this
session) stating real cost, real request count, and the seven-question evaluation. The
authorization sheet (this file, or `_scene2_continuation_capability_retry_authorization_2026_09_20.md`
via a new addendum) gets one addendum per card, same pattern as retries 10-15.

## Where artifacts will be saved

Same directory, `_scene2_repair_replay_sample_out/`, with the SAME fixed-name-file protection
discipline already established for every retry (`report.json`, `console_tail.txt`,
`partial_tracked_calls.json`, `scene2_raw_response.txt` are existing committed red fixtures for
prior dry controls — `git status` confirmed clean before every real run, extracted to a
uniquely-named file immediately after, restored via `git checkout --`, re-confirmed clean).
**New per-card naming convention** (distinct from the `_retryN` suffix used for sequential
Boundary attempts, since these four are organized by CARD, not by retry sequence):
`report_<card>.json`, `console_tail_<card>.txt`, `partial_tracked_calls_<card>.json`,
`scene2_raw_response_<card>.txt` (e.g. `report_temptation.json`) — plus the run's own uniquely
timestamped `run_<epoch>.jsonl`, which never collides with anything.

## What is NOT authorized by this sheet

- No provider or image calls of any kind.
- No card is run without its own separate, explicit authorization message.
- No change to `_validateLocalObjective`, the Planner Function Gate's core logic, or any lane's
  `objectiveActor`/`pressureSource`/`signalRx` — this pass tests the EXISTING, already-built
  architecture against four new inputs; it does not modify it.
- No image-pipeline work of any kind — that remains a separate, later decision per Roman's own
  framing ("Not all today if you're tired... I'd prove the branch system before spending image
  money").

## Status

Planning document only. Committed, not executed. Awaiting Roman's authorization — all four, one
at a time, or a decision to skip broad branch proof and move to images on Boundary instead.
