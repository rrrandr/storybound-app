# Continuation-stage issuer — design-review addendum (2026-09-13)

Reviews `_audit_out/continuation_stage_issuer_design.md` against the actual current code. No implementation, no prompt edits, no canon changes, no provider calls, no Scene 2 C+/E+/fusion code. Every claim below is grounded in `public/app.js` as it stands today; every gap is named as a gap, not silently filled.

## 1. One authority — extend the existing scene-spine planner, not a new one

The single existing continuation-planning step is the scene-spine planner call inside `_buildAuthorFloorDirective` (`public/app.js`): it builds `_scSys`/`_scUsr`, for an OPEN row appends the "OPEN ROW — READER POSTURE → BOUNDED LOCAL OBJECTIVE" block (~98264-98287), makes exactly **one** provider call (~98442-98446, Mistral primary per the provider-policy work already closed this session), parses the reply, and — for OPEN rows only — runs `_validateLocalObjective` reject-only (~98471-98480) before anything is stored. When the posture is unchanged from a prior accepted objective, it makes **no call at all** (`_openReuse`, ~98432-98437).

The issuer must extend this exact step: add stage-packet keys to the same JSON schema this call already requests (alongside `posture_read`, `local_objective`, `present`, `reserved`, `aftermath`), and add the new reject-only checks to `_validateLocalObjective` itself. No second planner, no second provider call, no separate issuer round-trip — the reuse-on-unchanged-posture behavior must cover the stage packet too, or it silently defeats itself on every posture-unchanged replay.

## 2. Inputs and precedence

The requested order maps directly onto what the OPEN-ROW block already assembles, in the order it already assembles it — with one real gap flagged:

1. **Committed prior page/stage** — today: the baked-emitted aftermath summary (`s._bakedEmitted`, read first in the block, ~98269-98274) and, once a stage packet exists, the prior scene's own issued packet (not built yet).
2. **Reader's submitted Say/Do and selected card** — `_recordScenePosture`'s verbatim `action`/`dialogue` plus the recorded end-of-opening `choice`, already the second thing read into the prompt (~98275).
3. **Durable Petition/Tempt consequences and posture** — `s._durableFateConsequences`, already read in (~98279, "DURABLE CONSEQUENCES ALREADY IN FORCE") — this input already exists and is already wired, contrary to the reputation-ledger work being otherwise dormant; it's specifically the *scene-injection* side that's live, not the full ledger.
4. **Starter-specific seed facts and locked future-event boundaries** — `aftermathTruths` (must return "kept" per id) and `reserved` (must return "untouched" per id), already reject-only enforced.
5. **Shared world canon** — `FATELANDS_CANON`, including `landmarks`. **Gap**: this does not appear anywhere in the OPEN-ROW block itself. It reaches this same planner call only ambiently, via the outer Fantasy Depth Engine system-prompt text assembled elsewhere in `_buildAuthorFloorDirective` for `world === 'Fantasy'`. That's sufficient for the prose author (whose output isn't reject-gated the same way), but it is **not** sufficient for a reject-only issuer check — the issuer cannot rely on "the model probably read the system prompt" to keep a locked landmark out. It needs an explicit, structural lock-check at accept time regardless of what the ambient prompt says (see §5).
6. **Ordinary planner-proposed immediate details** — lowest authority: accepted only if nothing above rejects it. This tier doesn't exist yet in any form; it's the actual net-new content this whole proposal adds.

## 3. Location transitions

Three cases, only the first two of which have any precedent today:

- **Carry forward (default)**: when the posture doesn't propose movement, the issuer should not even solicit a location proposal — mirror `_openReuse`'s existing "no planner call needed" pattern at the location level: `location_ref` copies forward from the prior scene's packet, `issued_by: 'carried_forward'`.
- **Genuine move**: when the posture's own recorded `action`/`dialogue` — the exact text already threaded into the prompt — describes leaving or relocating, the planner may propose an ordinary new location; the issuer accepts it only if it isn't canon-locked (§5).
- **Unrecognised/ambiguous custom Say/Do**: this case has no precedent in the current mechanism, because the current mechanism has no location concept at all yet. It should follow the same doctrine the existing vectors already establish for objectives — "a posture matching none of the six vectors must still produce a valid objective" (proven case G2 in the Scene 2 decision sheet) — applied to location: an ambiguous or unparseable custom Say/Do defaults to **carry-forward**, never to an invented distant location. Locomotion should never be inferred from ambiguity; it must be read from an explicit signal in the posture text.

## 4. Ordinary generated stage details without permanent canon

Reuse the seed's own existing object convention rather than inventing a new one: `seed.sceneOne.groundedObjects` already uses `{ object_id, name, owner_ref, head }` (e.g. `O4`/`O5`, owner_ref: 'pc'). The issuer's generated objects should extend this shape, not replace it, with two additions:

- **Namespacing**: an issuer-generated `object_id` must be scoped to the story+scene stage packet (e.g. `s2:O1`), never a bare `O`-prefixed id — this makes it structurally impossible to confuse with seed-authored, permanent canon (O1-O7 stay Scene-1/seed-owned).
- **`held_by` vs `owner_or_caretaker_ref` as two separate fields** (not present in the seed's current `owner_ref`, which actually means "current holder" for O4/O5 — Lirael is wearing the sash, not owning it in an institutional sense). This split is required for §5's Answer/ownership rule below; extending the field set, not renaming the seed's working convention.
- **Persistence/expiry**: an issuer-generated object or location detail persists only as long as the stage packet that issued it remains "current" — mirroring how `s._sceneObjectives[sceneNum]` already persists per scene number and is superseded (not deleted) when the posture changes. It is never auto-promoted into `FATELANDS_CANON` or a seed's `worldTruths`/`groundedObjects`. Promotion to permanent canon is always a distinct, explicit, Roman-authorized action — exactly the precedent The Open itself just set: it did not become canon by being mentioned, it became canon by an explicit instruction to add it to `FATELANDS_CANON`.

## 5. Hard exclusions — structural enforcement

All four extend `_validateLocalObjective`'s existing reject-only pattern, in the same function, alongside its current `reserved`/`aftermath` checks:

- **The Open before the Inquiry**: check any proposed `location_ref` against `FATELANDS_CANON.landmarks`. **Real gap found**: the unlock condition ("before Issue 1's formal Inquiry") currently lives only as a prose sentence inside `STARTER_SEEDS.starter_first_sacrifice.worldTruths` — there is no machine-checkable flag anywhere (not on the landmark record, which is intentionally story-agnostic; not on the seed, which currently states the rule only in English). The issuer as designed cannot yet structurally enforce this without one. This is real, required engine work, not something already covered by the canon split done earlier today.
- **Locked future events**: already reject-only enforced via `reserved`/`aftermath`. The location/object proposal should get the identical treatment: extend the same `reserved` object so a location/object proposal that would itself constitute delivering a reserved id (e.g., proposing "a council chamber with a Chayr presiding" as this scene's location) is rejected the same way a reserved-event marker in the objective text already is. This is also where the decision sheet's `declared_state_change_type` enum proposal would plug in, once built.
- **Institution ownership of The Answer**: enforced by the `held_by`/`owner_or_caretaker_ref` split in §4 — a proposal may set or change `held_by`, never `owner_or_caretaker_ref`, for any object the seed declares an institutional owner for. A proposal attempting to reassign ownership (not mere holding) is rejected outright regardless of how it's phrased.
- **Facts/locations/objects outside the accepted packet**: this is enforced by construction, not by a new check — see §6.

## 6. Author boundary

Unchanged in kind from what already happens today: the author receives only `effO.stage`'s accepted fields — never the planner's raw reply, never a rejected proposal. Once the stage packet is extended (per the original issuer design's §3 shape), the same rule applies to `location`/`grounded_objects`/`affordances`/`excluded`. C+, E+, and fusion must read from this same accepted packet exclusively — no separate channel, and no author-side "supporting detail" invented to satisfy a facet's `evidence_requires`. If a fact needed to satisfy a facet's evidence condition isn't in the accepted packet, that facet is unavailable this scene — the same "E+ unavailable" discipline the Scene 2 design doc already established for objects applies identically to C+ evidence.

## 7. Generic population — and where input data doesn't exist yet

- **Seeded starters** (First Sacrifice, future ones): full mechanism as designed; the seed's own `worldTruths`/`groundedObjects` bound what counts as "ordinary."
- **Unseeded Corridor**: **major gap, not a minor one**. `_effectiveSceneRow`'s entire OPEN-row/posture/objective mechanism runs only when `_activePlan(s)` returns a plan with `scenes` — i.e., only when a seed-backed plan exists. Corridor stories have no `STARTER_PLANS` entry and no `plan.scenes`, so `_curMs._open`/`_effSpine` never fire for them today. This means "generalizing to Corridor" isn't a matter of widening the ordinary-proposal envelope — Corridor has **no equivalent persistence mechanism at all** for posture, accepted objectives, or (by extension) stage packets. Building that equivalent is its own separate, unscoped engine task, not a natural extension of this one.
- **Famous Fate**: confirmed today that it receives neither Fatelands canon layer (this session's prior proof). But FF has no reviewed equivalent of `FATELANDS_CANON` to play the same role — no "FF canon gate" data structure was found or built. Per Roman's own framing this needs its own canon gate; that gate does not exist yet, so an FF story using this issuer would currently have an empty §2-tier-5 (shared world canon) with nothing to fill it — not wrong, just unimplemented.
- **Literary vs. CG**: the stage packet itself is render-mode-agnostic structured state; both paths would read the same accepted packet. CG carries one additional requirement not needed by literary: rendering an issued object/location as a visual panel must stay paint-only (`feedback_image_directive_paint_only`) — an issued `grounded_objects` entry becoming a CG panel needs its own paint-directive pass, which isn't automatic and isn't designed here.

## 8. First Sacrifice worked examples (unchanged from the original design, read against the new rules)

**A — ceremony-aftermath posture (stays):** `location.issued_by: 'carried_forward'`, `location_ref` unchanged from Scene 1's own clearing (confirmed distinct from The Open — not the 24-trunk tangle). Any object row remains `<PLACEHOLDER>`; `excluded.locations` explicitly lists The Open, now citing the real gap from §5 — this exclusion is enforced only once the missing lock-flag (§5) is built, not yet today.

**B — break-away posture involving Julian:** `location.issued_by: 'planner_proposed_accepted'`, an ordinary, non-canon-bearing `<PLACEHOLDER>` location (e.g., "a side path off the clearing") — never The Open, never a council chamber, never any location whose name or description would itself constitute delivering `inquiry_opened`/`formal_inquiry_convened`. No object is invented beyond `<PLACEHOLDER>` markers. The Inquiry is not pre-written in either example.

## 9. Acceptance plan — red/green

| Category | RED (must reject) | GREEN (must accept) |
|---|---|---|
| Carry-forward | A proposal is accepted despite the posture indicating no movement | No proposal solicited; `location_ref` unchanged, `issued_by: 'carried_forward'` |
| Genuine movement | Same moving posture, but the proposed location is canon-locked (e.g. The Open) | Posture clearly moves the scene; an ordinary, non-locked location is proposed and accepted |
| Custom ambiguous Say/Do | An ambiguous/unparseable posture triggers an invented, distant location | Ambiguous posture still yields a valid objective (existing G2 precedent) and location defaults to carry-forward |
| Excluded-location attempt | The Open (or any locked location) is proposed and accepted before its unlock condition is met | The identical proposal is accepted once the (to-be-built) lock flag reports the condition satisfied — proves the check is conditional, not a permanent ban |
| Locked-event attempt | A location/object proposal that itself would deliver a reserved id (e.g. staging a council hearing) is accepted | The same proposal is rejected the same way a reserved-event marker in objective text already is |
| Ownership | A proposal reassigns `owner_or_caretaker_ref` for The Answer (or any seed-owned object) to Lirael | Lirael holds it (`held_by: 'lirael'`) while `owner_or_caretaker_ref` stays the Institution/Julian |
| Persistence | An issuer-generated one-off object from Scene 2 resurfaces in Scene 5 treated as established permanent canon | The object is either not referenced again, or explicitly re-issued for the later scene — never silently promoted |
| Author-invention refusal | Rendered prose contains a location/object/fact absent from the accepted packet | Author renders only accepted-packet content, and correctly renders nothing (not an invented detail) when a packet field is empty |

## Decisions required from Roman vs. engine-only work

**Needs Roman's decision:**
- Whether, and how, to turn The Open's unlock condition from a `worldTruths` prose sentence into a structured, checkable flag — and where that flag should live (on the landmark record, on the seed, or in a new locked-locations registry) — this is real missing engine data, not a design choice this addendum can make.
- Whether Corridor stories get this mechanism in a first pass at all, given they currently have no equivalent posture/objective persistence infrastructure to extend — a scope call, not an implementation detail.
- Whether and when Famous Fate gets its own canon-gate data structure, and what it should contain — a separate design question from this issuer.
- Whether an issuer-generated stage detail should ever be promotable to permanent canon, and if so, by what explicit process.
- Approval to extend the seed's existing `owner_ref` object convention with a distinct `institution_ref`/`caretaker_ref` field rather than overload the current field's "current holder" meaning.

**Engine-only work, once approved (no further Roman decision needed):**
- Adding the new stage-packet JSON keys to the scene-spine planner's existing schema and OPEN-ROW prompt block.
- Adding the corresponding reject-only checks to `_validateLocalObjective`.
- Extending `effO.stage`'s shape per the original issuer design's §3.
- Namespacing issuer-generated object ids to the stage packet, distinct from seed-owned ids.
- Per-scene persistence/expiry bookkeeping for issued stage packets, mirroring `_sceneObjectives`.

Stopping here for review. Nothing above has been implemented.
