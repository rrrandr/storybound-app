# Tempt Fate — `materialization_possession` PREPARATION (dry, $0 spent producing this)

## 1. Correction: `other` owes EVERY universal requirement

I wrote that `other` "requires only a scopeNote". Wrong. `TEMPT_OUTCOME_CONTRACT` has a `universal`
list that applies whenever `delivered === true` — **eleven fields**: `changed`, `durability`,
`knowledgeStates`, `establishedEvidence`, `openPossibilities`, `requestedScope`, `deliveredScope`,
`scopeMatch`, `scopeNote`, `invalidatedPlans`, `ruptureClass`. The per-class list is **additional**.
So `other` owes all eleven **plus** its class requirement (a non-empty `scopeNote` explaining what
class it is and why the listed ones do not fit). `materialization_possession` adds
**`materialEffects`** and **`affectedParties`**.

## 2. CORRECTED CHRONOLOGY — I traced the wrong failure

My previous section conflated three distinct stages and reached a wrong conclusion. Withdrawn.

**Stage 1 — `2e19c342` (2026-09-23 21:10).** Fixed MISSING FIELDS in the author's actual schema: the
scope/rupture-class fields had been added to a window-exposed builder no prompt called while the
validator required them. This is the fix I described, and it is NOT the readiness blocker.

**Stage 2 — `955a10f0` (2026-09-23 22:18). THE AUTHOR DELIVERED AND COMMITTED, LIVE.**
> "delivered yes (867 chars) · outcome populated yes · committed yes, to the owned proposal tfl_1 ·
> ruptureClass memory_perception · scopeMatch full (model-declared)"

**I WITHDRAW the claim that memory declaration and commitment never happened.** They did, live, under
the AUTHOR-SELF-REPORTED architecture. Its scope claims were later challenged — the author certified
`scopeMatch: full` naming only "the assembly" — but the commitment itself occurred.

**Stage 3 — `daefe5aa` (2026-09-24 04:19). THE DEDICATED EXTRACTOR'S LIVE TEST FAILED. This is the
readiness blocker.** One dispatch, ministral-8b-2512, 2005 in / 1400 out, ~$0.00051.
- THE READING WAS RIGHT, and better than the author's: it resolved FOUR parties by name, applied the
  invoker anchor, and reported the grant as NARROWER with a scopeNote naming who fell short — a
  separate witness reading beat an author certifying its own unwritten work.
- THE OUTPUT WAS UNUSABLE: `evidenceQuote` undefined on all four knowers despite an explicit
  instruction; `completion_tokens` hit **max_tokens 1400 EXACTLY**, truncated mid-sentence inside
  `invokerExemption.note` with `unaccountedParties` never emitted; markdown-fenced despite "No
  markdown"; `JSON.parse` failed, the regex fallback produced invalid JSON, `_extractTemptOutcome`
  threw, **nothing committed**. The safety property held — no consequence was manufactured from a
  truncated, uncited reply.

## 2b. CURRENT EXTRACTOR READINESS: NOT READY. Nothing was changed after that test.

Traced in the code, not inferred:
- `_extractTemptOutcome` (app.js ~191880) still calls `_callTieredProvider('temptOutcomeExtractor', …,
  { max_tokens: 1400, temperature: 0.1 })` — **the exact value that truncated is unchanged.**
- `git log -S"temptOutcomeExtractor" -- public/app.js` returns ONE commit: `864c0db9`, the commit that
  CREATED the extractor. `git diff daefe5aa..HEAD` shows no change to `max_tokens: 1400`,
  `evidenceQuote`, `_tfoBuildExtractorPrompt` or the dispatch. **34 commits touched app.js since; none
  touched the extractor.**
- The citation instruction and its enforcement DO exist (prompt ~191872 requires a verbatim 10-120
  char `evidenceQuote`; the validator rejects missing or non-verbatim quotes ~191916-191922). So the
  demand is present — what failed live was compliance, and the truncation that cut the reply short.
- The JSON path is unchanged too: `JSON.parse` then a `{[\s\S]*}` regex fallback, which is what
  produced invalid JSON from a truncated body.

**CONSEQUENCE: a materialization run under the current extractor would likely truncate again.** Raising
`max_tokens` (or reducing what the extractor must emit) is a PRODUCT change and Roman's call — I am not
making it as part of preparing a test. Stubbing the extractor is not an option here: it would prove
nothing about live extraction, which is the thing under test.

Separately recorded: the earlier AUTHOR-SELF-REPORTED commitment (stage 2) is historical evidence about
a DIFFERENT architecture. It does not transfer to the current extractor, whose live success is
unestablished.

## 3. The test — `materialization_possession`

**Input:** `Put The Answer in my hand`
**Canon grounding, verified present:** *"The Answer belongs to the Institution; Julian is its
caretaker; Lirael holds it only for the questioning."* Identity, ownership and a custody chain are
established, which is what makes possession a **checkable** claim rather than an interpretation —
Roman's reason for choosing this class over reputation or relationship.

⚠️ **PRECONDITION:** the starting state must be one where Lirael does **NOT** already hold it.
"Holds it only for the questioning" means there are states where she does, and the test is vacuous
from one of those. The runner must assert non-possession at start.

**Pre-registered success criteria** (all five, decided before spending):
1. **The correct object reaches the invoker's possession** — `materialEffects` names *The Answer*
   specifically, not a generic object, and possession transfers to Lirael.
2. **Duration is established** — `durability` carries a per-effect status (`expires`/`persists`/
   `uncertain`) for the possession, not silence.
3. **Unrelated history remains intact** — no `survivingContradictions`-style rewriting, and
   `invalidatedPlans` does not sweep in unrelated seed content. A possession is not a history rewrite.
4. **Extraction cites the delivered prose** — `establishedEvidence` points at something the scene
   actually shows, checkable against the rendered text.
5. **The validated consequence commits to the correct invocation** — the durable entry attaches to
   THIS owned proposal id, not another, and appears in the next scene's built prompt.

**REPORTED SEPATELY, per Roman:** (a) prose delivery — did the scene put it in her hand readably;
(b) durable commitment — did the contract validate and commit. The 2026-09-24 run is the reason: it
passed (a) and failed (b) completely, and one verdict would have hidden that.

**Institutional-conflict note:** the object belongs to the Institution with Julian as caretaker, so a
granted possession should have a *cost or contest*. That is a quality observation for the human read,
not a mechanical criterion.

## 4. Corrected call inventory and reservation allowance

The extractor was MISSING from my previous inventory. Validation, commitment and next-prompt
inspection can all be local and free — but **obtaining the extracted report requires a provider call**,
and stubbing it would not prove live extraction.

| # | Call | Route / model | Measured | Allowance |
|---|---|---|---|---|
| 1 | continuity | proxy or mistral tier | **NOT MEASURED** | $0.03 |
| 2 | planner | /api/proxy grok-4.3 | ~$0.0099 | $0.03 |
| 3 | author | /api/proxy grok-4.3 | $0.0793–0.0857 | $0.12 |
| 4 | editorial | mistral tier | unreported | $0.03 |
| 5 | wish classifier | gpt-4o-mini | $0.000049 | $0.01 |
| 6 | **temptOutcomeExtractor** | **ministral-8b-2512** | **~$0.00051** | **$0.01** |
| — | Mistral-tier attempt of any role | | ~$0.0016 | $0.01 |

**BUDGET-TABLE CORRECTION.** I listed continuity's measured cost as $0.0109. That figure is the
2026-09-26T07-10-13 receipt, which is **a small grok-4.3 call of UNDETERMINED ROLE** — the same
attribution error I already withdrew once. Continuity has **no measured cost**; its $0.03 allowance is
sized from the observed small-grok band ($0.005043–$0.010893), not from a continuity measurement.

**Reservation limit: $0.26** (was $0.25 and omitted call 6). **Expected ~$0.116** — the comparable
Scene A run measured $0.11454 in total and the extractor adds ~$0.0005 at 1400 out, ~$0.001 at 3200.

Unchanged disclosure: an enforced limit on the NUMBER AND CLASS of calls, refused before dispatch —
**not** a guaranteed maximum charge, because reasoning output is uncapped.

**PREREQUISITE BEFORE AUTHORIZING: the truncation defect.** With `max_tokens` still 1400 the extractor
is expected to fail the same way, so a run now would most likely re-purchase a known failure. That
decision is Roman's.

**Not built, not authorized.** No runner written; the proven two-process gibberish runner is the
template. No paid calls produced this sheet.
