# Tempt Fate — `materialization_possession` PREPARATION (dry, $0 spent producing this)

## 1. Correction: `other` owes EVERY universal requirement

I wrote that `other` "requires only a scopeNote". Wrong. `TEMPT_OUTCOME_CONTRACT` has a `universal`
list that applies whenever `delivered === true` — **eleven fields**: `changed`, `durability`,
`knowledgeStates`, `establishedEvidence`, `openPossibilities`, `requestedScope`, `deliveredScope`,
`scopeMatch`, `scopeNote`, `invalidatedPlans`, `ruptureClass`. The per-class list is **additional**.
So `other` owes all eleven **plus** its class requirement (a non-empty `scopeNote` explaining what
class it is and why the listed ones do not fit). `materialization_possession` adds
**`materialEffects`** and **`affectedParties`**.

## 2. Extractor readiness — the blocker was real, and it WAS fixed (dry only)

Established from retained artifacts, not assumed.

**The run** (`_tempt_fate_memory_erasure_live_run_out/report.json`, 2026-09-24T00:53Z):
```
sceneDelivered:                    true
outcomeReportPopulated:            FALSE
outcomeCommittedToOwnedProposal:   FALSE
durableConsequences:               []
declared: ruptureClass=None requestedScope=None deliveredScope=None scopeMatch=None scopeNote=None
cost: $0.11454445 of a $0.20 cap
```
So the scene was delivered and **nothing was declared or committed**.

**The cause and the fix** — commit `2e19c342`, *"put scope/class fields in the schema the author
actually receives"*, whose own message names this run:
> "The authorized Scene A run delivered a scene and committed NOTHING… I had added the scope and
> rupture-class fields to `_buildTemptFateOutcomeReportingSchema()` — a window-exposed builder that NO
> prompt has ever called — while making the validator require them. The author's real schema is an
> inline block elsewhere, so the model was rejected for omitting fields it was never asked for."

Timeline: run at 20:53 local, fix committed 21:10 local — **17 minutes later**. The blocker is fixed.

**BUT: the fix has never been exercised LIVE.** It is dry-verified only
(`_tempt_fate_outcome_integration_control` 73/73 proves commitment through the real production path
with a stubbed model; `_tempt_fate_outcome_contract_control` proves the contract). A
`materialization_possession` run would be the **first live exercise of the corrected schema**, so
"the author declares the contract fields" is itself under test, not a given.

**Program record corrected:** `memory_perception` is NOT fully live-proven. Its SCENE was delivered
live; its outcome declaration and durable commitment were **not**. Earlier notes overstated this.

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

## 4. Proposed reservation allowance

One paid scene; commitment and next-prompt inclusion verified LOCALLY at $0 afterwards, the way
`_tempt_fate_outcome_integration_control` already does — no second generated scene needed.

| Role | Allowance | Basis |
|---|---|---|
| continuity | $0.03 | measured $0.0109 |
| planner | $0.03 | measured ~$0.0099 |
| author | $0.12 | measured $0.0793–0.0857; covers max_tokens 8000 + reasoning headroom |
| editorial | $0.03 | measured unreported, cheap tier |
| mistral tier (any role) | $0.01 | measured ~$0.0016 |
| wish classifier (gpt-4o-mini) | $0.01 | measured $0.000049 |

**Reservation limit: $0.25.** Expected from the comparable measured run: **~$0.115**.
Same disclosure as before: this is an enforced limit on the **number and class of calls**, refused
before dispatch — **not** a guaranteed maximum charge, because reasoning output is uncapped.

**Not built, not authorized.** No runner has been written for this; the proven two-process gibberish
runner is the template to reuse. No paid calls were made to produce this sheet.
