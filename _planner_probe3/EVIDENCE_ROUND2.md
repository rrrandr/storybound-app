# Planner probe, round 2 — after canonical identity / grounding / envelope (`1331d8c`)

3 sequential samples: 2 × First Sacrifice (seeded), 1 × corridor with a mentioned-but-offstage LI.
One real planner call each. **Total spend $0.00857.**

**Grok: 0 requests dispatched.** Samples 1–2 validated, so the pipeline proceeded to author and
made 6 author attempts — every one was `route.abort()`ed at the route layer, so no request reached
the server or xAI and nothing was billed. Sample 3 aborted before authoring, so 0 attempts.
Escaped requests: 0.

## Scorecard (rescored offline against the product's own rules, zero cost)

| # | mode | setting | no offstage C+/fusion | one C+ each | E+ grounded | fusion valid | angle rejections | validation |
|---|---|---|---|---|---|---|---|---|
| 1 | seeded | ✓ | ✓ | ✓ | ✓ | ✓ | none | **ACCEPTED** |
| 2 | seeded | ✓ | ✓ | ✓ | ✓ | ✓ | none | **ACCEPTED** |
| 3 | corridor | ✓ | ✓ | n/a | see note | ✓ | none | **REJECTED** |

> The inline scorecard printed during the run was stale — it read only `plan.scene_skeleton`
> (missing a lifted nested one) and grounded E+ against setting+present only (missing narrator).
> The table above uses the shipped `_scene1StageContract` / `_targetInScene`. Both versions agree
> on the validation column, which is the product's own verdict.

## Sample 1 — seeded · 15,008 in / 860 out · $0.00277 · 1 attempt, no retry

- opening_setting `"veilwood clearing"` ✓
- **envelope: NORMALISED** — the planner nested `scene_skeleton` inside `opening_spine` again; it
  was lifted intact and telemetry emitted. Round 1 this exact shape was discarded.
- C+ (4, all `first_mention=true`), stored as `["Lirael","Julian","Seren","the presiding Dohkar"]`:
  - Lirael — "presses palms to thighs to still the shake in her wrists, the tremor that always comes when she's about to break a rule"
  - Julian — "stands perfectly still at the edge of the gathering, his presence a weight no one else acknowledges"
  - Seren — "kneels with her hands trembling, her voice cracking on the final vow as the wish twists her devotion"
  - the presiding Dohkar — "locks her gaze onto Lirael, waiting for the signal to halt the rite before the harmony curdles further"
- E+ `{target:"the crimson spiralgrass carpet under Seren's knees", axis:"damage"}` ✓ grounded
- fusion `{Lirael, same target, "I watch the grass flatten where Seren kneels, the fibers darkening with something that isn't dew"}`
- **ACCEPTED.** No alias resolution needed — the planner used canonical labels throughout,
  including `the presiding Dohkar` verbatim.

## Sample 2 — seeded · 17,820 in / 894 out · $0.00321 · 1 attempt, no retry

- opening_setting `"veilwood clearing"` ✓ · envelope top-level as sent
- C+ (4, all `first_mention=true`), stored as `["Lirael","Seren","Julian","the presiding Dohkar"]`:
  - Lirael — "pull the band lower, exposing my teeth, and the fabric snags on the crook of my front tooth"
  - Seren — "fingers tighten on the offering bowl, knuckles white"
  - Julian — "still at the edge of the gathering, the way his presence rearranges the air"
  - the presiding Dohkar — "voice rises, mid-verse, eyes flicking between Seren and the covered mouth"
- E+ `{target:"the gossamer band across my mouth", axis:"damage"}` ✓ **grounded only through
  `seed.sceneOne.narrator`** — this is exactly the object round 1 false-rejected.
- fusion `{Lirael, same target, "I pull the band lower, exposing my teeth, and the fabric snags on the crook of my front tooth"}`
- **ACCEPTED.**

## Sample 3 — corridor · 14,512 in / 687 out · $0.00259 · 1 attempt, no retry

- stage: **planner-owned** setting and presence (no seed). Eligible up front: `["Lirael"]` only.
- offstage (ineligible): `["the one who draws them forward", "Julian"]` — the LI was mentioned in
  the mission ("rehearsing what she will say to Julian") and correctly **excluded**. This is the
  live exclusion evidence that was missing before.
- returned opening_setting `"guildhall loom-room"`; `staged_characters` **absent**
- C+ (2): `Lirael` — "braces against the loom frame, knuckles whitening"; `Quinn` — "slams a palm
  down on the table, eyes locked on Lirael's throat"
- E+ `{target:"loom frame", axis:"damage"}`; fusion `{Lirael, loom frame, "She grips the loom frame
  until splinters bite her palms, the wood groaning under her weight"}`
- **REJECTED** — *"planner owned presence and staged no IN_PERSON character besides the narrator"*

**This rejection is correct per contract.** Under planner-owned presence the planner must declare
its stage in `staged_characters`; it declared none, then assigned a C+ beat to an invented
character (Quinn). Taking C+ recipients as the presence set would let the assignment define the
stage circularly, which is the failure mode this whole contract exists to prevent. Julian was
correctly kept off-stage and out of C+/fusion.

## What this round proves

| | round 1 | round 2 |
|---|---|---|
| seeded samples validated | 0/2 | **2/2** |
| canonical setting preserved | 3/3 | 3/3 |
| concrete angles / diagnosis rejections | 12/12 · 0 | **10/10 · 0** |
| fusion returned with a beat | 3/3 | **3/3** |
| nested envelope discarded | 1 | **0 (lifted)** |
| E+ false-rejected on narrator-only canon | 1 | **0** |
| identity false-rejections | 3/3 samples | **0** |

All three round-1 representational defects are closed, each proven by a live sample that would
have failed before: sample 1 (envelope lift), sample 2 (narrator grounding), samples 1–2 (identity —
the PC is now `Lirael`, resolved from `state.name`, and `the presiding Dohkar` is one entity).

## Open findings — not fixed, per instruction

1. **Corridor planner omitted `staged_characters` (genuine planner non-compliance).** Under
   planner-owned presence this is fatal, and 1/1 corridor samples hit it. The request delegates
   presence in prose but the schema's `staged_characters` field is not prominent in that branch.
   Likely a prompt-clarity issue, not a model-capability one — but it is currently a hard abort for
   corridor stories.
2. **E+ grounding may be over-strict under planner-owned settings.** A seeded WHERE is a rich
   paragraph, so targets ground easily. A corridor WHERE is the planner's own 1–3 word
   `opening_setting` ("guildhall loom-room"), so a natural target like "loom frame" cannot ground
   against it — "frame" appears nowhere. Sample 3 aborted on presence first, so this never fired,
   but it would likely bite the next corridor sample. Grounding for a planner-owned stage probably
   needs to accept the planner's own scene material, not just its 3-word label.

## Gate

The stated gate was *"only if all three validate should we spend on the next full run"* —
**2/3 validated, so the gate is not met.** The two First Sacrifice samples are clean and the paid
Scene-1 prose run targets First Sacrifice specifically; the failure is in the corridor path, which
that run would not exercise. That is a judgement call for joint review, not one I have made.
