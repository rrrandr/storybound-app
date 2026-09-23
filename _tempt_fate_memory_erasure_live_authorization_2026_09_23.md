# Live-test authorization sheet — Tempt Fate memory-erasure scenario

2026-09-23. Roman: "Then present the concrete authorization sheet for the memory-erasure scenario.
It must distinguish what one generated scene can demonstrate from what requires a later
continuation... A successful first scene would show that the wish lands. A later continuation is
what proves the story can keep living with it." This sheet is a proposal to review and approve or
adjust — nothing in it authorizes a paid call by itself.

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

## What to actually read from the two scenes

- **Scene A**: does `temptFateOutcome.delivered` correctly track whether the prose actually
  rendered the intervention (not a rubber-stamped `true`); is `changed`/`establishedEvidence`
  grounded in real sentences from the prose, not invented; does the WISH ITSELF land as a
  legible warp (per the Eight-Orders doctrine — a compound History+Agency wish like memory-erasure
  should read as confused/inconsistent, not a clean uniform wipe) rather than either a flat refusal
  or an unnaturally tidy success; does the instruction-hierarchy text (this session's own fix)
  actually change the model's behavior versus a version without it — i.e., does the model let
  memory bend at all, or does it flinch back toward "circumstances, not minds" caution.
- **Scene B**: does the committed record's `establishedEvidence`/`knowledgeStates` actually surface
  in the new prose in a way a reader would recognize as connected (not just present in the raw
  prompt, but reflected in what gets written); does `openPossibilities` stay speculative rather than
  reading as already-decided; is there any sign of the classic failure mode this whole arc exists to
  prevent — the story quietly forgetting its own rupture ever happened.

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
