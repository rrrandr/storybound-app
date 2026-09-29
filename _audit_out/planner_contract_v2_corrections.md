# CONTRACT v2 — THE THREE CORRECTIONS + 18-PLAN RECLASSIFICATION · 2026-09-06

Authorized scope: the three free contract corrections from retest #2, discriminating controls,
and a replay of all 18 frozen plans. **No seed edit, no route enablement, no drafts applied, no
retest call, no commit.** Working tree only. 0 provider dispatches in the session.

## The corrections (`public/app.js`, validator only — the planner request is byte-identical)

| # | correction | where |
|---|---|---|
| 1 | the declared opening actor's C+ act is DERIVED from `opening_beat` unconditionally; a planner-typed act is discarded and logged `[SCENE1:CPLUS:OPENING-DERIVED] "<who>" — planner typed …`. `FROM_OPENING_BEAT` from anyone who is NOT the declared actor stays a named fault | resolver, `~264690` |
| 2 | the roster sentinel `FROM_OPENING_BEAT` is accepted only on the declared actor's row (the anchor is derived after validation from their act, which is the opening beat); on any other row it is a named fault | staged-anchor loop, `~265690` |
| 3 | a valid seed-object ID is grounded by identity: the resolved display name is not required to appear in the scene text, for the E+ target and for id-chosen elements. Unknown ids and an E+ id outside the chosen elements remain named faults | E+ branch `~265165`, element loop `~265190` |

Prompt fingerprint: `v2-corr` identical to `v2-contract-final` (user 65,265 chars, hash unchanged).

## Discriminating controls (dry delivery suite, valve at shipped default = off)

| case | expected | result |
|---|---|---|
| `v2ActorFreeAct` — declared actor types a free act (what 14B did 5/6) | ACCEPTED; committed act === opening beat; `_derived_from_opening`; log present; the typed act absent from the author payload | ✓ (V10 + table) |
| `v2WrongActorLiteral` — the Dohkar claims `FROM_OPENING_BEAT` | REJECTED, "claims FROM_OPENING_BEAT but is not the declared opening_actor" | ✓ |
| `v2ActorSentinelRoster` — sentinel on Seren's roster row (what 14B did 5/6) | ACCEPTED; anchor derived = opening beat; no sentinel survives | ✓ (V11 + table) |
| `v2SentinelWrongRow` — sentinel on the Dohkar's row | REJECTED, "that sentinel belongs to the opening actor alone" | ✓ |
| `v2SashById` — E+ on O5, whose name is absent from the scene text | ACCEPTED; committed with the seed name; rendered to the author | ✓ (V12 + table) |
| `v2UnknownObjectId` — element id `O42` | REJECTED, "which this scene does not contain" | ✓ |
| `v2TargetNotChosen` — E+ cites a valid id not among the chosen elements | REJECTED, "is not one of the chosen environment_element_ids" | ✓ |

Suite total: **397 passed · 0 failed** (previous 387 + 10 new). `verify:*` green.

## Replay of all 18 frozen plans (real validators, valve off)

Before = each plan's last recorded verdict under v2 (the 12 pre-v2 plans: the named-fault lists
from the valve replay; the 6 retest-#2 plans: their recorded verdicts). After = now.

| set | plan | before → after | what moved |
|---|---|---|---|
| stage-0 8B ×3, 14B ×3, retest #1 ×6 | all 12 | unchanged (13/13/16 · 17/9/15 · 15/14/12/16/16/13) | nothing — old-shape plans, rejected on the old-shape faults as before |
| retest #2 (v2) | S1 | 9 → 5 | −opening-actor act, −sash element grounding, −roster sentinel (×2 lines) |
| | S2 | 9 → 4 | −opening-actor act, −roster sentinel, −two first appearances (consequential) |
| | S3 | 6 → 5 | −sash element grounding |
| | S4 | 9 → 4 | −opening-actor act, −roster sentinel, −two first appearances |
| | S5 | 10 → 4 | −opening-actor act, −sash element grounding, −roster sentinel, −two first appearances |
| | S6 | 10 → 3 | −opening-actor act, −E+ target "not in the resolved scene" (sash), −sash element grounding, −roster sentinel |

**Accepted after: 0 of 18. Verdicts that moved: 6 of 18 — exactly the six v2 plans, exactly on the
three corrected classes and their one consequential class.** No verdict moved in any other
direction; no crash.

### What remains on the six v2 plans — all planner content

| fault | plans | note |
|---|---|---|
| fusion beat never reaches the E+ target | S1 S2 S3 S4 S5 | the beat handles the sash (or "mouthband") while E+ is the band or the canopy |
| Dohkar `enacts_evidence_id: E6` for an option established by E5 | S1 S2 S5 S6 | the seed links E6 to no Dohkar condition — see `seed_calibration_memo.md` §1 |
| Dohkar act never engages "an offering being named aloud" | S1 S2 S5 | |
| E+ beat does not name its target ("mouthband"/"the cloth" for the band) | S1 S2 S5 | lexical planner fault; no tolerance added (a compound-suffix rule would accept "husband" for "band") |
| invented wind (element, beat, realization) | S4 S6 | the forbidden-fact rule, working as intended |
| Julian assigned though not offered; `first_mention:false` ×2; generic read | S3 | |
| pc_interpretation never names the person | S1 | |

The 14B verdict therefore stands on planner content alone. The seed memo names the two places
where the seed, not the planner, set the trap (E6 unlinked; the sash absent from the scene text).

## State
Working tree: repair + v2 + corrections + suite, uncommitted (5 files, +836/−82). Drafts unapplied.
Valve opt-in (default abort). Dev server stopped. Blind pack for retest #2 still sealed.
