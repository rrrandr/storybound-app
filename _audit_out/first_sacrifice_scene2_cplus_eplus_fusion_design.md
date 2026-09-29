# First Sacrifice Scene 2 — C+/E+/fusion design review (2026-09-13)

Design only. No code, no model calls, no implementation. Every fact below is read directly from the current seed (`STARTER_SEEDS.starter_first_sacrifice` and `STARTER_PLANS.starter_first_sacrifice.scenes[1]`, `public/app.js`) and the current OPEN-row mechanism (`_effectiveSceneRow`, `_recordScenePosture`, `_validateLocalObjective`) — nothing here is invented, and every "unavailable" below is a finding, not a placeholder to fill in unilaterally.

## 1. Starting point: the fixed Scene 1 aftermath + the reader's actual posture

Scene 2 is an **OPEN row** (`n:2, objective:'reader'`), not a pre-authored branch tree. There is no "run vs. remain" decision baked into it — that framing belongs to the OAS interruption's own end-of-Scene-1 choice, which is a *separate*, already-built mechanism: the reader's end-of-opening exit (card-selected or custom-typed) is recorded verbatim by `_recordScenePosture(2, action, dialogue)` and hashed for reuse-detection. Scene 2's planner receives **that exact text**, not a summary and not a re-derived branch label. Row 2's own `decision_axis` field ("claim the interference openly vs. let the assembly keep its assumption") and its six `vectors` are explicitly documented in the seed itself as **affordances** — "any, none, or the reader's own — never a menu." A posture that matches none of the six vectors must still produce a valid objective; a posture that repeats a prior one reuses the persisted, already-accepted objective rather than re-planning.

Fixed and non-negotiable, regardless of the reader's posture (enforced structurally in §6, not by instruction):
- **`twist_manifested`** — Seren's wish already twisted on her own misalignment; not re-staged.
- **`interrogation_interrupted`** — Julian already interrogated Lirael publicly; the Dohkar already interrupted it as grossly inappropriate. Not re-staged.
- **`the_answer_institutional`** — The Answer belongs to the Institution, Julian is its caretaker; Lirael holds it only for questioning, never owns it.
- **`inquiry_authority_claimed`** — the Dohkar has asserted the rite and the ruling are his; Julian has publicly claimed authority to convene and preside over the coming formal inquiry. The inquiry itself is **not yet opened** — that's row 4's reserved event.

## 2. Issued Scene 2 inputs — exhaustively, nothing added

**Present cast** (`stage.participants`, all `presence: 'IN_PERSON'`):

| Character | Seed ref | Seed-owned facets (facet_id) | Forbidden implications |
|---|---|---|---|
| Lirael (PC) | `pc:self` | `pc_untested_brilliance`, `pc_fears_public_failure` | none declared |
| Julian (LI) | `named:julian` | `julian_status_without_display`, `julian_notices_without_volunteering` | 3 patterns: never read as contemptuous of the rite, never adversarial/challenging toward Lirael, **never suspicious or secret-holding before Scene 8** |
| Seren | `named:seren` | `seren_goodness_needs_witness`, `seren_trained_composure`, `seren_delicacy_over_truth` | never frightened/overwhelmed/a child who doesn't understand — "the poise is the point" |
| the presiding Dohkar | `role:first_sacrifice_presiding_dohkar` | 5-facet portfolio: `presiding_dohkar_ritual_contempt`, `_peer_jealousy`, `_compulsive_pedagogy`, `_sacrificial_arrogance`, `_kindness_to_the_poor` | per-facet forbidden restatements (stating the truth outright instead of performing it) |

Other roster entries seen elsewhere in the plan (`the Chayr`, `the second Dohkar`) are **not** in Scene 2's `stage.participants` and may not be cited as present.

**Aftermath state**: the 4 `aftermathTruths` above (§1) — a valid objective must declare every one `kept`.

**Reserved events in the lookahead window** (`_effectiveSceneRow`'s own rule: rows `n > 2` through `n ≤ 4`):
- `price_identified` (row 3) — the sacrifice/memory must stay untouched.
- `inquiry_opened` (row 4) — the formal inquiry itself must not open in Scene 2.

**Sealed** (never touchable, unsealing at scene 16): `julian_counter_wish`, `julian_obscuring_wishes` — id + label only, no text content reaches the planner at all.

**Explicitly issued Scene 2 setting/object ids: none.** `groundedObjects` (O1–O7: the willow canopy, the mated-pair trees, the spiralgrass carpet, the Sacrificiant's gossamer band, the ceremonial sash, the Veilweave everyone wears, the assembled First Favored) is declared under `seed.sceneOne`, scoped to Scene 1. Nothing in the seed re-declares any of them, or any new object, for Scene 2. This is the load-bearing fact for §4 below — not an oversight to route around.

## 3. What C+ can reveal for each present character

Every citation below is **evidence-gated, reject-only** — a facet may be cited only when its own `evidence_requires` pattern is actually satisfied by what the scene's content (aftermath + reader posture) contains, never asserted because a character is merely present.

| Character | Facet | Scene-2 fit | Guardrail |
|---|---|---|---|
| Julian | `julian_status_without_display` | Plausible — Scene 2 is staged as a public assembly moment (`presentGroups: 'the assembly ... reacting'`), matching the pressure "a gathering where standing is being displayed" | must not read as contemptuous or adversarial (forbidden implications) |
| Julian | `julian_notices_without_volunteering` | Plausible only if the reader's posture pushes toward the room wanting an explanation | **must never imply he is hiding/suspicious — hard-forbidden before Scene 8, independent of evidence match** |
| Seren | `seren_goodness_needs_witness` | Strong fit — she is present, the assembly is watching, and her wish is the reason Lirael is being judged | never write her as frightened/childlike |
| Seren | `seren_trained_composure` | Fit only if the reader's posture stages a further correction/rehearsal-adjacent beat | same |
| Seren | `seren_delicacy_over_truth` | Fit if the scene's content lets a wound become nameable in public | same |
| the Dohkar | `presiding_dohkar_sacrificial_arrogance` | **Strongest fit this scene specifically** — he just asserted the rite and ruling are his | never state the assumption outright — must be performed |
| the Dohkar | `presiding_dohkar_peer_jealousy` | **Strong fit** — his pressure condition literally lists "Julian" as matching evidence, and he just interrupted Julian directly | never name the comparison outright |
| the Dohkar | `_ritual_contempt`, `_compulsive_pedagogy`, `_kindness_to_the_poor` | **No evidence-eligible trigger in Scene 2's own content as issued** — do not force these into this scene | — |
| Lirael (PC) | `pc_untested_brilliance`, `pc_fears_public_failure` | Her own interiority, not a *revelation by another character* — the seed's own comment names a `pc_opening_fusion` mechanism for how her facets surface, which is **not defined anywhere else in this codebase**. Flagged in §8, not resolved here. | — |

## 4. E+ — unavailable for Scene 2 as currently seeded

Per §2, no Scene-2 object inventory has been issued, for any reader branch. **E+ unavailable.** This is not a gap to paper over with Scene 1's O1–O7 by assumption — even though Scene 2 is plausibly the same physical clearing, "plausibly the same place" is not an issued object id, and inventing one here would be exactly the failure mode this design is supposed to prevent. Whether O1–O7 carry forward into Scene 2 is a canon decision for Roman (§8), not an inference this document makes.

## 5. Fusion — unavailable, as a direct consequence of §4

Fusion requires one actor's single integrated act to join a valid C+ revelation **and** a valid E+ target/axis. Since no E+ target exists for Scene 2, fusion cannot exist either, for any actor, on any branch. Not a separate judgment call — it follows mechanically from §4.

## 6. Making the objective responsive while preserving fixed pressure

The mechanism that already exists (not proposed here) is what does this: the planner is handed the reader's *exact* posture text, the affordance list (never a menu), and is asked to return one grounded `local_objective` + `local_objective_actor` + `present` cast — validated reject-only by `_validateLocalObjective`. The fixed dramatic pressures survive **because the validator structurally rejects any objective that reverses an aftermath truth or touches a reserved event**, not because the model is asked nicely to preserve them. Concretely: Julian's claimed inquiry authority, Lirael's public vulnerability, and the still-unnamed interference question cannot be resolved, reassigned, or walked back by anything Scene 2 proposes — only *built on*. Responsiveness and fixed pressure are not in tension: the reader's words choose **how** the next beat moves through that pressure, never **whether** the pressure existed.

## 7. Structured ids instead of lexical markers — proposal only, not built

Today's enforcement for reserved events (`reservedEvents[].markers`) is a literal-phrase substring match against the concatenated text of the planner's own reply (`state_change` + `local_objective` + `forces_choice` + `branch_a` + `branch_b`) — exactly the kind of lexical check the project's own standing rule (`constrain GENERATION not labels`) warns against, and the seed's own comment already flags it as "Claude's, not canon," fragile to paraphrase.

**Proposed replacement** (design only): the planner declares, per reserved id, a `declared_state_change_type` drawn from a **closed enum** — e.g. `none | referenced_only | partial_gesture | full_delivery` — and the validator rejects reject-only against an allow-list per id (for an untouched reserved event, only `none` passes). This moves the check from "did a paraphrase slip past a string match" to "did the model correctly self-classify its own output," which is falsifiable the same reject-only way the aftermath-truths check already works. `markers` stay in place, unchanged, until this is reviewed and built — this section is not an instruction to remove them now.

## 8. Red / green acceptance cases, and what's missing before implementation

**RED — must be rejected:**
- R1. Objective reverses an aftermath truth (interrogation not-yet-interrupted; Lirael owns The Answer).
- R2. Objective touches `price_identified` or `inquiry_opened`.
- R3. Objective names a present-cast member outside `{Lirael, Seren, Julian, the presiding Dohkar}`.
- R4. Objective invents a new named character, mystery, or lore fact (row 2's own `constraints`).
- R5. A C+ facet is cited whose `evidence_requires` condition the scene's actual content does not satisfy.
- R6. Julian or Seren read through a forbidden-implication pattern (Julian as suspicious/hiding something; Seren as a frightened child).
- R7. Any E+ or fusion content is claimed despite §4/§5.
- R8. The objective substitutes an invented run/stay binary for the reader's actual recorded posture.

**GREEN — must be accepted:**
- G1. An objective grounded in the reader's real posture, every aftermath truth kept, both reserved events untouched, present cast within roster — whether or not it matches one of the six listed vectors.
- G2. A posture matching **none** of the six vectors still produces a valid, grounded objective (proves the affordance list isn't secretly a menu).
- G3. Julian cited via an evidence-satisfied facet only, with zero forbidden-implication language.
- G4. The Dohkar cited via `_sacrificial_arrogance` or `_peer_jealousy` specifically because this scene's own aftermath content satisfies their conditions — and not the other three facets, which have no matching evidence here.
- G5. E+/fusion correctly **absent** from the accepted objective — a compliant "nothing to reveal" outcome, not a defect to fix.

**Missing seed data, named plainly, before any of this is implemented:**
1. No Scene-2 object/setting inventory exists — blocks all E+/fusion outright. Needs deliberate authoring, or an explicit decision to extend Scene 1's O1–O7 into Scene 2 (a canon call, not something this document decides).
2. `pc_opening_fusion` is referenced once, in a comment, on the PC's cast entry — and defined nowhere. Needs Roman's clarification before any PC-facing C+/fusion mechanism can cite it.
3. The structured `state_change_type` replacement for reserved-event markers (§7) does not exist yet — a real, separate build, not assumed available.
4. No ruling on whether `presentGroups: 'the assembly (unnamed, reacting, no dialogue)'` may ever ground atmosphere/reaction detail without crossing into "a new named character" — worth one explicit sentence of policy before a planner has to guess at the boundary.

No code was written. No model was called. No Memory Book or reputation work was touched.
