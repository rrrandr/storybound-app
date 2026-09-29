# 14B RETEST #2 — UNDER CONTRACT v2, VALVE OFF · RESULT: NO-GO (2026-09-06)

Authorized: six calls, $0.05 ceiling, fresh blinded readers. Run on `main` @ `d41dc35` + the
uncommitted validator repair + contract v2, drafts applied for the run and **reverse-applied after**
(verified: allowlist and route flag gone, v2 code intact). Valve at its shipped default (off).

```
dispatches 6 (cap 6) · Grok 0 · escaped 0 · spend $0.02449 of $0.05 (provisional $0.20/M)
tokens 113,537 in / 8,928 out · latency 19–25 s · admission 6/6 (reserve 76–84k vs 937,500)
artifacts _stage0_out/retest2_14b_v2/ · blind pack _stage0_out/blind_retest2/ (sealed, unread by me)
cumulative Ministral spend across all stage-0 work: ≈ $0.071
```

## The bar → 0 of 6 accepted. NO-GO.

## What 14B did with the v2 contract — the shape questions are answered

| v2 field | 14B compliance |
|---|---|
| `opening_actor_id` | **6/6** declared, correct (`named:seren`), and the beat stages her |
| `environment_element_ids` | **6/6** valid ids (O1/O3/O4/O5/O6), no free text, no invented objects |
| `environment_plus.target_object_id` | **6/6** by id, within the chosen ids |
| fusion without target/axis | **6/6** |
| `enacts_evidence_id` | 6/6 present |
| `FROM_OPENING_BEAT` literal | 1/6 (S3); 5/6 wrote a free act for the opening actor anyway |
| realizations | used in 6/6, ≤120 chars |

## Fault triage — mine versus the planner's

Every fault was classified against the raw responses (`sample{i}_response.json`).

**A · my contract implementation (three classes, free to fix, not fixed here):**

1. **Opening-actor act not derived unconditionally.** I *asked* for the literal and rejected any
   free act (5/6). The proposal said the act is derived, full stop. The backend should overwrite
   the opening actor's `visible_action` with the opening beat and log what the planner typed. This
   also removes the consequential "two first appearances" faults (4/6).
2. **Roster sentinel echo.** 5/6 plans wrote `FROM_OPENING_BEAT` into Seren's staged `anchor_beat`
   (the roster ships prefilled `FROM_CHARACTER_PLUS`). The anchor is derived after validation anyway;
   that sentinel should be accepted for the declared opening actor.
3. **Id-selected objects re-grounded against the scene text.** After ids resolve to seed names, the
   old `_targetInScene` checks still ran on E+ target and elements. The **sash (O5) is not in the
   ground text at all** (setting/present/narrator never say "sash"; the `groundedObjects` comment
   claims every object is named there — it is not), so choosing the seed's own object by id failed
   grounding: 4 element faults, 1 "E+ target not in the resolved scene". An id-selected object is
   grounded by construction; the text check must be skipped for it.

**B · the planner (these alone reject every plan):**

| fault | plans | note |
|---|---|---|
| Dohkar `enacts_evidence_id: E6` for an option established by E5 | S1 S2 S5 S6 | E6 ("perceives the misalignment sooner") is a real Dohkar fact the seed does not link to the arrogance pressure — a seed-calibration question as much as a planner one |
| Dohkar act never engages "an offering being named aloud" | S1 S2 S5 | as in every prior run: fingers, gaze, a tap — never the offering or the cost |
| wind invented — "trembles as if stirred by an unseen wind, though the air is still" | S4 S6 (+S3 "reacting to the shift in the air") | the forbidden-fact rule caught it in element, beat and realization at once; the model names the stillness and adds the wind anyway |
| fusion beat touches a different object than the E+ target | S1 (sash vs band), S3 (sash vs canopy), S4 (sash vs canopy) | the contract derived the target; the planner wrote the beat about the sash regardless |
| "mouthband" for O4 (the band) | S2 S5 | a compound coinage the head-noun rule cannot match; a tolerance for compound suffixes would also accept "husband" for "band", so it stays a lexical planner fault |
| Julian assigned though not offered; `first_mention:false` ×2 | S3 | |
| pc_interpretation never names the person | S1 | |

**Projection with class A fixed:** S1 keeps E6 + act gate + pc_interpretation; S2 keeps E6 + act
gate + mouthband; S3 keeps Julian; S4 keeps wind ×3 + fusion; S5 keeps E6 + act + mouthband; S6
keeps E6 + wind ×2. **Still 0 of 6.** The NO-GO does not depend on my defects.

## Decision

Under contract v2, 14B follows the *shape* of the contract closely and still fails the planner
contract on content: the Dohkar's condition (5/6), invented wind (3/6), and a fusion that wanders
off its object (3/6). **14B cannot safely restore Scene 1 through this planner contract.** No route
change is earned; nothing is committed; the drafts are unapplied.

What remains is a product decision, not a test: (a) seed calibration — link E6 to the Dohkar's
pressures if that is what he is meant to enact, and put the sash into the scene text or drop it
from `groundedObjects`; (b) a stronger planner model for this one structured call; (c) shrink
the request to fit Small and measure Small, which has never been run against the current contract.
The three class-A fixes are worth making regardless, before any further run, and I have not made
them because the instruction was to stop after the retest.

## State

Working tree: repair + v2 + suite changes, uncommitted. Drafts reverted. Valve opt-in (default
abort). Dev server stopped. 0 Grok calls. Blind pack sealed; optional, since the gate was decided
deterministically.
