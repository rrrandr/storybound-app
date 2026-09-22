# Live Handoff Directive: The Author Gets the OAS Exchange and the Final Submission (2026-09-22)

Roman: "This is a concrete handoff bug worth fixing now. The planner received the interaction, but
the author lost it... The earlier OAS exchange and the final Fate-card submission are separate
events. Both should reach the author in order, with the player's final edited submission
authoritative. Implement the dry handoff fix now."

Full requirements: use existing persisted OAS snapshots and committed submission records; preserve
exact player wording; distinguish earlier actions from the latest submission; a card preview or
click must not replace interaction history or become a committed action before Submit; carry the
accepted planner's posture interpretation as subordinate context; apply through shared continuation
context for literary and CG; trace both real paths rather than adding an isolated First-Sacrifice
directive. Verify against Temptation's retained input, edited card text, custom Say/Do, and
save/reload preservation. No paid calls, no candidate prose edits.

## What was traced (see `_scene2_temptation_attempt4_omission_trace_2026_09_22.md` for the original diagnosis)

`state._playerImpactRead` — the channel `buildPlayerImpactDirective()` reads for "PLAYER DID/SAID"
— is overwritten wholesale by whichever player action is processed LAST. A real OAS turn and a
Fate-Card submission both route through the same generic per-turn pipeline
(`_computePlayerImpactRead`'s one persisting call site), so the Fate-Card's own text always wins by
the time the author reads it, discarding the richer OAS exchange that came before it.

## The fix

`public/app.js` gains `_buildLiveHandoffDirective(s)`, called from `_buildContinuitySpineBlock` —
the one builder every real author path already calls. Three sources, each already durable, none
newly invented:

1. **The completed OAS exchange** — `state._oasSceneSnapshots`, written by `_resolveIntimacyScene`
   before it nulls `state.intimacyDialogue`, specifically so Back-nav can replay the scene. The
   SAME source the open-row planner's own "RECENT OAS EXCHANGE" block already reads (2026-09-20) —
   reused here for the author, which never had it. **Preserves exact wording** by reading
   `pcSayRaw`/`pcDoRaw` (the player's literal, untransmuted text) rather than `pcSay`/`pcDo` (the
   post-transmute, world-register prose the live UI shows) — a real distinction found and fixed
   while building this: the archive builder's own comment says exactly this ("userInput is the
   post-transmute string the live UI showed; userInputRaw is original"), and the planner's own
   2026-09-20 "RECENT OAS EXCHANGE" block reads the WRONG (transmuted) pair — fine for that block's
   own purpose, wrong for a "preserve exact player wording" requirement.
2. **The final submitted Say/Do, with posture** — the scene ledger's most recent `oas_interrupt`
   entry, written ONLY by `_commitIntimateInterruption`, which fires ONLY on Submit
   (`r.action`/`r.dialogue` are set there). A card CLICK sets `r.draft`/`r.selectedSlot` on the
   in-progress record only — never reaches the ledger, never becomes "the final submission," and
   the player can still edit the text or pick a different card before Submit. This is the SAME
   entry `_buildContinuitySpineBlock`'s own STORY LEDGER already renders when its history budget
   allows; restated here unconditionally so this ordered account never depends on that
   budget-managed window still having room.
3. **The accepted planner's posture reading** — `state._sceneObjectives[<latest>].posture_read` and
   `.stateChange.lanePostureModulation` — carried explicitly as **interpretation**, last, and
   subordinate: "never a substitute for what she actually said or did, and never grounds for
   inventing a detail 1 or 2 did not give you."

Appended AFTER `_buildContinuitySpineBlock`'s own `_SPINE_MAX_CHARS` safety-truncation, deliberately
— this content is small and bounded (one scene's exchange, never growing) unlike the ledger's own
history, so it can never be the thing a length-based truncation cuts mid-sentence, and it never
competes with that budget for space. It IS still counted by `opts.includeStage:false`'s "everything
else" measurement (correct — a stage proposal's real remaining room must account for it too). A
real bug caught and fixed while wiring this in: the function's own early-return guard
(`if (!entries.length && !durable && !stageBlock) return ''`) would have silently dropped a live
handoff that had content when nothing else did (an early scene, no committed pages yet) — fixed by
computing the handoff block BEFORE that guard and including it in the condition.

## Shared path, not isolated (traced, not assumed)

`_buildContinuitySpineBlock` is called from all of: the CG author prompt-builder (~line 223287),
the literary continuation prompt-builder (~line 309512 and ~line 314284), and the open-row
planner's own budget-measurement call. One insertion point — inside that function — reaches every
one of them. Confirmed in `_scene2_live_handoff_directive_control.mjs` section G by reading the
real committed source, not by assumption.

## Proof — `_scene2_live_handoff_directive_control.mjs`, 28/28

- **A. RETAINED REAL INPUT, IN ORDER** — replays Temptation's own real fixtures (the real OAS
  turn-reply, the real Fate-Card batch, Temptation attempt 4's own real planner JSON) through the
  live app. The resulting `_buildContinuitySpineBlock` output contains, in the correct order: (1)
  the player's real gaze/hands-folded wording verbatim, (2) Julian's real response to it, (3) the
  final card submission's real text and its "Temptation" posture label, (4) the planner's real
  `posture_read` — explicitly labeled as interpretation.
- **B. EDITED CARD TEXT** — editing the pre-filled dialogue before Submit produces the EDITED
  words in the handoff block; the card's un-edited default text is absent; the posture label is
  still correctly recorded (editing text doesn't lose which card was chosen).
- **C. CUSTOM SAY/DO (no card)** — a plain typed submission with no Fate-Card selected produces a
  correct handoff with the custom text verbatim and no fabricated posture label.
- **D. SAVE/RELOAD PRESERVATION** — a JSON round-trip of the whole state object (the app's own save
  shape) produces a byte-identical handoff block from the reloaded copy.
- **F. NO PREMATURE COMMIT** — a card CLICK alone, with Submit never pressed, produces NO
  section-2 final-submission text at all; the interruption record itself confirms it is not yet
  submitted.
- **G. SHARED PATH** — source-traced, not reimplemented per engine (see above).

Two real, non-obvious bugs found and fixed while building the verification itself (not production
bugs — both were in the control's own stub setup):
1. An earlier draft's `/api/proxy` catch-all stub returned a fake 200 success for any unrecognized
   call. The real fate-card-batch generation tries Grok (this endpoint) as its first tier; the fake
   success let that attempt "succeed" with unrelated content, which never parses into five cards,
   and — because it looked successful — never triggered the tiered system's real fallback to
   ministral, where the actual fate-card content lives. Fixed to fail closed for anything
   unrecognized (matching `_scene2_repair_replay_sample.mjs`'s own proven philosophy), forcing the
   same fallback path a real run takes.
2. An attempt to exclude one OTHER real mistral-proxy call (an OAS-continuation dialogue generation,
   unrelated to fate-cards) by sniffing its system prompt wrongly matched the REAL fate-card
   request too, since both prompts share boilerplate language. Fixed by matching the proven
   harness's own unconditional stub for this endpoint — nothing this control asserts on depends on
   that other call's actual output, so it receiving fate-card-shaped content instead is harmless.

## Regression check

`_continuity_spine_dry.mjs` (80 checks, the most directly relevant pre-existing control): re-run
via a `git stash` A/B — 69 passed / 11 failed BEFORE this change, 69 passed / 11 failed AFTER,
identical failing test names in both runs. The 11 failures are pre-existing (scene-numbering/
turnCount/speculative-preload mechanics, unrelated to this change) and were not introduced or
affected by it. `_stage_issuer_budget_control.mjs` (21/21) re-verified clean.

## What this does NOT do

- Does not touch `_playerImpactRead` or its overwrite behavior — that mechanism is unchanged;
  this adds a second, independent, durable channel instead of trying to fix the first one's
  lifecycle.
- Does not change what the planner receives (its own "RECENT OAS EXCHANGE" block, built
  2026-09-20, is untouched) — only what the AUTHOR receives, which never had this before.
- Does not touch the STORY LEDGER's own rendering or budget logic — the new content is appended
  after it, never interleaved with its degradation system.
- Does not run any paid call, retry Temptation, or edit any candidate prose. The prose-quality
  question stays open and explicitly unresolved: this fixes missing context; whether the author
  actually uses it well is a question only a future real sample can answer.

## Status (original pass)

Dry, committed. No provider or image calls. No branch retry, no regeneration, no candidate prose
edits.

## Addendum (2026-09-22, second pass): closing the disclosed planner-wording gap

Roman, after the pass above: "This addresses the missing author context. One disclosed gap
remains: the planner still reads the transformed player wording. That could make it plan around a
different interaction from the one the author now receives. Close that small inconsistency before
paying for another sample... Finish the handoff correction by updating the planner's OAS context to
preserve the same original player Say/Do as the author. Reuse the shared extraction logic where
practical... Extend the focused dry proof to capture both actual dispatched request bodies —
planner and author — and verify that they receive the same relevant completed exchange and final
committed submission, in order... Also verify scene scoping."

**The gap.** The original pass fixed `_buildLiveHandoffDirective` (the author's channel) to read
`pcSayRaw`/`pcDoRaw` — the player's literal, untransmuted wording — but never touched the open-row
planner's own, older "RECENT OAS EXCHANGE" block (built 2026-09-20, independently, before the
author ever had any channel for this at all), which still read `pcSay`/`pcDo` — the post-transmute,
world-register prose the live UI shows. Two independent extractions of the same archive, reading
two different fields, meant the planner could plan around wording the author would never see.

**The fix.** `public/app.js` gains one shared function, `_extractRecentOASExchangeLines(s, opts)`,
placed beside `_buildLiveHandoffDirective` (function-declaration hoisting within the shared
top-level closure makes it callable from the earlier-positioned planner block too — already proven
safe in this session's own control, which calls `_INTR_SLOTS` the same way). It reads
`pcSayRaw||pcSay` / `pcDoRaw||pcDo` — raw first, always — and takes `opts.limit` for the two
callers' different windows (planner keeps its existing 3 beats; the author's own section 1 keeps
its existing 4). Both the planner's "RECENT OAS EXCHANGE" block and `_buildLiveHandoffDirective`'s
section 1 now call this one function instead of each independently re-implementing the same read —
the structural cause of the drift, closed, not patched over. The transmuted (`pcSay`/`pcDo`) pair is
deliberately never surfaced by this helper to either caller: there was no consumer that needed it,
and reading raw-only is what actually satisfies "must not silently replace the player's input" —
nothing here can ever be mistaken for, or overwrite, the player's own words, because nothing but
the player's own words is read.

**Proof it reaches the REAL requests, not just the helper's own output** (Roman: "Source wiring and
helper-output checks alone don't establish that the full requests contain the material"). Extended
`_scene2_live_handoff_directive_control.mjs` section A to capture the ACTUAL, FULL request bodies
dispatched to `/api/proxy` for both the REAL planner call (`max_tokens: 1200`,
`_callTieredProvider('scenePlanner', ...)`) and the REAL author call (`max_tokens: 8000`,
`_authorFullScenePolicy`'s Grok tier) — captured inside the stub function itself, before it answers,
so nothing is reconstructed or assumed. Confirmed, from the captured bodies themselves: both the
real planner request and the real author request contain the SAME raw player wording, verbatim
("I keep my hands folded at my waist and meet his eyes…"); the real author request also contains
Julian's real OAS response, the final committed card text, and the Temptation posture label, with
the earlier exchange appearing before the final submission inside the LIVE HANDOFF section
specifically (the STORY LEDGER, a separate and unrelated section of the same prompt, legitimately
restates the final submission's own text earlier still — by design, documented in the original pass
above — so the ordering check is scoped to the handoff section, not the whole request text).

**Scene scoping** (Roman: "advancing again must not present an earlier scene's submission as the
newest action or duplicate archived exchanges"). New section H: after Temptation's real scene 1
exchange/submission, a second, later-numbered `_oasSceneSnapshots` entry and ledger `oas_interrupt`
entry are added (direct state construction over the same durable, scene-number-keyed structures a
real second scene would populate — this session's own established methodology, matching section D)
and confirms: the later scene's own exchange and submission appear; the earlier scene's exchange no
longer appears as the current live exchange; the later scene's exchange is not duplicated; and,
scoped specifically to the handoff's own "2. THE READER'S FINAL SUBMITTED SAY/DO" section (not the
whole block), the earlier scene's submission is never presented there as the newest action — while
still correctly, legitimately appearing in the STORY LEDGER's own separate, budget-managed history
listing, which is that section's actual job and was never in question.

Two test-scoping bugs found and fixed while building sections A and H's new assertions themselves
(not production bugs): a naive whole-request-text order check picked up the STORY LEDGER's own
legitimate restatement of the final submission instead of the handoff section's own copy; and a
naive whole-block "must not contain" check for the earlier scene's submission wrongly failed against
that same legitimate STORY LEDGER listing. Both fixed by scoping the assertions to the specific
handoff section under test, per the pattern above.

**Proof — `_scene2_live_handoff_directive_control.mjs`, 49/49** (sections A–H; up from 28/28 in the
original pass — the new checks above account for the difference).

**Regression, re-verified via the same `git stash` A/B methodology**: `_continuity_spine_dry.mjs`
(80 checks) — 69 passed / 11 failed BEFORE this correction, 69 passed / 11 failed AFTER, identical
failing test names both times (S6, N1, R2, G3, R2d, G2, G6, R3, R5, R5b, R6a — all pre-existing,
scene-numbering/turnCount/speculative-preload/story-gravity mechanics, unrelated to this change).
This is **no additional failures**, not a clean suite — the 11 pre-existing failures are documented
and were not touched, per Roman's explicit correction to the original pass's language.

**What this does NOT do**: does not attempt to fix the 11 pre-existing `_continuity_spine_dry.mjs`
failures — out of scope for this correction, left exactly as found. Does not run any paid call,
retry Temptation, or edit any candidate prose.

### Status (addendum)

Dry, committed. No provider or image calls. No candidate prose edits. Cache-buster bumped
(`?v=20260922d-live-handoff-wording-parity`).
