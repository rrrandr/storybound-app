# X13b item 3 — post-validation scaffold failure vs. the commit gate

app.js `cc5171a14fb96432` · harness `_scene1_skeleton_delivery.mjs`

## Root cause of three failed attempts

`page.addInitScript((inject) => { window.__injectScaffoldFailure = !!inject; … })` was called
with **no second argument**. `inject` arrived `undefined`, the flag was permanently `false`, and
every injected throw was dead code. The seam was never wrong. Source-match counts could not
detect this; only an execution witness could.

## Proven (deterministic)

- The builder takes exactly one terminal path: `final-return`.
- Trace, throwing arm: `caller:before → entry → final-return → inject:throw → catch →
  caller:after (block empty)`.
- Gate at the injected post-validation failure, shipped placement: `{settled:false, ok:null}`.
- Gate at the identical instant, commit moved back to validation: `{settled:true, ok:true}`.
- Subplot dispatches, shipped placement: **0 across 3 trials** (`scaffold=1 planner=1`, so the
  chain really ran).

## NOT proven (directional only)

Moving the commit back to validation settles the gate too early — that part is deterministic.
Whether that *causes* a paid subplot dispatch is a **race**, not a reproduction:

| arms | E subplot dispatches |
|---|---|
| earlier single arms (2) | 1, 0 |
| final 3-trial run | 0, 0, 0 |
| **total** | **1 release in 5 arms** |

The subplot pass is fire-and-forget, so with the early commit the dispatch races the abort;
sometimes it reaches the wire, sometimes `_markInvocationFatal` lands first. One observed release
is what shows the placement is load-bearing. It is recorded here rather than asserted: gating on
it would be flaky, asserting its negation would be false.

**Status: the fix is retained on the deterministic gate-state evidence. The inverse arm is
directional evidence of the spend race, not a deterministic reproduction.**
