# Continuation-stage issuer — generic design (2026-09-13)

Design only. No code, no model calls, no engine changes. This replaces the earlier framing that treated Scene 2's setting/object gap as something Roman must hand-author. It is not. Storybound is missing a general **engine capability**: after the reader's actual submitted response, something must decide the immediate physical stage — where, who, what's there, who controls it, what can be touched — before the prose author writes anything. Today only the roster/objective half of that exists (`_effectiveSceneRow`'s OPEN-row handling, `_recordScenePosture`, `_validateLocalObjective`). The physical/object half was never built, for any starter or for Corridor. This document proposes it, generically, and shows First Sacrifice Scene 2 using it as the worked example — not as the thing being solved.

## 1. What already exists, and exactly where this plugs in

For an OPEN row (`row.objective === 'reader'`), `_effectiveSceneRow` (`public/app.js` ~196813) already builds, once a posture-derived objective is accepted:

```js
effO.stage = {
  v: 1,
  provenance: 'reader_posture_spine',
  participants: [ { ref, label, presence: 'IN_PERSON' }, ... ],   // from roster ∩ obj.present
  eventFacts: [ { text: effO.goal, participants: [...], source: 'spine:posture' } ]
};
```

This is a real, working, persisted packet — it just has no physical layer. `groundedObjects`/`roleInstances` exist only under `seed.sceneOne` (Scene-1-specific, hand-authored, never regenerated). No mechanism produces the equivalent for Scene 2 or any later OPEN row, and Corridor stories — which have no seed at all — have nothing like it anywhere.

**Proposal**: the continuation-stage issuer is the missing step that runs alongside the existing local-objective planner call and extends this exact `stage` object with the fields it's missing, rather than replacing it or inventing a parallel structure.

## 2. Inputs

1. **Committed prior scene state** — the prior scene's own issued stage packet (§3), so continuity (who was where, holding what) isn't re-derived from scratch each scene.
2. **Current physical location, when still applicable** — the last-issued `location_ref`, carried forward by default (§4, rule 1).
3. **The reader's submitted Say/Do** — `_recordScenePosture`'s exact, persisted, hashed record. Never a summary.
4. **Issued character/relationship state** — seed-owned cast facets for a fixed starter (`STARTER_SEEDS.<id>.cast`, `.sceneOne.roleInstances`) or the Corridor-generated PC/LI/cast record for a generated story.
5. **Durable consequences** — the reputation/consequence ledger, where it exists (`project_reputation_consequence_requirement` — currently dormant/not built; the issuer reads it once it is, rather than needing its own rebuild).
6. **World lore** — `FATELANDS_CANON` (or the equivalent canon object for other worlds), specifically its `landmarks` domain (now holding The Open, §3 of `_audit_out/first_sacrifice_scene2_decision_sheet.md`) and any other structured, locked, or gated location/object entries.
7. **Locked future-event boundaries** — the row's own `reservedEvents`/`sealedEvents` (already read by `_effectiveSceneRow`) plus the structured `formal_inquiry_convened`-style ids proposed in the decision sheet §0/§3.

## 3. Output — a persisted, provenance-stamped stage packet

Extends the existing `effO.stage` shape (§1) rather than replacing it:

```js
effO.stage = {
  v: 2,                                    // bumped: v1 packets have no physical layer; consumers must check
  provenance: 'reader_posture_spine',      // unchanged
  participants: [ ... ],                   // unchanged (existing roster/objective mechanism)
  eventFacts: [ ... ],                     // unchanged

  location: {
    location_ref: <id — carried forward, or a newly issued one; never invented outside §4>,
    issued_by: <'carried_forward' | 'planner_proposed_accepted' | 'seed_authored'>,
    time_offset_from_prior_scene: <'continuous' | 'short_break' | 'later'>
  },

  grounded_objects: [
    {
      object_id: <scoped to this stage packet, not global>,
      label: <string>,
      owner_or_caretaker_ref: <who institutionally owns/is responsible for it — NEVER inferred from who currently holds it>,
      held_by: <who currently physically has it, if anyone — SEPARATE field from owner_or_caretaker_ref, see §4 rule 5>,
      addressable_by: [<character refs who may act on it this scene>]
    }
    // zero entries is a valid, compliant output — see the design doc's E+-unavailable case
  ],

  affordances: [ ... ],       // dialogue/stance-level, as today's `vectors` already provide; unchanged in kind
  allowed_axes: <decision_axis, unchanged>,
  excluded: {
    locations: [<ids explicitly ruled out this scene, e.g. 'the_open', with the reason>],
    objects: [<ids explicitly off-limits even if physically present>]
  },

  _issuance: { source: 'continuation_stage_issuer', reconciled_from: [...], rejected_proposals: [...] }  // audit trail
};
```

## 4. The planner/author/issuer split, and the five enforced rules

**Split, mirroring the existing reject-only pattern** (`_validateLocalObjective` never rewrites, only accepts/rejects): the planner may *propose* an ordinary immediate location and object list in ordinary ambient terms ("the same clearing," "a side passage off the hall," "the little grove past the assembly"). The issuer runs the same reject-only discipline `_validateLocalObjective` already uses for objectives — extended with new checks — and accepts or rejects the proposal; it never invents content of its own past what's in a proposal or the carried-forward record. The author may render *only* what the issuer accepted into the stage packet — never a location or object the planner merely mentioned in passing.

Five rules, each expressed as a structural check (extending `_validateLocalObjective`'s pattern, not a new mechanism):

1. **Preserve the current location when the reader hasn't left it.** Default behavior: if the posture doesn't propose departure, `location.issued_by = 'carried_forward'` and `location_ref` is copied from the prior scene's packet without a planner round-trip at all.
2. **Permit a plausible new immediate location when the reader's action genuinely moves the scene.** The planner may propose one; the issuer accepts it only if it's an *ordinary* location (no canon-locked id, no landmark-tier location) — same tier of judgment `_validateLocalObjective` already applies to present-cast membership.
3. **Never use The Open, or any canon-locked location, before its authored unlock point.** Enforced by checking the proposed `location_ref` against `FATELANDS_CANON.landmarks[*]` for a lock condition (The Open's is "before Issue 1's formal Inquiry") — a structured id lookup, not a lexical ban on the word "open." This is why landmark canon needed a real, checkable record (`_audit_out/first_sacrifice_scene2_decision_sheet.md` §0) rather than staying prose-only.
4. **Never invent locked future events, institutional outcomes, or canon.** This is exactly what the decision sheet's `declared_state_change_type` enum (§3) already covers for reserved-event ids — the issuer's location/object proposals get the identical reject-only treatment: a proposal touching `formal_inquiry_convened`, `price_identified`, or any reserved/sealed id above `none` is rejected regardless of phrasing.
5. **Never make an institution-owned artifact reader-owned merely because the PC holds it.** This is why `owner_or_caretaker_ref` and `held_by` are two separate fields in §3, not one. First Sacrifice's own aftermath truth `the_answer_institutional` already states this exact rule in prose ("Julian is its caretaker; Lirael holds it only for questioning, never owns it") — the issuer makes it structural: `held_by` may say `lirael`, `owner_or_caretaker_ref` stays `julian` (or the Institution), and any object with a declared caretaker rejects a proposal that would flip `addressable_by`-as-owner.

E+/fusion gate (unchanged from the earlier design doc, now precisely grounded): E+ is available for a stage only when `grounded_objects` is non-empty for that packet; fusion only when the same actor holds both a valid C+ revelation and a valid E+ target within that same issued packet. An empty `grounded_objects` array is a compliant "E+ unavailable" outcome, not a defect.

## 5. Worked example A — First Sacrifice Scene 2, ceremony-aftermath posture (reader keeps Lirael at the gathering)

Inputs: prior stage = Scene 1's own `seed.sceneOne` record (ceremony clearing, mated-pair trees, spiralgrass carpet — *not* The Open, confirmed no conflict in `_audit_out/first_sacrifice_scene2_decision_sheet.md`); posture = reader's Say/Do stays and responds in place; cast = Lirael/Julian/Seren/the presiding Dohkar (all issued, §2 of the design doc).

```
location: { location_ref: <SAME AS SCENE 1 — carried forward, ordinary rule 1>, issued_by: 'carried_forward', time_offset_from_prior_scene: 'continuous' }
grounded_objects: [
  { object_id: <PLACEHOLDER — not yet authored>, label: <PLACEHOLDER, e.g. "the ceremonial sash" if still on Lirael>,
    owner_or_caretaker_ref: <PLACEHOLDER — the rite/Institution, not Lirael>, held_by: 'lirael', addressable_by: ['lirael'] }
  // or: zero entries, if nothing ordinary is issued — a compliant E+-unavailable outcome, not a gap to force-fill
]
excluded: { locations: ['the_open — locked until Issue 1 formal Inquiry'], objects: [] }
```

C+ available per §3 of the design doc (Julian's status-without-display, the Dohkar's sacrificial-arrogance/peer-jealousy — both evidence-satisfied by this posture). E+/fusion depend entirely on whether the placeholder object row above is ever actually issued — this document doesn't decide that, the issuer would, at generation time, from the planner's ordinary proposal.

## 6. Worked example B — First Sacrifice Scene 2, leave/confront posture (reader has Lirael break from the gathering toward Julian)

Inputs: same prior stage, but posture genuinely moves the scene (rule 2 applies, not rule 1).

```
location: { location_ref: <PLACEHOLDER — planner-proposed ordinary location, e.g. "a side path off the clearing", accepted only if NOT a canon-locked id>, issued_by: 'planner_proposed_accepted', time_offset_from_prior_scene: 'continuous' }
grounded_objects: [
  { object_id: <PLACEHOLDER>, label: <PLACEHOLDER — an ordinary object plausible for "a path off the clearing", e.g. a fallen branch, nothing canon-bearing>,
    owner_or_caretaker_ref: <none — ordinary unowned prop>, held_by: null, addressable_by: ['lirael', 'julian'] }
]
excluded: { locations: ['the_open — locked until Issue 1 formal Inquiry'], objects: [] }
```

Julian's `julian_notices_without_volunteering` facet becomes newly evidence-eligible in a way it wasn't in Example A (private one-on-one proximity), still bound by its hard forbidden-implication guard (never suspicious/secret-holding before Scene 8). Nothing about the Inquiry, The Open, or the sacrifice's price may be touched in either example — rule 4 applies identically regardless of which posture the reader chose.

## 7. Generalization beyond First Sacrifice

Fixed starters (First Sacrifice and future ones): the issuer's accept-set for a proposed location/object is bounded by what the *seed* declares as ordinary/ambient for that world (e.g., "a Veilwood ceremony clearing" implies plausible ordinary objects like fallen branches, ordinary Veilweave folds — never a named canon artifact) plus canon-lock checks against `FATELANDS_CANON`. Corridor stories (no fixed seed): the same issuer runs with a wider ordinary-proposal acceptance envelope (no seed to bound it against) but the identical canon-lock and reserved/sealed-event checks apply whenever the story is set in a canon world — the mechanism is the same; only the seed-boundedness of "ordinary" differs.

## 8. What this document is not

Not a request for Roman to author Scene 2's location or objects. Not an implementation — no code was written, no function was added or modified, no provider was called. The two worked examples use explicit `<PLACEHOLDER>` markers precisely where an ordinary, non-canon-bearing detail would need to be issued at generation time by the mechanism above, not by this document. The Open remains untouched, excluded, and locked in both examples, consistent with `_audit_out/first_sacrifice_scene2_decision_sheet.md` and `[[project_fatelands_the_open]]`.
