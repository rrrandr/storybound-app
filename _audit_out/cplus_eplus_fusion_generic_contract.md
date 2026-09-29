# C+/E+/Fusion Generic Contract — accepted 2026-09-14, Roman's D1-D6

Restates the decisions from `cplus_eplus_fusion_stage_consumption_decision_sheet.md` as one binding
contract before any code is written. No Scene 2 canon, no ordinary-wish adjudication, no paid prose
evaluation in this slice.

## The shared primitives (one generic contract, not five patches)

**Stage inventory resolution** (D2) — `_resolveStageBeatInventory(s)`, source precedence, computed
fresh each call, read-only:
1. An active accepted `state._stageState` record (`_activeStageRecord`) — its `issued_objects`
   (minted `object_id`+`head`, D1) and `present` (resolved ledger ids) ARE the inventory.
2. Else, if the active seed/plan row declares legacy structured `sceneOne.groundedObjects` — normalize
   each into the SAME `{object_id, label, head, kind, owner_or_caretaker_ref, addressable_by}` shape
   (backend-derived `object_id`/`head` here too, for a stable, uniform contract) and the row's
   `stage.participants` into the same present shape. This is the EXISTING seed v2 path, preserved,
   now routed through one normalizer instead of being consumed ad hoc.
3. Else — empty inventory. No free-text `environment_elements`/`groundText` fallback (D2, explicit).
   Corridor, Famous Fate, and any story with neither an active stage nor a legacy structured object
   record get **no E+ for that beat** — not degraded, not invented, simply absent.

**Object identity** (D1) — every object in the resolved inventory carries a backend-minted
`object_id` (same minting authority as `_proposeNewEntity`'s entity ids — the caller/planner never
supplies one) and a backend-derived `head` (canonical display noun, computed from `label`, never a
planner claim). An E+ target must resolve to exactly one inventory object by `object_id` (falling
back to an exact normalized-label match only when the caller has no id yet to cite — never fuzzy
token overlap against free scene text).

**Exclusion enforcement** (D3) — both:
- **Filter**: `_resolveStageBeatInventory` never includes an object/location matching
  `rec.exclusions` — it is structurally absent from what's offered.
- **Reject**: a resolution attempt that names an excluded label/id anyway (bypass attempt, or a
  target proposed before an exclusion was recorded) returns a NAMED failure code
  (`TARGET_EXCLUDED`), never a silent non-match indistinguishable from "doesn't exist."

**C+ participant resolution** (D4) — `_resolveCPlusParticipant(entityRef, inventory, s)`. Resolves a
present-pool id to `{id, label, kind}` AND checks authored-facet availability via the EXISTING
`_facetSourceCoverage` (unchanged, reused, not reimplemented). No authored material → C+ unavailable
for that entity, never inferred from the bare label. `inventory.present` sourcing mirrors D2's
precedence for symmetry: active accepted stage's `present` first, else the existing seed/plan
`_effectiveSceneRow` `stage.onStage` (untouched legacy path), else empty — the pre-existing
text-derived "mentioned but absent" pool (`stage.offStage` + roster regex matching) is UNCHANGED and
OUTSIDE this contract (it can't be, since it's derived from prose that doesn't exist at resolution
time).

**Fusion reachability** (D5) — `_checkFusionReachability(participant, object)`. Valid only when
`participant.id` appears in `object.addressable_by`. Fail-closed: an object with empty/missing
`addressable_by` is reachable by **no one** — never a permissive default. Scoping note: D5 also
mentions "affordance rules"; `affordances` today are free-text scene-flavor strings, not
actor-scoped structured data, so THIS slice implements reachability via `addressable_by` only — no
new structured semantics are invented for `affordances` here.

**Fail-closed composition** (D6) — `_resolveStageBeatEligibility(s)` composes the above into one
read: C+-eligible participants (via D4), E+-eligible objects (via D2/D1/D3), and valid fusion PAIRS
(via D5, participant×object where reachability holds). A beat with no eligible C+ has no C+; a beat
with no eligible E+ has no E+; fusion needs both AND reachability — never invented to fill a gap.

## What stays explicitly unchanged
- C+ cadence/cooldown (`_cpSchedule`, ledger `cplus.rows`) — untouched, independent of staging.
- The seed/plan v2 path for scenes with no active accepted stage — preserved via the D2 normalizer,
  not replaced.
- The Exposure Clause — prompt text, no state dependency, untouched.
- No prompt content changes, no new provider call, in this slice — the skeleton-generation prompt
  still asks the model whatever it already asks; the CHANGE is what the VALIDATOR accepts afterward.

## Build order (controls-first, per this session's standing discipline)
1. RED: offline controls calling the not-yet-built primitives, proving today's system lacks these
   properties (free-text elements still validate; no facet-gated C+ unavailability; no reachability
   check; exclusions not enforced structurally).
2. Implement `_resolveStageBeatInventory`, object-id/head minting, `_resolveCPlusParticipant`,
   `_checkFusionReachability`, `_resolveStageBeatEligibility` — GREEN on the same controls.
3. Wire into the three real call sites (E+ target validator, C+'s `onStage` input, fusion's
   cross-check) — minimal, defensive, preserving the legacy path per D2.
4. Re-run the full existing regression (all real-browser proofs + offline suites) to prove no
   regression to the live seeded/corridor/CG/literary/FF paths this touches.
5. Report. Stop before any model call.
