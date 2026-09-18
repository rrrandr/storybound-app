# First Sacrifice — Bounded Repair Operational Redesign (Roman, 2026-09-20) — REPORT

Dry engineering only. No provider/image call was made to produce this report. All 279 regression
assertions green (validator 129, adapter control 51, bounded repair engine control 56, fatelands
law control 30, visual storyboard control 13) plus a clean review preview re-render.

## 1. Why did the 8,000-token ceiling (not 6,000 — corrected below) yield only ~750 words?

Real evidence across all 6 rejected paid attempts (`_first_sacrifice_draft_v7_attempt{1..6}_full_package/01_request_response_records.json`), reproduced mechanically by `_first_sacrifice_bounded_repair_engine_control.mjs` section 8:

| Attempt | max_tokens | finish_reason | completion_tokens | reasoning_tokens | headroom unused |
|---|---|---|---|---|---|
| 1 | 8000 | `stop` | 1725 | 615 | 6275 |
| 2 | 8000 | `stop` | 1721 | 571 | 6279 |
| 3 | 8000 | `stop` | 1570 | 451 | 6430 |
| 4 | 8000 | `stop` | 2245 | 379 | 5755 |
| 5 | 8000 | `stop` | 2412 | 428 | 5588 |
| 6 | 8000 | `stop` | 2329 | 773 | 5671 |

**Diagnosis, distinguishing the 4 candidate causes named in the request:**
- **Model early completion (CONFIRMED — this is the real cause).** `finish_reason` is `"stop"` on all 6 real calls, never `"length"`. The model itself decided the response was complete, using 20-30% of its available completion budget. This is not a resource constraint; it is the model judging a short, structurally-complete 20-beat scene as satisfying the task.
- **Schema/parser truncation (RULED OUT).** All 6 real `02_draft.json` artifacts parse as clean, complete, well-formed JSON (re-verified mechanically in the control script). No response was ever cut off mid-structure.
- **Prompt-output burden (RULED OUT as the primary driver).** Prompt size grew across attempts (7,432 → 11,382 real prompt tokens) with no corresponding growth in output — if the prompt's own size were crowding out the model's attention/budget, output would degrade as prompt grew; it does not track that way (attempt 5, with a large prompt, produced the best real result: 1,035 words).
- **Proxy/runner output cap (RULED OUT).** The in-process handlers (`api/proxy.js` etc.) pass `max_tokens` straight through; no independent cap exists in this path, and every real response completed normally (`httpStatus: 200`, `hadContent: true`, clean JSON) well under the model's own ceiling.

A text-only "final self-check" reminder (the fix already committed for Attempt 6's density failure, `b1a9b2c2`) asks the model to notice this about itself. It is a real, disclosed, good-faith attempt, but it has never been tested against a real paid call yet, and the underlying pattern — a reasoning model completing early despite an unused ceiling — is not something a single additional sentence reliably overrides. Five real rejected samples (with prior reminder-style interventions already tried across attempts 1-5) is the evidence for that.

## 2. The bounded repair design (built, proven dry, 56/56)

New file: `_first_sacrifice_bounded_repair_engine.mjs` (pure, zero network calls). New control: `_first_sacrifice_bounded_repair_engine_control.mjs` (56 assertions, `fetch()` stubbed to throw, 0 calls made).

1. **`measureBeatDeficiencies(scene1Candidate, packet)`** — measures every beat's real word count against its OWN slot target (`scene1_beat_number_template.slots[i].wordRange`). Detects structural drift (wrong beat count — real Attempt 3 returned 16 beats; tampered image/kind mapping) and marks the draft `structurallyRepairable: false` in that case — repair NEVER applies to a wrong-shape draft, only to a right-shape, under-length one.
2. **`buildRepairPrompt` / `buildRepairFallbackChain`** — a repair request naming ONLY the deficient slots (by locked slot number), carrying the full accepted draft as read-only context, explicitly forbidding any touch on `oasOpening`/`postInterruptionBeat`/`scene1Coverage`/image/kind/speaker/provenance/objectClaims/new canon. Its own 3-tier fallback chain (Grok → Ministral-8B → GPT-4o), capped at 4,000 max_tokens.
3. **`mergeRepairIntoDraft`** — merges locally (no provider call). Fails CLOSED on any deviation: an unflagged slot, an extra top-level field, an extra per-entry field, a missing flagged slot, a duplicate slot, or a malformed response all reject the WHOLE merge.
4. **`isRepairEligible` / `REPAIR_ELIGIBLE_VALIDATOR_RULES`** — repair is only ever attempted when the validator's violations are a subset of exactly `{scene1_too_thin, scene1_insufficient_narration_density}`. Any canon/structural violation blocks repair entirely, by design.

**Honest real-data finding:** Attempt 6, as it really happened, would NOT have been repair-eligible under this engine — its real 3rd violation (`exemplar_verbatim_copy`, in `oasOpening`) is outside repair's scope. Bounded repair (this pass) and the convergence fix (already committed, `b1a9b2c2`) are two separate, both-required corrections, not substitutes for each other.

**End-to-end proof on real data:** the real Attempt 6 draft (751 words) was merged with a locally-built, mechanically-compliant repair covering its real deficient slots, then re-validated with the REAL validator. Result: `scene1_too_thin` and `scene1_insufficient_narration_density` both clear; the real, untouched `exemplar_verbatim_copy` violation (in `oasOpening`, which repair never touches) correctly still fires — proving both that repair fixes exactly what it should, and that the "if it still fails, reject with zero package write" path is real and live, not just a stated intention.

## 3. Cost ceiling for one logical future authoring operation (primary + at most one bounded repair)

Reusing the real governor (`api/_mistral-governor.js`) and the same per-token pricing this session established, computed by the control script (section 6), zero spend:

| | est. input tokens | max_tokens/tier | expected-success (1 call) | 3-tier-exhaustion |
|---|---|---|---|---|
| Primary chain (existing) | 12,908 | 8000/8000/8000 | $0.0361 | $0.1515 |
| Repair chain (worst case — all 20 slots flagged) | 2,450 | 4000/4000/4000 | $0.0131 | $0.0602 |

- **Expected-success ceiling for one full operation** (Grok primary succeeds, one density repair needed, Grok repair succeeds): **$0.0492**.
- **Absolute worst case** (both primary and repair exhaust all 3 tiers): **$0.2117**.
- Real governor `admit()` check on the repair chain's Mistral fallback tier: **ADMITTED**, 2% TPM utilization.

## 4. Truncation-capacity proof

A synthetic maximal draft (every one of the 20 beats at its slot's own word-range CEILING — 1,620 words total, the validator's accepted range is 1,100-1,700) was built and measured:
- Real JSON size: 16,271 bytes (~4,068 est. tokens, chars/4 convention).
- Applying the WORST real observed tokens-per-word ratio (2.937, from the shortest real attempt, where JSON overhead is proportionally largest) and the WORST real observed reasoning-token overhead (773, from Attempt 6) — both worst-case, not best-case — projects **5,531 completion tokens** for the largest legitimate output this schema could ever require.
- That is **31% below** the primary's 8,000-token ceiling, using pessimistic real-data assumptions on both dimensions.

**Conclusion: the schema can physically carry a full 20-beat, 1,100-1,700-word candidate without truncation.** The 8,000-token ceiling was never the bottleneck in any of the 6 real attempts, and it has real margin even at the top of the accepted word range.

## 5. What changed in the run script

`_first_sacrifice_draft_authoring_run.mjs` (edited, NOT executed — no spend from this pass):
- `OUT_DIR` moved to `_first_sacrifice_draft_v7_attempt7_full_package/` (Attempt 6 preserved untouched).
- The three provider-attempt functions were refactored to take an explicit `ctx` object instead of module-level state, so the SAME real handler-calling code path now serves both the primary chain and the (at most one) bounded repair chain — no drift between them.
- After primary validation: if `!validation.ok`, checks `isRepairEligible` + `measureBeatDeficiencies(...).structurallyRepairable`. Only if both are true does it build and run the repair chain (one more real call at most), merge locally, and re-validate with the real validator. Every failure mode (not eligible, not structurally repairable, repair call fails all 3 tiers, unparseable repair response, merge rejected) falls back to the ORIGINAL primary draft/validation unchanged, and is disclosed in `repairOutcome`.
- New artifacts when a repair is attempted: `05_repair_request_response_records.json`, `06_repair_merge_result.json`, `07_final_draft_after_repair.json`, `raw_repair_content.txt`. `03_validation_result.json` now holds `{finalValidation, repairOutcome}`. `REPORT.md` and `04_review_preview.md` disclose primary cost, repair cost (if any), and total cost separately.

## Status

This is a dry, proven, uncommitted-until-now operational redesign. **No Attempt 7 has been run.** Attempt 7 remains a separate, later, explicit paid authorization — but it now has a credible repair path behind it rather than being another blind single shot.
