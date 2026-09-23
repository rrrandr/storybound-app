# Live-test authorization sheet — Tempt Fate memory-erasure scenario (THIRD REVISION)

2026-09-24, second same-day pass. First revision: Codex found four production gaps (planner never
received Tempt context; a prompt-construction race; sceneIdx-keyed dedup that breaks across Issue
boundaries; commit at generation instead of persistence) plus three sheet inaccuracies (scaffold/
audit model census, planner-fallback framing, starting-state Tempt-availability) — all fixed and
corrected (`_tempt_fate_codex_review_fixes_2026_09_24.md`). **This pass**: Codex found a residual
race (cleanup's volatility/saturation helper still read live state before switching to the owned
proposal) and flagged the planner's new authority language as too absolute; Roman corrected Tempt
Fate's reputation rule (fame/infamy/mythic recognition ARE valid lasting outcomes) and asked for the
Mythic Couple mechanism's seal-time keyword activation to be reconciled with the accepted-outcome
model; Roman also asked for the executable live-test harness itself to be built and run dry — it did
not exist before this pass. All of this is now fixed/built and proven
(`_tempt_fate_codex_review_pass2_2026_09_24.md` has the full trace), with one genuinely open item
disclosed in §H below (a real, previously-unknown staleness quirk the new harness surfaced, not yet
resolved). **Nothing in this sheet authorizes a paid call by itself. No paid run yet.**

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

**Corrected paid-role table** — three cells below were wrong in the prior revision, each corrected
by reading the actual executable branch (not the nearest comment) this pass:

| Role | Fires on | Model / tier (CORRECTED) | Gate | Max physical requests |
|---|---|---|---|---|
| CG scaffold generation | Scene A only (one-time per story) | `_callTieredProvider('scaffold', ...)` — ministral-8b-2512 primary → Grok fallback → Claude/OpenAI terminal. **(Corrected: NOT the `gpt-4o-mini` "backup" branch cited previously — that branch lives inside a dead `_isGrokScaffold` path, only reachable via an explicit bake-off harness never in play here.)** | `_shouldGenerateCGScaffold` — unconditional for staged/CG mode | up to 3, one-time |
| 3 Body Bible generators (PC/LI/Antagonist) | Scene A only (one-time, each self-gated on the field not already existing) | `_callTieredProvider('pcBodyBible', ...)` and same-pattern siblings — ministral-8b primary → Grok → OpenAI/Claude terminal, run in parallel | self-gated on `!s.pcBodyBible` etc. | up to 3 each, 3 run in parallel — up to 9, one-time |
| scenePlanner (the plot-contract generator's PRIMARY branch) | Every scene, Scene A and Scene B both — **now also carries Tempt Fate context (item 1 of the code fix)** | `_callTieredProvider('scenePlanner', ...)` — confirmed empirically (captured request) to use grok-4-1-fast-non-reasoning as its own primary tier (a custom `opts.tiers` override, not the shared default) → fallback tiers | `_plotContractActive()` — default ON | up to 3 per scene |
| Legacy hard-beat planner (`mistral-small-latest` direct fetch) | **FALLBACK ONLY** — reached only if the scenePlanner primary branch throws. **(Corrected: the prior revision described this as THE planner call; it is not — it is a fallback that returns on success like the branch above it.)** Also now carries Tempt context. | `mistral-small-latest` via `/api/mistral-proxy`, single-shot, no further fallback | Only reached on scenePlanner exception | 0 typical, 1 worst-case fallback per scene |
| `_commitScene` runtime-commit verifier | Scene B only (`state._priorSceneStateChange` is null going into Scene A) | `_callTieredProvider('runtimeCommitVerifier', ...)` — ministral primary → Grok → Claude/OpenAI terminal | Conditional on the prior scene's declared transition | up to 3, Scene B only |
| CG emotional-gravity audit | Every scene, Scene A and Scene B both, fire-and-forget | `_auditPostMistralOnly` — **(Corrected: NOT Haiku/Sonnet, a stale comment; the real, live dispatch as of 2026-09-20 is ministral-8b-2512 ONLY, one attempt, no tiered fallback — "telemetry-only, so it should never spend on expensive fallback tiers.")** | `_auditSampleGate()` — FULL on localhost (where this test runs), not 5%-sampled | 1 per scene |
| CG screenplay author | Every scene, Scene A and Scene B both — the main event | Tier 1 grok-4-1-fast-reasoning → Tier 2 ministral fallback → Tier 3 gpt-4o terminal | Existing per-scene retry policy | up to 3 per scene |

**Maximum physical-request count**: Scene A up to 3 (scaffold) + 9 (bibles, parallel, one-time) + 3
(scenePlanner) + 1 (legacy fallback, worst case) + 1 (gravity audit) + 3 (author) = **up to 20**.
Scene B up to 3 (scenePlanner) + 1 (legacy fallback) + 3 (commit-verifier) + 1 (gravity audit) + 3
(author) = **up to 11**. **Combined worst case: up to 31 physical provider requests across 2 logical
scene generations.** This is higher than the prior revision's 17, because the scaffold/Bibles are
now correctly identified as tiered (up to 3 requests each) rather than single calls, and the
scenePlanner's own primary tier is itself a real network call (previously miscounted as "the legacy
fallback" only). Typical case (every primary tier succeeds, no fallbacks): Scene A = 1+3+1+0+1+1 =
7, Scene B = 1+0+1+1+1 = 4, **combined typical: 11** (unchanged from the prior estimate — the
correction mainly widens the WORST case, which is what actually needs a hard ceiling).

## 3. Dollar ceiling and accounting/enforcement method

**Accounting/enforcement method — corrected per Codex finding 6.** Checking real cost only AFTER a
scene finishes cannot enforce that scene's own ceiling — the money is already spent by the time it's
checked. The enforcement is instead a **pre-dispatch reservation**: before each declared phase
(`gate.setPhase(roleTag, N)`), reserve `N × (the phase's most expensive plausible per-request cost,
from the sourced rate table below)` against the running total; refuse to open the next phase if the
reservation would push the running total past the phase's own or the combined ceiling. Reconcile
against real per-request cost afterward — `cost_in_usd_ticks` where the response carries it (as the
one true precedent's Confession attempt did for its two Grok calls), sourced-rate computation
otherwise (`GROK_RATE`/`GPT4O_RATE` from the precedent, extended this pass with `MISTRAL_SMALL_RATE`
for the plot-contract legacy fallback and a `MISTRAL_8B_RATE` row for ministral-8b, needed for
scaffold/Bibles/scenePlanner/commit-verifier/gravity-audit). **An unsourced rate is a stop condition,
not a zero** — if any tier this test's own census (§2) says could fire lacks a sourced per-token
rate by the time of the live run, that is flagged and the reservation for that phase is computed
from the MOST expensive sourced rate on the same tier as a conservative stand-in, not treated as
free.

- **Per-scene ceiling**: Scene A ≤ **$0.65** (absorbs the widened worst-case scaffold+9-Bible-request
  surface, the scenePlanner's own real tiered call, plus the author). Scene B ≤ **$0.45** (no
  scaffold/Bibles, but adds the commit-verifier).
- **Combined ceiling**: **$1.10**.
- **Basis**: the one real, observed precedent (`_confession_attempt1_2026_09_22.md`) spent $0.094287
  against a $0.45 ceiling for a LARGER 4-phase flow (this test needs no OAS dance, no fate-card
  batch). The widened figures above absorb the corrected, larger worst-case physical-request count
  from §2 — still built from small/cheap models (ministral-8b, mini, mistral-small) layered onto the
  same core author call the precedent already measured cheap, so the real spend is expected to land
  far under these ceilings, same as the precedent did. **These figures are the enforced pre-dispatch
  reservation, not an estimate presented as a guarantee** — real tracked cost is reconciled after
  each scene settles, and Scene B does not open if Scene A's real cost already exceeds its own
  ceiling.

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

## H. Open item this pass surfaced — the executable harness is real but not yet fully green

`_tempt_fate_memory_erasure_live_test_harness.mjs` is now a real, executable script (not just this
sheet) — run dry this pass, **20/24 checks passed**. Proven for real: hydration through the actual
shipped starter's own mount function; the Tempt card's real onboarding-lock DOM state and a real
click opening a real zoom overlay; `blockImagePreparation:true` against both classified shapes;
an executable pre-dispatch reservation ledger with both a real ceiling stop and a real
unsourced-pricing stop; continuous artifact persistence; Scene A's real planner AND author requests
both carrying the active invocation; zero image-preparation dispatches anywhere in the run.

**Not yet green**: getting a stubbed response through First Sacrifice's real, rich seed validation
chain required matching three escalating real schema layers this pass (open-row local-objective,
scene-function/aftermath-lane content signals) — each fixed by extracting the actual required
fields/ids/phrases out of the real system prompt rather than guessing. A fourth, different check
(`_cgAcceptDelivered`'s delivered-assignments staleness guard) now rejects Scene A's commit with
"stale attempt: a newer request replaced this one (null ≠ cpa:...)" — a genuinely new,
previously-unknown quirk in how `_cgMintDeliveredAssignments` behaves against this real seed,
un-investigated further this pass given the depth already reached. This blocks 4 of the harness's 24
checks (Scene A's commit proof and Scene B's continuation-content proof specifically) — it does not
reopen anything already proven: `_tempt_fate_outcome_integration_control.mjs`'s own commit-at-
persistence and planner/author wiring proofs (70/70) use a simpler, controlled seed state unaffected
by this quirk.

## Go/no-go criteria

Proceed if: the mechanism proof (70/70, production-integration-level, including all six Codex/Roman-
identified fixes across both passes) is accepted as sufficient plumbing verification, the corrected
paid-role census in §2 is accepted as complete, the widened ceilings in §3 are accepted as the
enforced pre-dispatch reservations, the `_intimacyDevMode` starting-state bypass (§1) and
`blockImagePreparation: true` (§7) are accepted as the correct, disclosed mechanisms, and the §H open
item (a delivered-assignments staleness quirk against this specific real seed) is accepted as
non-blocking for a live run (it is a harness-stub gap, not a production code defect — nothing in the
trace suggests it would affect a REAL, non-stubbed generation, only a synthetic stub response reaching
that far into the validation chain). Hold if: §H should be resolved and re-proven green first, there's
a reason to test a different wish, want different ceilings, want the Lirael-knowledge-limits question
narrowed or dropped, or want the full multi-scene volatility-window lifecycle folded into this same
authorization (still out of scope — this sheet tests "the wish lands" + "one ordinary scene keeps
living with it," not the full 3-5+ scene fade-out).
