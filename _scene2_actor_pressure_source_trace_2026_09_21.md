# Actor / Pressure-Source Separation (2026-09-21)

Roman, after retry 14: "It exposed a narrow schema/role problem in the `family_accusation` lane:
the lane naturally uses group grammar, but `_validateLocalObjective` requires an allowed
individual actor and forbids collectives as actors... The fix is not to loosen collectives into
actors. The fix is to make the lane specify who carries the objective versus who supplies
pressure." Dry work only, no provider calls, no live retry.

## 1. What retry 14 actually showed

Two real planner attempts, both instantiating `family_accusation` closely and correctly, both
rejected by `_validateLocalObjective` on `local_objective_actor`:

- Attempt 1: `"Seren's family"` — an undeclared collective (not roster, not the row's declared
  `"the assembly"`).
- Attempt 2: `"the assembly"` — the row's OWN declared collective, which the validator has always
  forbidden as an actor (collectives supply pressure/reaction, never agency).

Retry 13's accepted plan avoided this by setting `local_objective_actor: "Lirael"` — her own
agency driving the family's action. Retry 14's two attempts instead named the group directly.

## 2. Diagnosis

The `family_accusation` lane's own natural grammar is a GROUP acting ("Seren's family steps
forward and demands remedy"). The pre-existing, correct rule — an actor must be one individual
roster member, never a collective — was never in question. What was missing was an explicit
statement, at the point the model is told to instantiate this lane, of WHICH individual carries
the scene's objective when the lane's own action is naturally collective. Without that, the model
has to guess, and guesses inconsistently (correctly once, incorrectly twice).

## 3. Fix — role separation, not validator loosening

### Per-lane data (`STARTER_PLANS.starter_first_sacrifice.scenes[2].aftermathLanes`)

Each of the 5 lanes now declares `objectiveActor` (an individual roster member) and
`pressureSource` (the group/institution applying pressure, when the lane is naturally
group-driven — `null` otherwise):

- `dohkar_preliminary_review` → objectiveActor: "the presiding Dohkar"
- `family_accusation` → objectiveActor: "Lirael", pressureSource: "Seren's family"
- `julian_jurisdiction_challenge` → objectiveActor: "Julian"
- `lirael_constrained` → objectiveActor: "the presiding Dohkar"
- `lirael_defensive_path` → objectiveActor: "Lirael"

### Prompt (`_generateLiteraryPlotContract`)

- The REQUIRED EVENT FRAME block (deterministic-resolution path) now appends a WHO CARRIES THE
  OBJECTIVE vs WHO SUPPLIES PRESSURE block whenever the resolved lane has a `pressureSource`: it
  names the pressure source explicitly, states it can NEVER be `local_objective_actor` or an
  individual `present` entry, and names the required objective actor.
- The free-choice REQUIRED AFTERMATH LANE MENU block (fallback path) now lists each lane's
  `objectiveActor`/`pressureSource` inline, with the same "never the actor" framing — generic
  coverage for any lane, not just the resolved one.
- Two new JSON keys: `pressure_source` (required — exactly the declared value — when the resolved
  lane has one; otherwise optional) and `institutional_actor`/`li_pressure_actor` (always
  optional, generic, not lane-specific — `li_pressure_actor` connects naturally to the LI PRESENCE
  FLOOR work). None of these are structurally validated — this is a prompt/role-clarity fix, not a
  validator change. `_validateLocalObjective`'s reject-only check on `local_objective_actor` is
  completely unchanged.

## 4. Proof — 21/21, new `_scene2_actor_pressure_source_control.mjs`

- **RED-A / RED-B** — retry 14's real two replies (`"Seren's family"`, `"the assembly"`) are still
  rejected by the unchanged validator, RED-B citing retry 14's exact real live rejection text.
- **GREEN** — attempt 1's real content, with ONLY `local_objective_actor` corrected to `"Lirael"`
  and a new `pressure_source: "Seren's family"` field added, is accepted — proving the fix is
  additive (new fields), the content itself was never the problem, and the validator was not
  loosened.
- **PROMPT** — the real, live planner dispatch (Boundary card) carries the WHO CARRIES THE
  OBJECTIVE vs WHO SUPPLIES PRESSURE block naming `pressure_source: "Seren's family"` and
  `objectiveActor: "Lirael"`, and the schema requires `pressure_source` exactly that value.
- **COEXIST** — REQUIRED EVENT FRAME, the reserved/aftermath schema block, WORLD TRUTHS, RECENT
  OAS EXCHANGE, and IMMUTABLE AFTERMATH (mouth-band) all still render.

Full pre-existing 15-control suite re-ran green with zero regressions.

## Status

Dry, committed, generic (the `objectiveActor`/`pressureSource` mechanism is reusable by any
starter's lane menu; First Sacrifice's own values are its own data). No provider or image calls.
`_validateLocalObjective` completely unchanged. No live retry run in this pass. A future retry
would be the first real test of whether the model, given this explicit role separation, reliably
puts Lirael in `local_objective_actor` and the family in `pressure_source` — and, if the author
reaches prose, whether Julian gets a real moment under the LI PRESENCE FLOOR directive, still
untested against a real completion since retry 13.
