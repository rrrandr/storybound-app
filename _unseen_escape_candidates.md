# Two mechanism-backed candidates — `unseen` and `escape`

> **PROPOSED. No ranking, no coverage run, no implementation.** Each causal step is cited to `public/app.js`.
> Where a step cannot be cited, it is stated as uncited rather than asserted.

---

# A. `unseen` — `unm.the_turning_forgotten`

## A1. Class permission

> **`app.js:191220–191238`, `memory_perception`.** `targetPopulation.kind` includes **`collective`**
> (191224). Dispositions come from a **closed enum** (191238, `_TFO_DISPOSITIONS`):
> `forgot · retained · partial · suspects · resisted · exempt · absent`. **This draft uses `forgot` only.**

## A2. Target fact — exactly one atom

**`twist.assembly_turned`** — source, `twist_manifested` verbatim (`app.js:131285`):

> *"the literal words were honoured **(the whole assembly turned to look at Lirael)** and the intent failed."*

**The seed names the population inside the clause.** The atom's target and its population come from the same
seven words, which is why this mapping does not stretch either.

## A3. Scope — frozen at seal

`population.assembly` — the crowd of First Favored family and guests — **expanded to its sealed roster at seal
time and frozen into the delta.** Never re-derived, never widened.

**Per the approved definition, the crowd excludes `pc:lirael`, `named:seren`, `named:julian`,
`role:first_sacrifice_presiding_dohkar`.** They are outside the roster **by membership, not by exemption.**

## A4. What is forgotten — **the turning moment only**

The crowd no longer remembers that the assembly turned to look at Lirael. **That is the entire effect.**

## A5. What remains — stated, because the limits are the point

| | |
|---|---|
| **Lirael is still physically present** | **This is not invisibility.** Nobody's eyes stop working, nobody fails to see her now. A memory of one past moment is gone. |
| **the twist remains known** | `twist.wish_misaligned`, `twist.words_honoured`, `twist.intent_failed` and `twist.loose_note_heard` are **untargeted and untouched.** Every First Favored present still heard the loose note and still knows a wish went wrong. |
| **the four named retain everything** | Seren, Julian, the presiding Dohkar **and Lirael** keep the turning in full. **They are the parties who matter most to the proceeding**, and the outcome does not reach them. |
| **`scopeMatch` obligation** | 191264 — `"full"` requires `unaccountedParties` to be empty, so the four named must be recorded as `retained`, **not omitted.** |

## A6. Duration

> **`app.js:191194`, `durability`:** per-effect `{ aspect, status: expires \| persists \| uncertain, note }`.
> *"`expires` ONLY if THIS scene signals the effect is bound to the passing rupture window; the window closing
> governs how long the world visibly destabilizes, **never whether the underlying change stuck**."*

**`persists`.** Nothing in the scene binds the forgetting to the rupture window.

## A7. Cost — **NONE. `residual_suspicion` is REMOVED (2026-09-28)**

**Schema legality was not semantic support.** `suspicionFromResidue` is legal on a collective entry, but that
establishes only that it can be **reported**. The mechanism catalog licenses `memory_perception` to **edit
what parties know**, with a declared population and a disposition from the closed enum. **It does not license
authoring a residue-suspicion effect as a designed cost.**

**And a mechanical point settles it independently:** `disposition` is **singular per party**. The enum
contains `suspects` as a *different* disposition, not an addition to `forgot`. **An outcome cannot author
the crowd as both.** This one chose forgetting.

> **This is a costless crowd-memory change, and that is not a weaker outcome.** `unm.dohkar_demand_unmade`
> and `unm.the_accusation_unmade` are costless too. The limits in §A5 — she is still present, the twist stays
> known, the four named retain everything — do the work a cost was reaching for.

Full reasoning: `_compiler_contract_boundary.md` §3.

## A8. Prevents checked

- **Disposition enum is closed** (191238) — `forgot` is valid; nothing outside the enum is used.
- **Memory may not be inferred from behaviour** (191238): *"Memory may NOT be inferred from gaze, silence,
  stillness, composure or presence."* An authoring constraint on the prose, recorded here.
- **`invokerExemption`** (191251) — **not used, and not extended.** Growing the extractor's enum would be
  migration by accretion into a retrospective reading contract. The compiler has a **native** field instead:
  `invokerScope: in_population | not_in_population | exempted_by_grant`, with a declared lossy mapping to the
  report contract. **This candidate writes `not_in_population`** — Lirael is not in the crowd, and that is
  scope, not sparing. See `_compiler_contract_boundary.md` §2a.

## A9. Presentation

**This is Fate's ambiguous interpretation of *"I want to disappear"*, never a literal reading.** The player
anchored nothing; Fate chose to take *disappear* as *stop being the one they all turned to look at*. **These
words do not guarantee this outcome and never promise invisibility.**

---

# B. `escape` — `unm.the_accusation_unmade`

## B1. Class permission, and the primary interpretation chosen

> **`app.js:191271`, `history_rewrite.priorHistoryReplaced`:** *"what the history WAS, and what it now IS
> instead. **A rupture MAY make an event never have occurred when that is the wish and the scene delivers
> it.**"*

**Primary interpretation, chosen before any alternative:** *"let me out of this"* → **the public accusation
against her was never made.** The `identity_reputation` alternative (`recordsChanged`) is **not considered
here** and is not a fallback within this draft.

## B2. Target fact — one specific active accusation

> ### ⛔ SUPERSEDED — the lane is split (2026-09-28)
> A disjunctive lane may not be targeted as one event. Two atoms are now declared —
> **`accusation.family_accused`** and **`accusation.family_demanded_remedy`** — and this rewrite ceases
> **`accusation.family_accused` only**, with `accusation.family_demanded_remedy` explicitly **unchanged**.
> The jurisdiction-challenge companion is conditional on that choice and would not arise had the remedy demand
> been chosen. See `_contract_and_atom_pass.md` §2. Original single-atom text below, superseded.

**`accusation.family_public`** — declared from the lane the way `review.demanded_by_dohkar` was, source
`app.js:131355`:

> *"**Seren's family (or another party with standing) publicly accuses Lirael or demands remedy for the twisted
> wish.**"* · `objectiveActor: 'Lirael'` · `pressureSource: "Seren's family"`

> ⚠ **The lane is a disjunction** — *accuses* **or** *demands remedy*. One atom cannot carry both cleanly.
> **Flagged: this may need splitting into `accusation.family_accused` and `accusation.family_demanded_remedy`
> before the outcome is approved.** Not resolved here.

**`requiresActive[]`: `accusation.family_public`.** Nothing is erased that was not made.

## B3. `ceases[]` — complete, with causal companions

| atom | why named |
|---|---|
| `accusation.family_public` | the grant itself |
| ⚠ **WRONG ATOM — corrected 2026-09-28.** `auth.julian_claims_convene_preside` is Julian's claim to convene the formal inquiry, **not** the jurisdiction challenge, which is a separate event from lane `julian_jurisdiction_challenge` (131356). And **that lane is disjunctive too** — challenges jurisdiction / reframes the accusation / contests who has authority — so the companion cannot be named precisely until it is split. See `_compiler_contract_boundary.md` §4a. | **only if `jurisdictionChallengeMade` is active.** I3: a jurisdiction challenge presupposes a charge, and the lane's own frame says Julian *"reframes **the accusation**"* (131489). **Erase the charge and a live challenge is orphaned** — so if one exists it must be named here, or declared unchanged with a stated reason. **Not decided in this draft; it is a per-instance authoring obligation.** |

## B4. `establishes[]`

| fact | text |
|---|---|
| `accusation.family_never_made` | *No public accusation and no demand for remedy was made against Lirael by Seren's family or by any party with standing.* |
| `survivingContradictions` | **empty** — permitted: *"empty array if the rewrite left none."* Nothing was recorded or set in motion by an accusation that did not occur, and **no memory is edited**, so nobody recalls one. |

## B5. What remains open — **no blanket innocence**

| | |
|---|---|
| **not innocence** | `twist.wish_misaligned`, `twist.intent_failed`, `twist.loose_note_heard` all stand. **A wish still twisted and every First Favored present still heard it.** |
| **not immunity** | The lane reads *"or another party with standing"* — **anyone with standing may accuse her at any time.** One accusation is unmade; the ability to accuse is untouched. |
| **no mental state changed** | `history_rewrite` ceases an event. **It does not touch minds.** Seren's family still lost what they lost and still believe what they believe — **they simply never stepped out and said it.** |
| **the rest of the pressure stands** | `review.demanded_by_dohkar` (if made), **`review.demanded_by_julian`** — which is untouched, so **row 4's notice and investigation still arrive.** |
| **open** | when the family speaks, if they do · whether anyone notices the absence of a complaint everyone expected · whether the Dohkar proceeds without one |

## B6. Duration

**`persists`** (191194). The event did not occur; nothing binds that to the rupture window.

## B7. Cost — **none supported, and none invented**

The honest position. Ceasing the accusation costs her nothing the source lets me name. **The family's
grievance being intact is not a cost — it is a thing the outcome did not change**, and it is listed in §B5 as
open rather than dressed as a price.

**A costless outcome is permitted** — `unm.dohkar_demand_unmade` is the precedent — and inventing a cost to
make the package feel balanced is the exact failure mode the mechanism-first rule exists to stop.

## B8. Prevents checked

- **`history_rewrite` requires both fields** (191271–191276) — both supplied; `survivingContradictions` empty
  is explicitly allowed.
- **I3** — a jurisdiction challenge presupposes a charge; handled as the conditional companion in §B3.
- **`the_open` unlock** (131137) and **row 14** (131651) — neither depends on the family accusation; the route
  to the late spine runs through Julian's demand and row 4, untouched.
- **130922** — non-interference is *"procedural and cultural, not magical"*: relevant because it means the
  accusation is a **social act**, which is exactly what `history_rewrite` can unmake, unlike the Answer claim
  that failed.
- **No prevents-clause found** forbidding the erasure of a social act.

## B9. The limit on eligibility, stated

**`escape` is answered only where an accusation is active.** With `requiresActive: accusation.family_public`,
a player who says *"let me out of this"* **before any accusation exists** has no answer from this candidate.

> **So `escape` is partially covered, not covered.** Recorded here rather than left for a coverage run to
> discover. Whether that gap needs a second `escape` outcome, or a declared adjacency fallback, is an open
> editorial question — **not answered in this pass.**

---

# C. Status

| | |
|---|---|
| `unseen` | **candidate drafted** — `unm.the_turning_forgotten`. One schema gap flagged (§A8). |
| `escape` | **candidate drafted** — `unm.the_accusation_unmade`. One atom-shape flag (§B2), one conditional companion (§B3), **partial eligibility** (§B9). |

**Neither is approved. No rank assigned. No coverage computed. Nothing implemented.**
