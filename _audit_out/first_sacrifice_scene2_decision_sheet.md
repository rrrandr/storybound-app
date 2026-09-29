# First Sacrifice Scene 2 — decision sheet (2026-09-13, revised)

Design only, derived strictly from `_audit_out/first_sacrifice_scene2_cplus_eplus_fusion_design.md`. No new First Sacrifice fact, object, or facet is authored here. Every blank below is a named empty slot, not a filled-in guess. No code, no model calls.

**Revision note (2026-09-13):** §1's original template treated Scene 2's missing `setting.location_ref` as an open blank with no further constraint. Roman corrected this: The Open (the 24-trunk circular clearing used for formal trials, treaties, coronations, and matters of comparable institutional gravity — now recorded as approved Fatelands canon in `[[project_fatelands_the_open]]`) is **not eligible** to fill that blank for Scene 2 at all. It is a locked Issue 1 location reserved for Lirael's formal Inquiry near the end of Issue 1, after a preliminary, university-like process gives her and Julian time to investigate, get into trouble, conceal things, or flee. §1 and §4 below are revised accordingly; a new §0 records the boundary explicitly.

## 0. Boundaries this revision establishes

- **Scene 2 must not convene, begin, or resolve the formal Inquiry.** The Inquiry is Issue-1-climax content, not early-arc content.
- **The Open is a future locked Issue 1 location, not a Scene 2 setting or object packet.** It has its own canon entry (`[[project_fatelands_the_open]]`) and is excluded from every Scene 2 authoring slot below.
- **Early scenes (including Scene 2) may establish**: accusation, preliminary review, notice, political pressure, procedural threats, investigation, flight, or competing explanations — narrated through the reader's own choices, never substituted for them by a fast-forward to a hearing.
- **The Issue 1 climax is provisional architecture, not a fixed outcome**: a surprise first witness or revelation is expected to show the danger is more nefarious than the charges Lirael believed she faced. This is a shape for the eventual formal Inquiry beat, not something Scene 2 needs to plan for or foreshadow mechanically.
- **Enforcement must use structured future-event status, not lexical phrase guards** — see the revised §3 enum below, which now includes an explicit `formal_inquiry_convened` reserved id alongside Scene 2's existing two.

## 1. Per-posture Scene 2 stage-packet template

The existing seed authors this exact shape for Scene 1 (`seed.sceneOne.groundedObjects`, `seed.sceneOne.roleInstances`) and Scene 2's own row already authors `stage.participants`/`presentGroups`/`vectors`/`aftermathTruths`. What's missing is the object/ownership/affordance layer Scene 1 has and Scene 2 does not. One packet is needed **per legitimate reader posture family** (the six listed `vectors`, plus the "matches none of the six" case from G2) — not one packet for the scene as a whole, since what's addressable plausibly differs by posture (e.g. "claim the interference openly" vs. "let the assembly keep its assumption" may expose different objects/parties as salient).

Template, with each field's current status:

```
posture_family: <one of the 6 issued vectors, or "reader-original">

setting:
  location_ref: <EMPTY — STILL UNDECIDED. Ruled OUT: The Open (locked Issue 1 Inquiry location, see §0). Not yet ruled in or out: whether Scene 2 stays in Scene 1's own ceremony clearing (the seed's ordinary paired mated-pair trees / crimson spiralgrass setting — a different, smaller location than The Open) or moves elsewhere for the accusation/fallout beat.>
  time_offset_from_scene1: <EMPTY — immediate continuation vs. a scene break was never declared>

present_character_refs: <ALREADY ISSUED — stage.participants: Lirael, Julian, Seren, the presiding Dohkar>

event_facts: <ALREADY ISSUED — the 4 aftermathTruths (§1 of the design doc); no new ones needed here>

grounded_objects:
  - object_id: <EMPTY>
    label: <EMPTY>
    owner_or_caretaker_ref: <EMPTY>
    addressable_by: <EMPTY — which present character(s) may act on it>
  # repeat per object; zero entries is a VALID answer if Roman rules nothing is addressable in Scene 2

owner_caretaker_refs: <EMPTY — depends on grounded_objects above; e.g. Scene 1's O4 "Sacrificiant's gossamer band" names no caretaker even in Scene 1>

affordances: <PARTIALLY ISSUED — the 6 vectors exist as dialogue/stance affordances; no OBJECT-directed affordance exists because no object is issued>

allowed_axes: <ALREADY ISSUED — decision_axis: "claim the interference openly vs. let the assembly keep its assumption">

excluded_objects: <EMPTY — cannot be populated until grounded_objects exists; e.g. would the ceremonial sash (O5) be explicitly off-limits to reader action in Scene 2, or simply absent? The Open itself and anything scoped to it are excluded by definition, not by this field.>
```

**What this reveals**: `event_facts`, `present_character_refs`, and `allowed_axes` are fully issued today — the gap is entirely in `setting.location_ref` and the object layer. Nothing here proposes an answer; each `<EMPTY>` is the exact datum Roman would need to author or explicitly decline (a declined slot with zero objects is a legitimate outcome, not a stalled one). **The Open is removed from this dependency entirely** — it was never a valid candidate for `location_ref` and is now recorded as such rather than left ambiguous.

## 2. Lirael Character+ proposal — same issued-facet/evidence shape as NPCs

Today Julian, Seren, and the Dohkar each carry `facet_id` + `canonical_truth` + `possible_pressures` (with `evidence_requires`) + `forbidden_restatements`/forbidden implications. Lirael's two facets (`pc_untested_brilliance`, `pc_fears_public_failure`) exist but carry none of that apparatus — they're bare labels, and the only pointer to how they'd ever surface is the unresolved `pc_opening_fusion` comment.

**Proposed shape** (structure only — the bracketed fields are the exact authoring work needed, not filled in here):

```
facet_id: pc_untested_brilliance
canonical_truth: <EMPTY — one sentence, same register as e.g. julian_status_without_display's>
possible_pressures:
  - condition: <EMPTY — what present-scene content makes this facet relevant>
    evidence_requires: <EMPTY — regex/pattern the scene's actual content must satisfy, same mechanism NPCs use>
forbidden_restatements: <EMPTY — what an author must never state outright about Lirael via this facet>
```
(identical shape for `pc_fears_public_failure`)

**How the PC's C+ revelation would be selected and rendered — the part NPCs don't need, because NPCs are revealed TO the reader, while Lirael IS the reader's own vantage:**

- **Selection**: the same reject-only evidence-gate NPCs use (`evidence_requires` matched against this scene's aftermath + posture content) should gate PC-C+ too — no special-casing that lets Lirael's interiority appear ungrounded when an NPC's cannot.
- **Rendering**: unlike an NPC C+, which is *another character's* perception surfacing through prose, a PC-C+ has no external observer to attribute it to inside the fiction — it would render as Lirael's own interiority (POV-internal, not another character's read on her). This is a genuinely different mechanism from the nine C+ mechanisms already on file for NPCs (`feedback_character_plus_mechanisms.md`), not a variant of one of them — worth Roman's explicit confirmation before any of those nine is assumed to cover it.
- **Responsiveness, not override**: a PC-C+ reveal must be a consequence that *follows from* the objective already validated against the reader's own posture (§6 of the design doc) — it narrates what the reader's stated choice reveals about Lirael, never a fact injected regardless of what the reader chose, and never a fact that recolors or reverses the posture the reader already submitted.

**Missing before this can be built**: `canonical_truth` and `possible_pressures`/`evidence_requires` for both facets (parallel to what Julian/Seren/the Dohkar already have), and Roman's ruling on whether PC-C+ counts as a tenth mechanism or an adaptation of one of the nine on file.

## 3. Smallest closed enum for `declared_state_change_type`

Reject-only validation classifying what the planner's own reply did to a reserved event — **not** a prose-planning tool and **not** a script for a future scene beat. The planner self-declares one value per reserved id in its window; the validator checks the declared value against a per-id allow-list.

**Revision**: §0 requires a third reserved id beyond Scene 2's existing two — `formal_inquiry_convened` — scoped structurally rather than by phrase-matching, so that no early scene can drift into delivering the Inquiry by accident regardless of how it's worded. Today: only `none` is allowed for `price_identified`, `inquiry_opened`, **and** `formal_inquiry_convened` in Scene 2 and every scene before the authored Issue 1 climax — none of the three may be touched.

```
enum declared_state_change_type:
  none              — the reserved event's substance is not referenced at all
  referenced_only   — the reserved event is named/alluded to as still-pending, with no new fact stated
  partial_gesture    — a fact adjacent to the reserved event appears, without resolving the event itself
  full_delivery      — the reserved event's substance is actually stated/resolved
```

**Scene 2 worked examples** (illustrating the enum, not authoring new content):
- Objective text that never mentions the coming inquiry's substance, the sacrifice's price, or a formal Inquiry/The Open → `none` for all three ids. **Only value Scene 2's validator may currently accept.**
- Objective text where Julian says "that question will keep, for now" (naming that an inquiry is coming, without describing it) → `referenced_only` for `inquiry_opened` — would be a **new** allowed value only if Roman decides row 2 may reference row 4's pending inquiry; today it's still a reject, since the allow-list is `{none}`.
- Objective text that states what specifically will be investigated, or who bears the sacrifice's cost → `full_delivery` for `price_identified`/`inquiry_opened` — always a reject for Scene 2 regardless of allow-list changes, since row 3/row 4 are strictly ahead of row 2.
- Objective text that stages any council/board formally questioning Lirael, or places anyone at The Open, or describes a hearing/verdict of any kind → `full_delivery` for `formal_inquiry_convened` — a hard reject in Scene 2 and in every early scene per §0, independent of phrasing, since this id is checked structurally rather than by matching against phrases like "inquiry" or "hearing."

The enum only classifies the planner's own output for a validator to check; it carries no instruction about what SHOULD happen in scene 3, 4, or the eventual Issue 1 climax, and authors nothing about them.

## 4. Dependency table

| Decision needed | Unlocks C+ | Additionally unlocks E+ | Additionally unlocks fusion |
|---|---|---|---|
| Author `canonical_truth`/`possible_pressures`/`evidence_requires` for Lirael's 2 facets | Lirael's own C+ (NPC C+ already unlocked today — Julian/Seren/Dohkar need no new authoring) | — | — |
| Rule on PC-C+ rendering mechanism (10th mechanism vs. adaptation of the 9) | Required before Lirael C+ can render at all, even with facet data authored | — | — |
| Author Scene 2 `setting.location_ref` — **from the eligible set only; The Open is excluded by §0** | — | Required (E+ needs a place before it can need objects in that place) | Required (inherits from E+) |
| Author ≥1 Scene 2 `grounded_objects` entry with owner/caretaker + addressable_by | — | Required — this is the actual blocking gap identified in §4 of the design doc | Required (inherits from E+) |
| Decide whether Scene 1's O1–O7 carry forward vs. Scene 2 gets its own inventory | — | Resolves the object-authoring question above, one way or the other | Resolves same |
| Confirm at least one present actor can hold both a valid C+ revelation and a valid E+ target in the same beat | (independent of this) | (independent of this) | Required — this is a per-instance check at generation time, not a one-time seed decision |
| Build the `formal_inquiry_convened` structured reserved id and wire it into every early scene's validator, not just Scene 2 | (independent of this) | (independent of this) | (independent of this) — but required before any early scene, including a future Scene 3+, may safely author investigation/flight/concealment content near this boundary |

Reading the table: **C+ for the three NPCs is already unlocked today** — no new seed data required. **C+ for Lirael** needs the facet-authoring + PC-rendering-mechanism decision. **E+** (and therefore **fusion**) needs the setting + object-inventory decisions, with The Open now explicitly removed from the candidate set; nothing else in this document can substitute for that.

## Revised Scene 2 gap, reported

Scene 2's actual immediate setting is **not yet decided** — The Open is ruled out, but neither "stays in Scene 1's ceremony clearing" nor "moves to a new, not-yet-authored location" has been chosen. Its object inventory is likewise **not yet decided**, and depends on that setting choice. Both remain open questions for a separate decision; this sheet does not resolve them, only narrows the candidate space. The Open itself is preserved as approved world canon for its own eventual use (`[[project_fatelands_the_open]]`), scoped to Issue 1's climax, outside Scene 2 entirely.

No implementation follows from this sheet. Stopping here for review.
