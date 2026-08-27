# Round 11 — the first real sample of the combined field, and the three gaps it found

One seeded First Sacrifice planner-only sample against the new schema.
**$0.00267 · 1 attempt, no retry · 0 Grok requests dispatched (3 attempts blocked at the route
layer) · 0 escaped.**

## What Mistral returned

`pc_opening_fusion` came back **well-formed on every structural axis**:

```
character          : Lirael                       ← the PC, correct recipient
placement          : PC_FIRST_EMBODIED_BEAT       ← verbatim
environment_target : the long white weeping-willow veil-canopy   ← == environment_plus.target
environment_axis   : ritual                                      ← == environment_plus.axis
character_angle    : her body's reflexive alignment with the earth beneath her, the spiralgrass
                     yielding to her weight
beat               : My palm flattened against the spiralgrass, feeling its damp give beneath
                     me—the same yielding I refuse to let Seren feel when the wish twists her bones.
```

`environment_plus` carried real evidence, and it grounded:

```
target : the long white weeping-willow veil-canopy
axis   : ritual
beat   : hangs lower on the left where generations of petitioners have pulled it aside to kneel
```

The three non-PC characters each got one distinct, renderable first-appearance beat. No invented
identity, no invented setting, no second body. **The planner understood the shape of the field.**

## …and it was ACCEPTED when it should not have been

**The beat declares the veil-canopy and touches the spiralgrass.** Those are two different objects.
The fault that exists for exactly this — *"pc_opening_fusion.beat never reaches the assigned
environment target"* — did not fire.

Cause: every cross-field coherence check was written **inside `if (_norm && _norm.fusion)`** — the
branch for the standalone fusion that `pc_opening_fusion` had just retired. The live planner
returned no standalone fusion at all, so the entire block was skipped. The free suite could not see
it because the mock has always sent a fusion object; a mock that is more complete than production
hides the case production actually produces.

Two more, found in the same reply:

- **Every staged anchor_beat was the literal string `"opening_beat"`** — the field's own name echoed
  back, for all four characters. The PC-anchor check only fired on a *non-empty* anchor, and
  `"opening_beat"` is non-empty, so it passed. Nothing else looked at the other three at all.
- **The PC's `character_plus.angle` was a paraphrase of the beat, not the beat**
  ("presses her palm to the spiralgrass…" vs "My palm flattened against the spiralgrass…"). The
  contract says character-for-character; the validator tolerates ≥0.8 token coverage, so it passed.
  Harmless in delivery — the directive now renders her C+ line as a pointer, so only the fusion beat
  reaches the author — but two strings for one beat still sit in state.

## Fixes

1. The coherence block is **hoisted out of the fusion branch** and runs unconditionally.
2. `_isPlaceholderBeat` rejects an anchor that is a field name, a bracketed stub, a bare
   `snake_case` token, the template's own fill hint, or fewer than three words — by SHAPE, not by a
   ban list, because the next echo will be a different word. **Every** staged person owes a real
   anchor, not just the PC.
3. Four regression cases, each asserted to fail for *its own* named reason, all with the standalone
   fusion **omitted** — the shape the live planner actually returns:
   `pofOffTarget` · `noFusionNoEpBeat` · `anchorPlaceholder` · `anchorEmpty`.

## Worth flagging before the next paid call

The returned E+ beat is *"the veil-canopy hangs lower on the left where generations of petitioners
have pulled it aside"*. The template's worked example is *"the veil-canopy hangs lower on the left
where three generations of petitioners have pulled it aside"*. **That is the exemplar, echoed back
with one word dropped** — the same mechanism as the round-9 `pressure_source` leak, where the
REQUIRED PHRASING examples came back as the plan. The exemplar should move to a world the story
cannot be set in, or the E+ beat will keep arriving pre-written.

## Suites

Free: universal **164/164** · delivery **228/228** · continuation compat **12/12**.
Series spend including this sample: **$0.0502**. Zero Grok requests, ever. Nothing pushed.
