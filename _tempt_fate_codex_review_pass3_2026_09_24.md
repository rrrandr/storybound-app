# Tempt Fate — third Codex/Roman pass: staleness root cause, sourced cost ceiling, Mythic Couple note

2026-09-24, third same-day pass. Roman: "do not authorize the memory-erasure live test yet... make
the memory-erasure harness genuinely executable end to end." No paid calls made.

## 1. Root cause of the staleness failure — a real production bug, not a harness artifact

Traced per Roman's exact request: captured old/new assignment IDs, call sites, and sequence.

**Call sites, confirmed by grep (exactly one each):** `_cgMintDeliveredAssignments` is the ONLY
writer of `state._cgDeliveredAssignments` (`app.js` ~232009, inside the function's normal/success
path). `_buildCGScreenplayUserPrompt` (NOT `_runCGScreenplayGenInner` directly, corrected from an
earlier assumption) has the ONE call site that mints and captures the result
(`_cgDelivered`/`_cgReqAttemptId`, ~232207-232209), and `_cgAcceptDelivered`'s ONE call site
(~232451) checks the captured `_cgReqAttemptId` against whatever `state._cgDeliveredAssignments`
holds at that later moment.

**The bug**: `_cgMintDeliveredAssignments`'s fail-closed branch — taken whenever
`_sceneDecisionNeeded()` is true (a reader-decision genuinely outstanding, not recorded yet) —
constructs a full snapshot object with a freshly-minted, real `attemptId` (via `_cpMintAttemptId()`)
and `return`s it directly to the caller, **without ever writing it to `state._cgDeliveredAssignments`
first** — unlike the normal/success path two dozen lines below, which explicitly does
`state._cgDeliveredAssignments = snap;` before returning the identical shape. The caller still
captures the RETURNED object's real attemptId as its own request identity
(`_cgReqAttemptId = cpa:d0a61181...`, non-null), but `state._cgDeliveredAssignments` itself is left
at whatever it was before this call — `null` on a fresh story, or a stale value from an earlier
scene otherwise. `_cgAcceptDelivered`'s later check (`cur.attemptId !== reqAttemptId`) then
**always** sees `cur=null` for this branch, producing the exact observed error: "stale attempt: a
newer request replaced this one (null ≠ cpa:d0a61181...)".

**Confirmed empirically, not just from reading source.** A direct property-trap on
`state._cgDeliveredAssignments` during a real generation logged **zero writes** across the entire
Scene A dispatch — impossible if the success path had run, since that path's own write is exactly
what the trap watches for. Console output independently confirmed the fail-closed branch fired:
`[SCENE-DECISION] scene 2 requested with NO recorded choice — nothing is minted (fail closed)`.

**Production sequencing bug, not a harness-mounting issue.** `_sceneDecisionNeeded()` is a real,
legitimate production condition (a reader decision genuinely outstanding) — not something specific
to how this harness mounts or drives the story. Any real story that reaches a scene needing this
exact fail-closed path would hit the identical "stale attempt" rejection on its FIRST such scene,
every time, deterministically — an unconditional mismatch, not a race.

**Fix, exactly as instructed** ("not by disabling, bypassing, or broadening `_cgAcceptDelivered`"):
the fail-closed branch now writes its own snapshot to `state._cgDeliveredAssignments` before
returning, mirroring the success path's own pattern precisely. `_cgAcceptDelivered` itself is
untouched — same guard, same comparison, same rejection logic.

## 2. Green dry evidence: Scene A → persisted outcome → Scene B

`_tempt_fate_memory_erasure_live_test_harness.mjs`, re-run after the fix: **24/24 dry checks
passed** (up from 20/24 before the fix — the exact 4 that were blocked by this bug now pass):
- Scene A's generation returns a usable plan (not stale-rejected).
- Scene A's outcome commits as a real durable consequence, attributed to the wish.
- Scene B's real planner request carries Scene A's committed durable consequence.
- Scene B's real author request carries the durable-consequence directive too.
- Scene B (ordinary continuation) commits no new outcome — confirmed still the expected, not a
  failure.

Everything previously proven (real hydration, the real Tempt-card click, `blockImagePreparation`
against both classified shapes, the executable pre-dispatch reservation stops, zero image-prep
dispatches) remains green, unaffected.

**Negative control preserved, as instructed.** `_tempt_fate_outcome_integration_control.mjs`
section 4 (mints twice to construct a genuinely stale pair, confirms `_cgAcceptDelivered` still
rejects the first/stale request) re-run clean after the fix: **70/70**, section 4's two assertions
unchanged and still passing. The fix touches only the fail-closed branch's missing write — the
normal-path staleness guard this negative control exercises is untouched.

## 3. Real maximum dispatch sequence and priced ceiling

**Every tier now sourced — the "unsourced" gap in the prior pass was my own error, not a real gap.**
`public/app.js`'s own `TEXT_PRICING` table (~4764-4811) — the SAME table the app's real cost
accounting (`_recordProxyTextCost`) uses, each row cited to the provider's own published pricing
page — already carries real, sourced rates for `ministral-8b-2512` ($0.15 in / $0.15 out per MTok),
`mistral-small-latest` ($0.15/$0.60), and `gpt-4o-mini` ($0.15/$0.60). The prior pass's "unsourced"
claim came from checking only the one precedent script's own partial `GROK_RATE`/`GPT4O_RATE`
tables, not the app's own authoritative pricing table. **No reachable tier in this test remains
unsourced.**

**Real tier lists, re-traced from source this pass** (each independently confirmed, not assumed):

| Role | Real tiers, in order | All models sourced? |
|---|---|---|
| CG author (`_authorFullScenePolicy`) | grok-4-1-fast-reasoning (unconditional) → ministral-8b-2512 (conditional on a static TPM admission check — can be SKIPPED without dispatch) → gpt-4o (terminal) | Yes |
| scenePlanner (custom `_scTiers`) | grok-4-1-fast-non-reasoning (or ministral, order depends on its own admission check) → the other of the two → gpt-4o (terminal) | Yes |
| scaffold / 3 Body Bibles / commitVerifier (`_callTieredProvider` default chain, no `tiers` override) | ministral-8b-2512 → grok-4-1-fast-reasoning → gpt-4o-mini (terminal) | Yes |
| legacy hard-beat planner (fallback only, reached if scenePlanner's primary branch throws) | mistral-small-latest, single attempt, no further fallback | Yes |
| CG emotional-gravity audit | ministral-8b-2512, single attempt, no fallback | Yes |

**A real, previously-uncounted multiplier: the bounded outer retry.** Confirmed from source
(`app.js` ~233106-233118, `_completeStagedSceneFromScreenplay`): if the returned plan is
`__staleRejected` or `__plannerFunctionRejected`, the code retries the **entire** generation call
**exactly once** more, then stops (resumable, no further retries) if the retry also fails. This
doubles scenePlanner + author + gravity-audit + (for Scene B) commitVerifier — but never scaffold or
the Body Bibles, which are one-time per story and already cached by the time any retry could fire.
The prior pass's static census never accounted for this at all.

**Live, forced-worst-case confirmation — partial, honestly reported.** A dedicated script,
`_tempt_fate_memory_erasure_cost_audit.mjs`, attempts to force every tier to fail except the
terminal one and count real physical requests via the network gate. Its own content classifier
(matching each stubbed request against several real, similarly-worded prompts sharing 2-3 endpoints)
did not fully isolate every role in one combined run this pass — left as diagnostic logging, not an
asserted pass, rather than presented as more certain than it is. What it DID independently confirm
via real console output during this investigation: the scenePlanner's real 3-tier cascade
(`[TIERED:scenePlanner] primary/grok/...failed → attempt 2 tier=fallback provider=mistral...failed →
attempt 3 tier=terminal provider=openai model=gpt-4o...`) and the scaffold's real 3-tier cascade each
independently fired and reached their real terminal tier during this session's diagnostic runs — the
cascade mechanism is real, not merely claimed from reading source, even though a single fully-clean
combined script run was not achieved this pass.

**Real priced ceiling** (computed from the source-traced tier lists directly — does not depend on
the live forced-cascade script's own remaining classification issues):

| | Worst case, no retry | Worst case, with the real bounded retry |
|---|---|---|
| Scene A (scaffold + 3 Bibles, one-time, + scenePlanner + author + gravity audit) | ~$0.103 | ~$0.174 |
| Scene B (scenePlanner + commitVerifier + author + gravity audit) | — | ~$0.160 |
| **Combined** | | **~$0.33** |

This replaces the prior pass's withdrawn "up to 31 physical requests" estimate (which mis-derived
the scaffold/Bible tier depth) with a dollar figure computed from confirmed tier lists and sourced
per-token rates, including the retry multiplier the prior pass missed entirely. Every model in this
computation has a `TEXT_PRICING` row — confirmed programmatically (`_tempt_fate_memory_erasure_cost_audit.mjs`'s
own passing assertion), not asserted from memory.

## 4. Remaining limitations of model-authored outcome reports

Unchanged from the prior passes' own disclosures, restated for completeness per Roman's ask:
- `_validateTemptFateOutcomeReport` checks STRUCTURE only (shape/types: is `delivered` a boolean, do
  `durability` statuses match the enum, etc.) — it is NOT independent semantic verification that the
  model's claimed `changed`/`establishedEvidence` content actually matches what the scene's own prose
  says happened. A structurally-valid report is not proof the effect is real; the live-test sheet's
  own §6 already requires cross-reading the rendered prose against the report rather than trusting
  the report alone.
- The commit pipeline trusts `delivered:true` as the ONE semantic signal from the model — there is no
  automated check that the specific facts in `changed[]` are actually present in `plan.beats[].text`.
- Mythic Couple activation (now gated on a successful commit, per the second pass) still only
  fires when the WISH TEXT matches `_detectMythicCoupleWish`'s keyword shapes — see §5 below for what
  this does and doesn't mean for the generic durable-consequence record.

## 5. Mythic Couple follow-up (documented, not expanded — does not block this test)

Roman: "document whether the current accepted-outcome record can represent fame/infamy even when the
wish lacks the legacy keywords." **Yes, it can — the two systems are only partially reconciled.**
`_commitTemptFateOutcome`'s generic entry (`changed[]`, `knowledgeStates[]`, `establishedEvidence[]`)
performs NO keyword gating on its own content — it is validated only for STRUCTURE and
`delivered:true`. A wish with no mythic-shaped language at all (e.g., "let the guards recognize me on
sight") could still produce a model outcome report whose `changed`/`knowledgeStates` describe
real, lasting public recognition — and that report would commit normally, reach
`_buildTemptFateDurableConsequenceDirective()`, and shape future prompts, entirely independent of
`_detectMythicCoupleWish`. What it would NOT do is trigger the SEPARATE, LEGACY
`_mythicCoupleStatus`/`buildMythicCoupleDirective()` system's own special story-wide "every NPC
recognizes their names" HARD directive — that activation (moved to commit-time in the second pass)
is still gated on the ORIGINAL WISH TEXT matching one of `_detectMythicCoupleWish`'s regex shapes,
not on whether the accepted outcome record itself describes fame. This memory-erasure test's wish
("everyone forgets the ceremony happened") matches neither `_detectMythicCoupleWish` nor
`_detectMythicForgetWish` — confirmed against their real regexes — so this gap does not affect this
authorization. Left undisturbed this pass, as instructed.

## Regression

`_tempt_fate_outcome_integration_control.mjs` 70/70 (section 4's negative control re-confirmed
passing, unaffected by the fix). `_tempt_fate_model_driven_outcome_control.mjs` 38/38.
`_tempt_fate_canon_rupture_control.mjs` 20/20, `_tempt_fate_volatility_activation_control.mjs`
19/19, `_tempt_fate_imprint_lifecycle_control.mjs` 19/19. Full cross-cutting suite (relational-
obligation 47/47, CG proxy world-guard 15/15, causal-link legibility 25/25, confession-frame 16/16,
aftermath-lane 22/22 — one transient batch navigation timeout, confirmed clean on immediate solo
re-run, the session's own established flaky pattern — scene2 planner-gate 10/10, Lirael defensive-
path 22/22, Say/Do safety gate 24/24, Say/Do wallbreak 32/32, Petition identity-rewrite 23/23) and
continuity-spine baseline (69/80, same established pre-existing failing set) all re-run clean after
the fix. `_tempt_fate_memory_erasure_live_test_harness.mjs` 24/24 (was 20/24).

No paid calls, no live sample, no image work, no starter content altered, no outcome hand-authored.
Cache-buster bumped: `?v=20260924c-tempt-decision-absent-mint-fix`.

**Stopping here for authorization, per instruction.**
