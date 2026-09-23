# Tempt Fate model-driven outcome mechanism — dry implementation

2026-09-23. Roman's correction of the prior pass, verbatim: "The model should work out the
consequences of an unfamiliar wish. Code should preserve those consequences and keep future scenes
consistent; it shouldn't need a handwritten response for every possible wish... Remove the
keyword-based eligibility gate and predefined residue/clue templates as authorities over its
consequences... It's still mixing ordinary wishing with Tempt Fate. 'Circumstances, not minds'
would undermine your memory-erasure example. Tempt Fate can actually erase the memories... A wish
is a request, a plan is a proposal, and neither becomes accomplished history merely because the
model filled out a field." No paid calls, no prose generation, no image work, no live sample.

## 1. What changed from the prior pass, and why

The prior pass (`_tempt_fate_durable_consequences_2026_09_22.md`) built a keyword-gated eligibility
check and a fixed bank of residue-clue templates, keyed by three hand-picked categories
(memory/death/materialization). Roman's correction is right on both counts:

- **A keyword layer cannot cover "any unforeseen wish."** It was already brittle within the three
  categories it tried to cover (two inflection bugs found empirically). A fourth pass would find a
  fourth gap. The actual requirement is that the AUTHOR — which already receives the full doctrine
  — works out the consequences of whatever wish arrives, and code's job is to PRESERVE and DELIVER
  that judgment, not to pre-guess it.
- **The keyword layer also, invisibly, imported ordinary-wish framing into Tempt Fate.** The
  residue templates and the (removed) `explanationPressure` default leaned on Fatelands CORE's
  "circumstances, not minds" language, which is correct for ORDINARY wish-granting but wrong as a
  hard limit on Tempt Fate itself — Tempt Fate is the higher-order mechanic and can, per this
  pass's explicit correction, directly alter memory/history if the wish calls for it.

Both problems are fixed the same way: **remove the keyword layer as an authority, and let a
verified, structured report (built from what the accepted scene actually shows) carry the content.**
Persistence, idempotency, and prompt-delivery plumbing from the prior pass are kept — that
infrastructure was sound, only what fed it was wrong.

## 2. Reused, existing pattern: `_commitScene` (proposal → verify → commit)

Traced (`app.js` ~99477) before designing anything, per Roman's instruction to use the existing
workflow rather than invent a parallel one. `_commitScene` is the codebase's real "plan is a
proposal, not accomplished history" mechanism: a proposed transition (`pendingIntent`) is checked
by a SEPARATE, evidence-grounded verifier call against the rendered prose — literal verbatim quotes
required for each load-bearing slot — and only a `DELIVERED` verdict commits a fact;
`MISSED`/`PARTIAL` leaves `pendingIntent` in place for replanning, no commit. It also already has a
duplicate-commit guard (`cs._committedThroughScene >= prevSceneNum` early return).

This pass does **not** literally hook into `_commitScene` itself (it's feature-flagged, already
live, verifies an unrelated A-plot milestone concept, and modifying its actual network call
couldn't be safely dry-tested this pass). Instead it builds a **parallel, dedicated mechanism that
reproduces the same pattern** for Tempt Fate specifically: a proposal stage that already exists
unchanged (`state._temptFateLedger`, recorded at Tempt seal time — "a wish is a request"), a new
verified-report stage, and a new commit stage with its own idempotency guard — evidence-grounding
of the verifier call itself is real, usable prompt content built this pass (§3) but its live
integration point (a dedicated verifier call, or a field on the author's own structured response)
is a follow-up, not built this pass (§6).

## 3. The new mechanism (`app.js` ~189615 onward, LAYER 2b)

- **`_buildTemptFateOutcomeReportingSchema()`** — real prompt text specifying the JSON fields a
  report must contain: `delivered` (bool — did it concretely happen on the page), `changed`
  (`{subject, whatChanged}[]`), `durability` (`{aspect, status: expires|persists|uncertain, note}[]`
  — **per-effect**, not one tier for the whole wish — this is the direct fix for Roman's "manifested
  Answer disappears while a witnessed accusation persists" example: two effects from one wish, two
  different durabilities), `knowledgeStates` (`{character, state: knows|remembers|believes|
  suspects|unaware, note}[]` — per-character, never a blanket "everyone"), `establishedEvidence`
  (what the scene actually put on the page), `openPossibilities` (explicitly NOT yet fact — future
  threads only). States plainly: "This treatment applies IDENTICALLY to any wish, familiar or
  unprecedented — there is no fixed catalogue of wish types to match against."
- **`_validateTemptFateOutcomeReport(raw)`** — structural validation ONLY (types, required fields,
  enum values, and a shape-sanity check that `delivered:true` must carry at least one `changed`/
  `establishedEvidence` item). Never judges creative correctness — that's explicitly out of scope
  for a dry pass.
- **`_commitTemptFateOutcome(sceneIdx, ledgerEntry, rawReport)`** — commits a
  `state._temptFateDurableConsequences` entry ONLY when the report validates AND
  `delivered === true`; a per-scene idempotency guard (`state._temptOutcomeCommittedScenes`,
  mirroring `_commitScene`'s own duplicate guard) makes a retried/duplicate call for the same scene
  a silent no-op. Purely additive — never writes a protected/canon state field.
- **`_buildTemptFateDurableConsequenceDirective()`** — unchanged wiring into
  `_buildContinuitySpineBlock` (from the prior pass), rewritten to render the new shape: `changed`/
  `durability`/`knowledgeStates`/`establishedEvidence` are labeled ESTABLISHED (binding, do not
  silently revert); `openPossibilities` are labeled explicitly NOT YET ESTABLISHED — directly
  implementing "do not let proposed future clues become retroactively established facts."

## 4. Instruction hierarchy fix (`buildWorldLawDirective`, `app.js` ~75878)

Real bug, confirmed present: the Fatelands Wish doctrine (Core/Adjudication/Judgment/Archaeology)
fires whenever `state.volatility_window.active` — which a live Tempt Fate invocation sets true —
with no stated precedence against the Empowerment Contract also active in the same prompt. Added,
gated to Fantasy-world only (the only world where the Fatelands doctrine ever fires, so no
precedence conflict exists elsewhere): a hard statement that Tempt Fate overrides ordinary wish
limits (Circumstances Not Minds, the Eight Orders, etc.) — those govern ordinary in-world wishing,
never Tempt Fate's own intervention — while ordinary doctrine still governs how the world
interprets, explains, suspects, and investigates the resulting impossibility afterward. Confirmed
present in the real, live `buildWorldLawDirective()` output (via its exposed wrapper
`_buildCGTemptDirective()`) by the control.

## 5. Proof (`_tempt_fate_model_driven_outcome_control.mjs`, 38/38)

Per Roman's explicit correction — "Dry tests can prove that mechanism. They cannot certify the
model's creative judgment; reserve that claim for subsequent live tests" — every check uses
SIMULATED outcome reports (hand-built objects standing in for what a real generated report would
contain), never a live call.

1. Confirms the prior pass's keyword functions are genuinely gone (not just unused).
2. An unfamiliar wish (a bureaucratic-fraud rupture — a fake tide-registry entry — deliberately
   outside every removed category, since there is no category system left to be outside of):
   simulated report → validates → commits → entry content is exactly what the report said (never
   re-derived) → directive separates ESTABLISHED from NOT YET ESTABLISHED → no protected state
   touched.
3. Roman's own worked example, directly: a single wish ("materialize The Answer") produces TWO
   effects with DIFFERENT durability in the SAME commit — the manifestation `expires`, the
   witnessed accusation `persists`.
4. Rejected generation (`delivered:false`) → no entry.
5. Six shapes of malformed report → no entry, no array growth.
6. Duplicate/retried commit for the same scene → first succeeds, retries are silent no-ops, exactly
   one entry survives.
7. Save/reload round-trip (mirroring the real Issue-carry-forward JSON capture/restore pattern) →
   entry and idempotency guard both survive intact.
8. Future prompts: the real `_buildContinuitySpineBlock` includes the committed consequence,
   verbatim evidence, and the ESTABLISHED/NOT YET ESTABLISHED separation.
9. Full volatility-window lifecycle (activation → taper → close → aftermath imprint → fading →
   expiration, using the real, already-fixed CG functions from the prior two passes) leaves the
   durable-consequence array's count flat throughout — window/aftermath expiration never touches
   it — while the window/aftermath mechanism itself does fully expire in the same run (proving this
   isn't a vacuous no-op check).
10. The instruction-hierarchy text is present in the real, live directive.
11. Ordinary wish doctrine (`classifyWishDisposition`) still resists the same-intent wish
    independently and never touches Tempt's own array — the separation from the prior pass holds
    structurally, not just by naming convention.

## 6. Live-test authorization sheet (what this pass could NOT establish, and what a live pass would need to)

This pass proves the mechanism handles ANY well-formed or malformed report correctly. It cannot
and does not claim the model WILL produce well-formed, well-grounded reports, or that its creative
judgment about "what changed" / "what's evidence" / "what's still open" is good. That requires a
live sample. Recommend, when authorized:

- **Scope**: one live Tempt Fate invocation on First Sacrifice (Fantasy world, so the instruction-
  hierarchy and Fatelands-doctrine interaction is actually exercised), using a wish outside the
  three categories the old system special-cased (e.g. Roman's own "everyone forgets the ceremony"
  or an entirely fresh one) — a single paid call, not a batch.
- **Integration point to build first, live-testable only**: a call site that actually asks the
  model for the `_buildTemptFateOutcomeReportingSchema()`-shaped report and feeds the raw response
  into `_validateTemptFateOutcomeReport`/`_commitTemptFateOutcome`. Two reasonable shapes, either
  workable: (a) a dedicated verifier call mirroring `_commitScene`'s own evidence-grounded design
  (higher fidelity, one more call per Tempt scene); (b) a field appended to the author's own
  structured generation response (CG already returns structured JSON; literary would need a
  trailing structured block). Not decided this pass — worth deciding WITH the live sample rather
  than guessing blind.
- **What to actually judge from the live sample**: (1) does `delivered` correctly distinguish a
  scene that rendered the intervention from one that hedged/deferred it; (2) is `changed`/
  `establishedEvidence` genuinely grounded in the prose (not invented, not vague); (3) does
  `durability` correctly separate effects that the scene itself signals as bound to the window from
  ones that read as sticking; (4) does the model actually honor the instruction-hierarchy override
  for a "circumstances not minds"-violating wish (i.e., does it really let Tempt Fate touch minds/
  memory directly, or does it flinch back toward ordinary-wish caution); (5) does
  `openPossibilities` stay speculative in tone rather than reading like disguised fact.
- **Cost**: one Tempt Fate invocation at whatever the current CG/OAS Tempt pricing is (60F default,
  40F embodied-context discount) — a single sample, not a batch; the design doc above already
  specifies exactly what to look for, so one careful read should be enough to decide whether the
  mechanism is ready or needs another dry iteration first.

## 7. Regression

`_relational_obligation_contract_control.mjs` 47/47 · `_planner_function_gate_diagnosis_control.mjs`
unaffected · `_cg_proxy_world_guard_control.mjs` 15/15 · `_cg_causal_link_legibility_control.mjs`
25/25 · `_confession_frame_confessing_party_control.mjs` 16/16 · `_scene2_aftermath_lane_control.mjs`
22/22 · `_scene2_planner_function_gate_control.mjs` 10/10 ·
`_scene2_lirael_defensive_path_lane_semantics_control.mjs` 22/22 · `_saydo_safety_gate_control.mjs`
24/24 · `_saydo_wallbreak_gibberish_cluster_control.mjs` 32/32 ·
`_petition_identity_rewrite_gate_control.mjs` 23/23 · `_tempt_fate_canon_rupture_control.mjs` 20/20
· `_tempt_fate_volatility_activation_control.mjs` 19/19 ·
`_tempt_fate_imprint_lifecycle_control.mjs` 19/19 · `_continuity_spine_dry.mjs` (80-check baseline)
— result appended to the commit body once the background run completes (expected unchanged: 69
passed / 11 pre-existing-failed).

The prior pass's own control (`_tempt_fate_durable_consequences_control.mjs`) is deleted, not kept
— it tested functions this pass removed entirely (not relocated), so keeping it would only produce
false regression-suite failures for deliberately-retired code.

## 8. What this pass does NOT do

- Does not build the live call site that actually asks a model for the outcome report (§6) — that
  is the next authorized step, and it needs a live sample to validate, not more dry design.
  Explicitly not built this pass per "Do not add... a separate paid classification call."
  Explicitly not "merely another design document" either — the validate/commit/persist/deliver
  mechanism is real, wired, and dry-proven; only the model-facing call site remains.
  Also intentionally NOT built as a workaround for the prior fixture list (materialize/memory/
  death) — the mechanism is content-blind by construction.
- Does not touch `WISH_ORDER_SIGNALS`/`classifyWishDisposition`'s own coverage gap (flagged in the
  prior pass) or the cataclysmic-regex inflection gap from the original canon-rupture pass.
- No live Tempt Fate sample, no paid calls, no prose generation, no image work.
