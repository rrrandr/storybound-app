# Generic stage-state substrate — design only (2026-09-13, revised 2026-09-14)

**Revision note (2026-09-14):** Roman made two corrections to the 2026-09-13 version. §3's "open roster" language was wrong — Corridor's absence of a seed roster must not become license for the planner to invent recurring people as prose names; it needs the same bounded, identity-recorded selection seeded stories already get, drawn from an existing mechanism, not a new one (§3, revised). §4's persistence question was left open as "a real, unresolved question" — it is now resolved: stage-state keeps immutable per-scene history forever, but the *active* stage explicitly closes at an Issue boundary and Issue 2 is issued a fresh one (§4, revised). §2 (the landmark-lock shape) and the one-planner-authority argument of §3 are unchanged.

**Second revision note (2026-09-14):** Roman confirmed the correction and sharpened two implementation requirements that were implicit rather than stated: (1) every reference into the entity registry — `present`, `addressable_by`, `owner_or_caretaker_ref`, `held_by`, a creation-event's own back-reference — must use the ledger's stable id, never a name or alias, since names collide, change, and get reused (§1, §3, made explicit). (2) [SUPERSEDED — see the third revision note directly below] a "near-duplicate" reject-and-hold check was proposed here; it was wrong.

**Third revision note (2026-09-14): the near-duplicate/reject-and-hold mechanism is removed entirely, not refined.** It would have blocked ordinary story generation any time the system judged two names or descriptions "similar," requiring a review queue Storybound has no path for during live generation — and it contradicted the standing rule that duplicate display names are a legitimate part of a story (two characters can simply both be named Julian). §3 and §7 are corrected below: the only identity-conflict red case is a proposal reusing an *existing stable id* with conflicting canonical identity data. A brand-new, previously-unissued id is always valid, regardless of what its display name resembles. Stage issuance performs **no fuzzy identity matching at all** — collisions are handled procedurally, by exact-string label comparison producing an issued disambiguator, never by judgment calls about whether two people are "probably" the same. He also named the next engineering slice: implementing §7's controls as executable tests, *before* any planner is allowed to rely on this design — recorded below, not started; this remains a documentation-only deliverable.

No code, no prompt edits, no canon changes, no provider calls. This is the layer that must exist *before* a continuation-stage issuer (`_audit_out/continuation_stage_issuer_design.md` + its addendum) can be implemented for more than First Sacrifice. It answers the architectural correction directly: the issuer as previously designed extends a mechanism that today only exists for seeded plan rows, and The Open's lock is only ever prose a model might read, never state a validator can check. This document proposes the minimum substrate that fixes both, generically, for one planner and one validator serving both populations. **None of it is enforced today — it is a design, not a control**, until the executable tests named below exist.

## 1. The persisted per-scene stage-state record

Today, `_sceneObjectives[sceneNum]` (`public/app.js` ~98535-98537) is the only durable, per-scene, storyId-stamped record this mechanism produces, and `_effectiveSceneRow` derives `effO.stage` from it fresh on every call — `effO.stage` itself is a **view**, not the durable record. The substrate needs a sibling durable record, not a replacement for the derivation logic:

```js
state._stageState = {
  "<sceneKey>": {
    v: 1,
    storyId: <ownership stamp — checked on every read, same discipline _openReuse and _bibleArtifacts already use>,
    issueId: <which Issue this record was issued under — see §4>,
    sceneKey: <string — see §3 for how this is assigned for seeded vs. corridor scenes>,
    status: 'pending' | 'accepted' | 'superseded',      // mirrors _sceneObjectives' existing status field exactly
    postureHash: <mirrors the existing reuse-on-unchanged-posture pattern>,

    location: {
      location_ref: <id, carried forward or newly issued>,
      issued_by: 'carried_forward' | 'planner_proposed_accepted' | 'seed_authored',
      time_offset_from_prior_scene: 'continuous' | 'short_break' | 'later'
    },
    present: [ <STABLE LEDGER ENTITY IDS ONLY — e.g. "pc", "ent:12" — never a name or label; see §3 >,
    present_disambiguators: { "<entity_id>": <short distinguishing phrase> },  // populated ONLY when 2+ present entities' resolved labels are exact-string identical; see §3 — never a fuzzy/semantic judgment
    issued_facts: [ { text, source } ],                  // generalizes today's eventFacts
    issued_objects: [
      { object_id: <stage-packet-namespaced, e.g. "s:<sceneKey>:O1">, label,
        owner_or_caretaker_ref: <STABLE LEDGER ENTITY ID, institutional owner, never inferred from possession>,
        held_by: <STABLE LEDGER ENTITY ID, current physical holder, separate field>,
        addressable_by: [ <STABLE LEDGER ENTITY IDS who may act on it this scene> ] }
    ],
    affordances: [ ... ],
    exclusions: { locations: [ { id, reason } ], objects: [ { id, reason } ] },

    provenance: { source: 'seed_constrained' | 'corridor_generated', reconciled_from: [...], rejected_proposals: [...] },
    lifecycle: { issuedAt: <ts>, supersededAt: <ts|null>, closedAt: <ts|null — see §4>, closedReason: 'scene_advanced' | 'issue_boundary' | null }
  }
}
```

This is additive to, not a replacement for, `_sceneObjectives` — a scene's stage-state record and its objective record share the same `sceneKey`/`postureHash`/`status` discipline but are separate durable objects, since an objective can be accepted with no stage detail yet resolved (today's actual behavior) and the two have different lifecycles.

**Every accepted record is immutable history the moment it's written** — nothing in this substrate ever mutates a past record's `location`/`issued_objects`/`present` fields after acceptance. "Closing" a stage (§4) only ever appends `closedAt`/`closedReason`; it never rewrites what was issued. The `issueId` field is what lets §4's active-vs-history distinction be read back correctly after a resume.

**Hard requirement (2026-09-14): every reference above is a stable ledger id, never a name.** `present`, `owner_or_caretaker_ref`, `held_by`, and `addressable_by` all resolve through `_relationshipLedger.entities` by `id` (`"pc"`, `"ent:12"`, ...) — never by `label` or an alias string. A name is a display convenience the ledger already tracks in `aliases`; it is not a stable reference, since it can collide (two different entities sharing a label), change (a title, a rename), or be reused across entities over a story's life. Any proposal that identifies a person by bare name rather than a resolvable ledger id is malformed input to the validator, not an acceptable stage-state reference.

## 2. A structured world/arc constraint record — The Open as the illustrating example only

**No canon is added or changed by this section.** `FATELANDS_CANON.landmarks.the_open` stays exactly as corrected earlier today: shared, generic, story-agnostic. The gap identified in the addendum was that its unlock condition ("late Issue 1, not yet convened") exists only as a sentence in `STARTER_SEEDS.starter_first_sacrifice.worldTruths` — readable by a generative prompt, unreadable by a reject-only validator. The fix is a new registry, separate from both `FATELANDS_CANON` and the seed's prose, that a validator can query directly:

```js
// PROPOSED SHAPE — not built, not populated. Illustrated with The Open; no values below are canon.
ArcConstraint {
  landmark_id: 'the_open',                                   // points at FATELANDS_CANON.landmarks.the_open — never duplicates its description
  availability_state: 'locked' | 'unlocked' | 'conditional',
  unlock_condition: { type: 'story_event_id', ref: <e.g. 'formal_inquiry_convened'> },   // a structured id, not a phrase
  forbidden_before_condition: { type: 'reserved_event_not_fired', ref: <same id> },       // the reject-only test itself
  owning_story_arc_scope: { seed_id: 'starter_first_sacrifice', arc: 'issue_1' }          // this record applies ONLY within this scope
}
```

The `owning_story_arc_scope` field is what keeps this generic rather than First-Sacrifice-only: The Open itself has no global lock (a different story could use it freely, or lock it differently) — the constraint is attached per owning story/arc, exactly mirroring how the Inquiry fact itself was moved out of shared canon into the seed's own `worldTruths` earlier today. This record is what `_validateLocalObjective`'s new location check (addendum §5) would actually query, instead of hoping a proposal never mentions "The Open."

## 3. One planner authority, one validation path, for both populations

**The generalizing move, precisely**: today the entire mechanism is gated by `_curMs._open`, which is only ever true when a seed's plan row declares `objective: 'reader'` (`_effectiveSceneRow`, `row.objective === 'reader'`). Corridor stories have no `plan.scenes` at all — `_activePlan(s)` returns null — so this boolean is false for every corridor continuation today, and nothing in the OPEN-ROW block, `_validateLocalObjective`, or (by extension) any future stage issuer ever runs for them.

**The fix is not a second planner for corridor — it's changing what the gate means.** The scene-spine planner's OPEN-ROW-style block should become the default path for *every* continuation turn, seeded or not, with the presence of seed data changing what *constrains* the reject-only validator rather than whether the mechanism exists at all:

- **Seeded plan row present** (First Sacrifice-style): `eff.roster`, `eff.reserved`, `eff.aftermathTruths`, `eff.vectors` are populated from the row exactly as today — the validator's existing checks apply unchanged.
- **No plan row** (Corridor): the same JSON schema is requested from the same single provider call, but `eff.roster` is bounded differently — see the correction below. `eff.reserved`/`eff.aftermathTruths` are empty arrays (checks pass trivially, exactly how they already do today whenever a row happens to declare none), and the world/arc constraint check (§2) still runs against whatever registry entries exist in scope, empty or not.

**Correction (2026-09-14): "no seed-imposed roster" is not "unlimited invented people."** The original wording — "an open, generated roster" — was wrong: it would let the planner name a new recurring person every turn with no identity record behind them, recreating in a new layer exactly the continuity failure this whole substrate exists to close. The actual bound already exists in the codebase and needs extending, not inventing: `state._relationshipLedger` (`_relLedger`, `public/app.js` ~31168+) is already the storyId-scoped, fail-closed, versioned entity registry every story — seeded or Corridor — maintains (`L.entities`, keyed by stable id, each carrying `kind`, `label`, `aliases`, and a `provenance` field already populated with values like `'seed'` and `'generated_cast'` elsewhere in the file). `_relEnsureEntity(L, id, patch)` is the existing upsert function, and `++L.seq` is the existing mechanism for minting a stable sequential id (e.g. `'v' + (++L.seq)` for edges today).

For Corridor, `eff.roster` for a stage proposal is bounded to: the PC and LI anchors (`_relPcId()`/`_relLiId()`, already always present via `_relEnsureAnchors`), the story's generated cast (`provenance: 'generated_cast'` entities), and any entity already committed by a prior accepted stage record — every one of these named by its ledger `id`, never by label (see §1's hard requirement). **A genuinely new person is not a free-text name in a proposal — it is a distinct, explicit creation event**: the planner proposes a new-entity creation (minimal role/identity data: a working label, an aliases array, a role hint), and only on acceptance does it get written into `_relationshipLedger.entities` with a stable minted id (`_relEnsureEntity`) and `provenance: 'stage_issuer_generated'`. Only *after* that commit may any later scene's stage proposal reference them, by that minted id — a proposal that names an unissued recurring person, rather than proposing their creation, is rejected exactly like any other unissued fact (§5 of the addendum).

**Corrected requirement (2026-09-14, tightened further): no novelty/near-duplicate check exists — but a creation proposal is not "always accepted," and the planner never mints its own id.** A planner may *propose* a new entity, supplying the required minimal identity fields (label, aliases, a role/kind hint) — that proposal is a request, not a commit. **The backend**, not the planner, validates it: schema well-formedness, `provenance` legitimacy, relevance to the stage actually being issued, and any applicable locked-world constraint (§2's `ArcConstraint` machinery, for a proposed entity that would itself collide with a locked fact). Only if all of that passes does **the backend** mint the stable id (`_relEnsureEntity` with a freshly incremented `++L.seq`, never a planner-supplied id) and commit the entity.

Within that validation, **display-name resemblance to an existing entity — including an exact match — is never a rejection reason.** What still rejects: invalid/incomplete structure, a forbidden or scene-irrelevant entity kind, a proposal that would violate a locked-world constraint, or — the one identity-conflict case — a proposal that names an *existing* stable id but supplies canonical identity data (its `kind`, `anchorRole`, `role_instance_id`, or equivalent identity-defining field — never its `label`/`aliases`) that conflicts with what that id already has on record. That last case is a data-integrity check against one specific id's own history, not a judgment comparing two different ids against each other, and it requires no fuzzy matching — the id either matches its own prior record or it doesn't.

Two different, validly-minted entities may end up with the same display name (two people both named Julian is an ordinary story, not a defect). When that happens, stage issuance detects it procedurally — an exact-string comparison of `present` entities' resolved labels for the active stage, nothing fuzzy — and adds an **issued disambiguator** to the stage-state record for each colliding entity (e.g. a distinguishing epithet or role phrase), so the author packet can tell them apart in prose without the validator ever having judged whether the two people are "the same."

One authority, one schema, one validator function — `_validateLocalObjective` extended, never duplicated, and `_relLedger`'s entity registry extended, never duplicated. Corridor's inputs are exactly the four the instruction named: committed prior stage-state (§1), reader posture (already generic — `_recordScenePosture` has no seed dependency today), world canon (§2, scoped or unscoped), and generated stage proposals bounded to the identity records above.

## 4. Persistence through saves, Issue boundaries, Library resumes, and future Memory Book work

**Durability precedent already established and working**: `state._bibleArtifacts` is explicitly documented in-code as "(state._bibleArtifacts, survives a save/reload) per-story, per-role state machine" (~line 253468) — a plain property on `state`, storyId-stamped, read back on resume without re-deriving anything from prose. `state._stageState` should follow the identical convention: a plain `state` property, restored automatically by whatever already restores `_sceneObjectives`/`_bibleArtifacts` on Library resume, through the same already-fixed staged-resume path (`continueStory()`, this session's own earlier repair) — no new save/load plumbing needed, only a new field riding the existing one. This part was already correct and is unchanged.

**Issue boundaries — resolved (2026-09-14 correction): history is permanent, the active stage is not.** The prior version of this document left this open by pointing out that `_resetStoryState` (L3, documented as firing at "the issue boundary" — `startBook2` calls it) does not currently clear `_sceneObjectives`/`_scenePosture`. That fact stands, but it describes today's code, not the intended design — Roman has now made the call directly:

- **Every accepted `_stageState` record is immutable history and is never deleted or cleared** — not by `_resetStoryState`, not at any boundary. It persists through saves, later Issues, and Library copies exactly like `_bibleArtifacts` and `_relationshipLedger` already do, stamped with the `issueId` it was issued under (§1).
- **Exactly one record per story is ever "active"** — the most recently accepted, not-yet-closed stage. A stage closes (its `lifecycle.closedAt`/`closedReason` gets set — an append, never a rewrite of what it recorded) when its scene ends and the next scene's stage supersedes it (`closedReason: 'scene_advanced'`, the ordinary case, already how `_sceneObjectives` marks a prior objective `superseded` today), **or** when an Issue boundary fires (`closedReason: 'issue_boundary'`) — the latter needs one new line added to `_resetStoryState`'s existing clear list: not to delete `_stageState`, but to close whatever is currently active and leave no active record behind.
- **A new Issue begins with no active physical stage.** The very next continuation in Issue 2 has nothing to carry forward from (§3's "carried forward" default has nothing to default to) and must go through full stage issuance — an ordinary planner proposal, checked the same reject-only way as any other, exactly as if the story's very first stage were being issued. This is a real, deliberate asymmetry with `_relationshipLedger`: that ledger is explicitly designed to be *carried* across an Issue boundary and re-stamped to the new story (`_relLedgerCarryAdopt`, ~line 31179 — "a carried ledger adopts the story it lands in") because *identity* persists across Issues, while *physical stage* does not. The codebase already draws exactly this distinction for one axis; this document extends the same distinction to the other.
- **Later issuers may read stage-state history as continuity context, never as current fact.** A Scene-5-in-Issue-2 stage proposal may cite "the willow clearing from Issue 1, Scene 1" as *narrative* continuity (the way the seed's own aftermath summaries already work), but nothing in that historical record — its location, its objects, who was present, who held what — is treated as still true without being explicitly reissued into the new, active record. Reading history and inheriting it as current state are two different operations, and only the first is permitted without a fresh issuance.

**Raw prose is never the authority, by construction, not by discipline**: the stage-state record is committed *before* the author writes (mirrors the existing objective-acceptance ordering, where `_validateLocalObjective` runs and the objective is stored before any prose exists at all). A later scene's stage computation reads the prior **record**, never re-parses previously generated prose to reconstruct where things are — exactly as `_effectiveSceneRow` already does for objectives today. This property is inherited for free from the existing architecture; it does not need to be separately built.

**Future Memory Book work**: out of scope here, and deliberately not designed in this document. It would track reader-facing reputation/consequence across stories; this substrate tracks physical/object/location continuity within one story. Both should eventually share the storyId-stamped, survives-a-reload durability convention above, but they are separate ledgers with separate lifecycles — noting the shared convention is the only connection this document draws.

## 5. Migration plan — existing stories and free-text paths unchanged until their stage state exists

- **Purely additive.** The absence of a `state._stageState` record for a scene must be fully valid and must produce exactly today's behavior (no location/object layer, free-text as now) — never an error, never a backfilled guess at prior history for a story that predates this substrate.
- **Flag-gated rollout, following the codebase's own established convention.** This file's own planner call already carries multiple independently-flagged experimental contracts (`window._structuredEventHandoff`, `window._consequenceSelectionPlanner`, `window._situationDrivenPlanner`, each default-off or independently toggled, ~98380-98430). The new stage-packet schema keys and the flipped `_curMs._open` gating (§3) should ship behind the same kind of flag, so First Sacrifice can be validated first without silently changing behavior for every other seeded starter or any live corridor story.
- **Validator checks degrade to no-op cleanly, matching existing behavior.** `_validateLocalObjective`'s new checks (location lock, ownership) must pass trivially when no `ArcConstraint` record or no `issued_objects` exist for a story — exactly how its existing `reserved`/`aftermathTruths` checks already pass trivially today when a row declares none.
- **No retroactive population.** A story already in progress when this ships resumes with zero stage-state records and simply starts accumulating them from its next continuation forward — never an attempt to reconstruct scenes 1 through N's stage history from their already-generated prose.

## 6. Decision table

| | Item |
|---|---|
| **Roman's canonical choices** | The `sceneKey` scheme for Corridor, which has no plan-row `n` to key against |
| | Who authors an `ArcConstraint` record for a given story (§2) — presumably Roman, as a story-scoped canon-adjacent act, parallel to how The Open's split was authored today |
| | Whether Corridor gets this substrate in the same rollout as seeded starters or a later phase (already flagged in the prior addendum; restated here since §3's fix is what would make that rollout possible) |
| | Approval of the flag-gated, additive migration approach (§5) |
| | ~~Whether stage-state is per-story or per-Issue lifecycle~~ — **resolved 2026-09-14**: immutable history is per-story (never cleared), the active stage is per-Issue (closes at the boundary) — see §4 |
| **Pure engine implementation** (once approved) | Adding `state._stageState` alongside `_sceneObjectives`, following its exact durability/ownership-stamp convention |
| | Extending `_effectiveSceneRow`'s stage derivation to read from it |
| | Extending `_validateLocalObjective` with the new reject-only checks, including the `ArcConstraint` query and the new-entity-creation check (§3) |
| | Flipping `_curMs._open`'s gate so the mechanism runs on every continuation turn, with seed presence constraining rather than gating |
| | Extending `_relEnsureEntity`/`_relationshipLedger` with a `'stage_issuer_generated'` provenance and the accept-then-commit sequencing (§3) |
| | One new line in `_resetStoryState` (L3) that closes the active stage record at the Issue boundary — an append (`closedAt`/`closedReason`), never a delete (§4) |
| | Object-id namespacing and per-scene close/supersede bookkeeping |
| **Missing data** | The Open's unlock condition as structured state — does not exist in any form today, only as the `worldTruths` sentence |
| | Corridor has zero existing per-scene persisted record of any kind to extend — this is the actual blocker §3 addresses |
| | Famous Fate's own canon-gate registry — not built; would need its own (empty-by-default) `ArcConstraint`-equivalent scope eventually, out of scope here |
| | No stage-state exists for any currently-saved or in-progress story — the migration plan (§5) treats this as the normal case, not a defect |
| | ~~"Is this a near-duplicate of an existing entity" check~~ — **removed 2026-09-14**: no such check exists or should exist; a creation proposal is never rejected for resembling an existing entity (§3) |
| | The exact-string label-collision check that produces `present_disambiguators` (§1/§3) — deterministic and simple, but not yet built |
| **Future provider/model evaluation** (explicitly not answered here) | Whether the scene-spine planner's current model (Mistral Small, per this session's already-closed provider-policy work) has the context budget and reliability to emit the new stage-proposal keys without truncation or quality loss — an empirical question for later, not something this design claims to have resolved |

## 7. Controls (design-level — what each would assert, not yet built)

| Control | Setup | Asserts |
|---|---|---|
| **Corridor planner attempts an unissued recurring name** | A Corridor stage proposal's `present` or `issued_facts` references a person by **name/label** rather than a resolvable `_relationshipLedger.entities` id, or by an id with no matching entity, and isn't accompanied by a creation-event proposal | **RED — reject.** The proposal is refused the same way an unissued reserved-event id is refused today; no entity is written, no stage record is accepted with a bare-name or unresolved reference |
| **Explicit new-entity record, then reused** | A planner proposes a well-formed creation event (label, aliases, role hint) for a genuinely novel person — schema valid, provenance legitimate, relevant to the stage, no locked-world constraint violated; display-name resemblance to any existing entity, however close, is not evaluated as a rejection ground | **GREEN — the backend mints and commits.** The backend, not the planner, assigns the stable id (freshly incremented, never planner-supplied) and writes a new `_relationshipLedger.entities` row with `provenance: 'stage_issuer_generated'`; a *later* scene's proposal may reference that **id** directly (never re-typing the name) and must be accepted, not re-flagged as unissued |
| **Two distinct ids, identical display name, both present** | Two genuinely different, already-minted entity ids happen to share the exact same resolved `label` (e.g. two characters both named Julian) and are both proposed as `present` in the same active stage | **GREEN — accept both; issue disambiguators.** Neither is rejected or merged for resembling the other; the exact-string label collision (never fuzzy matching) causes `present_disambiguators` to be populated for both ids so the author packet can distinguish them in prose |
| **Existing id reused with conflicting canonical identity data** | A proposal names an *already-minted* entity id but supplies a `kind`/`anchorRole`/`role_instance_id` (or equivalent identity-defining field) that conflicts with what that id already has on record — its display name is irrelevant to this check | **RED — reject by id, not by name.** The proposal is refused because the specific id's own record doesn't match, not because of any comparison to a different entity; no entity is written or altered |
| **A Scene 1 object incorrectly treated as present in Issue 2** | An Issue 2 stage proposal's `issued_objects`/`present` cites an object or location from an Issue 1 historical `_stageState` record without a fresh issuance for the new active stage | **RED — reject.** Historical records may be cited as narrative continuity text, never as a live `issued_objects`/`location` entry without being reissued; the validator checks the active stage's own record, not history, for what currently exists |
| **A past stage remains available as historical truth after the Issue transition** | After an Issue boundary closes the active stage (`closedReason: 'issue_boundary'`), the prior Issue's accepted `_stageState` records are read back (e.g. for a "what happened before" continuity reference, or a Library copy) | **GREEN — available, unmutated.** The closed record is still present in `state._stageState`, `status` and its issued fields unchanged from when it was accepted, `closedAt`/`closedReason` set — readable as history, not writable, and not silently re-activated |

## Next engineering slice (named, not started)

This document is design only and enforces nothing. Before any planner is allowed to rely on it, the next slice is to implement the six rows now in §7 (the four originally named controls, plus the two identity-conflict controls above — same-name/different-id disambiguation, and existing-id/conflicting-data rejection, replacing the withdrawn near-duplicate row) as executable tests against real code — the same red/green discipline this session has used throughout, not another design pass. That slice has not begun.

Stopping here for review. Nothing above has been implemented, and no canon or prompt was touched.
