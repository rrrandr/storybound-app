# Live-test authorization sheet — Tempt Fate memory-erasure scenario

2026-09-23, updated same day after the ownership fix (§ pointer:
`_tempt_fate_outcome_ownership_fix_2026_09_23.md`). Roman: "Then present the concrete authorization
sheet for the memory-erasure scenario. It must distinguish what one generated scene can demonstrate
from what requires a later continuation... A successful first scene would show that the wish lands.
A later continuation is what proves the story can keep living with it." This sheet is a proposal to
review and approve or adjust — nothing in it authorizes a paid call by itself. No paid run yet.

## What's already dry-proven, so this test isn't validating plumbing

`_tempt_fate_outcome_integration_control.mjs` (20/20) already proved, against the real production
functions with the network stubbed: the real CG system prompt asks for `temptFateOutcome` in the
same JSON schema as every other structured field; a real dispatch/parse/accept/commit cycle works
end-to-end; the commit is gated by the app's own `_cgAcceptDelivered` check, not the model's
self-report alone; rejected, missing, and duplicate reports are all handled safely and the missing
case is explicitly logged; and a subsequent real system-prompt build genuinely carries the
committed effect with established/not-yet-established and per-effect durability intact. **This live
test is not needed to prove any of that — it exists only to observe the model's actual creative
judgment**, which no dry test can certify.

## The two-scene shape, and why not one or many

**Scene A (the invocation)** can show only that the wish LANDS — the omen/invocation/effect beats,
the immediate confusion, the first evidence the scene itself puts on the page, and whether the
model's own `temptFateOutcome` report is well-grounded in what it just wrote. It CANNOT show
whether the change survives past this scene, whether evidence accumulates, or whether anyone
begins investigating — those require time passing in the story, which a single scene doesn't have.

**Scene B (one ordinary continuation, no new Tempt invocation)** is where "the story keeps living
with it" becomes observable: does the durable consequence correctly shape a REAL next scene's
prose (not just its prompt, which is already proven); does new evidence or a character's suspicion
plausibly build rather than the model quietly re-establishing the erased memory; does the
aftermath IMPRINT-phase framing (if the volatility window happens to close on this exact turn)
coexist sensibly with the durable consequence's own "persists" framing rather than contradicting
it.

**What this sheet deliberately does NOT authorize**: watching the volatility window taper through
its full multi-scene lifecycle to FADING and full expiration (per the already-fixed lifecycle, this
could take 3-5+ scenes depending on severity) — that's a real, valid question ("does the durable
consequence still read cleanly once all the scene-level rupture framing has fully quieted?") but a
SEPARATE, larger, later authorization if Scenes A and B look sound. Two scenes is the smallest test
that distinguishes "the wish lands" from "the story keeps living with it," per Roman's own framing
— not the smallest test of everything eventually worth knowing.

## Starting state

Continue from First Sacrifice's current, real, committed story state (whatever scene the story is
actually sitting at right now) — not a synthetic/reset state. This is deliberate: the durable-
consequence mechanism is meant to work against the app's real committed-state machinery
(`_committedState`, the scene ledger, the real cast/canon), and a synthetic starting state would
test less than the real one does. If the current real state isn't at a point where inserting a
ceremony-erasure wish makes narrative sense, that's Roman's call to redirect before authorizing,
not something to assume away here.

## Evaluation criteria (Roman, 2026-09-23)

- **Scene A** should establish actual memory erasure, with confusion and surviving evidence
  consistent with the wish's scope — not a flat refusal, not a clean uniform wipe with no residue,
  and not a metaphorical near-miss (the same "rendered as a feeling instead of literally happening"
  failure mode this session's LITERAL MANIFESTATION rule already exists to prevent for other Tempt
  wishes).
- **Scene B** should honor the erased memories (no character suddenly and cleanly remembers the
  ceremony) and develop consequences from that changed situation — WITHOUT automatically restoring
  memories, and WITHOUT forcing a predetermined investigation script. The durable record's
  `openPossibilities` are threads the model MAY pick up; Scene B is not required to start an
  investigation, only to not contradict or quietly undo what Scene A established.
- **Report explicitly whether Scene B occurs INSIDE or AFTER the volatility window** (check
  `state.volatility_window.active` and `state._temptAftermathScenes` going into Scene B's
  generation). If Scene B lands INSIDE the window, that's immediate-continuity evidence only —
  persistence of the erasure BEYOND the window's own expiration remains untested by this
  authorization and would need the larger, later multi-scene run already flagged as out of scope
  below.

## Paid roles, request cap, and cost basis

- **Provider/role**: CG screenplay author, TIER 1 of the existing `_authorFullScenePolicy` —
  `grok-4-1-fast-reasoning` via `/api/proxy`, `role: STRUCTURE_GENERATOR`, the SAME call type every
  ordinary CG scene already uses. **No new call type, no separate verifier call, no new
  classifier** — `temptFateOutcome` is one more field in the SAME structured JSON response the
  author already returns (confirmed this pass, not assumed).
- **Request cap**: exactly 2 generation calls — Scene A (Tempt-invoked) and Scene B (ordinary
  continuation). If either genuinely fails/retries (the existing `_cgAcceptDelivered`
  staleness/rejection path, or a provider fallback to Tier 2/3), that's within the SAME existing
  per-scene retry policy every CG scene already uses — not an extra budget line.
- **In-app cost (Fortunes, charged to the story's balance)**: Scene A costs `getTemptFateCost()` —
  `60 * 1.35^heat` Fortunes, rounded; for a first Tempt invocation in this story (heat = 0, ordinary
  default scope, not OAS/intimacy-discounted), that's **60 Fortunes flat**, confirmed by reading the
  live cost function directly. Scene B is an ordinary continuation with no Fate card — its Fortune
  cost is whatever First Sacrifice's normal per-scene/per-Issue cost model already charges (unrelated to Tempt Fate).
- **Provider spend (real money, unrelated to the in-app Fortune economy)**: no dedicated
  measurement exists for a Tempt-augmented CG scene specifically; the closest known reference point
  is the existing scene-cost telemetry (`project_scene_cost_breakdown` — Scene 1 ≈ $0.31,
  continuation ≈ $0.12, console-corrected) — a Tempt-invoked scene plausibly runs a bit higher given
  the added directive length (Empowerment Contract + Fatelands doctrine + the new
  `temptFateOutcome` schema), but this has not been measured and should be read from the real
  console after the run rather than estimated further here.
- **Everything else stays dry**: no image generation, no additional scenes beyond A and B, no
  batch, no exploratory retries beyond what the existing per-scene policy already allows.
- **Per-scene spending limit**: Scene A ≤ 60 Fortunes + Scene A's own ordinary per-scene provider
  cost (no batch/regeneration on top of the existing single-retry policy); Scene B ≤ First
  Sacrifice's ordinary per-scene Fortune/provider cost, no Tempt surcharge (no Fate card used).
- **Combined spending limit for this authorization**: 60 Fortunes total (Scene A's Tempt charge;
  Scene B carries no Fortune cost of its own) + at most 2 provider generation calls' worth of real
  spend (each within the SAME per-scene retry policy every ordinary CG scene already uses — not a
  new, larger retry budget). No third scene, no image generation, under this authorization.
- **Stop conditions**: if Scene A's generation is rejected/stale twice in a row (the real
  `_cgAcceptDelivered`/provider-fallback path exhausting its existing retry policy), stop and report
  rather than keep retrying past what an ordinary scene would; if Scene A's `temptFateOutcome`
  report is malformed or reports `delivered:false`, stop, report the raw output, and do NOT proceed
  to Scene B (there is nothing for Scene B to continue from yet); if Scene B's own generation fails
  the same way, stop and report — do not substitute a third attempt.

## Recommended wish text for Scene A

Roman's own example, unchanged: **"everyone forgets the ceremony happened."** It's the specific
case this whole multi-pass arc was built around, it's a compound History+Agency wish (the hardest
case for the doctrine to get right), and using the same wording that motivated the design makes the
result directly checkable against everything already written about it.

## Go/no-go criteria for this sheet

Proceed if: the mechanism proof above (20/20, production-integration-level) is accepted as
sufficient plumbing verification, and there is nothing else architecturally that should be dry-
verified first. Hold if: there's a reason to test a DIFFERENT wish first, want a larger request cap,
or want the multi-scene full-lifecycle observation included in this same authorization rather than
deferred.
