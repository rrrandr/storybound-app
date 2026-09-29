# Baseline Reconciled PC Portfolio + PC-C+ — design (2026-09-14, authorized)

Grounded in direct-source tracing (4 parallel forks + follow-up), not assumed. No design decision
below invents content; every facet-content field cites a real, already-existing source.

## Ground truth that shapes this design

- **PC Body Bible** (`_generatePCBodyBible`, app.js:254559+, tiered via `_callTieredProvider`,
  no new provider call) already asks for genuinely psychological fields:
  `wound.core`/`wound.category`(enum)/`wound.surfacing_hint`, `core_contradiction`,
  `private_hope`, `emotional_weather`, `current_crisis.{event, time_since_impact,
  hottest_emotion, immediate_want, immediate_fear, refusal, li_complication}`. Stored at
  `state.pcBodyBible`. Has its own fingerprint (`_pcBibleFingerprintInputs`/`_bibleFingerprint`,
  ledger-backed at `state._bibleArtifacts.pc`) — reused for portfolio provenance, not reinvented.
- **Fixed-starter PC cast** (`STARTER_SEEDS.starter_first_sacrifice.cast[0]`, Lirael) already
  carries real, authored `cPlusFacets` (`pc_untested_brilliance`, `pc_fears_public_failure`) —
  same shape NPCs use. **Their `possible_pressures` are plain strings, not
  `{text,evidence_requires}`** — `_normFacet` sets `evidence_requires=''`, and
  `_cpBuildGroundedOptions` (`if (!req) return;`) means **these two facets can never ground
  today, as authored**. Pre-existing, not introduced here — used as-is, not patched (that's
  Roman's canon-authoring call, not an engine fix).
- **`_seedFacetIndex`** already special-cases `role:'PC'`, but keys it `'pc:'+slug(name)`
  (e.g. `'pc:lirael'`) — a DIFFERENT id than `_relPcId()`'s bare `'pc'` (the ledger anchor, and
  the id this session's `_sceneStageContract` accepted-stage branch supplies for
  `stage.onStage`). Rather than reconcile two id schemes, this design routes PC facets through
  the SAME runtime mechanism NPCs already use for generated/materialized casts:
  `L.entities['pc'].authorProfile.cPlusFacets` + `_generatedCastFacetIndex` (unmodified) — a
  direct id match, zero alias-fallback risk.
- **Baked emitted package** (`_bakedEmitted`) has `openState.pcCondition` — a NAMED,
  structurally PC-scoped field (unlike `obligations`/`ledgerSeeds`, which are general or
  relationally-framed) — legitimate evidence for the scene immediately following the baked
  opening. `ledgerSeeds` DOES carry real Lirael-specific interiority but only relationally
  framed ("Lirael ... reads his stillness as..."), never a bare self-facing entry — NOT used as
  a facet/evidence source here (would require prose-parsing, which the codebase's own doctrine
  forbids: "ownership from structured data alone — never from matching a name in prose").
- **Committed evidence, four categories traced**: `_committedState.facts[]` has **no subject
  ref at all** — ambiguous, could be about anyone — **excluded** from PC grounding (using it
  would repeat the blanket-attribution mistake just corrected). `_scenePosture[sceneNum]`,
  `_durableFateConsequences[]` (sceneIdx-keyed), `_temptFateLedger[]` (sceneIdx-keyed) are each
  legitimately, structurally PC-scoped **by their own construction** (the reader's own input;
  Fate-bargain costs are always the PC's own; Tempt Fate is always the PC's own wish) — used.
- **NPC C+ rendering** (`_cpBeatLines`, app.js ~96856) is 100% outsider-observation voice
  ("a reading of this act that exposes X... shows how SHE sees") — incoherent if X is the PC.
  A parallel self-embodiment render path is required; nothing today does this.
- **PC exclusion from ordinary C+ is exactly ONE gate**: `_cPlusCandidateSet`'s
  `if (isPc && n===1) { ownedBy = pc_opening_fusion; availableForOrdinaryCPlus = false; }`.
  Nothing else in `_facetSourceCoverage`/`_cpBuildGroundedOptions`/`_cpSchedule` special-cases
  the PC. Scene 2+, she is an ordinary candidate the moment real facet material exists for her.
- **CG delivery**: `_runCGScreenplayGenInner` calls the SAME `_cpContinuationAssignment` as
  literary (`_cgMintDeliveredAssignments`, app.js ~226608) — so PC candidacy reaches CG for
  FREE once wired into the shared pipeline. But `_cgMintDeliveredAssignments` hardcodes
  `environment_plus: null, fusion: null` — CG has never had E+/fusion delivery at all (a
  pre-existing, separate gap from what this session built for literary). Since the final
  requirement needs NPC E+/fusion to reach the CG payload too, this design also wires the
  ALREADY-BUILT, ALREADY-TESTED `_resolveStageBeatInventory`/`_resolveEPlusTarget`/
  `_checkFusionReachability` primitives into that one CG call site — reusing, not redesigning.

## What gets built

1. **`state._pcPortfolio`** — one story-scoped record: `{v, storyId, pcRef:'pc', source:
   'fixed_starter'|'corridor_bible'|'none', provenance:{...}, facets:[...same shape as NPC
   cPlusFacets...], reconciliation:{appliedDurableConsequenceIds:[], appliedTemptEventKeys:[],
   lastReconciledAt:null}}`. `reconciliation` is the boundary the task asks for — later durable
   identity/body changes have somewhere to record what they've already applied — the WRITER that
   populates it on a real durable change is explicitly deferred (not built here).

2. **`_ensurePcPortfolio(s)`** — idempotent. Fixed-starter: facets = seed's own
   `cast[PC].cPlusFacets`, used verbatim (including their current lack of grounding — that's
   real, not a bug to hide). Corridor: facets = `_pcFacetsFromBodyBible(bible)` — two facets,
   `pc_core_contradiction` (category:'contradiction', text:`core_contradiction`) and
   `pc_current_fear` (category:'fear', text:`current_crisis.immediate_fear`), each pressure's
   `evidence_requires` DERIVED (never invented) from `current_crisis.event`'s own content words
   (stopword-filtered, same discipline `_cpFactCorpus`'s own tokenizers use elsewhere) — a
   mechanical transform of already-authored bible text, not new canon. Missing source (no seed
   PC facets, no bible) → `source:'none'`, empty facets, `authorProfile` never marked ready —
   PC-C+ is silently absent, never fabricated. Materializes onto
   `L.entities['pc'].authorProfile = {status:'ready', cPlusFacets, guardrails:[]}`.

3. **`_pcEvidenceFacts(s, sceneNum)`** — backend-derived, structured, PC-attributed facts from
   the three legitimate sources (posture for THIS scene only; durable consequences and Tempt
   Fate entries committed strictly BEFORE this scene; `_bakedEmitted.openState.pcCondition` only
   for scene 2). Shape: `{text, participants:[{ref:'pc', role:'subject'}]}` — same structured
   shape this session's own stage-fact correction already established, reused verbatim.

4. **Wiring**: `_sceneStageContract`'s accepted-stage branch calls `_ensurePcPortfolio(s)` and
   appends `_pcEvidenceFacts(...)` to `_accEventFacts` — so C+ eligibility (already flowing
   through `_cPlusCandidateSet`→`_facetSourceCoverage`→`_cpBuildGroundedOptions`→`_cpSchedule`→
   `_cpContinuationAssignment`, ALL UNMODIFIED) sees the PC as an ordinary candidate with real,
   evidence-backed pressures whenever both a portfolio and real evidence exist — and sees nothing
   otherwise. `_cpContinuationAssignment`'s own `cp.push(...)` gains one additive field,
   `isPC: cand.kind === 'pc'`, so downstream rendering can branch — no other change to that
   function. CG's `_cgMintDeliveredAssignments` gains the SAME E+/fusion resolution the literary
   skeleton already has (calling the existing D1-D5 primitives), and `_renderCGDeliveredAssignments`
   renders them using the same self-embodiment/outsider split as literary.

5. **Say/Do contradiction guard** — `_applyPcSayDoGuard(characterPlusArray, s, sceneNum,
   pcLabel)`, a post-filter both call sites apply to the array `_cpContinuationAssignment`
   returns: drops the PC's own entry if `_scenePosture[sceneNum]`'s action/dialogue explicitly
   negates ("not"/"never"/"no longer" + a content word from the facet's own `canonical_truth`)
   what the facet claims. Bounded, mechanical, never a semantic/LLM judgment.

6. **Self-embodiment rendering** — `_renderPcSelfEmbodimentLine(c)`, a new sibling to
   `_cpBeatLines`, phrased as internal perception/body/words/action rather than outsider
   observation, never stating a claim the guard above didn't already clear.

## Explicitly not built here
Ordinary-wish adjudication, any new Fate UI, Scene 2 canon, the reconciliation WRITER for durable
identity/body changes (only its target — `state._pcPortfolio.reconciliation` — exists), any paid
model call.
