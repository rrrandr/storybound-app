# Tempt Fate — Codex source review, fixes and corrected authorization sheet

2026-09-24. Roman relayed Codex's review of the proposed live-test authorization sheet: "Codex
reviewed the current source. Address these findings dry before the paid test." No files changed,
no provider calls made, until the fixes below — then dry only, no paid calls.

Every one of Codex's 7 findings was verified against the real, current source before any code
changed (never assumed). Findings 1–4 were real production gaps and are fixed below. Findings 5–7
were inaccuracies in the sheet itself (a stale scaffold/audit model claim, a stale planner-fallback
framing, an under-verified starting-state claim) — corrected in the revised sheet
(`_tempt_fate_memory_erasure_live_authorization_2026_09_23.md`, rewritten in place) rather than in
code, since they were documentation errors, not code bugs.

## 1. Planner never received Tempt Fate context — FIXED

Confirmed: `_generateLiteraryPlotContract`'s own consequence injection (`app.js` ~100403, the
`_dc`/`_durableFateConsequences` line) read only the ordinary-wish array — never
`_temptFateDurableConsequences`, never `state.temptFateWish`, never the shared
`_buildTemptFateDurableConsequenceDirective()` the author already consumes.

**First fix attempt was itself wrong** — traced empirically, not assumed. An initial attempt
injected Tempt content into the `_ob`/`_oe` "OPEN ROW" block (only reachable when
`_curMs._open && _curMs._eff`). A probe script driving the REAL `_generateLiteraryPlotContract`
against a minimal ordinary-continuation state showed the captured request body contained NONE of
the injected text — the OPEN ROW block never fires for a plain scene. Relocated the injection into
the **base `_scUsr` construction** (`app.js` ~100252, right after the "Reachability"/"Continuity"
lines — the block that unconditionally builds every scenePlanner request, confirmed by the same
probe technique to be exactly what fired for both an authored-spine scene and an ordinary
continuation).

The fix:
- Reuses `_buildTemptFateDurableConsequenceDirective()` **unchanged** — the exact function the
  author already consumes via `_buildContinuitySpineBlock` — so planner and author read the
  identical rendering of accepted Tempt outcomes; no second, divergent description of the same
  facts.
- Adds an "ACTIVE INVOCATION THIS SCENE" line, present only when `temptCtx.invoked` — HARD,
  explicitly stated to supersede the CURRENT MILESTONE/A-plot-goal derivation for *this scene's
  event only*, and explicitly stated to NOT override REQUIRED WORLD FACTS or seed-owned
  reserved/aftermath content (the correct authority ordering Codex asked for: higher than ordinary
  canon/plot expectations, never higher than seed-owned hard constraints).
- Mirrored into the "legacy hard-beat planner" fallback (`mistral-small-latest`, the path Codex's
  finding 5 correctly identifies as a fallback reached only if the primary scene-spine branch
  throws) so the fix holds even on that less-common path.
- `_generateLiteraryPlotContract` takes a new optional third parameter, `temptCtx` —
  `{invoked, wishText}` — supplied by the CG call site (below) from the OWNED invocation, never
  re-read from live state inside the planner itself. Omitting it (the literary call site, unaudited
  here, out of scope) falls back to a live-state read, unchanged prior behavior.

**Verified against the real dispatch**, not the pure function: `_tempt_fate_outcome_integration_
control.mjs` §10 captures the actual request body `_generateLiteraryPlotContract` sends (via the
real `_callTieredProvider('scenePlanner', ...)` → `/api/proxy` dispatch, confirmed empirically to be
grok-4-1-fast-non-reasoning primary, not mistral as `_callTieredProvider`'s generic default would
suggest — this scenePlanner role passes its own `opts.tiers` override) for both:
- **Scene A** (active invocation): the captured request contains the wish text and the
  ACTIVE INVOCATION marker.
- **Scene B** (ordinary continuation, prior committed outcome): the captured request contains the
  durable-consequence text and does NOT contain the ACTIVE INVOCATION marker.

## 2. Race window in prompt construction, and unconditional cleanup — FIXED

Confirmed both halves of this finding by reading source, not assumed:

**(a) Prompt construction reads mutable state.** `_runCGScreenplayGenInner` captures
`_tfoProposalEntry`/`_tfoWasInvokedAtStart` before any `await` (the 2026-09-23 ownership fix), but
the scaffold-ensure and the planner call BOTH await real dispatches before the author's own prompt
is built (`_buildCGScreenplayUserPrompt`, `app.js` ~232184) — and that function reads
`state.temptFateWish`/`state.tempt_fate_invoked_this_turn` **live**, via the shared
`buildWorldLawDirective()` (also used by literary, not touched). A second wish sealed during either
await would leak into THIS generation's author prompt even though the eventual commit stays
correctly attributed to the first proposal — a real, user-visible mismatch between what the author
was told to write and what the durable record says it wrote.

**Fix**: a synchronous pin/restore around the single `_buildCGScreenplayUserPrompt(...)` call — no
`await` between pin and restore, so the pin itself cannot race. If this generation owns an
invocation, `state.temptFateWish`/`tempt_fate_invoked_this_turn` are pinned to the OWNED proposal's
exact values for that one call, then restored immediately after. If a wish was sealed mid-flight
with nothing yet owning it (Tempt not invoked at this generation's start, but live now), it's
suppressed from THIS prompt and left alone in live state for the next generation to correctly pick
up as its own.

Chose a snapshot/pin/restore at the one synchronous call site over threading a param through
`buildWorldLawDirective()` itself — that function is large, shared with literary, and used in many
other contexts; the pin closes the exact race with zero blast radius outside the CG path.

**(b) Cleanup cleared the live global unconditionally.** `_cgTemptFateAftermathCleanup` read
`state.temptFateWish`/`tempt_fate_invoked_this_turn` live and cleared both unconditionally. If a
second wish was sealed mid-flight, cleanup would (i) stash the WRONG wish text into Scene A's own
aftermath/imprint window, and (ii) destroy the second wish's live invocation before it ever got a
generation of its own — silently losing a legitimately sealed wish.

**Fix**: `_cgTemptFateAftermathCleanup` now takes `(ownedProposalEntry, ownedWasInvoked)`. It only
clears the live global when the live ledger's last entry still matches the owned proposal's stable
id (or both are "nothing owned, nothing live"). Otherwise it logs and preserves the live state for
the newer invocation's own future generation. Called with no arguments (as one existing dry control
still does, for an unrelated volatility-lifecycle test) falls back to the pre-fix behavior
unchanged — pure regression safety, not a silent default that could mask the ownership case.

**Verified against the real dispatch**: `_tempt_fate_outcome_integration_control.mjs` §11 seals a
second wish during the FIRST real `/api/proxy` call this generation makes (empirically, that's
whichever of scaffold-fallback/planner/author reaches the network first — the point proven is that
it lands before the author's own prompt is built) and confirms NO captured request body anywhere in
the generation contains the second wish's text, while the author's own (last) request contains the
first. §12 exercises the real `_cgTemptFateAftermathCleanup` directly: proves a raced cleanup
preserves the newer live invocation (with an explicit log line), and proves — as a regression check
— that the ordinary, unraced case still clears normally exactly as before.

## 3. Dedup keyed on local sceneIdx, which resets at Issue boundaries — FIXED

Confirmed: `_commitTemptFateOutcome`'s dedup guard was `s._temptOutcomeCommittedScenes[sceneIdx]` —
keyed purely by the CURRENT SCENE'S LOCAL NUMBER. Confirmed (also via source, `app.js`
~101759/~101815 in the Issue-boundary save-carry code) that this exact map is carried FORWARD across
Issue transitions, while `state.turnCount`/local scene numbering legitimately restarts each Issue —
meaning a genuinely new proposal in Issue 2 that happens to land at the same local scene number as
an unrelated Issue-1 proposal would be silently rejected as a duplicate.

**Fix**: dedup now keys on `ledgerEntry.id` — the stable, story-scoped, monotonic id
`_recordTemptFateEvent` already assigns (the 2026-09-23 ownership fix's own stable identity),
carried across Issue boundaries via `_temptFateLedgerSeq`, never reset except on a genuinely new
story. `state._temptOutcomeCommittedScenes` renamed to `_temptOutcomeCommittedProposals`
(every reader/writer updated: the reset on a new story, the Issue-carry save/restore JSON, and the
internal guard) to make the new key shape explicit rather than leaving a stale name. A proposal with
no stable id is refused rather than committed unsafely (defense-in-depth for a caller that failed to
capture a real ledger entry).

**Verified against the real function**: `_tempt_fate_outcome_integration_control.mjs` §13 calls the
real `_commitTemptFateOutcome` directly (the established pattern this file already uses for
pure-function-level proofs) — commits a proposal at local scene 5, commits a genuine duplicate
callback for the SAME proposal (rejected), then commits a DISTINCT proposal reusing the SAME local
scene 5 (simulating an Issue-boundary reset) and confirms it succeeds, not rejected. Also fixed the
7 hand-built ledger-entry object literals in `_tempt_fate_model_driven_outcome_control.mjs` (a
pre-existing dry control this pass's rename broke) to carry stable ids, and renamed its own
`_temptOutcomeCommittedScenes` references — 38/38 restored.

## 4. Commit ran at generation acceptance, not at real scene persistence — FIXED

Confirmed: the commit lived inside `_runCGScreenplayGenInner`, gated on `_normalized && plan` — the
app's own `_acc.ok` acceptance check (request/assignment freshness), never proof the scene was
actually persisted to `state.scenes` or displayed. `_completeStagedSceneFromScreenplay` (the actual
caller) does real prose cleanup, `state.scenes.push(...)`, and `_sceneLedgerCommit(...)` AFTER
`_runCGScreenplayGen` returns — meaning a genuine intervention could become durable canon even if
something failed between acceptance and persistence.

**Fix**: `_runCGScreenplayGenInner` no longer commits. It attaches the owned identity and the raw,
still-uncommitted outcome report to the returned plan (`plan.__temptOwnership = {proposalEntry,
wasInvokedAtStart, pendingOutcome, sceneIndex}`). The actual commit now happens in
`_completeStagedSceneFromScreenplay`, immediately after `state.scenes.push`/`_sceneLedgerCommit` —
inside the SAME try block, so an exception anywhere in prose assembly/push/ledger-commit prevents
the commit line from ever being reached, by construction. Extracted to its own function,
`_cgTemptFateCommitAtPersistence(plan)` (mirrors `_cgTemptFateAftermathCleanup`'s own established
extraction pattern in this same file — directly callable from a dry control without invoking the
whole async pipeline).

Also fixed, per Codex: "Describe model-reported evidence accurately; structural validation is not
independent semantic verification" — the commit's own two-guarantee framing (ownership + delivery)
already made this distinction; nothing in the sheet or the code claims semantic verification beyond
`_validateTemptFateOutcomeReport`'s structural checks, and the revised sheet (§6 below) restates this
explicitly for the live-test's own reporting.

**Verified against the real dispatch**: `_tempt_fate_outcome_integration_control.mjs` §2 (extended)
proves generation ALONE — before `_cgTemptFateCommitAtPersistence` is ever called — leaves
`_temptFateDurableConsequences` unchanged; committing only happens once persistence is simulated.
§14 is a structural proof against the real served `app.js` (same style as this file's pre-existing
§4): the commit call sits textually after `state.scenes.push`/`_sceneLedgerCommit`, in the same try
scope, with no function boundary between them.

## 5. Provider census corrected in the sheet (no code change — a documentation fix)

Three claims in the original sheet's paid-role table were wrong, each corrected by reading the
actual executable branch, not the nearest comment:

- **Scaffold**: the sheet cited a `gpt-4o-mini` "backup 1" branch — that branch lives inside
  `_isGrokScaffold`'s own fallback chain, which is DEAD in the live default flow (only reachable via
  an explicit console-invoked bake-off harness that passes a grok `modelOverride`; First Sacrifice's
  actual genre resolves to the generic, non-grok config). The REAL default path (confirmed by
  reading the `else` branch actually executed) is `_callTieredProvider('scaffold', ...)` —
  ministral-8b-2512 primary → Grok fallback → Claude/OpenAI terminal, up to 3 physical requests, not
  a single gpt-4o-mini call. The 3 Body Bible generators (PC/LI/Antagonist) also each use
  `_callTieredProvider('pcBodyBible', ...)` (confirmed for the PC one; LI/Antagonist share the same
  helper pattern), not a fixed Haiku call as an earlier pass assumed.
- **Emotional-gravity audit**: the sheet cited "Haiku/Sonnet" from a stale 2026-06 header comment.
  The REAL, currently-live dispatch (`_auditSceneEmotionalGravity` → `_auditPostMistralOnly`,
  Roman 2026-09-20: "telemetry-only, so it should never spend on expensive fallback tiers") is ONE
  attempt, `ministral-8b-2512` only, no tiered fallback — cheaper and simpler than the sheet claimed.
  Still gated `_auditSampleGate()` — 5% on prod/preview, FULL on localhost (where this test runs).
- **Hard-beat planner**: the sheet described the `mistral-small-latest` direct-fetch call as THE
  planner call. It is a fallback, reached only if the primary "scene-spine" branch throws — and that
  primary branch (item 1 above) itself makes a real, up-to-3-tier `_callTieredProvider('scenePlanner',
  ...)` call (grok-4-1-fast-non-reasoning primary, confirmed empirically via a captured request, not
  mistral as the shared default tier list would suggest — scenePlanner passes its own tier override).

The revised sheet's §2 table is rebuilt from these corrected branches, with the worst-case physical-
request count re-derived rather than carried forward from the withdrawn estimate.

## 6. Spending/image-prep enforcement corrected in the sheet (no code change)

- **Cost enforcement**: checking cost after a scene finishes cannot enforce that scene's own
  ceiling — by the time it's checked, the money (real, provider-side) is already spent. The revised
  sheet specifies a pre-dispatch reservation per phase (conservative, sourced-rate-based, covering
  the phase's declared concurrent-request ceiling) with post-hoc reconciliation against real
  `cost_in_usd_ticks` where available — and explicitly states an unknown/unsourced rate must be
  treated as an unbounded risk to flag, never silently counted as $0.
- **Image-prep**: the endpoint allowlist alone does not block image-preparation requests riding
  through an ALLOWED text endpoint (`isImagePreparationRequest`, `_e2e_network_gate.mjs` ~140,
  classifies by request-body `purpose` or system-prompt text, independent of which endpoint carries
  it). The revised sheet specifies `installFailClosedNetworkGate(page, {blockImagePreparation:
  true})` explicitly, plus a test of both the extraction and the text-only image-rewriting paths.

## 7. Starting-state Tempt-availability corrected in the sheet (no code change)

Confirmed by reading the real onboarding gate (`_syncFateCardLockState`, `app.js` ~107076):
`temptLocked = _withinWindow && turn < 2 && !_isDevOAS`, where `_isDevOAS = !!state._intimacyDevMode`
— a DIFFERENT flag from `window._devBypass` (which only affects the Fortune-charge dev bypass in
`consumeFortune`, unrelated to this UI lock). At `turnCount:0` (the proposed Scene-2 starting state),
Tempt Fate's fate-card is locked (`.fate-locked`, `pointer-events:none`) for any story within the
new-player onboarding window, unless `state._intimacyDevMode` is set. The revised sheet's starting-
state construction adds `state._intimacyDevMode = true` explicitly, labeled as a real, source-
grounded dev-only bypass (the same one intimacy/OAS dev launches already use to exercise
Petition/Tempt outside the normal reveal cadence) — NOT ordinary player flow — and instructs the
live-test script to visually confirm (DOM check: `.fate-locked` absent, card responds to a real
click) before proceeding, rather than assume the bypass is sufficient.

## Regression

Full established suite re-run after all fixes: `_tempt_fate_outcome_integration_control.mjs`
extended to **47/47** (new §§10–14 cover items 1–4 against the real dispatch/functions);
`_tempt_fate_model_driven_outcome_control.mjs` **38/38** (fixed for the §3 rename, 7 ledger-entry
literals given stable ids); `_tempt_fate_canon_rupture_control.mjs` 20/20;
`_tempt_fate_volatility_activation_control.mjs` 19/19; `_tempt_fate_imprint_lifecycle_control.mjs`
19/19; `_relational_obligation_contract_control.mjs` 47/47; `_cg_proxy_world_guard_control.mjs`
15/15; `_cg_causal_link_legibility_control.mjs` 25/25; `_confession_frame_confessing_party_control.mjs`
16/16; `_scene2_aftermath_lane_control.mjs` 22/22; `_scene2_planner_function_gate_control.mjs` 10/10;
`_scene2_lirael_defensive_path_lane_semantics_control.mjs` 22/22; `_saydo_safety_gate_control.mjs`
24/24; `_saydo_wallbreak_gibberish_cluster_control.mjs` 32/32;
`_petition_identity_rewrite_gate_control.mjs` 23/23; `_continuity_spine_dry.mjs` 69/80 — the same
established, pre-existing failing set (S6, N1, R2, G3, R2d, G2, G6, R3, R5, R5b, R6a), unchanged.

No paid calls, no live sample, no image work. Cache-buster bumped:
`?v=20260924a-tempt-planner-wiring-commit-at-persistence`.
