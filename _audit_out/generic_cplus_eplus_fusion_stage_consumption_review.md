# Generic C+/E+/Fusion Consumption Review — the Accepted Stage Record

**Status: DESIGN ONLY. No code changed. No Scene 2 canon authored.** This reviews whether/how
`state._stageState`'s active accepted record (`_activeStageRecord`, committed via
`_acceptStageProposal`, delivered today only to the author via `_buildCurrentStageDirective`) could
generically feed the EXISTING Character+ (C+) / Environment+ (E+) / fusion selection mechanisms —
for both seeded and corridor stories, not just First Sacrifice. It does not decide anything; it maps
the real mechanism, finds the real overlap, and lists the real open questions.

Grounded in a direct-source research pass (file:line citations below) — not assumed.

---

## 1. Ground truth: how C+/E+/fusion actually decide eligibility today

**Character+ (C+)** — three separately-owned decisions (`app.js:134343-134354`):
- **Eligibility** — `_cPlusCandidateSet` (`app.js:134427`+). Reads `stage.onStage` (physically present,
  `IN_PERSON`) and `stage.offStage` + `roster` (matched against scene text by regex → `ANTICIPATED` /
  `RECALLED` / `REPORTED`). Physical presence is explicitly **not required** — a character can be
  C+-eligible while absent, by being meaningfully discussed (`134355-134361`, the "Waldorf concierge"
  doctrine).
- **Facet availability** — `_facetSourceCoverage` (`app.js:133998`) — whether authored psychology exists
  to cite.
- **Cadence/scheduling** (the actual "fire, about whom, this scene" gate) — `_cpSchedule`
  (`app.js:131553`+), reading ledger rows nested inside `_relationshipLedger.cplus.rows[canonicalId]`
  (`app.js:131410-131418`, `131493-131510`). Fields: `last_cplus_scene_ordinal`, `last_cplus_issue`,
  `meaningful_appearances_since_cplus`, `used_facet_ids`, `used_categories`, `cplus_count`,
  `appearancesByMode`. Gates: `CP_COOLDOWN_SCENES=2`, `CP_RECURRENCE_FLOOR=3`,
  `CP_RETURN_GAP_SCENES=3`, `CP_MAX_NPC_PER_SCENE=2` (`131401-131405`). This is pure narrative-pacing
  bookkeeping — nothing about physical staging.

**Environment+ (E+)** — required every scene (not scheduled like C+): the skeleton-generation prompt
mandates `environment_plus: {target, axis}` (`app.js:96429`). Validated at `app.js:268012-268049`:
axis must be in `_EPLUS_AXES` (`223840`), and `target` must be **in the stage's inventory** —
`_targetInInventory(target, _stage.environmentElements, _stage.setting)` or
`_targetInScene(target, _stage.groundText)`. Seed path: `target_object_id` must cite one of
`sceneOne.groundedObjects`' ids (`126841-126858`, `266435`, `267281-267286`).

**Fusion** — not separately scheduled; a required-when-possible cross-check
(`app.js:268162-268169`): if there's eligible cast AND a valid E+ target, declining fusion (`null`)
requires a structured `impossible_because` code from a closed set —
`NO_ONSTAGE_CHARACTER | NO_ENVIRONMENT_TARGET | TARGET_UNTOUCHABLE_THIS_SCENE` (`268147`).

**The Exposure Clause** — a prompt-text instruction (`app.js:65628`, extended to E+ at `65748`,
restated for CG panels at `220881`), not a programmatic gate. It has no state dependency and nothing
in this review touches it.

## 2. The key overlap: `groundedObjects` already IS a narrow, Scene-1-only version of `issued_objects`

`STARTER_SEEDS.*.sceneOne.groundedObjects` (`app.js:126841-126858`) is exactly the concept the new
stage record's `issued_objects` generalizes:

| `groundedObjects` (seed, Scene-1-only) | `issued_objects` (stage record, any scene, seeded or corridor) |
|---|---|
| `object_id` | *(none — the record uses the object's position in the array + label; no stable id)* |
| `name` | `label` |
| `owner_ref` | `owner_or_caretaker_ref` |
| `head` (a head noun for prose reference) | *(none)* |
| *(none)* | `kind` |
| *(none)* | `addressable_by` (array of ledger ids) |
| *(none — Scene 1 only)* | works for every scene, corridor included |

It's read at `app.js:265737-265738` with an explicit fallback when a seed has none:
`_cpObjects = sceneOne.groundedObjects || []`; `if (!_cpObjects.length && environmentElements) ...`.
That fallback (`_stage.environmentElements`) is untyped strings only — no id, no owner, no
addressability. **There is currently no generalized, per-scene, owner-aware object inventory beyond
Scene 1.** `issued_objects` is that missing thing, already built, already validated
(`_validateStageProposal`), already budget-safeguarded, already delivered to the author.

## 3. Per-mechanism review

### E+ target validation — the clearest, lowest-risk integration point
`_targetInInventory`/`_targetInScene` (`268038-268048`) already read from `_stage.environmentElements`
and `_stage.setting`/`groundText` — i.e. this is **already a "read an inventory, check membership"
check**, not a new kind of gate. The accepted stage record's `issued_objects` (labels) +
`location.label` are a structurally identical shape to what's already being checked against. A future
wire-up would extend the inventory these two functions check against — union in the active accepted
stage's objects/location alongside `environmentElements`/`groundedObjects`, never replacing either
(seeds keep authoring what they author; the stage record adds what the issuer captured this scene).

**Open question, not resolved here:** does an E+ target chosen from `issued_objects` need the missing
`object_id`/`head` fields to satisfy the seed-path's `target_object_id` citation contract
(`266435`), or does the plain-inventory path (`_targetInScene`/`environmentElements`-shaped) suffice?
This is a schema-reconciliation decision, not a design conclusion.

### `exclusions` — a capability the current system does not have at all
Today E+/inventory checks are purely positive (is X in the list?). There is no NEGATIVE list — nothing
today says "this object/location exists in the world but must NOT be targeted this scene." The stage
record's `exclusions.objects`/`exclusions.locations` (already populated by the landmark-lock deferral
mechanism — see `[[project_arc_constraint_registry]]`) would be new information to these validators,
not a replacement for anything. Genuinely additive, if wired.

### C+ eligibility (`stage.onStage`) — a narrower, real but partial overlap
`stage.onStage` (physical presence, `IN_PERSON` mode) is the one part of `_cPlusCandidateSet`'s two
pools the accepted stage record's `present` (resolved, backend-validated ledger ids) could plausibly
feed or corroborate for a corridor/continuation scene. The OTHER pool — `stage.offStage` +
free-text-mention matching against `aboutToHappen`/`narratorLens`/`eventText`/`presentText`/`setting`
— is **not** something the stage record represents or should try to represent: it is derived from
scene TEXT that does not exist yet when the stage is issued (issuance happens before prose), and C+'s
own doctrine (`134355-134361`) deliberately keeps "mentioned but absent" broader and text-driven, not
staging-driven. **Finding: `present` is a candidate SOURCE for the `onStage` pool specifically, never
a substitute for the whole eligibility function.**

`stage.setting` is separately read as a `'place'`-type C+ fact, explicitly marked
`pressureEligible: false` (`134150` — "a room cannot make a condition true of a person"). The accepted
stage's `location.label` is the same kind of fact and would carry the same non-evidentiary status if
ever surfaced there — no change to that doctrine implied.

### Cadence/scheduling (`_cpSchedule`) — no bearing, stays independent
Entirely a function of ledger history (who got a C+ beat how recently), never of physical staging.
**Finding: nothing to integrate here. Explicitly out of scope, and should stay that way** — conflating
"who's in the room" with "whose turn it is for a reveal" would be a real regression, not a
generalization.

### Fusion cross-check — inherits whatever C+ eligibility and E+ target-validity decide
No separate integration surface: if the above two wire-ups happen, fusion's existing cross-check
(`268162-268169`) sees their effects automatically, unchanged itself.

## 4. A real architectural seam this review surfaces

`_cPlusCandidateSet`/`_cpSchedule`/the E+ validator at `268012+` run inside the **skeleton-generation**
code path (the system prompt at `96429` is a *different* planner call from the scene-spine
planner/OPEN-ROW work this session just built). The stage issuer captures inside the scene-spine
planner's single reply. Any future wiring would therefore be a **cross-function state READ** —
skeleton-generation code reading `_activeStageRecord(state)` (or a shared helper alongside
`_renderStageDirectiveText`) as an *additional* input to `_stage.environmentElements`/`stage.onStage`/
`_cpObjects` — not a new provider call, not a new planner, and not a merge of the two planner calls
themselves. This matches the delivery discipline already built for the author
(`_buildContinuitySpineBlock` reads the accepted record once; nothing re-derives it).

## 5. Explicit non-goals of this review

- No code was written or planned in detail; the table in §2 and the "candidate source" language in §3
  are mapping, not a spec.
- No decision is made on WHICH of the integration points above should be built first, or whether all
  of them should be built at all.
- No Scene 2 canon, no ordinary-wish adjudication, no C+/E+/fusion selection logic was touched.
- The schema-reconciliation question (`issued_objects` vs `groundedObjects`'s `object_id`/`head`
  fields) is named, not resolved.

## 6. Open questions for the next authorized step (decision sheet, if wanted)

1. Should `issued_objects` gain `object_id`/`head` fields to satisfy the seed E+ path's
   `target_object_id` citation contract, or should a NEW, separate inventory-only E+ path be added
   that doesn't require an id?
2. Should the union of stage-record inventory + seed `groundedObjects`/`environmentElements` be
   "stage record wins on conflict," "seed wins," or "both always available, union only"?
3. Should `exclusions` become a real negative constraint inside `_targetInInventory`/`_targetInScene`,
   or is that a separate, later slice?
4. Should `present` feed `stage.onStage` directly (a straight read), or does C+'s eligibility function
   need its own resolution step (disambiguated labels, etc.) the way the author directive does?
5. Scope boundary check for whoever authorizes the next step: does "generic C+/E+/fusion consumption"
   mean ALL of §3's integration points, or a narrower first slice (e.g. E+ target inventory only,
   since it's the lowest-risk, already-additive, no-doctrine-change point)?
