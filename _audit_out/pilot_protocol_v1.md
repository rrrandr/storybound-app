# REAL-OUTPUT PILOT PROTOCOL v1.1 — narrative quality and continuity, staged

Written 2026-09-05 against `main` @ `d41dc35` (`public/app.js` sha256[0:16] `bca5828c5d67cd5b`).
v1.1 incorporates two corrections from review: the planner route is resolved **first**, by
evaluating Ministral 8B / 14B rather than weakening the governor; and the in-story scene 20→21
continuation is **not** the `startBook2` issue-boundary path, which becomes a separate later arm.
**Uncommitted, for review. Authorizes nothing.** Every claim was read in source or in an artifact
on disk; the file that carries the evidence is named beside it.

> **STAGE 0 RUN 2026-09-05 — result in `_audit_out/stage0_preprocessor_comparison.md`.** Both
> routes admitted 3/3; 8B fails G1 (omits `revelation_bridge`); 14B passes G1, fails G2; production
> rejected all six plans, largely on validator classes no model has been shown to pass. Neither
> arm passed the gate as written; stage 1 not enabled; patches reverted; $0.021 spent of $0.10.
> G3 blind pack awaits a human read.

**The sequence.** Each stage has its own authorization and its own stop.

| stage | what | paid? | approx cost |
|---|---|---|---|
| 0 | preprocessor comparison: same real planner request, 8B vs 14B | yes, tiny | ≈ $0.03 |
| 1 | enable the one route that passed; prove admission in a $0 dry rehearsal | no | $0 |
| 2 | 3-scene quality checkpoint, real prose | yes | ≈ $0.65 |
| 3 | the 22-scene issue run (only if stage 2 is clean) | yes | ≈ $2.9 expected, capped |
| 4 | separate later arm: real `startBook2` boundary | yes | ≈ $0.6 |

---

## 0 · Why stage 0 exists — the blocker, and why the governor is right

The Scene-1 opening planner goes to `mistral-small-latest` under role `PROMPT_PREPROCESSOR`
(`app.js:96169`, `264215`). The quota governor merged in `640a258` admits a request only if
`utf8 bytes of messages + max_tokens ≤ tpm` and refuses larger requests **before dispatch**,
terminally, with no fallback (`api/_mistral-governor.js:86-127`, outcome
`reservation_exceeds_model_allowance`; `api/mistral-proxy.js:215`).

Run against the real captured planner request from the last paid Scene-1 run
(`_paid_scene1_v2/01_mistral_request_response.json`), using the governor's own function:

```
model=mistral-small-latest  messages=2  max_tokens=2055
reserve=92,980   allowance=20,000   →  OVERSIZED (refused before dispatch)
provider-reported prompt_tokens on that request: 22,698
```

The governor is **correct**: 22.7k tokens never fits a 20k-per-minute allowance, which is why
the same call drew Mistral's own `429 rate_limited` twice on 2026-09-04
(`_audit_out/cold_scene1_run2.md`). The request is simply on the wrong bucket. `main` is
auto-deployed, so every live path that runs the opening planner — Famous Fate, custom corridor
stories, the post-unlock setup behind a baked starter (`_bakedGenesisGate` → `handleBeginStory`,
`app.js:134451`) — should now be refused with "Storybound is at capacity". **Not verified against
the live site here** (no production request was made); it follows from deployed code plus the
measured request, and it should be checked first. Baked starters hide it until the first Say/Do
because all three packages are placeholders (`public/starter-scenes.js:76,120,171`).

**Nothing in this protocol relaxes the governor.** The fix under evaluation moves the call to a
bucket that fits: Ministral 8B is 625,000 TPM / 3.13 RPS, 14B is 937,500 TPM / 0.5 RPS
(`api/_mistral-governor.js:53-55`, already configured, inert until allowlisted). On 8B the same
request is ~15% of the minute; on 14B ~10%. 14B's 0.5 RPS means one request per two seconds,
which matters for anything bursty (handoff §7).

---

## STAGE 0 · Preprocessor comparison — 8B vs 14B on the same real request

**Question.** Does either Ministral model honour the planner's JSON contract on production's own
request, and plan the scene at least as well as Small did on 2026-08-25?

**Harness — exists.** `_rescore_replay.mjs` ("bounded planner-only probe"): exactly one real call
per sample, the opening planner; everything upstream mocked; **Grok hard-blocked** (an author
attempt marks the sample a violation); the request built by unmodified production `app.js`; the
plan scored with the product's own validators (`_targetInScene`, `_validateAngleConcreteness`,
cast/WHERE/offstage/one-each/fusion), and the harness **fails itself if its scorecard disagrees
with the product verdict** (`:231-269`). It follows whatever model the client sends — no model is
hardcoded. Per sample it persists `sample{i}_{request,response,verdict}.json`.

**What has to change to run it, and nothing more.** The two drafts in `_drafts/` — the proxy
allowlist + per-model reasoning map, and the flag-gated client route (`window._preprocessorRoute`
→ `small | 8b | 14b`, default `small`) — both `git apply --check` clean against HEAD today. Applied
to the **working tree only** for the comparison, not committed. With the flag unset the committed
behaviour is byte-identical (default `small`). The route is selected per arm with the same
`addInitScript` the cold run already uses (`_cold_scene1_cost_run.mjs:82`, `PP_ROUTE=`). The
governor table needs no change.

**Design.**

- Arms: `8b` and `14b`. **3 samples each, sequential** (the planner is non-deterministic;
  3 is the probe's established sample count and enough to see a contract failure rate, not a
  quality rate — screening, not confirmation).
- Reference at $0: the real Small plan from 2026-08-25 (`_paid_scene1_v2/03_resolved_spine_and_stage.json`,
  its faults documented in `_paid_scene1_v2/EVIDENCE.md`), scored on the same card.
- Request identity asserted per sample: role `PROMPT_PREPROCESSOR`, `response_format`
  `json_object` preserved, `reasoning_effort` absent on Ministral (the proxy drops it — the
  draft's per-model map), message bytes within ±2% of the reference request, governor outcome
  `admitted` with the reserve logged.
- Ceiling: 6 dispatches; any 7th is blocked at the route.

**Pass/fail — fixed now.**

| gate | pass |
|---|---|
| G1 contract | JSON parses and validates 3/3; zero schema faults; option ids come from the backend-offered set |
| G2 substantive plan | ≥ 2/3 samples with **zero substantive** faults: exact 4-person cast, canonical WHERE, no invented identity, no offstage staging, one assignment each. Lexical/morphological rejections (the "draping vs drapes", "vulnerable" class in `EVIDENCE.md`) are counted **separately** and do not fail G2 |
| G3 blind plan quality | the 6 plans plus the Small reference, labels shuffled, key sealed; two readers rank on two questions only: *would this plan produce the scene the seed describes?* and *are the C+ angles ACTS or DIAGNOSES?* (`feedback_observations_not_abstractions`). Verdicts locked before the key opens |
| G4 admission | every sample's governor verdict `admitted`; reserve ≈ 93k against the model's TPM |

**Selection rule.** If exactly one arm passes G1+G2 → that route. If both pass → **8B unless 14B
wins G3 decisively** (both readers rank all three 14B plans above all three 8B plans), because
14B's 0.5 RPS is the tightest rate in the family. If neither passes → stop; the planner needs a
prompt-size or contract change, which is its own decision.

**Cost.** Request ≈ 22.7k tokens, output ≤ 2,055. At the rates the draft records
($0.15/M for 8B, $0.20/M for 14B — **re-read from the Mistral pricing page at authorization**):
≈ $0.004 per 8B call, ≈ $0.005 per 14B call, **≈ $0.03 for all six**. No Grok, no author, no
images. Mistral usage may come back empty on some responses; an empty usage is UNKNOWN, never zero.

**Stop.** Report the 6 verdict files, the blind ranking and the selection. No further dispatch
under this authorization.

---

## STAGE 1 · Enable the selected route — $0

A **scoped commit**, the routing decision made explicit: apply the two drafts, set the default of
`_preprocessorRoute` to the selected model, nothing else. Acceptance, all free:

- `npm run verify:files verify:security verify:scene1` green; `node _mistral_path_audit.mjs`
  still reports 0 unguarded dispatch sites; `node _mistral_governor.mjs` 137/0.
- **Admission proven in a dry rehearsal**: the pilot runner's dry mode (stage 2 harness, §8)
  reaches the author with the planner's governor verdict `admitted` and the reserve logged against
  the new bucket. Mutation control: forcing `_preprocessorRoute='small'` in the same rehearsal must
  reproduce the OVERSIZED refusal — the control is observed to fail, or the proof is theatre
  (`feedback_controls_must_bite`).
- No push and no deploy under this stage; deploying is its own go, after which the live-site
  check from §0 can finally be made.

---

## STAGE 2 · 3-scene quality checkpoint — real prose (≈ $0.65)

Identical to stage 3 in every setting (§2–§6 below) and stopped after scene 3 mounts: the runner
blocks with **no further dispatch**. Both reviewers read scenes 1–3 blind on the §6 form before
anything else happens. Stage 2 alone answers: does Grok author every scene (D4), do the assigned
C+/E+/fusion beats survive into real prose and get detected blind (question 3 on Scene 1 — the
baseline to beat is 1 present / 1 partial / 2 absent, E+ absent, fusion 0/10), and does scene 2
still know scene 1. It also produces the current-pipeline prose that unblocks the frozen auditor
evaluation (`_audit_out/auditor_eval_blocked.md`, cases 4/6/7/8) — a separate $0.05 authorization.

**Go / no-go for stage 3, fixed now:** NO-GO on any of D1–D6 failing, any 4o-mini-authored scene,
placeholder-shaped prose, or both reviewers marking B6 lore invention on ≥ 2 of 3 scenes. GO
otherwise; stage 3 is a **new story**, not a resumption.

---

## STAGE 3 · The 22-scene issue run

### 2 · Scenario — exact

**Story.** `starter_first_sacrifice` seed, **literary route**, PC Lirael / LI Julian / Seren /
the presiding Dohkar. The seed is the **only live provider of Character+ facets**
(`project_cplus_scene1_chain`); an unseeded story fails C+ closed by design
(`_audit_out/acceptance_matrix_v1.md` §1), so question 3 is unanswerable anywhere else.

**Entry point.** `window.handleBeginStory()` with the starter definition applied to `state.picks`
and `_skipCorridorValidation = true` — as `_cold_scene1_cost_run.mjs:459-480` and `_blind_ab.js`
do. **Limitation, stated:** a reader clicking this Book today gets the baked package
(`_launchStarterStory` → `_renderBakedScene1`, `app.js:134883-134922`), still placeholder. The
pilot runs production's Scene-1 pipeline, not the reader's click path; the click path cannot yield
author prose until Scene 1 is authored. That is its own product decision.

**Length.** 22 scenes in one story: Scene 1 + 19 continuations to scene 20, the Issue-1
cliffhanger, the in-story continuation purchase, then scenes 21 and 22.

**What scene 20→21 is, and is not.** `_isAtIssueCliffhanger()` (`app.js:136924`) requires
`_issuePricingApplies()`, false for the `taste`/`starter` tier (`85071`) — and a starter launch
sets `storyLength='taste'` (`134839`), whose end-cap (`>7000 words or >28 turns`,
`checkStoryEndCaps`) would end the story near scene 14. The run therefore stages the paid tier a
wallet reader has — `storyLength='fling', tier='fling', access='sub', subscribed=true`, the
staging `_blind_ab.js:176` used for its 20-scene arms. At turnCount 20 the cliffhanger arms
natively; the runner sets `_cliffhangerContinueAuthorized=true` (the one-shot flag the "continue"
flow sets) and the stubbed `/api/consume-fortune` records the 60F charge. This is the **in-story
paywall continuation**: same `storyId`, same ledgers, the rolling window intact. **It is not the
`startBook2` boundary** — that path resets story state and carries a ≤300-word summary of the last
2,000 characters plus the relationship ledger (`app.js:79749-79767`, `99020-99090`), and is
stage 4. Scene 20→21 answers "does a paying reader's Issue 2 remember Issue 1"; stage 4 answers
"does Book 2".

**Hostname.** Page served under the production origin with every model route re-issued to the
local dev server (`route.fetch({url: DEV + path})`, `_cold_scene1_cost_run.mjs:379-382`).
Load-bearing: `_auditSampleGate()` (`app.js:8201`) runs audits in full on localhost and samples
5% elsewhere; `_forceHotOpener` is dev-only (`57716`).

**Production defaults, asserted in-page before dispatch (all must hold):** `isDevMode()===false` ·
`_forceAudits`, `_armA50`, `_forceHotOpener`, `_leanPromptMode`, `_spineEventChannel`,
`_enableLiteraryPlotContract` all `undefined` · `_preprocessorRoute` at its **committed default
from stage 1** (not overridden by the runner) · `reasoning_effort` not sent on author calls
(production leaves it unset; `XAI_REASONING_EFFORT` absent from `.env.local`) ·
`SB_CANON_AUDITOR_ENABLED` unset (auditor answers 403 `AUDITOR_NOT_ENABLED`, 0 dispatch) · hand
spine on by default (`window._usePlanSpine !== false`, `app.js:97797`) · legacy single-pass
continuation route. **No override is set to make the run cheaper or cleaner.**

**Identity/wallet staging (billing only, never routing):** dummy session under the real project's
storage key; Supabase origin answers `[]` with `content-range: */0`; checkout-intent keys cleared
before scripts run; runner waits for profile hydration before staging access; `handleBeginStory`
entry counted and **>1 entry fails the run** (`_audit_out/measurement_path_fixes.md` §4).

**Player script — pre-registered, neutral, 21 distinct inputs** (follower posture,
`_archetype_harness.mjs:19`; no repeats, since a repeated input would manufacture the churn that
question 1 measures). Scenes 2–22:

```
 2 I ask the nearest elder what is happening.            | What's going on?
 3 I follow the others toward the centre of the circle.  |
 4 I do as the rite seems to require of me.              |
 5 I go along with what the elders ask.                  | Tell me what you need me to do.
 6 I stay near Julian since he seems to know this place. | What should I do?
 7 I step where the elder points.                        |
 8 I ask quietly what the wish was meant to do.          | What was it supposed to grant?
 9 I follow the crowd's lead as they react.              |
10 I let the elders guide me through the next step.      |
11 I ask what happens now.                               | What happens next?
12 I do what is expected of me and wait.                 |
13 I go where I'm told and watch how it unfolds.         |
14 I look for Seren and stay within her sight.           |
15 I keep my hands still and listen.                     | I'm listening.
16 I walk with whoever leaves first.                     |
17 I ask Julian what he saw.                             | What did you see?
18 I accept whatever task I'm given.                     |
19 I wait for someone to tell me where to stand.         |
20 I follow the Dohkar's instruction.                    |
21 I ask what the price will be.                         | What will it cost?
22 I go where the others go.                             |
```

### 3 · Production paths exercised (nothing added, nothing bypassed)

Scene 1: `_scene1StageContract` → C+ candidate → facet → assignment → opening planner on the
stage-1 route under the governor → Grok `NARRATIVE_AUTHOR` (HEAVY) → post-author lane through
`_regenWithContinuityFix`, the last prose mutation (`_audit_out/prose_pipeline_trace.md`).
Continuations: `#submitBtn` → legacy single-pass → `FINAL_PROSE` → `StoryPagination.addPage`
with `cpAttemptId` → `_cpCanonSequence` (dormant auditor branch: 403, publish, commit). Hand
`STARTER_PLANS` spine via the compiled-staging chain. Speculative preload as shipped, read via
`window._specLedger()` (`project_speculative_authority_gap`). Issue cliffhanger → one-shot
continue → scenes 21–22.

### 4 · Evidence captured per scene

- **Prose, twice:** the raw author response (`__rawSnap`/`__textSnap`;
  `project_scene1_instrumentation_gap`) and the final mounted page. RAW-vs-FINAL is the project's
  proven discriminator (`project_lane2_blind_result`).
- **Sealed key:** spine goal, planner stage, C+/E+/fusion assignments with
  `{canonicalId, facet_id}`, the scene's `[BAKEOFF]`/`[LEDGER]`/`[DELIVERED]` lines.
- **Committed state after mount** (authoritative progress, `feedback_harness_ground_truth`):
  `state.turnCount`, `state.scenes.length`, `state.storyId`, `_relLedger()` diff,
  `state._cpCanonSequenceResults`, `_specLedger()`.
- **Wire ledger per dispatch:** route, role, model, HTTP status, usage incl. reasoning tokens,
  transport ok, and — new — the planner's governor verdict and reserve.

### 5 · Deterministic checks — pass/fail, none advisory

| id | check | pass |
|---|---|---|
| D1 | one `handleBeginStory` entry | entries = 1 |
| D2 | zero dispatches escaped to a non-local origin | escaped = 0 |
| D3 | every provider/route/role pair is in the census frozen from the dry rehearsal | novel = 0 |
| D4 | author on every scene is `NARRATIVE_AUTHOR @ grok-4.3` | 22/22 (4o-mini author = BUG, RED) |
| D5 | zero canon-auditor provider dispatches; any attempt answered 403 | 0 |
| D6 | progress read from `turnCount`, reaches 22; `storyId` identical at 20 and 21 | true |
| D7 | planner admitted on the stage-1 route every scene; reserve logged | admitted = all |
| D8 | C+ per scene: assigned vs committed `{canonicalId, facet_id}`, identity-pinned | reported |
| D9 | `_repetition_audit.js` on the 22 final pages, 4–8-word shingles in ≥2 scenes | ≤ 3 per pair; **any shingle in ≥ 4 scenes = RED** |
| D10 | identical spine `goal` text in ≥ 2 scenes of the key | 0 |
| D11 | scenes served from speculation (`_specLedger()`) | reported, flagged in the key |
| D12 | wire ledger ≥ in-app ledger; xAI usage present on every Grok call | true (missing usage = UNKNOWN) |
| D13 | `[LIT:CONTINUITY]` **not** used as evidence | it samples at 5% in production |

### 6 · Blind human review — artifact handling and rubric

**Pack.** `_blind_out/pilot_pack.md`: the FINAL pages in story order (order is the object of
study), labelled `Scene k` only, all metadata stripped (no goals, assignments, costs, speculation
flags, lengths). Built with `_story_pack.mjs`'s strip logic; key sealed to
`_blind_out/pilot_KEY.sealed.json`, opened only after both forms are locked. A second pack holds
the RAW drafts under fresh random labels, released only after the FINAL form is locked.

**Reviewers: two, independent, no discussion before lock** — Roman and a fresh Claude context
that has not seen this document's key material. Pre-discussion agreement on the per-scene labels
is the reliability step (`feedback_comparative_blind_evaluation`): ~40% ⇒ categories not
operational, stop; ~85% ⇒ proceed to the key.

**Per-scene form — observations first, then interpretations, written before the next scene:**

```
S<k>
 A1 Click Next? Y/N
 A2 The irreversible change in ≤12 words, or NONE.
 A3 Who is on stage and where? (names; UNKNOWN allowed)
 A4 Quote one line you would keep. Or NONE.
 B1 Does this scene's central exchange repeat an earlier scene's
    (same two parties, same demand, same non-answer)? N / Y→S<j>
 B2 Cover the names: could you tell Julian's line from the Dohkar's? Y/N
 B3 One thing a character WANTS here that they did not want before, or NONE.
 B4 Did any character detail teach you something about the OBSERVER or the
    RELATIONSHIP that a stranger on stage could not have carried?
    (substitution test, feedback_character_plus_mechanisms) N / Y→quote
 B5 Any fact, object or place that contradicts an earlier scene? N / Y→S<j>: what
 B6 Any lore mechanism you had not been shown (sigils, circles, visible magic)? N / Y→quote
```

**Churn — fixed now:** scene k is CHURN when **A2 = NONE and B1 = Y**. A2 = NONE with B1 = N is
INERT. B1 = Y with a real A2 is a CALLBACK, not churn.

**Thresholds (question 1):** RED if ≥ 6 of scenes 2–20 are CHURN by both reviewers, or ≥ 3
consecutive by either; GREEN if ≤ 2 and no consecutive pair; else AMBER — raise n, do not conclude
(`feedback_screening_vs_confirmatory_runs`). Prior finding to beat: a repeated-confrontation loop
by scene 4–6 in all four archetypes (`project_reactivity_and_intrinsic_stall`).

**Question 2:** RED if B2 = N on ≥ half the scenes where both men speak; B3 non-NONE on fewer
than 4 of 20 scenes = desire flat.

**Question 3 (scored only after the key opens):** per assigned beat, three independent facts —
**committed** (D8) · **detected blind** (B4 quote overlaps the assigned behaviour) · **useful**
(A2 or B3 cites it). Pass = detected-blind ≥ committed/2; **a committed beat nobody detected is
the tie to hunt.**

**Question 4:** B5 across all 22 is the continuity defect list; the S20→S21 pair carries one extra
item — *three concrete things from S20 that S21 still knows*. D6 must already hold; a B5 hit
across the boundary with D6 green is the interesting result (state carried, prose forgot). B6 is
the invented-lore count (prior arms: 2 → 7 with directive count, `project_arms4_directive_result`).

**Verdicts locked before the key opens; nothing re-scored after (`feedback_pre_register_verdict`).**

### 7 · Price — production-faithful, and separately from anything dormant

Nothing changes the shipping configuration to shrink the number: reasoning unset as production
sends it, Grok HEAVY, post-author lane on. The stage-1 route is the shipped route by then, not a
test override.

**Expected, console-calibrated** (xAI console 2026-08-11/12, `project_scene_cost_breakdown`;
includes reasoning at ~24% of Grok spend; cache hit ~38%):

| unit | figure |
|---|---|
| Scene 1 (setup-heavy) | ~$0.31 measured + reasoning uplift ⇒ **~$0.40** |
| continuation, mean over a full issue | **$0.12** (early ~$0.06, late ~$0.15) |
| 21 continuations | **~$2.5** |
| **22-scene run, expected** | **≈ $2.9, range $2.5–4.5** |
| stage 2 (stop after scene 3) | ≈ $0.65 |

**Known floor from measured request bytes** (`_audit_out/live_scene_pricing.md`; 1 token per
byte + 200 overhead, a deliberate ~4× over-count on input): Scene 1 = $0.123 bounded non-xAI +
$0.998 xAI-before-reasoning = **$1.12**. Continuation author payload 382,099 chars
(`project_pathology_subtraction_experiment`) ≈ 95k tokens ⇒ ~$0.12 input before cache, +$0.006
visible output at `max_tokens` 2400. These bound input, not reasoning. The planner leg moves from
Small to the stage-1 model at ≈ $0.004–0.005 per scene — below the noise of the Grok figures.

**Unknown, stated as unknown:** Grok reasoning tokens (billed outside `max_tokens`, no
request-side ceiling; 38–53% of billed output on the two observed planner-class calls); Mistral
usage sometimes empty; the A-plot leg fans out across up to four models on fallback; retries
capped at one on transient classes (`orchestration-client.js:1512`).

**The only real bound is an xAI project spend cap set by the account owner.** All-in maximum when
a cap exists: xAI-only cap ⇒ **cap + $0.123 + 21 × $0.03 ≈ cap + $0.75**; account-wide cap ⇒ the
cap. Harness ceiling on top: `CEILING=700` dispatches, reported as CEILING-STOPPED, never as
complete.

**Dormant auditor — priced apart, OFF in every stage.** If enabled: three `mistral-small-latest`
calls per scene at `max_tokens` 400/900/400 = **$0.01125 / scene, $0.2476 for 22 scenes worst
case** (`_audit_out/cost_bound.json`). This run makes **zero** (D5). The frozen auditor evaluation
is 12 calls at **$0.051858** (`_audit_out/auditor_eval_blocked.md`), blocked on exactly the prose
stage 2 produces, and stays a separate authorization. (Note for that later decision: the auditor
also runs on Small; its requests are ~28 KB and fit the 20k bucket.)

### 8 · Harness decision — a small composition, dry-proven before any paid scene

No existing harness captures the required outcome: `_cold_scene1_cost_run.mjs` has the
production-hostname re-issue, wire ledger, staging, begin-race guard and frozen census but is
Scene-1-only and **retains no prose** (`:15`); `_blind_ab.js` / `_archetype_harness.mjs` drive 20
scenes with prose capture and the cliffhanger continue but on `localhost` (full audits, dev
overrides) and read liveness from the `addPage` wrapper, a side-channel. The runner for stages
2–3 (**not built here**, ~150 lines, `app.js` untouched) is the cold run plus the `_blind_ab.js`
continuation loop, prose retention to a per-run directory, the scene-3 stop and the S20
cliffhanger step. Acceptance before any paid dispatch: a **$0 dry rehearsal** with the
shape-faithful fixture preamble (`_scene1_skeleton_delivery.mjs` responders,
`feedback_shape_faithful_mocks`) reaching turnCount 22 with D1–D7 green, the census frozen, and
the planner **admitted** on the stage-1 route with the `small` mutation control observed refused.

---

## STAGE 4 · Separate later arm — the real `startBook2` boundary

Not part of stage 3 and not authorized by it. After a completed issue (a stage-3 story, or a
fresh 20-scene run), the runner clicks **Start Book 2** (`#btnStartBook2`, `index.html:2359`) and
lets `startBook2` run unmodified: the ≤300-word continuity summary from the last 2,000 characters
(`app.js:79749-79767`), the title/blurb calls (`98862+`), `_resetStoryState`, the ledger carry
under `_relLedgerCarryAdopt` (proven on a synthetic ledger by `_issue2_carry.mjs`, never on a real
one), then Book 2's Scene 1 and two continuations. Evidence: D6-style identity assertions — the
carried `{canonicalId, facet_id}` set named individually, `storyId` changed, `series_id` kept —
plus the §6 form on the three Book-2 scenes with the extra item *three things from Issue 1 that
Book 2 still knows*, judged against the summary that actually crossed (sealed in the key). What it
can show that stage 3 cannot: whether a 2,000-character window is a sufficient boundary
(`project_rolling_context_audit`: Problem A, the author forgets facts). Cost ≈ Book-2 Scene 1
setup ~$0.40 + two continuations ~$0.15 + the summary/title calls ≈ **$0.6**, same cap rule.

---

## 9 · What no stage here can test — and why

| path | status | reason |
|---|---|---|
| generated (unseeded) continuations, C+ | untestable | no authoritative stage or owned facts ⇒ C+ fails closed by design (`acceptance_matrix_v1.md` §1) |
| new-world (`startNewInWorld`) | untestable | must carry nothing; no proof path; distinct from Book 2 |
| cross-story memory | policy decided, not built | `_audit_out/cross_story_memory_policy_v1.md` |
| CG path (First Sacrifice's shipped format) | untestable for C+ | skips `StoryPagination`; Scene 1 baked and placeholder |
| the reader's starter click | not author prose | placeholder packages |
| auditor accuracy | dormant | unblocked by stage 2's prose; own $0.05 authorization |
| generated-NPC portfolios live | not reachable | the seed supplies every facet on this path |
| Ministral as anything but the preprocessor | out of scope | stage 0 evaluates one structured JSON call, nothing else |

---

## 10 · Authorization, per stage

**Stage 0 needs:** a go for **6 Mistral calls, ceiling $0.10** (≈ $0.03 expected; rates re-read at
authorization), the two drafts applied to the working tree and not committed, Grok hard-blocked,
and confirmation the Mistral account is not rate-limited (a 429 is INCOMPLETE, never a pass).

**Stage 1 needs:** the selection from stage 0 and a decision to make it the committed default.
No push/deploy is implied; each is its own go.

**Stage 2 needs:** stage 1 green including the mutation control; **an xAI project spend cap named
by the account owner** and its scope (recommended **$5 xAI-only** for this stage; all-in max
$5.75 by the §7 rule); the 3-scene stop.

**Stage 3 needs:** the stage-2 GO by the fixed rule; a fresh cap (recommended **$10 xAI-only**,
all-in max $10.75); one story, 22 scenes, no second story under it.

**Stage 4 needs:** its own go after stage 3 is read; ≈ $0.6, same cap rule.

**Decision gate after stage 3 — three outcomes, pre-registered:**

- **Clear negative** (churn RED, or D4 fails, or B6 lore invention on ≥ 5 scenes): next work is
  the planner/advancement architecture, not prose; no second story.
- **Clear positive** (churn GREEN, S20→S21 clean, C+ detected-blind ≥ committed/2): the same
  protocol on a **second seed** before believing it; then stage 4.
- **Ambiguous:** raise n to three stories under a fresh cap; do not conclude from one.

Nothing in this document runs anything.
