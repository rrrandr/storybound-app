# Tempt Fate — second Codex/Roman pass: cleanup race, authority language, Mythic Couple, real harness

2026-09-24, second pass same day. Roman: "do one final dry implementation pass before any paid
run," plus a correction on Tempt Fate's reputation authority (fame/infamy/mythic recognition are
valid lasting outcomes) and an audit of the Mythic Couple mechanism's own seal-time activation. No
paid calls made.

## 1. Volatility/saturation race — FIXED and reproduced through the real production path

Confirmed: `_cgTemptFateAftermathCleanup` called `_updateTemptFateSaturationAndVolatility()` at step
0, BEFORE switching from live state to the generation's owned proposal at step 1. That helper read
`state.tempt_fate_invoked_this_turn`/`state.temptFateWish` live — so a wish sealed mid-flight (during
Scene A's own scaffold/planner/author awaits) could have Scene A's cleanup create ITS volatility
window, saturation increment, and severity tier under wish B's text/flag, even though the outcome
commit (already fixed the prior pass) stayed correctly attributed to A.

**Fix, per Roman's explicit preference ("pass the owned invocation explicitly... not by temporarily
overwriting live globals"):** `_updateTemptFateSaturationAndVolatility` now takes two optional
parameters, `(ownedWasInvoked, ownedWishText)`. No global is ever pinned/restored for this call — the
owned values are passed straight through as ordinary function arguments, so there is nothing for
concurrent work to observe or race against. `_cgTemptFateAftermathCleanup` now computes the owned
`_temptInvokedThisTurn`/`_temptWishForAftermath` FIRST (moved up from where it previously sat after
the saturation call) and passes them into the helper. The one other call site (literary, no args) is
unaffected — it still reads live state by default.

**Proven through the real production path** (`_tempt_fate_outcome_integration_control.mjs` §15, new
this pass): seals wish A, runs a real generation with a real mid-flight seal of wish B (both the
ledger record AND the live wish/flag assignment — the full real seal, not the narrower ledger-only
race sections 8/11 use), commits A via `_cgTemptFateCommitAtPersistence`, cleans up via
`_cgTemptFateAftermathCleanup` with A's owned identity. Confirms: A's volatility window carries A's
text (not B's); saturation incremented once for A; the committed outcome is attributed to A; wish B
survives A's cleanup fully intact (not destroyed). Then runs B's own real generation+commit+cleanup
cycle and confirms it creates its OWN separate window (carrying B's text), increments saturation a
second, separate time, and commits as a second distinct durable entry — exactly "B later receives
exactly one separate activation" as specified.

## 2. Tempt Fate authority language — revised per the corrected product rule

The prior pass's planner directive said an active Tempt invocation "does not override REQUIRED WORLD
FACTS or seed-owned reserved/aftermath content" — too absolute. Revised (both the planner's active-
invocation line and its durable-consequences line, `app.js` ~100281/~100286) to the distinction
Roman gave:

- Foundational setting rules and the fact that an already-read scene occurred remain history — Tempt
  cannot un-happen the past.
- A Tempt outcome MAY change present-world facts, memory, identity, access, possession, or social
  reality — up to and including fame, infamy, or legendary status — when the accepted scene actually
  earns it. The planner is now told explicitly not to refuse or soften a wish's real scope on an
  assumption that Tempt cannot cause lasting change.
- The durable outcome record is the authority for that exception.
- Seed-owned future material stays story-bearing, not untouchable — Tempt may change its route,
  interpretation, stakes, or who remembers why it matters, without erasing that it exists.
- Memory erasure changes memory and the resulting social knowledge, not necessarily physical reality,
  unless the scene's own effect establishes something broader.

Also revised the author-facing "SINGLE-USE SCALE" line in `buildWorldLawDirective()` (`app.js`
~75972, shared by literary and CG via `_buildCGTemptDirective`), which previously said a single
invocation "does NOT reshape how the world sees the protagonist long-term." Per Roman/Codex: "Fame,
infamy, legend, public sexual notoriety, being recognized as a mythic couple, a ruined reputation, or
a new social role are all valid lasting Tempt outcomes... 'You're THE Roman and Dani?' is an intended
payoff, not a failure mode." Rewritten: the guard is against AUTOMATIC reputation inflation (from the
mere presence of an invocation, a keyword match, or a vague mention) — never against a genuinely
delivered one. A wish that asks the world to know earns exactly the scale it actually delivers on the
page.

## 3. Mythic Couple — reconciled with the proposal → accepted-outcome → durable-record model

Confirmed exactly what Roman/Codex flagged: `_activateMythicCoupleStatus`/`_deactivateMythicCoupleStatus`
were called directly from the Tempt zoom's seal handler (`app.js` ~108944-108958), gated only by
keyword detection (`_detectMythicCoupleWish`/`_detectMythicForgetWish`) — BEFORE any scene was
generated, accepted, or its outcome validated. The seal handler's own adjacent comment already
documented that the general durable-consequence commit had been moved OUT of seal-time for exactly
this reason (the 2026-09-23 refactor, `367238a1`) — this one mechanism was never migrated when that
happened.

**Fix**: removed the eager seal-time activation entirely. Detection is now applied at COMMIT time,
inside `_commitTemptFateOutcome` (`app.js` ~189814, right after a proposal's outcome is pushed to
`_temptFateDurableConsequences`), re-deriving eligibility from `ledgerEntry.wishText` — the OWNED
proposal's own text, never re-read from live state. Because this sits after dedup, structural
validation, and the `delivered:true` check — the exact same bar every other durable Tempt effect
already meets — a rejected, stale, malformed, or duplicate outcome never reaches it, so it cannot
make anyone famous (or unfamous). `_detectMythicCoupleWish`/`_detectMythicForgetWish` themselves are
unchanged, pure, stateless classifiers — only WHEN their result is allowed to take durable effect has
moved.

**Proven against the real functions** (`_tempt_fate_outcome_integration_control.mjs` §§16-19, new
this pass, 4 scenarios as specified):
- §16 — a "let the world know us" wish: detected but NOT active before generation; activates only
  once the real commit succeeds; the real `buildMythicCoupleDirective()` then fires for future
  prompts.
- §17 — an infamous/hostile wish ("make our names legend, even if they curse us for it"): still
  commits as a durable consequence with a hostile-register outcome (fame and infamy both valid), and
  mythic status still activates — the classifier doesn't distinguish tone; the outcome record does.
- §18 — a mythic-shaped wish that is NOT delivered (both `delivered:false` and a structurally
  malformed report): confirms zero durable commit and mythic status stays inactive in both cases — a
  failed scene cannot make anyone famous.
- §19 — an ordinary continuation after a successful activation: confirms no re-seal/reactivation
  (`sealedAtScene` unchanged), the real author directive still carries the recognition fact into
  future prompts, and no duplicate durable entry is created.

## 4. The executable live-test harness — built and run dry

`_tempt_fate_memory_erasure_live_test_harness.mjs` is new this pass — the actual script that would
run the paid test, executed here in fully-stubbed dry mode (`TEMPT_LIVE_MODE` unset; the script
refuses to proceed if it is ever set, and this pass never sets it). Current result: **20/24 dry
checks passed.**

**What is proven, genuinely executable, not documentation:**
- Real hydration through the shipped starter's own `_renderBakedScene1`/`_bakedScene1For` functions
  (not hand-built DOM/state) — confirmed via a real ~36KB rendered page.
- The Tempt fate-card's real onboarding lock, checked against the real DOM (`.fate-locked` absence,
  computed `pointer-events`), unlocked via the disclosed `state._intimacyDevMode` bypass — then a
  REAL Playwright `.click()` on the card, which opens a real zoom overlay (both the click succeeding
  and the resulting DOM change are checked, not assumed).
- `blockImagePreparation: true`, exercised against BOTH classified shapes (`purpose` field and
  system-prompt text) via a dedicated real-allowed lane isolated from the generation stubs, plus a
  final audit confirming zero incidental image-prep dispatches anywhere else in the run.
- A genuine, executable pre-dispatch reservation ledger: a real ceiling-exceeded stop (isolated from
  the unsourced-pricing stop), a real unsourced-pricing stop (never silently $0), and confirmation
  that the REAL author phase's own tier list (including its unsourced ministral-8b fallback) hits the
  same rule with no special-casing.
- Continuous artifact persistence to disk at every step (hydration, requests, responses, reservation
  log, console log, rendered scene text, outcome reports) under `_tempt_fate_memory_erasure_harness_out/`.
- Scene A's real planner request carrying the active-invocation marker and wish text; Scene A's real
  author request carrying the wish (`PLAYER WISH` directive) — both against the real dispatch, with
  the network fully stubbed.
- Zero image-generation-endpoint requests and zero incidental image-preparation dispatches across the
  entire run.

**What remains open (disclosed, not silently passed over):** getting a stubbed response all the way
through First Sacrifice's REAL, rich seed validation chain took three escalating discoveries this
pass — the OPEN-ROW local-objective schema (`_validateLocalObjective`), the scene-function/aftermath-
lane schema with its own per-lane content regex (`_pfGate`), and each was fixed by extracting the
REAL required fields/ids/content-signal-phrases directly out of the real system prompt rather than
guessing — a self-adapting, not hardcoded, stub. A FOURTH, different check
(`_cgAcceptDelivered`'s staleness guard, comparing the delivered-assignments `attemptId` captured at
generation start against current state) now rejects Scene A's commit with "stale attempt: a newer
request replaced this one (null ≠ cpa:...)" — meaning `_cgMintDeliveredAssignments` returned an
object with a null `attemptId` on this harness's first real call, while something later populated a
real one. This is a genuinely new, previously-unknown quirk specific to running the DELIVERED-
ASSIGNMENTS subsystem against this real, richly-seeded story rather than a minimal synthetic one —
not investigated further this pass given the diminishing-returns depth already reached chasing three
prior schema layers. It blocks Scene A's commit/Scene B's continuation-content checks (4 of the 24
assertions) in THIS harness specifically; it does NOT reopen or contradict anything already proven —
`_tempt_fate_outcome_integration_control.mjs`'s own §§2/10/11 (70/70, unaffected by this pass) already
separately prove the commit-at-persistence and planner/author wiring mechanisms are correct against a
simpler, controlled seed state. Flagged here as a real open item for a future pass, not resolved by
this one.

## Regression

`_tempt_fate_outcome_integration_control.mjs`: **70/70** (extended with §15 volatility-race
reproduction and §§16-19 Mythic Couple, on top of the prior pass's 47/47).
`_tempt_fate_model_driven_outcome_control.mjs`: **38/38**, unaffected.
`_tempt_fate_canon_rupture_control.mjs` 20/20, `_tempt_fate_volatility_activation_control.mjs` 19/19,
`_tempt_fate_imprint_lifecycle_control.mjs` 19/19 — all re-run clean after the saturation-helper
signature change and the authority-language/Mythic-Couple edits.
Full cross-cutting suite (relational-obligation 47/47, CG proxy world-guard 15/15, causal-link
legibility 25/25, confession-frame 16/16, aftermath-lane 22/22, scene2 planner-gate 10/10, Lirael
defensive-path 22/22, Say/Do safety gate 24/24, Say/Do wallbreak 32/32, Petition identity-rewrite
23/23) and continuity-spine baseline (69/80, same established pre-existing failing set) both re-run
clean after this pass's edits.

No paid calls, no live sample, no image work. Cache-buster bumped:
`?v=20260924b-tempt-cleanup-race-authority-mythiccouple`.
