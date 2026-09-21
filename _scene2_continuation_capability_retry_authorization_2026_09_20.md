# Continuation Capability Retry — Future Authorization Sheet (2026-09-20, eighth revision + harness fix note)

**Not authorized. Not run. No provider or image call has been made preparing this sheet.** This
describes a proposed, separate, later paid operation for when you choose to authorize it.

This revision follows retry #5 (real, run — the gate caught a bad Grok-sourced plan live, zero
author spend, see `_scene2_capability_retry5_report_2026_09_20.md`) and Roman's verdict:
**"Model strength alone is not the fix... The player choice should steer the story, not hijack the
skeleton."** The planner contract itself changed this pass — a REQUIRED SCENE FUNCTION frame now
renders before the reader's posture, and a new posture-echo check catches a plan that paraphrases
the raw Say/Do text instead of translating it. See `_scene2_required_scene_function_trace_2026_09_20.md`.

**Post-revision addendum:** retry #6 (same day) came back inconclusive — a real 502 from the
Grok-primary planner tier, $0 spend, no capability evidence either way
(`_scene2_capability_retry6_report_2026_09_20.md`). Traced dry, no provider calls: the real bug was
in the TEST HARNESS, not production code. `_e2e_network_gate.mjs`'s `waitForSettlement` returned the
instant the first tracked call settled, before the app's own correctly-implemented fallback/retry
logic had a chance to issue its next request — so both retry 5 (the gate's bounded retry) and retry
6 (the tier fallback after the 502) may have been silently cut off before they finished, not
genuinely single-shot outcomes. Addressed, NOT confirmed fixed (`_e2e_network_gate.mjs`,
quiet-period settlement check, commit `cc503c04`) — full control suite re-run green, 104/104, no
behavior change for any existing control, only timing. **This means retries 5 and 6 may understate
what the app actually did**; report language calling them single-attempt outcomes should be read
with that caveat. Retry #7 (below) shows this first pass at the fix was real but incomplete — read
the "Second addendum" before treating this settlement-timing question as resolved.

**Second addendum:** retry #7 (same session, on the fixed harness) hit a SECOND real 502 from the
same Grok endpoint — worth naming as a possible real, current reliability issue on that serving
function, separate from this codebase. New finding: the app's own console log proved
`_callTieredProvider`'s fallback logic DID fire correctly this time ("attempt 2 tier=fallback
provider=mistral...") — retry 6's implied "fallback never fires" read does not hold up. The gap is
narrower than first thought: the fallback's own resulting request never got tracked/settled before
the browser closed — a race the quiet-period fix didn't fully close. Widened further as a precaution
(`quietMs` default 3s → 8s), not a confirmed fix. See `_scene2_capability_retry7_report_2026_09_20.md`.
Two consecutive real infrastructure failures (0/2, both $0 spend) — before an eighth attempt, worth
deciding whether to wait out possible endpoint instability or accept the residual risk.

**Roman, 2026-09-21: "Hold off. Don't keep poking a flaky Grok endpoint tonight... the next 'retry'
is mostly testing whether that endpoint feels better, not whether Scene 2 works."** No further
retry authorized as of this addendum. Retry now only when separately authorized.

**Third addendum (same day, dry work only):** the scene-spine planner chain gained a third tier —
Grok primary → ministral-8b-2512 fallback → **gpt-4o terminal** (new) — since this is the one role
that decides the actual next-scene event and previously had no terminal, unlike every other
important text path in this codebase. A single Grok 502 (or a Grok+ministral double failure) no
longer necessarily means the planner produced nothing; the terminal tier gives it one more real
chance before genuinely exhausting. The Planner Function Gate is unchanged and applies identically
regardless of which tier produced the plan. Also: the harness observation gap behind retries 6 and 7
is now more precisely understood and directly addressed (not just widened) — see the corrected
pre-run note and full trace below. Proven 19/19 (`_scene2_planner_terminal_tier_control.mjs`) + 3/3
(`_harness_tier_log_cross_check_control.mjs`); full trace:
`_scene2_planner_terminal_tier_trace_2026_09_21.md`. All 8 pre-existing controls re-run green
(104/104 before this addition). No live retry run.

## Pre-run note — classify a fully-exhausted chain as infrastructure, not a story result

The chain is now Grok → ministral → gpt-4o terminal. If a future retry exhausts ALL THREE tiers
(each returning a transport/parse failure — `_callTieredProvider` throws "all tiers exhausted"):
classify it immediately as provider/serving instability across multiple providers simultaneously —
record cost (likely near $0, since failed tiers rarely bill) and stop. Do NOT interpret total
exhaustion as evidence about the required-scene-function contract, the planner-policy change, or
Scene 2 capability. A single Grok 502 alone is no longer grounds to stop early — the chain should be
given the chance to fall through to ministral and then gpt-4o before concluding infrastructure
failure. That capability question stays open and untested until a real planner reply is obtained on
some tier AND evaluated by the Planner Function Gate.

**Fourth addendum, retry #8 (same day) — the harness fix worked; the diagnosis changes.** Under the
full 3-tier chain with the tier-log-cross-checking harness, retry #8 ran correctly end to end: six
real dispatches (grok/ministral/gpt-4o, twice — the initial pass and the app's own bounded retry),
all observed through to real settlement, exactly as designed. **All six returned HTTP 502 with the
identical error body** `"An error occurred with this application. NO_RESPONSE_FROM_FUNCTION"` —
across THREE independent, unrelated providers (xAI, Mistral, OpenAI). That is not a plausible
coincidence across three separate companies. Checked directly on this machine: **157** running
`@vercel/node/dist/dev-server.mjs` processes, most dating back days, with only one actually bound to
port 3000. This makes a LOCAL dev-server infrastructure problem the better-supported explanation for
retries 6-8's failures than "Grok is flaky" — the earlier single-tier observations (retries 6-7)
were consistent with either explanation; this run's three-independent-provider, identical-error
result is not. Full account: `_scene2_capability_retry8_report_2026_09_21.md`. **Revise the pre-run
note above accordingly:** a full chain exhaustion with this exact identical-error-across-providers
signature should prompt checking local dev-server health (and the stale-process count) BEFORE
assuming provider-side instability — the gpt-4o terminal tier, however well-built, cannot route
around a problem in the shared local proxy layer all three tiers depend on.

## Future option — controlled fallback-path test (not a policy change)

A SEPARATE, explicitly-scoped option still exists for later, now less urgent given the terminal
tier: force `window._scenePlannerEngine = 'ministral'` (the existing escape hatch, `public/app.js`)
for one retry, to verify the REST of the continuation stack against a planner tier that isn't Grok.
Explicitly NOT a proposal to revert the Grok-primary policy decision. Would need its own explicit
authorization, separate from a normal Grok-primary retry.

## What this is testing

Not "which model is smarter" — closed; retry 5 showed Grok alone didn't fix it. Not "does the gate
work" — proven dry AND live (retry 5). This would be retry #6: the FIRST real test of whether a
required-function frame — instantiated first, with posture as modulation rather than the event's
source — changes what either model actually proposes. Six real attempts on one causal input is a
lot; whoever authorizes this may want to weigh a fresh player branch instead.

## What changed since retry 5

- **Root causes A/B/C**, **Findings 1-3**, the **Planner Function Gate**, and the **Grok-primary
  planner policy** — all unchanged this revision, confirmed coexisting with today's addition.
- **NEW — REQUIRED SCENE FUNCTION frame**: `STARTER_PLANS.starter_first_sacrifice.scenes[n=2]`
  carries a new `sceneFunction` field (not new canon — restated from this row's own `exitState` and
  the seed's own worldTruths-sanctioned lanes), rendered in the planner prompt as a HARD block
  BEFORE the reader's posture. The posture line itself is reframed as the reader's "ANGLE" into that
  frame, never the source of the central event. Two new required JSON output keys
  (`scene_function_instantiated`, `aftermath_obligations`) requested when the field is present.
- **NEW — posture-echo reject check**: `_postureEchoBigram`, folded into
  `_detectPlannerFunctionGap` as a second, independent rejection reason — catches a plan that
  shares a meaningfully distinctive phrase with the reader's raw Say/Do text (retry 5's real plan
  shared "to burn"/"burn for" with the Fate-Card line it was supposed to translate, not restate).
- Proven 14/14, `_scene2_required_scene_function_control.mjs`, using retry 5's real posture + real
  rejected plan as the red fixture. All 8 pre-existing controls re-run green (104/104 total across
  the suite after this addition).

## Scope

- Same mechanism as every prior replay: reuse the already-paid, persisted real OAS turn-reply,
  Fate-Card, and scaffold content via the zero-cost stub-lane replay — real spend starts only at the
  planner/author call.
- Same player decision (Boundary card, the same real Say/Do) — a capability retry on the SAME
  causal input, not a new player branch — unless whoever authorizes this prefers a fresh branch,
  given five failures/rejections already on this one.
- The planner now sees the REQUIRED SCENE FUNCTION frame before the posture, and must return
  `scene_function_instantiated`/`aftermath_obligations` alongside its existing fields.
- If the plan fails the (now two-part) Planner Function Gate — no aftermath signal, OR echoes the
  posture almost verbatim — the attempt stops there, $0 author spend, reported as a gate rejection.
- Only if the gate passes does the author fire; THEN run `_detectSceneAdequacyFailure` on the
  delivered prose before calling it usable.
- If this retry ALSO fails or gate-rejects, that is real, strong evidence the remaining gap is
  neither model-tier-shaped nor posture-framing-shaped — a genuinely harder open question, reported
  honestly, not concealed.

## Cost ceiling (estimate)

Retry #5's real, measured total was $0.00981465 (gate-rejected before author spend — the cheapest
outcome so far). Retries 6-7 were $0.00 (pure 502 exhaustion under the old 2-tier chain). If a
future retry's plan clears the gate, real cost would run closer to retry #4's $0.228671 (Grok
planner + Grok author + adjacent calls). **Ceiling revised** for the new 3-tier planner chain (Grok
→ ministral → gpt-4o terminal) — worst case now includes a real gpt-4o call if both earlier tiers
fail transport-wise (estimated ≤$0.03 for that one call at this prompt's real size, ~24.3K chars /
~6.1K tokens, `max_tokens: 1200`, well under the $0.08 line below):

| Phase | Ceiling (USD) | Physical requests |
|---|---|---|
| scene2-planner (chain now 3-tier — Grok → ministral → gpt-4o terminal) | $0.08 | ≤3 |
| scene2-author (unchanged) | $0.40 | ≤2 |
| **Total** | **$0.48** | **≤8** |

Adequacy re-validation is dry (`_detectSceneAdequacyFailure`, `_detectPlannerFunctionGap`) — $0
additional. This is a proposed revision on an unauthorized, not-run sheet — not itself a spend
commitment.

## What this would (and would not) prove

Would prove: whether framing the required scene function explicitly, before the planner reads
posture, changes what event it proposes — and if the gate now passes, whether the resulting
dramatization clears full adequacy.

Would not prove: that Scenes 3-10 are adequate; that a different player branch holds the same
standard; that beat-kind diversity (still not encoded as a reject-only check) is satisfied. A single
sample is still one sample — this framework change deserves more than one real draw before anyone
concludes it works, but that's a larger, separately-authorized program, not this one retry.

## Status

Fifteen fixes in place and dry-proven across nine passes (root causes A/B/C, Findings 1-3, the
Planner Function Gate, the Grok-primary planner policy, the Required Scene Function frame, the
posture-echo check, the gpt-4o terminal tier, the harness tier-log cross-check, the reserved/
aftermath schema hardening). Requirements and traces documented
(`_continuation_scene_adequacy_requirements_2026_09_20.md`,
`_scene2_capability_test_root_causes_2026_09_20.md`, `_scene2_skeleton_handoff_trace_2026_09_20.md`,
`_scene2_skeleton_handoff_trace2_2026_09_20.md`, `_planner_role_ledger_2026_09_20.md`,
`_scene2_required_scene_function_trace_2026_09_20.md`,
`_scene2_planner_terminal_tier_trace_2026_09_21.md`, `_scene2_reserved_schema_trace_2026_09_21.md`).
Seven real capability samples on record — six FAILED/gate-rejected/would-have-been-gate-rejected,
plus retry 9 (schema-rejected, real content progress), plus three real infrastructure non-results
(retries 6-8, all $0, resolved by the local dev-server cleanup — see
`_local_dev_server_contamination_incident_2026_09_21.md`).

**Fifth addendum, retry #9 (same day, after environment cleanup) — real content progress, blocked
by a NEW, narrow bug.** First retry on the cleaned environment: zero 502s, two real HTTP 200 planner
replies ($0.014627 total). Both explicitly engaged the required-scene-function frame with real,
specific `scene_function_instantiated`/`aftermath_obligations` content — the first time in nine real
attempts. Both were rejected before reaching author OR the Planner Function Gate, by a different,
pre-existing, earlier validator (`_validateLocalObjective`'s reserved-events completeness check):
both replies returned `"reserved": {}` (empty) instead of the four required IDs, despite the
planner's own system prompt requiring them. Full account: `_scene2_capability_retry9_report_2026_09_21.md`.
This is a genuinely new, narrowly-diagnosed, mechanical schema-completeness issue — not a repeat of
any prior finding. No further retry followed retry 9, per standing instruction.

**Sixth addendum (same day, dry fix) — the reserved/aftermath schema gap is closed, not the
validator loosened.** `reserved`/`aftermath` now get their own dedicated prompt block: an explicit
"an EMPTY object {} for EITHER is INVALID" statement, the real ids restated, and a worked JSON
example built from the scene's own real ids. `_validateLocalObjective`'s reject-only check is
completely unchanged — proven by re-testing retry 9's real replies against it unmodified (still
correctly rejected) and confirming attempt 1's real content, with ONLY reserved/aftermath corrected,
is accepted. Proven 16/16, `_scene2_reserved_schema_control.mjs`; full trace:
`_scene2_reserved_schema_trace_2026_09_21.md`. A future retry would be the first real test of
whether the planner can now preserve retry 9's genuinely improved scene-function behavior WHILE
satisfying the hardened schema — a combination not yet tested live. No live retry run in this pass.

**Seventh addendum, retry #10 (2026-09-21) — zero capability evidence, a THIRD infra fault, distinct
from retries 6-8.** One retry authorized to test the reserved-schema-hardened stack live. Both real
dispatch rounds (2 × 3 tiers = 6 calls) returned 502 `NO_RESPONSE_FROM_FUNCTION` across all three
providers, identically — the same symptom as retries 6-8, but a **different, more specific root
cause** this time: the live `vercel dev` server log showed 95 `Error: spawn EBADF` lines landing
exactly at the point of failure — the dev-server parent process (PID 24065, up since the prior
Wednesday) failed to spawn a child handler at the OS level, independent of which provider endpoint
was being called. `ps aux` ruled out the retry-6-8 cause (leaked stale children): only 6 fresh,
~1-minute-old children existed this time, not 155. The planner never produced a single reply; none
of the five evaluation questions are answerable. $0 spent. Full account:
`_scene2_capability_retry10_report_2026_09_21.md`. No follow-up retry run, per standing instruction.
Likely fix (NOT actioned, needs separate authorization distinct from "run a retry"): restart the
`vercel dev` parent process itself, not just clean up children as before.

**Eighth addendum, retry #11 (2026-09-21, after dev-server restart) — reserved-schema fix
CONFIRMED live; a deeper, substantive gate correctly caught a different real gap.** The
`vercel dev` parent process (PID 24065) was restarted per separate authorization; confirmed
`localhost:3000` responded before the retry (a side effect of the restart: `vercel` self-updated
its own `package.json`/`package-lock.json` entry `^59.5.0` → `^59.23.2`, left uncommitted,
flagged not decided; `playwright-core@1.62.1` — an out-of-band, unpinned-in-lockfile dependency —
was pruned by the same process and reinstalled with `--no-save` to match its original state).

One real planner dispatch, HTTP 200 first try, $0.01018465. The real reply's `reserved` and
`aftermath` objects carried all 8 required ids with the correct values, exactly as the hardened
schema block asks — the first live confirmation the Sixth-addendum fix works. The plan then
reached and was correctly rejected by the Planner Function Gate: the model's own
`scene_function_instantiated` self-report and `tactical_move` field borrowed institutional/
procedural vocabulary, but the actual `state_change` ("Julian crosses the circle and stands
before Lirael, naming himself the one she lost") was still the same in-ritual confrontation
beat as the scene's opening, not a genuine aftermath event — a label/content mismatch the gate
is specifically built to catch (it reads the real proposed event, not the self-report). The
retry mechanism reused the cached objective rather than drawing a fresh planner sample, so this
is one real draw, correctly stopped resumably. No author call, no prose. Full account:
`_scene2_capability_retry11_report_2026_09_21.md`. No follow-up retry run, per standing
instruction.

## Status update (after retry #11)

Nine real capability samples now on record. The reserved-schema fix (Sixth addendum) is
CONFIRMED against a live draw — no further work needed there absent new evidence. The remaining
open problem is now narrower and better isolated than at any prior point this session: the
planner's prompt does not yet reliably make the model choose a genuine aftermath event over
re-staging the immediate ritual moment under aftermath-sounding vocabulary. Both gates
(structural validator, Planner Function Gate) are confirmed working correctly against real
model output in both directions (one pass, one correct catch) — the gates are not the problem.
A future retry would be the first test of whether a fresh planner draw (not a cached-objective
retry) can produce a genuinely new aftermath event on this same Boundary input.

**Ninth addendum (2026-09-21, dry fix) — freeform "instantiate the scene function" replaced with a
constrained aftermath LANE MENU.** Roman: "The planner is now getting the scene function, filling
the schema correctly, being checked by the right gates, failing cheaply before author spend... The
planner model is the thing still not doing the creative jump: it can label 'procedural pressure,'
but it keeps staging the same ritual moment... Change the Scene 2 planner contract from 'invent an
aftermath event' to 'choose and instantiate an aftermath lane.'" `STARTER_PLANS.starter_
first_sacrifice.scenes[2]` now declares 5 concrete `aftermathLanes` (Dohkar preliminary review,
family accusation, Julian jurisdiction challenge, Lirael constrained, Lirael's own defensive
path), each with a `signalRx` the Planner Function Gate checks the planner's real proposed content
against. The prompt now requires `chosen_aftermath_lane` (one of the 5 ids) and
`lane_posture_modulation`; the gate rejects a plan with no chosen lane OR one whose declared lane
isn't backed by matching content — using retry 11's real (pre-fix) reply as the red fixture in both
forms (no lane at all; a synthetic lane label added over the same unchanged content). Proven 22/22,
`_scene2_aftermath_lane_control.mjs`; full trace: `_scene2_aftermath_lane_trace_2026_09_21.md`.
`_validateLocalObjective` untouched — this is a Planner Function Gate change only. No live retry
run in this pass.

## Status update (after the aftermath lane menu fix)

A future retry would be the first real test of lane-selection scaffolding, not just freeform
planner fidelity: does the planner, given a concrete menu instead of open creative freedom, select
one of the 5 allowed lanes AND produce content whose own text actually matches that lane's signal —
on this same Boundary input, or a fresh one. If it still fails, the failure would newly distinguish
between "the planner can't follow a menu at all" (a harder problem) and "the planner follows the
menu but the signal patterns are too narrow" (a prompt/regex-tuning problem, not a capability one).

## Status update (after retry #10)

Eight real capability samples now on record: six FAILED/gate-rejected/would-have-been-gate-rejected,
retry 9 (schema-rejected, real content progress), and now four real infrastructure non-results
(retries 6, 7, 8 — leaked child processes, $0 each — and retry 10 — parent-process `spawn EBADF`,
$0). All six dry-proven fixes remain unconfirmed end-to-end against a live 200 response. The local
dev environment has now caused two DISTINCT infra failures in two days; before any further retry,
the `vercel dev` parent process itself likely needs a clean restart (separate authorization required
— this is more invasive than the prior child-process cleanup, since it stops the actively-listening
server).

**Tenth addendum, retry #12 (2026-09-21, after the aftermath lane menu fix) — the planner chose a
valid lane; its own content still did not instantiate it.** One real planner dispatch, HTTP 200
first try, $0.0113159. `chosen_aftermath_lane: "lirael_defensive_path"` was populated with a valid
id — real engagement with the new menu mechanism. But the real `state_change` ("The presiding
Dohkar turns to Lirael and demands she state before the assembly whether she shaped Seren's wish")
has the DOHKAR as actor, demanding an answer — not Lirael taking any of the lane's own defensive
actions (submit to procedure, gather proof, conceal, flee, counter-accuse, force a procedural
bind). The Planner Function Gate's new lane-content check rejected it correctly, naming the exact
declared lane and exactly why the content doesn't back it. Reserved/aftermath schema again fully
correct (4/4, 4/4) — that fix continues to hold. Retry mechanism reused the cached objective (no
second real draw), so this is one real sample, correctly stopped resumable. Full account:
`_scene2_capability_retry12_report_2026_09_21.md`. No follow-up retry run, per standing
instruction.

## Status update (after retry #12)

Ten real capability samples now on record. Across the last two real samples (retries 11 and 12 —
freeform, then lane-menu), the SAME underlying pattern recurs: the model satisfies whatever
compliance surface it is given (aftermath vocabulary, then a valid lane id) while its actual
proposed event stays anchored to the Dohkar-interrogates-Lirael beat the scene opens on. The lane
menu did not solve the creative-jump problem; it made the same failure more precisely diagnosable
— the gate now names exactly which lane was claimed and exactly why the content doesn't back it.
Both gates (structural validator, Planner Function Gate, now including the lane-content check)
continue to behave correctly against real model output, in both freeform and menu-constrained
forms. This is two real samples in a row showing the same specific pattern, not proof the model
can never leave the ritual moment — but it is a real, replicated signal that the remaining problem
may be deeper than schema/menu compliance: getting the model to actually write a DIFFERENT event,
not merely label one correctly.

**Eleventh addendum (2026-09-21, dry architecture change) — the model no longer decides the event;
deterministic code resolves it before the model sees the task.** Roman: "The planner is not
failing because it lacks a lane menu. It's failing because the event-deciding step is still too
generative for a starter scene that has a known issue skeleton... Deterministically select or
constrain the lane/event frame before the model sees the authoring task." `_resolveStarterEventFrame`
(new, `public/app.js`) is a pure function — no model call — keyed on
`state._intimateInterruption.selectedSlot`, the fate-card slot the READER already clicked
(generic across every starter, not First-Sacrifice-specific plumbing). First Sacrifice's Scene 2
row now declares `eventFrameBySlot` (all 5 slots, each mapped to one of the SAME 5 `aftermathLanes`
ids, never a 6th) + `defaultEventFrame`. When a frame resolves, the prompt renders a REQUIRED
EVENT FRAME block that REPLACES the free-choice menu entirely (not both), and the Planner
Function Gate rejects ANY declared lane other than the resolved one — even a valid, menu-listed
one — before the content-signal check runs. Old free-choice behavior is fully preserved for any
row that doesn't declare the new fields. Proven 26/26,
`_scene2_event_frame_resolver_control.mjs` — using retry 12's real reply as the red fixture (now
rejected specifically as the WRONG lane, not just unmatched content) and a synthetic green
fixture that both declares and instantiates the resolved lane; full trace:
`_scene2_event_frame_resolver_trace_2026_09_21.md`. `_validateLocalObjective` untouched. No live
retry run in this pass.

## Status update (after the event-frame resolver fix)

A future retry on this same Boundary input would be the first real test of whether the model,
given a single deterministically-resolved event frame instead of any lane choice at all, actually
writes into it — the model's only remaining job is prose, dialogue, interiority, argument, and
local complications inside a fixed event, not deciding what the event is. If it still fails, the
failure would newly distinguish between "the model can't write convincingly inside ANY fixed
frame" (a much more fundamental capability question) and "the model still tries to substitute its
own event even when told not to" (a compliance/instruction-following question) — either of which
would be more informative than anything the freeform or menu-based attempts could show.

**Twelfth addendum, retry #13 (2026-09-21, after the event-frame resolver fix) — FIRST FULL
SUCCESS.** Real cost $0.2255553 (8 requests, well under the $0.45 ceiling). Confirmed directly
from the real dispatched prompt: the resolver correctly selected `family_accusation` for the
Boundary card, and the prompt presented it as a required fact ("this is NOT a choice among
options"), not a menu. The planner instantiated it closely
(`state_change`: "Seren's family steps out of the assembly and publicly demands remedy for what
the wish cost Seren" — near-verbatim to the required frame). BOTH gates passed. The author ran
and produced a full CG scene: three new named-role family characters step forward and formally
accuse Lirael, real escalating dialogue (5 beats), real interiority, continuity/canon fully
preserved (mouth-band, The Answer, the Dohkar's claimed authority, no reserved id touched), and a
real forced end choice matching the row's own decision axis. One genuine, specific gap found and
named honestly: Julian (the LI) is present but nearly inert in this draft — one beat references
him, no dialogue, no direct exchange with Lirael — thinner than the standing adequacy standard
calls for. Full account: `_scene2_capability_retry13_report_2026_09_21.md`. No follow-up retry
run, per standing instruction.

## Status update (after retry #13)

Eleven real capability samples now on record. **Boundary Scene 2 generation is architecturally
successful — this sample is NOT final/approved prose.** Planner and author both completed, gates
both passed for substantive reasons, real prose produced; the event-frame resolver architecture
change is now confirmed live, not just dry-proven. It is not treated as finished content because
of a real, named quality gap: LI presence is weak. Remaining open items: (1) only the Boundary
card's frame (`family_accusation`) has been tested live — the other 4 slots
(`temptation`/`silence`/`reversal`/`confession`) and the `defaultEventFrame` fallback remain
untested against a real draw; (2) LI presence — addressed dry in the very next pass, see below.

**Thirteenth addendum (2026-09-21, dry quality fix) — LI presence is now a required authoring
axis for continuation scenes, not just a post-hoc detector.** Roman: "Julian still needs to exert
pressure in it: a look, a line, a refusal to protect her, a procedural move, a charged silence
that changes the room, something... The family accusation can be the public engine of the scene,
but Julian must not disappear." A new LI PRESENCE FLOOR directive in
`_buildCGScreenplayUserPrompt` (the real CG continuation author's prompt) requires at least one
meaningful LI moment (dialogue, or a restrained-but-felt anchored reaction beat) whenever the LI
is present in a continuation scene — explicitly NOT a dominance or rescue requirement, and inert
for Scene 1 openers or any story with no LI configured. A new, complementary detector,
`_detectLIPresenceFloor` (distinct from the earlier `_detectLIPresenceDominance`, which only
judges beats that already mention the LI and needs >=3 of them to fire at all — too few for retry
13's single Julian beat), is exposed for future QA/reporting use, not wired as a hard post-author
reject gate in this pass (that would double author spend on every borderline scene — a separate
decision, not requested here). Proven 15/15, `_scene2_li_presence_floor_control.mjs` — using
retry 13's real captured scene as the red fixture (flagged: Julian present, no dialogue, no
anchored beat) and two green fixtures (a restrained anchored beat; one dialogue line) each
independently sufficient; full trace: `_scene2_li_presence_floor_trace_2026_09_21.md`. No live
retry, no image calls, no prose rewrite — retry 13's real captured prose was not hand-edited.

## Status update (after the LI presence floor fix)

A future retry on this same Boundary input would be the first real test of whether the model,
now given both a deterministic event frame AND an explicit LI-presence requirement, produces a
scene that is both architecturally correct (moves into the resolved aftermath lane) AND romance-
complete (the LI has at least one real moment). If Julian is still inert on a fresh draw, that
would distinguish "the directive doesn't change model behavior" (a prompt-fidelity question, like
the earlier lane-vocabulary gap) from "this was one draw's variance" — either way, more
informative than treating retry 13 as finished.

**Fourteenth addendum, retry #14 (2026-09-21, quality retry) — architecture held again; a
DIFFERENT, narrower structural rejection blocked the author before LI presence could be tested.**
$0.0082157, 2 real planner attempts, both instantiated `family_accusation` closely and
consistently (matching retry 13's accepted content), both rejected by the pre-existing
`_validateLocalObjective` check on `local_objective_actor` — NOT the Planner Function Gate, NOT
anything LI-related. Attempt 1 invented an undeclared collective ("Seren's family"); attempt 2
used the row's own declared collective ("the assembly"), which the validator explicitly forbids
as an actor. Diagnosed as a genuine, narrow, previously-latent tension: the `family_accusation`
lane's own natural grammar is a GROUP acting, but the individual-actor rule requires one roster
member — retry 13 resolved this correctly (`local_objective_actor: "Lirael"`, her own agency
driving the family's action); retry 14's two attempts resolved it more literally, and invalidly,
both times. Not a regression from the LI presence floor change (that directive lives in the
AUTHOR's prompt, never reached here) or from any other fix this session. Full account:
`_scene2_capability_retry14_report_2026_09_21.md`. No follow-up retry run, per standing
instruction. No dry fix authorized or made in this pass.

## Status update (after retry #14)

Twelve real capability samples now on record. The `family_accusation` frame itself continues to
resolve and get instantiated reliably (three consecutive real draws: 12, 13, 14, all producing
near-identical, on-target `state_change` text) — the event-frame resolver mechanism is solid. The
open item is narrower still: `local_objective_actor` for a group-driven lane needs clearer
guidance so the model reliably attributes agency to an individual (as retry 13 did) rather than
naming the group itself (as retry 14 did, twice). LI presence remains untested against a real
completion — retry 13 is still the only sample that reached the author, and it is still the one
sample showing the LI-inertness gap this session's most recent fix targets.

**Fifteenth addendum (2026-09-21, dry role-model fix) — the fix is who carries the objective, not
a loosened validator.** Roman: "The fix is not to loosen collectives into actors. The fix is to
make the lane specify who carries the objective versus who supplies pressure." Each of the 5
`aftermathLanes` now declares `objectiveActor` (an individual roster member) and `pressureSource`
(the group/institution applying pressure, when the lane is group-driven — `family_accusation` →
objectiveActor "Lirael", pressureSource "Seren's family"; the other 4 lanes have no pressure
source). The prompt now states this explicitly wherever a lane with a pressure source is in play
— both the deterministic-resolution path (Boundary → `family_accusation`) and the free-choice
fallback menu — and two new JSON keys (`pressure_source`, required when the lane has one;
`institutional_actor`/`li_pressure_actor`, always optional) give the model somewhere to put group
pressure that isn't `local_objective_actor`. `_validateLocalObjective`'s reject-only check is
completely unchanged — proven by re-testing retry 14's real two replies against it unmodified
(still correctly rejected, RED-B citing retry 14's exact real live rejection text) and confirming
attempt 1's real content, with only the actor corrected to Lirael and `pressure_source` added, is
accepted. Proven 21/21, `_scene2_actor_pressure_source_control.mjs`; full trace:
`_scene2_actor_pressure_source_trace_2026_09_21.md`. No live retry run in this pass.

## Status update (after the actor/pressure-source fix)

A future retry on this same Boundary input would be the first real test of whether the model,
given explicit role separation, reliably puts Lirael in `local_objective_actor` and Seren's family
in `pressure_source` — closing the specific gap retry 14 found — and, if the plan passes both
gates and the author actually reaches prose, whether Julian gets a real moment under the LI
PRESENCE FLOOR directive. LI presence itself remains untested against any real completion since
retry 13; that question and this one are now both live for the next authorized retry.

**Sixteenth addendum, retry #15 (2026-09-21, quality retry) — the best real sample yet, AND a
real harness capture bug.** Fully corrected total real cost **$0.13614335** (the replay script's
own `report.json` undercounted this at $0.0108684 — its call-tracking failed to correlate the
author's real 200 response, recorded `status: null`, and exited believing the scene was never
captured; a first recovery pass found $0.0955956 from the raw log, then building the regression
control for the harness fix below surfaced two MORE real calls — $0.0006303 ministral +
$0.0399175 gpt-4o — the same gap had also missed). On content: `local_objective_actor: "Lirael"`,
`pressure_source: "Seren's family"` — the actor/pressure-source fix worked cleanly on the first
real draw since it was built. Both gates passed. The author produced a full scene preserving
continuity/canon (mouth-band, The Answer, the Dohkar's claimed authority, no reserved id
touched) and, for the first time, a genuine, positive LI-presence result: Julian never speaks or
acts to resolve anything, but gets his own dramatic-question panel, a restrained anchored beat
("his stillness feels different now"), a canon-grounded emotional tell (his Weave-Script catching
the light), a charged mutual-gaze beat with Lirael, and a closing "his stillness asks the question
anyway" — exactly the "charged silence that changes the room" the LI PRESENCE FLOOR directive
asked for, without hijacking the family-accusation scene. One small, honestly-noted quality gap:
beat 9's dialogue narration implies a family member speaks ("one says") but its structured
speaker tag says "the presiding Dohkar" — a minor internal inconsistency, not gate-relevant. Full
account: `_scene2_capability_retry15_report_2026_09_21.md`. No follow-up retry run, per standing
instruction.

**Seventeenth addendum (2026-09-21, dry harness fix) — the capture bug is fixed, not just
flagged.** Root-caused to `_e2e_network_gate.mjs`'s response-correlation logic matching a settled
response to its dispatch by URL STRING alone (a LIFO "most recent unsettled" heuristic), which can
misattribute when multiple requests to the same URL (e.g. planner + author, both via `/api/proxy`)
are in flight concurrently and their responses arrive out of order. Fixed to match by Playwright's
own request-object identity — unambiguous regardless of ordering; benefits every real-browser
control in the repo, not just this one script. A second, independent safety net was added directly
to `_scene2_repair_replay_sample.mjs`: before ever concluding "never settled," it now cross-checks
its own persisted JSONL log (guaranteed-complete by construction — every dispatch/response is
appended the instant it's observed) and reconciles dispatch/response pairs itself; if the log has a
real settled record the in-memory view missed, that record and its real cost are used instead of
giving up. Proven 11/11, `_e2e_network_gate_response_correlation_control.mjs` — a synthetic
concurrent-request race proving the general fix, plus retry 15's own real, unmodified persisted
log fed through the new reconciliation logic, correctly recovering all 4 real calls and the fully
corrected $0.13614335 total. Full trace:
`_scene2_repair_replay_sample_harness_fix_trace_2026_09_21.md`. No provider or image calls, no
story retry. Retry 15's real captured prose was not touched — only its report's cost figure and
status language were corrected.

## Status update (after the harness fix)

Thirteen real capability samples now on record; retry 15 remains the strongest — architecture,
actor/pressure-source separation, and LI presence all held together on one real draw, closing
every specific gap named across retries 11-14. It remains ONE sample, not proof of reliability
across draws. The run-summary accounting bug that made retry 15 hard to trust is now fixed and
dry-proven; the next authorized paid retry (on Boundary or any other card) can be trusted to
report its real settlement and real cost correctly.
