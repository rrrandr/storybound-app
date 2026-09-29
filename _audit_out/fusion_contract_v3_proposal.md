# OPENING FUSION CONTRACT v3 — REVISED PROPOSAL (dry; no code, no provider call, no prompt change) · 2026-09-07 rev 2

Corrections applied from Roman's review: (1) no gender assumption — everything resolves through the PC's
identity/pronoun data; (2) one coherent placeholder invariant; (3) an explicit, provenance-tagged fact
base for the pressure line; plus precise terminology and a population map.

## 1 · Where this applies today (and where fusion is unavailable)
| path / population | v3 applies? | why |
|---|---|---|
| Unseeded corridor stories in planner-owned mode, literary engine (every world; Modern is the captured case), masks offered by the corridor UI: HEART_WARDEN, OPEN_VEIN, ARMORED_FOX | **yes** | all three offered masks carry a profile in `_PC_NARRATOR_ARCHETYPE_PROFILES` and issued operations in `_PC_LENS_OPERATIONS`; the stage comes from the planner-owned stage contract |
| Famous Fate (unseeded, planner-owned) | yes by code path; **not captured** | same scaffold; no dry capture exists for it — not claimed |
| Seeded First Sacrifice (authored stage, v2 id contract) | **no — unchanged** | fusion target/axis already derived by v2 from selected ids; C+ anchored to facet/option ids; v3 does not touch it |
| Baked starters (First Taste, Glass House) Scene 1 | **no planner runs** | verbatim prose; nothing to plan |
| Continuation scenes (any story) | **out of scope** | the continuation skeleton's `fusion` is a different field and contract |
| CG engine Scene 1 | **unverified** | the scaffold is shared, but the screenplay rendering of the fusion block has no capture; not claimed |
| A mask with no profile / no issued operations | **fusion not offered** | no validated C+ anchor exists; the template omits the member and the validator accepts its absence (not reachable from the corridor UI today, since all three offered masks have a lens) |
Terminology: the PC mask's issued archetype lens operation is the C+ anchor ONLY where a profile and
operation list are actually issued and the cited operation validates against that list. This is not
generic Character+ coverage; the PC has no C+ candidate entry and no facet ids on unseeded stories.

## 2 · Identity (correction 1)
All PC references resolve through `_resolvePcIdentity(state)` (name, aliases) and `_pcPronouns()` (the
resolved pronoun set). Schema text says "the protagonist"; validators test "about the PC" as: contains
the resolved name or an alias, OR (first-person POV) a first-person pronoun, OR one of the resolved
third-person pronouns. No pronoun is assumed anywhere in schema, prompt or validator.

## 3 · The placeholder invariant (correction 2) — ONE rule
- `action` contains the literal `{ENV_TARGET}` **exactly once**; nowhere else in the fusion.
- `environment_pressure` does **not** contain the placeholder and does not repeat the target string
  (token coverage of the target's content words below the existing `_covered` threshold).
- The link between the pressure line and the validated target/axis is **structural, by ids**: the
  pressure member carries `grounds`, a list of issued fact ids, and the validator requires `env:axis`
  in `grounds` (the E+ axis id) and at least one further id from §4. `env:target` may appear in
  `grounds` as an ID; the target STRING may not appear in the text. No prose guessing: the link is the
  id set, checked for membership in the issued set.
- Normalisation replaces `{ENV_TARGET}` in `action` with the validated target. **Precise invariant
  (corrected 2026-09-08):** the planner supplies `{ENV_TARGET}` exactly once in the fusion action; the
  normalised fusion action renders the canonical target exactly once; the pressure line is labelled by
  axis and does not repeat the target; no literal placeholder survives to the author. Environment+ keeps
  its OWN canonical target occurrence under its separate contract, so the whole author request contains
  the target at least twice (E+ line and fusion action). No planner-owned second target/axis exists.
  No whole-request single-occurrence rule is claimed or enforced.

## 4 · Fact base for `environment_pressure` (correction 3) — explicit, provenance-tagged, issued as ids
For an UNSEEDED Scene 1 the validator issues exactly these ids alongside the lens operations:
| id | source field | provenance |
|---|---|---|
| `pick:world`, `pick:worldSubtype`, `pick:flavor`, `pick:dynamic`, `pick:tone`, `pick:intensity`, `pick:pov`, `pick:pcName`, `pick:liName`, `pick:mask`, `pick:archetype` | reader-selected corridor inputs (`state.picks` / identity) | reader |
| `env:target`, `env:axis` | `environment_plus.target` / `.axis` after E+ validation | validated E+ |
| `stage:setting` | `opening_setting` **only after** `_resolveStageFromPlan` accepted it into the contract (`environmentOwner:'planner'`) | stage contract (structurally validated; flagged as planner-authored) |
| `stage:element:<n>` | accepted `environment_elements[n]` | stage contract (same caveat) |
| `stage:participant:<ref>` | `stage_contract.participants[]` (issued refs, presence) | stage contract (validated against ISSUED REFS) |
| `stage:fact:<n>` | `stage_contract.event_facts[n].text` + participants, as accepted by `_cpIngestGeneratedStage` | stage contract (validated) |
| `plot:<id>:primary_antagonist` | the issued antagonist ref | accepted plot record (identity only — no text fact is issued from the plot today) |
| `ledger:*` | `state._committedState.facts`, scene ledger | **empty at an unseeded Scene 1** (fresh story) |
Excluded, by rule: `pc_career`, `pressure_source`, `pc_wound_anchor`, `reader_state`, `opening_beat` and
every other free spine field — planner assertions, not facts. The wound qualifies only if issued from
reader inputs (`pick:wound`), which the corridor does not do today. If a story has none of the §4 ids
beyond `env:*` (cannot happen while picks exist) or has no lens (§1), fusion is not offered.
Consequence stated plainly: a pressure line may say how the E+ thing in its condition bears on the PC
in this setting for this reader-chosen premise (e.g. flavor, dynamic, staged presence, the accepted
event fact); it may not assert pay, rank, history or any fact not in the table.

## 5 · Revised short schema (planner-owned free-text mode only)
```
"pc_opening_fusion": {
  "character": "<the protagonist, exactly (resolved name)>",
  "placement": "PC_FIRST_EMBODIED_BEAT",
  "action": "<ONE physical act the protagonist performs in contact with {ENV_TARGET} — the placeholder literally, once; no other object named as the thing acted on>",
  "pc_lens_operation": "<EXACTLY one issued operation, verbatim>",
  "character_revelation": "<one sentence: what this act shows about the protagonist through that operation — not the operation's gloss re-worded, not a description of the environment>",
  "environment_pressure": {
    "grounds": ["env:axis", "<one or more further issued ids from the FACT BASE list>"],
    "text": "<one sentence: how the environment thing, in its E+ condition, bears on the protagonist now — using only the grounded facts; no placeholder; do not repeat the target's name>"
  }
}
```
Not planner-owned: `environment_target`, `environment_axis` (attached at normalisation from validated
E+), the free `beat` (the author writes it). Supplying either target/axis rejects by name (shared
function `_reconcileFusionEnvFields`, mode `owned`).

## 6 · The four distinguishing controls (dry, fixture replies; each must be NAMED)
| | fixture | expected |
|---|---|---|
| (a) target contact only | `action` with `{ENV_TARGET}` once; `character_revelation` empty; `environment_pressure` absent | REJECT: "fusion has no character revelation" (and "no environment pressure") — contact is necessary, not sufficient |
| (b) character revelation only | issued `pc_lens_operation` + a revelation about the PC; `action` without `{ENV_TARGET}` (or an action the contact rule fails); pressure absent | REJECT: "fusion action lacks the environment placeholder" / "not contact" |
| (c) environment description only | `environment_pressure` present and grounded; `character_revelation` empty, or a restatement of the E+ beat, or a sentence about the room with no PC reference | REJECT: "fusion has no character revelation" / "restates the E+ beat" / "does not concern the protagonist" |
| (d) genuine C+ × E+ fusion | valid E+; `action` contacts `{ENV_TARGET}` once; issued lens op; revelation about the PC (resolved identity), distinct from the gloss; pressure with `grounds` ⊇ {`env:axis`, one more issued id}, text without the target string, about the PC, distinct from the E+ beat and from the revelation | ACCEPT → normalised fusion carries E+ target/axis; within the fusion block the canonical target appears exactly once (action line), the pressure line labelled by axis, no literal placeholder anywhere in the request; E+ keeps its own occurrence; dry Modern Scene 1 reaches ONE stubbed author + one page |
Supporting named rejects (unchanged from rev 1): duplicate placeholder; placeholder in the pressure text;
planner-supplied target/axis; invalid E+ (no fusion accepted); action on another object; missing/unissued
lens op; `grounds` containing an id not issued or missing `env:axis`; revelation = gloss restatement;
pressure = E+ beat restatement; revelation ≈ pressure; the retained 22:10 real reply (old shape) →
named reject, not reinterpreted; v2 path unchanged (skeleton suite).
Honest limit unchanged: "reveals" and "bears on" are judged structurally (anchored ids, distinctness,
non-restatement, PC reference), not semantically.

## 7 · Decisions still needed
1. Approve §5 field set and the §3 invariant (action holds the placeholder; pressure links by ids).
2. Approve the §4 fact table as the complete admissible base for an unseeded Scene 1 — in particular
   whether `stage:setting` / `stage:element:*` (planner-authored, structurally validated) are admissible,
   or only reader picks + `env:*` + `stage:fact:*` + participants.
3. Confirm "no lens → no fusion offered" and "no §4 ids beyond env → no fusion offered".
4. Confirm the population map in §1 (v3 = unseeded planner-owned literary Scene 1 only; CG unverified).


**Correction 2026-09-08 (Roman):** the earlier wording "exactly once overall" was wrong. The scoped invariant above is the contract; the harness asserts exactly that (once within the v3 fusion block; no placeholder anywhere) and makes no whole-request count claim.
