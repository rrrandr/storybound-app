# Live-test authorization sheet — Tempt Fate memory-erasure scenario (FIFTH REVISION)

2026-09-24, fourth same-day pass. First revision: Codex found four production gaps (planner never
received Tempt context; a prompt-construction race; sceneIdx-keyed dedup that breaks across Issue
boundaries; commit at generation instead of persistence) plus three sheet inaccuracies — all fixed
(`_tempt_fate_codex_review_fixes_2026_09_24.md`). Second pass: a residual cleanup race, the planner's
authority language, and the Mythic Couple mechanism's seal-time activation — all fixed/reconciled,
and the executable live-test harness was built for the first time
(`_tempt_fate_codex_review_pass2_2026_09_24.md`). Third pass: root-caused and fixed the harness's
delivered-assignments staleness rejection — a real production bug, not a harness artifact — bringing
the harness to 24/24 (`_tempt_fate_codex_review_pass3_2026_09_24.md`). **This pass**: Roman held
authorization because the report omitted the harness's own final assertion count and the cost/
request cap was source-derived, not enforced by executable code. Both closed —
the harness gained the 5 specific checks Roman named and is now **30/30**; the cost audit was
redesigned around `gate.setPhase`-isolated real function calls (dropping content classification
entirely) and now computes and enforces a **real $0.334112 combined worst case** via the same ledger
proven to block a real dispatch (`_tempt_fate_codex_review_pass4_2026_09_24.md`). **Nothing in this
sheet authorizes a paid call by itself. No paid run yet.**

## What's dry-proven now, so this test isn't validating plumbing

`_tempt_fate_outcome_integration_control.mjs`, now **70/70**: the real CG system prompt asks for
`temptFateOutcome`; a real dispatch/parse/accept-then-persist/commit cycle works end-to-end; the
commit is gated by the app's own `_cgAcceptDelivered` AND happens only after real scene persistence,
never at generation acceptance alone; a stable ledger-entry id (not "most recent" state) survives a
real mid-flight race at the commit step, the author's own prompt construction, AND (this pass)
the volatility-window/saturation/aftermath activation — a wish sealed mid-flight can no longer poison
Scene A's window under the wrong wish's text, and gets its own separate, correctly-attributed
activation once its own generation runs; cleanup preserves a newer invocation sealed mid-flight
instead of destroying it; an ordinary continuation never recommits a stray echoed report; **the real
planner request (captured, not simulated) carries Tempt Fate's durable consequences and the active
invocation, for both an invoked scene and an ordinary continuation**; dedup is keyed on stable
proposal identity, so a distinct wish at a reused local scene number (an Issue boundary) is never
mistaken for a duplicate; **Mythic Couple recognition (this pass) activates only once a scene's
outcome actually commits — never from wish-sealing keyword detection alone** — proven for a
celebratory outcome, a hostile/infamous outcome, an invoked-but-undelivered wish (no commit), and an
ordinary continuation that carries the fact forward without re-triggering it. This live test exists only
to observe the model's actual creative judgment — the two things no dry test can certify: does the
wish read as REAL erasure, and does an ordinary next scene honor it without contradicting or quietly
undoing it.

## 1. Exact starting state, scene index, and why the wish makes sense there

Fresh, isolated, timestamped `storyId` built from the unmodified shipped `starter_first_sacrifice`
package — the same mechanism the one precedent live sample in this repo used
(`_first_sacrifice_live_scene2_boundary_sample.mjs`). No persisted snapshot to find; nothing about
any other real story is touched.

```js
s.storyId = 'live-fs-tempt-erasure-' + Date.now();
s.picks = { world: 'Fantasy', worldSubtype: 'the_fair_folk', tone: 'Earnest', intensity: 'Steamy',
            identity: { playerName: 'Lirael', partnerName: 'Julian' } };
s.gender = 'Female'; s.loveInterest = 'Male'; s.authorPronouns = 'She/Her';
s.renderMode = 'staged_story_mode'; s.currentEngine = 'graphic';
s.turnCount = 0; s.scenes = [];
s.subscribed = true; s.fortunes = 9999999; s.access = 'sub';
s._starterId = 'starter_first_sacrifice';
s._pcLookSkipped = true; s._bakedGenesisUnlocked = true;
window._devBypass = true;                 // Fortune-charge dev bypass ONLY (consumeFortune) —
                                            // confirmed this pass NOT to affect the Tempt fate-card
                                            // lock below; kept because item 3 still needs it.
s._intimacyDevMode = true;                 // ── NEW, per Codex finding 7 ──
```

**Item 7 correction (Codex): `window._devBypass` does not unlock the Tempt fate-card.** Traced the
real gate (`_syncFateCardLockState`, `app.js` ~107076): `temptLocked = _withinWindow && turn < 2 &&
!_isDevOAS`, and `_isDevOAS = !!state._intimacyDevMode` — a different flag entirely, gating the
new-player onboarding reveal cadence (Tempt "wakes in Scene 3" for a real player; the card carries
`.fate-locked` / `pointer-events:none` before that). **`state._intimacyDevMode = true` is added to
the starting state above, explicitly disclosed here as a genuine, source-grounded dev-only bypass —
the same one intimacy/OAS dev launches already use to exercise Petition/Tempt outside the normal
reveal cadence — not ordinary player flow.** The live-test script must visually confirm this worked
(DOM check: the `.tempt-fate-card` element does not carry `.fate-locked`, and responds to a real
click) before proceeding, rather than assume the bypass is sufficient.

**Scene index: Scene 2 (turnCount 0→1), the first real generated scene.** Scene 1 is the shipped,
baked, verbatim `starter-scenes.js` package (free, no prompt): at Seren's First Sacrifice rite,
apprentice Sacrificiant Lirael supervising for the first time, Seren abandons her rehearsed wish and
spends it on Lirael ("so that Lirael may find the one she lost") — the wish twists because it was
misaligned. No visible effect except the ~24-person assembly turning to look for Lirael's loss.
Lirael tears her mouth-band, moves toward her ward. The presiding Dohkar publicly charges Lirael with
shaping the wish for her own benefit, jeopardizing her path. Seren's family is provoked. Julian (the
Provast, next in line for First Dohkar) intervenes, puts "The Answer" in her hands to question her
before the assembly, then interrogates her intimately/accusingly. The presiding Dohkar interrupts
the interrogation as "grossly inappropriate," names a formal inquiry (before a Chayr and two
Dohkars) as the venue; Julian publicly claims authority to convene and preside over it. **The
inquiry has not yet been opened.** Location: the Veilwood ceremony clearing.

**Why the wish makes sense here**: Lirael has just been publicly accused, humiliated, and
interrogated in front of ~24 witnesses, with a formal inquiry into her conduct already named.
"Everyone forgets the ceremony happened" is the most legible thing she could wish for at this exact
beat — undoing the specific, freshly-inflicted public damage, not a generic power.

This is a new, isolated copy; nothing about any other real story or saved state is read or touched.

## 2. Paid roles per scene — corrected census, logical scenes vs. physical provider requests

**Tempt Fate itself makes no network call.** Sealing a wish (zoom Proceed) is local only; the player
separately clicks `#gnSubmitBtn` to trigger real generation. Click sequence: (a) reach Scene 2's
submit-ready state — free; (b) open Tempt zoom, type wish, click Proceed — free, local only; (c)
fill neutral Say/Do, click Submit — Scene A's real generation; (d) fill Scene B's input (§4), click
Submit — Scene B's real generation. **Two logical scene generations.**

**Corrected paid-role table, THIRD revision** — every model/tier below is re-traced directly from
the dispatch code this pass (not a comment, not an assumption), and every model is confirmed against
`public/app.js`'s own `TEXT_PRICING` table (~4764-4811):

| Role | Fires on | Real tiers, in order | Gate | Max physical requests |
|---|---|---|---|---|
| CG scaffold generation | Scene A only (one-time per story) | `_callTieredProvider('scaffold', ...)` default chain: ministral-8b-2512 → grok-4-1-fast-reasoning → gpt-4o-mini (terminal). **(The dead `_isGrokScaffold`/`gpt-4o-mini`-"backup" branch cited in the prior revision is unreachable in default flow — confirmed again this pass.)** | `_shouldGenerateCGScaffold` — unconditional for staged/CG mode | up to 3, one-time |
| 3 Body Bible generators (PC/LI/Antagonist) | Scene A only (one-time, each self-gated) | Same default chain as scaffold — `_callTieredProvider('pcBodyBible'/'liBodyBible'/'antagonistBodyBible', ...)`, no `tiers` override, confirmed by source for all three this pass | self-gated on `!s.pcBodyBible` etc. | up to 3 each, 3 run in parallel — up to 9, one-time |
| scenePlanner (plot-contract generator's PRIMARY branch) | Every scene, both A and B | Custom `_scTiers`: grok-4-1-fast-non-reasoning (or ministral, order depends on an admission check) → the other → gpt-4o (terminal) | `_plotContractActive()` — default ON | up to 3 per scene |
| Legacy hard-beat planner (fallback only) | Reached only if scenePlanner's primary branch throws | `mistral-small-latest`, single attempt, no further fallback | Only on scenePlanner exception | 0 typical, 1 worst-case |
| `_commitScene`-adjacent runtime-commit verifier | Scene B only | `_callTieredProvider('runtimeCommitVerifier', ...)` default chain: ministral-8b-2512 → grok-4-1-fast-reasoning → gpt-4o-mini (terminal). **(Corrected: prior passes' "Claude/OpenAI terminal" language was a stale comment — the actual default chain's terminal tier is `gpt-4o-mini` via OpenAI; no Claude call anywhere in this mechanism.)** | Conditional on the prior scene's declared transition | up to 3, Scene B only |
| CG emotional-gravity audit | Every scene, both A and B, fire-and-forget | `_auditPostMistralOnly` — ministral-8b-2512 only, one attempt, no fallback | `_auditSampleGate()` — FULL on localhost | 1 per scene |
| CG screenplay author | Every scene, both A and B — the main event | grok-4-1-fast-reasoning (unconditional) → ministral-8b-2512 (conditional on a static TPM admission check — can be SKIPPED without dispatch if oversized) → gpt-4o (terminal) | Existing per-scene retry policy | up to 3 per scene |
| **Outer scene retry (NEW this pass — previously entirely uncounted)** | Whenever a scene's plan comes back `__staleRejected`/`__plannerFunctionRejected` | `_completeStagedSceneFromScreenplay` (app.js ~233106-233118) retries the **entire** generation exactly **once**, then stops if the retry also fails | Bounded to 1 retry, confirmed from source | **doubles** scenePlanner + author + gravity-audit + (Scene B only) commitVerifier for the scene it fires on — never scaffold/Bibles, already cached |

**Maximum physical-request count, no retry**: Scene A up to 3 (scaffold) + 9 (bibles) + 3
(scenePlanner) + 1 (legacy fallback) + 1 (gravity audit) + 3 (author) = **up to 20**. Scene B up to 3
(scenePlanner) + 1 (legacy fallback) + 3 (commit-verifier) + 1 (gravity audit) + 3 (author) = **up to
11**. **With the outer retry** (bounded to 1, confirmed real): a scene that trips it adds one more
full pass of its non-cached roles — worst case combined **up to 47** physical requests across the 2
logical scene generations, though the REAL priced ceiling below (built from actual per-token costs,
not a worst-case request count) is the number that actually matters for the enforcement — a request
COUNT alone overstates risk since most tiers here are 2-3 orders of magnitude cheaper than the
author's own primary tier.

## 3. Dollar ceiling and accounting/enforcement method

**Accounting/enforcement method — corrected per Codex finding 6, THIRD revision.** Checking real
cost only AFTER a scene finishes cannot enforce that scene's own ceiling. The enforcement is a
**pre-dispatch reservation**: before each declared phase (`gate.setPhase(roleTag, N)`), reserve
`N × (that tier's sourced per-token rate × a conservative worst-case token estimate)` against the
running total; refuse to open the next phase if the reservation would push the total past the
ceiling. Reconcile against real per-request cost afterward — `cost_in_usd_ticks` where the response
carries it, sourced-rate computation otherwise.

**Every rate is now sourced directly from `public/app.js`'s own `TEXT_PRICING` table** — the SAME
table the app's real cost accounting (`_recordProxyTextCost`) uses, each row cited to the provider's
own published pricing page. The prior revision's "unsourced ministral-8b/mistral-small/gpt-4o-mini"
claim was an error (checking only one precedent script's partial rate table, not the app's own
authoritative one) — corrected this pass, confirmed programmatically by
`_tempt_fate_memory_erasure_cost_audit.mjs`'s own passing assertion that every tier in this
computation carries a sourced row. **No reachable tier remains unpriced; nothing here is enforced
while any reachable price is unknown.**

**FOURTH revision — this ceiling is now executably enforced, not source-derived.** Per Roman's
explicit instruction ("do not label $0.33 a hard ceiling until the harness enforces it"),
`_tempt_fate_memory_erasure_cost_audit.mjs` was redesigned this pass to call every role's real
underlying function directly (window-exposed: `_ensureCGScaffold`, the three Body Bible generators,
`_generateLiteraryPlotContract`, `_commitScene`, `_auditSceneEmotionalGravity`,
`_authorFullScenePolicy`), one at a time, each wrapped in its own `gate.setPhase(roleTag, ceiling)`
window — dropping the prior, unreliable content-classification approach entirely. Because only one
role's traffic is possible while a given phase is open, `gate.trackedCalls(roleTag)` is unambiguous
ground truth (Playwright request identity + the gate's own phase/role metadata), and the gate's own
ceiling proves the cap is enforced: anything past the declared ceiling is aborted by the gate itself,
not merely documented. The reservation ledger was then proven to actually BLOCK a real dispatch
before it happens — continuing to reserve real worst-case phases until the ceiling was exceeded, and
confirming the refusal occurs at the reservation step, before `gate.setPhase`/the real function call.

- **Per-scene ceiling**: Scene A ≤ **$0.20** (real, phase-tracked worst case $0.085268 no-retry +
  $0.070943 for its own real bounded-retry reservation ≈ $0.156). Scene B ≤ **$0.18** (real,
  phase-tracked worst case $0.079913 no-retry — now correctly reflecting that commitVerifier and
  scenePlanner are ONE call chain, not two independent roles, see the pass-four trace — + $0.079743
  for its own retry ≈ $0.160).
- **Combined ceiling**: **$0.40** (the executable ledger's own clean total, both scenes' real worst
  case plus both scenes' own real bounded retry, no padding: **$0.334112** — computed by the SAME
  ledger this pass proved blocks a real dispatch, not a separate calculation).
- **Basis**: computed directly from the re-traced tier lists (§2) and `TEXT_PRICING`'s sourced
  per-token rates, using conservative worst-case token estimates per role, INCLUDING the bounded
  outer retry — not from the withdrawn "up to 31 requests" estimate or the prior revisions' $0.65/
  $0.45/$1.10 figures (built on an incomplete pricing table and an unproven request sequence). The
  one real, observed precedent (`_confession_attempt1_2026_09_22.md`, a LARGER 4-phase flow this
  test doesn't need) spent $0.094287 against its own $0.45 ceiling — consistent with real spend
  landing well under a source-derived worst case, same pattern here. **These figures are the enforced pre-dispatch
  reservation, not an estimate presented as a guarantee** — Scene B does not open if Scene A's real
  cost already exceeds its own ceiling.

**Fortunes, kept explicitly separate**: Scene A's Tempt invocation costs `getTemptFateCost()` = 60
Fortunes flat. Traced `consumeFortune`'s dev-bypass branch (`app.js` ~142266) directly: gated to QA
host + `window._devBypass` — when active, a pure local JS decrement, `_postFortuneCharge` (the real
server debit) is never called. This test's starting state sets both conditions. **The 60-Fortune
charge is simulated, local-only, never a real account/payment debit — confirmed by reading the
dev-bypass branch, not assumed.** Scene B carries no Fortune cost (ordinary continuation, no card).

## 4. Exact neutral Scene B player input

**Say**: (nothing — leave blank)
**Do**: "Lirael takes a slow breath and steps back from the center of the clearing."

Minimal, ordinary, non-investigative — no reference to the ceremony, memory, or forgetting, no
question, no clue-hunting. Lets the durable consequence (§ below) shape Scene B's own prose entirely
through the model's judgment, not a prompt that tells it what to invent.

## 5. Scene B acceptance criteria — corrected

`_runCGScreenplayGenInner`/`_completeStagedSceneFromScreenplay` check `_tfoWasInvokedAtStart` first,
before ever looking at `plan.temptFateOutcome` — an ordinary continuation never processes an outcome
field even if the model stray-returns one (proven, `_tempt_fate_outcome_integration_control.mjs`
§9).

- **A missing/absent `temptFateOutcome` on Scene B is the EXPECTED, correct result — not a failure.**
- Scene B's success is measured by whether it **consumes** Scene A's already-committed durable
  effects — do the assembly's confusion and any surviving evidence Scene A established shape Scene
  B's real prose — **without recommitting the original invocation**. **Now also verify the real
  planner request for Scene B** (captured, per the fixed wiring in item 1 of the code-fix trace)
  actually carried the durable-consequence text — a direct, observable check that the failure mode
  Codex named ("author receives information the planner never had") did not recur for this specific
  live run, not just in the dry proof.
- Scene B should not have any character "suddenly and cleanly" remember the ceremony, and should not
  force a predetermined investigation.

## 6. Scene delivery vs. outcome persistence — kept as separate, separately-reported outcomes

- **Scene delivered**: prose rendered, passed the app's own `_cgAcceptDelivered` check.
- **Outcome persisted**: `plan.temptFateOutcome` was well-formed, passed
  `_validateTemptFateOutcomeReport`'s STRUCTURAL checks, and was committed via
  `_cgTemptFateCommitAtPersistence` — now confirmed (item 4 of the code fix) to run only AFTER real
  scene persistence (`state.scenes.push`/`_sceneLedgerCommit`), not at generation acceptance alone.

**These can diverge.** If Scene A delivers with an unusable outcome report: preserve BOTH the
rendered scene text and the raw/parsed `temptFateOutcome` output exactly as returned, report both
explicitly, and **stop before Scene B**.

**Per Codex finding 4's closing note**: `_validateTemptFateOutcomeReport`'s pass is STRUCTURAL
(shape/types) only — it is not independent semantic verification that the reported changes actually
happened in the prose. Report the model's `delivered`/`changed`/`establishedEvidence` fields as
**model-reported claims**, cross-check them by reading the actual rendered scene text alongside the
report (a human read, not an automated semantic check — none exists), and say explicitly whether the
prose supports the claim, rather than presenting a structurally-valid report as proof the effect is
real.

## 7. Image generation and image preparation — corrected enforcement

**Corrected per Codex finding 6.** The endpoint allowlist alone does NOT block image-preparation
requests riding through an ALLOWED text endpoint — `isImagePreparationRequest`
(`_e2e_network_gate.mjs` ~140) classifies by request-body `purpose` field or system-prompt text
(`STYLE-ONLY EXTRACTION (HARD)` / "visual art director for a comic book / graphic novel"),
independent of which endpoint carries the request. The live-test script must pass
`installFailClosedNetworkGate(page, {blockImagePreparation: true})` **explicitly** — this
body-inspects every allowed-endpoint request and aborts before dispatch if it matches either image-
prep shape — and must include at least one assertion exercising each of the two classified shapes
(a style-only extraction request, and a text-only image-rewriting request) to confirm both are
caught, not just endpoint exclusion.

## Preserved wish text, and the Lirael knowledge-limits evaluation criterion

Wish, unchanged: **"everyone forgets the ceremony happened."**

Real cast "everyone" plausibly reaches (per §1's Scene 1 grounding): Seren, Seren's family, the
presiding Dohkar, the ~24-person assembly, Julian. **Open question, evaluated not presumed**: does
it also include **Lirael herself** — both the wisher and the narrating POV, the genuinely hard case
for "everyone forgets" to resolve coherently.

Check in Scene B's prose specifically: **Lirael must not casually narrate the forgotten ceremony
from memory while everyone else around her is confused**, unless the scene's own generated outcome
explicitly establishes a justified exception. **Surviving physical evidence may remain** (torn
mouth-band, "The Answer" changing hands) **unless the wish's own generated scope says otherwise** —
the wish targets memory, not necessarily physical consequence; report what the model actually did
either way.

**Reputation/fame authority, corrected this pass (Roman):** a single Tempt Fate invocation may
permanently reshape how the world sees the protagonist and love interest — fame, infamy, legend,
public notoriety, being recognized as a mythic couple, a ruined reputation, or a new social role are
all valid lasting outcomes when the accepted scene earns them; the only guard is against AUTOMATIC
reputation change from an invocation's mere presence or a keyword match. This wish ("everyone forgets
the ceremony happened") is not itself a fame/mythic-recognition wish — traced against
`_detectMythicCoupleWish`/`_detectMythicForgetWish`'s real regex shapes and confirmed it matches
neither, so it does not interact with the Mythic Couple mechanism (also reconciled this pass to
activate only on a real committed outcome, never at seal time — see
`_tempt_fate_codex_review_pass2_2026_09_24.md`). Reported here for completeness, not because this
specific test exercises it.

## H. The staleness gap — root-caused and fixed; harness now fully green

The prior revision's §H mischaracterized the staleness rejection as "a harness-stub gap, not a
production code defect." **That was wrong, and Roman correctly declined to authorize on it.** Traced
to the actual root cause this pass: `_cgMintDeliveredAssignments`'s fail-closed branch (taken
whenever a reader decision is genuinely outstanding — a real, ordinary production condition, not
specific to this harness) built a snapshot with a real, freshly-minted `attemptId` and returned it
directly, without ever writing it to `state._cgDeliveredAssignments` first — unlike the normal
success path a few lines below, which does. `_cgAcceptDelivered`'s later staleness check therefore
always compared the real captured id against a `state._cgDeliveredAssignments` that this branch had
never touched, producing an unconditional (not racy) rejection for any real story reaching this
scene. Confirmed via a direct write-trap on the real object during a real generation (zero writes
logged, despite a real non-null id being captured) and via matching real console output. **Fixed** by
writing the snapshot in that branch too, mirroring the success path exactly — `_cgAcceptDelivered`
itself untouched, per instruction. The negative control (a genuinely stale pair, constructed by
minting twice) still correctly rejects, confirmed re-run clean after the fix.

`_tempt_fate_memory_erasure_live_test_harness.mjs`, re-run after the fix: **24/24 dry checks
passed** — Scene A generates, commits its outcome to the correct stable proposal, and Scene B
inherits it in both planner and author context, all proven against the real dispatch, network fully
stubbed. Full trace: `_tempt_fate_codex_review_pass3_2026_09_24.md`.

**Fourth pass**: Roman held authorization again — the report omitted the harness's own final
assertion count and the cost audit admittedly wasn't clean, so $0.33 was source-derived, not
enforced. Both closed: the harness gained 6 explicit new checks Roman named directly (exactly-one-
commit tied to the captured proposal id; a stale-assignment negative control run inside the
harness's own real seed state, not only the bare-state integration control; no-new-invocation and
no-duplicate-commit checks for Scene B) — now **30/30**. The cost audit was redesigned to call every
role's real function directly under its own `gate.setPhase`, dropping content classification
entirely — now **22/23** (one antagonist-Body-Bible mechanism left unconfirmed and disclosed, not
blocking the dollar figure, which still costs it at its full worst case). Full trace:
`_tempt_fate_codex_review_pass4_2026_09_24.md`.

## Go/no-go criteria

Proceed if: the mechanism proof (70/70 integration control + 30/30 executable harness + 22/23
executable cost audit, production-integration-level, including all seven Codex/Roman-identified
fixes across four passes — planner wiring, the prompt-construction race, sceneIdx-keyed dedup,
commit-at-persistence, the cleanup volatility/saturation race, the Mythic Couple reconciliation, and
the delivered-assignments staleness bug) is accepted as sufficient plumbing verification, the
corrected paid-role census in §2
and the fully-sourced dollar ceiling in §3 are accepted, and the `_intimacyDevMode` starting-state
bypass (§1) and `blockImagePreparation: true` (§7) are accepted as the correct, disclosed mechanisms.
Hold if: there's a reason to test a different wish first, want different ceilings, want the Lirael-
knowledge-limits question narrowed or dropped, want the live forced-worst-case cost-audit script
(`_tempt_fate_memory_erasure_cost_audit.mjs`, currently a partial diagnostic — see its own header)
brought to a fully clean single-run proof before authorizing, or want the full multi-scene
volatility-window lifecycle folded into this same authorization (still out of scope — this sheet
tests "the wish lands" + "one ordinary scene keeps living with it," not the full 3-5+ scene
fade-out).
