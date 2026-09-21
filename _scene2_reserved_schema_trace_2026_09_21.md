# Reserved/Aftermath Schema Hardening (2026-09-21)

Roman, after retry 9: "The important part: the planner chose the right kind of scene... The blocker
now is not story intelligence. It's schema compliance... This should be a prompt/schema-compliance
fix, not a standards downgrade." Dry work only, no provider calls, no live retry.

## 1. What `_validateLocalObjective` requires

Traced directly, `public/app.js` (~line 200001): for every entry in `eff.reserved` (the scene row's
real reserved-event ids), the planner's reply must carry `reply.reserved[id] === 'untouched'`
exactly — a missing key, `undefined`, or any other value is rejected with `"no status declared"` or
`"declared <value>"`. The same shape applies to `eff.aftermathTruths` against `reply.aftermath[id]
=== 'kept'`. This check is unchanged by this pass — the fix is entirely on the prompt side.

## 2. Why the model returned `reserved: {}` despite the prompt asking for it

The instruction existed (`"reserved" (object: every RESERVED id → "untouched" or "touched")`) but
was one terse clause inside a single long run-on sentence covering five other required keys
(`posture_read`, `local_objective`, `local_objective_actor`, `present`, `aftermath`), with no
statement that an empty object is invalid and no worked example of the correct shape. An empty
object is a plausible (wrong) reading of "nothing here is touched" — the model likely intended to
communicate compliance, not omission.

## 3. Fix

`reserved` and `aftermath` now get their own dedicated prompt block, inserted right after the main
OPEN ROW schema sentence (`public/app.js`, `_generateLiteraryPlotContract`'s OPEN ROW prompt
construction):

- States explicitly: **"an EMPTY object {} for EITHER is INVALID and will be rejected, exactly as a
  missing key is."**
- Restates the exact real ids for both `reserved` and `aftermath` (not just earlier in the user
  prompt — repeated at the point the schema itself is specified).
- Supplies a **worked JSON example**, built dynamically from the scene's own real ids (not
  hardcoded) — e.g. `{"reserved":{"price_identified":"untouched","inquiry_opened":"untouched",...},
  "aftermath":{"twist_manifested":"kept",...}}` — so the model sees the exact shape expected, not
  just a prose description of it.

Generic: the block only renders when the scene row carries `reserved`/`aftermathTruths` ids at all
(inert for a scene with neither), and the ids/example are built from whatever real data the row
declares — not First-Sacrifice-specific.

## 4-5. Proof — red/green, using retry 9's real data as fixtures

16/16, new `_scene2_reserved_schema_control.mjs`:

- **RED ×2** — retry 9's real two planner replies (read verbatim from its persisted log, both with
  `"reserved": {}`) are still rejected by the unchanged `_validateLocalObjective`, both citing all 4
  real reserved ids as `"no status declared"` — proves the validator was not loosened.
- **GREEN** — attempt 1's real plan (the one with genuinely good, real institutional-pressure
  content — `scene_function_instantiated`, `aftermath_obligations`, a real non-echoing
  `state_change`), with ONLY `reserved`/`aftermath` corrected to the real required shape, is
  **accepted** by the same unchanged validator, and the accepted `local_objective` is verified to be
  byte-identical to attempt 1's real content — proving the fix is purely about the schema, the
  content itself was never the problem.
- **PROMPT** — the real, live planner dispatch (same Boundary/Say-Do reproduction as every prior
  control) now carries the new block: the invalidity statement, the real ids restated, and a worked
  example containing them.
- **COEXIST** — the Required Scene Function block, WORLD TRUTHS, RECENT OAS EXCHANGE, and IMMUTABLE
  AFTERMATH (mouth-band) all still render correctly alongside the new block.

## Status

Dry, committed, generic. No provider or image calls. `_validateLocalObjective`'s reject-only check
is completely unchanged — this closes the gap entirely on the prompt/schema side, per Roman's
explicit instruction not to loosen the validator. No live retry run in this pass.
