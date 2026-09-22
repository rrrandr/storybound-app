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

## Status

Dry, committed. No provider or image calls. No branch retry, no regeneration, no candidate prose
edits.
