# PLANNER CONTRACT v2 — BUILD + CONTROLS (stage 5.1) · 2026-09-05

Implements `planner_contract_v2_proposal.md` §2 (five field changes) and §4 (availability valve) on
`main` @ `d41dc35` + the earlier validator repair. **Working tree only, uncommitted. No route enabled,
no paid call, no deploy.** Drafts in `_drafts/` untouched and unapplied.

```
files: public/app.js (32 hunks) · public/index.html (buster 20260905c-contract-v2)
       _scene1_skeleton_delivery.mjs (fixtures + expectations) · _planner_probe3.mjs (replay/valve knobs)
       scripts/verify-baked-scene1.mjs (seed lint)
```

## What the planner is now asked for (seed-owned stages)

| field | v1 | v2 |
|---|---|---|
| `opening_actor_id` | — | person_id the opening beat stages, or null (validated against the beat text) |
| opening actor's `character_plus.visible_action` | free text | the literal `FROM_OPENING_BEAT`; the backend derives the act from `opening_beat` |
| `environment_elements` | free text ×2 | `environment_element_ids` (2–3 object_ids from the seed's `groundedObjects`) + optional `environment_realizations{id: ≤120 chars}` |
| `environment_plus.target` | free text | `target_object_id` ∈ chosen ids; the seed's name is rendered downstream |
| `pc_opening_fusion.environment_target/axis` | "repeat E+ verbatim" | **removed**; derived from E+ after parsing |
| `character_plus.enacts_evidence_id` | — | one id from the option's `evidence_ids`; the act gate (`evidence_requires`) still runs on the act |
| seed `groundedObjects[].owner_ref/head` | — | O4/O5 → `pc`, O6 → `all`; rendered as "(owner: Lirael)"; possessive-mismatch check over every free-text beat |

Planner-owned (corridor) stages keep the free-text contract: the id contract applies only where
the stage offers an object list. Old-shape replies are rejected **by name** (never coerced).

**Delivery/rendering:** ids are resolved to seed text *after* the identity scan (so a seed object
containing "Sacrificiant" is not read as a planner-invented person) and *before* normalisation, so
every existing validator, the author renderer and continuation consumers read the text they always
read. The E+ author line appends the realization when present. The author writes every sentence.

**Valve (§4):** an invalid ASSIGNMENT plan no longer aborts Scene 1. C+/E+/fusion are dropped,
`[SCENE1:ASSIGNMENTS:DROPPED] <faults>` is logged, `state._scene1AssignmentsDropped` records why,
unresolved staged-anchor sentinels are blanked, and the scene is authored from the seed stage.
Transport refusals (governor) and roster faults still abort. Kill switch:
`window._scene1AssignmentValve = false`.

## Controls (all $0, no provider dispatch — dev-server log shows 0 Ministral calls this session)

| control | result |
|---|---|
| prompt fingerprint `v1-repair` → `v2-contract-final` | system identical; user 64,578 → 65,265 chars; determinism ✓; the line diff is exactly the v2 fields (15 −, 16 +), nothing else |
| replay of the 12 frozen plans, valve ON | 12/12 assignments dropped with a **named v2 fault**, author reached in every case (Grok attempts blocked by harness), 0 crashes |
| same, valve OFF (mutation control) | abort restored: `settle=fatal`, Grok attempts 0, `[SCENE1:SKELETON:INVALID]` |
| `_scene1_skeleton_delivery.mjs` (SB_VALVE=off) | **368 passed · 0 failed** — every detection case still fires; fixtures moved to the v2 shape (one real shape, ids read off the dispatched packet) |
| `verify:*` (8 scripts, network blocked) | all green; `verify:baked` now 119 checks incl. the seed lint (every pressure has `evidence_requires`; owned objects have heads; forbidden-facts regex compiles) |

Two defects of mine were caught by the controls and fixed before anything else: the id contract
fired on assignment-owned stages that offer no objects (the solo/corridor cases went red), and
the identity scan flagged "Sacrificiant" once seed names were written into the plan. A third,
found by the suite: the head-noun rule only split on "of", so "the band tied across the
Sacrificiant's mouth" still picked "mouth" — it now stops at the first preposition, participle,
relative pronoun or parenthesis.

**One suite case retired on purpose:** `contemptOverJealousyEvidence` asserted that a bridge
describing a different option is rejected. Under policy 2 the bridge does not gate; the surviving
binding fault fires only when the alternative option's evidence excludes the enacted fact, and in
this seed the Dohkar's conditions share their fact — so the pairing is legitimate. It is now an
ACCEPT case with that reason written beside it.

## Review controls (2026-09-05, after Roman stopped the build short of a retest)

| # | control | result |
|---|---|---|
| 1 | cross-option case restored as a DISCRIMINATING fixture: cite an option whose evidence EXCLUDES the fact the act enacts (Seren: OPT-1 is established by E4 alone; the act enacts E3). Fixture THROWS if the packet offers no such pair | rejected by name — `enacts_evidence_id "E3", which does not establish this option (E4)`; both assertions green (rejection loop + table needle). The Dohkar-only form had gone inert because all four of his options cite E5 |
| 2 | PART V — positive delivery of a fully valid ID-based plan with a declared opening actor (`FROM_OPENING_BEAT`, ids, realization, enacted fact, derived fusion) | 9/9: accepted; Seren's committed act === the opening beat and marked derived; rendered once as her VISIBLE ACTION; staged anchor = same beat; E+ committed as the seed name + realization + axis and rendered once as "name — realization"; fusion carries E+'s target/axis by derivation and renders "↳ THROUGH: name — the axis of ritual"; enacted fact + resolved facet in the commit with planner internals stripped; bridge logged, not gated |
| 3 | 369 → 368 accounted: the removed assertion was `"contemptOverJealousyEvidence" is rejected visibly and no author call is made` (plus its table row). Both are restored in the discriminating form, and PART V/W add 17 more | **387 passed · 0 failed** (default valve OFF; PART W switches it on for its own pages) |
| 4 | PART W — valve ON with an old-shape plan | not fatal, author called once; drop logged by name; author directive has NO C+/E+/opening-fusion/standalone-fusion block; commit has empty C+, null E+/fusion/pof, `dropped:true` + faults; no anchor sentinel reaches the author; the planner's "dawn breeze"/"untrampled" text reaches neither system nor user payload; a ROSTER fault still aborts with the valve ON; the same plan at the shipped default aborts, named. Probe: governor refusal with the valve ON still aborts (settle=fatal, 0 author attempts) |
| 5 | doctrine | **The valve is a NEW policy**, not the pre-existing fail-C+-closed doctrine: that doctrine withdraws one candidate the scene proves nothing for and keeps planning; an invalid skeleton was fatal by explicit design ("swallowing it here is exactly the failure this work exists to prevent"). Therefore the default is now **OPT-IN** (`window._scene1AssignmentValve === true`); the shipped behaviour remains the abort until Roman approves the valve as default |

Everything else re-verified after the changes: `verify:*` green, prompt fingerprint identical to `v2-contract-final` (validator/suite-only edits), 0 provider dispatches across the session. Working tree still uncommitted; 14B not enabled; no retest calls.

## What this does not claim

It does not show a valid 14B plan. It makes five failure classes inexpressible and makes an
invalid plan non-fatal. Whether 14B now clears the 4-of-6 bar is the retest's question, and the
retest remains its own authorization (six calls, ≈ $0.025, fresh readers). Small remains
governor-refused; v2 is not a size fix.

## Next gate (unchanged from the proposal)

Authorize the 14B retest → GO ⇒ scoped route enable for the Scene-1 opening planner only,
deploy, live check. NO-GO ⇒ the remaining faults are planner quality against a contract that can
no longer be blamed.
