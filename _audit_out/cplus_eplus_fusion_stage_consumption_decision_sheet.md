# C+/E+/Fusion Stage Consumption — Decision Sheet

Six open integration decisions from `generic_cplus_eplus_fusion_stage_consumption_review.md`,
surfaced for Roman. **No canon, no model calls, no implementation here.**

**Fixed in every option below** (not re-decided per item): C+ cadence/cooldown stays independent of
staging · E+ targets come only from the accepted current stage's `issued_objects` (never a seed/model
invention, wherever a stage is active) · excluded objects are never selectable/eligible · fusion needs
valid C+ + E+ for the *same* stage/actor · missing data → beat absent, never invented.

---

### D1 — E+ target schema: does `issued_objects` need `object_id`/`head`?
**Integration point:** `_targetInInventory`/`_targetInScene` (`app.js:128617-128677`) — fuzzy
token-match validation, no prompt-declared list required. Seed path's stricter
`target_object_id` citation (`266435`, `267281-267286`) needs a real id.
- **Smallest option — label-only.** `issued_objects[].label` is matched by the existing
  `_targetInScene` fuzzy-token check, unchanged. *Available:* free-text E+ targeting against the
  stage inventory, today's validator, zero schema change. *Unavailable:* the stricter
  `target_object_id` citation path (id-exact) stays seed-Scene-1-only.
- **Next option — add `object_id`+`head`.** Extends `issued_objects`'s shape so the generic path can
  also satisfy the stricter citation contract. *Available:* one unified citation mechanism for both
  paths. *Unavailable:* nothing new; costs a schema field + a minting rule (who assigns `object_id` —
  the same backend-mint discipline `_proposeNewEntity` already uses).
- **Engine vs canon:** both options are pure engine (runtime schema/validator), no authored data.
- **Effect:** identical across seeded/corridor/CG/literary/FF — this validator is story-shape-agnostic.
- **Prompt/calls/behavior:** neither option touches the prompt or adds a call; label-only is a pure
  validation-side change (zero prompt cost); the schema option adds a field the issuer already
  produces internally, not new prompt content.

### D2 — No-active-stage fallback: preserve today's behavior, or stage-only?
**Integration point:** the skeleton-generation `usr` block's `environment_elements` declaration
(`app.js:266765`, model invents them when `_stage.settingOwner === 'planner'`) and
`_targetInInventory`'s `elements`/`setting` pool.
- **Smallest option — preserve fallback.** Only a scene with an ACTIVE accepted `state._stageState`
  record switches to "stage inventory only, exclusions enforced"; every other scene (pre-issuer
  stories, a scene where issuance didn't fire) behaves EXACTLY as today — model still declares
  `environment_elements` itself. *Available:* zero regression risk for anything outside the issuer's
  reach. *Unavailable:* two live rules coexist (stage-scoped vs model-declared) until the issuer
  covers everything.
- **Other option — stage-only, always.** E+ requires an active stage record everywhere; scenes
  without one get no E+ (per "missing data → absent"). *Available:* one rule, no coexistence.
  *Unavailable:* real behavior change for every story/scene the stage issuer doesn't yet reach —
  E+ (and therefore fusion) silently stops firing there, a regression versus today's shipped rate.
- **Engine vs canon:** pure engine (a conditional branch); no authored data either way.
- **Effect:** preserve-fallback is the only option that leaves seeded starters not yet covered,
  corridor edge cases, and Famous Fate (no seed at all — see review §4, FF runs the corridor stage
  packet path same as any unseeded story) unaffected. Stage-only would visibly change FF/corridor E+
  rate immediately, everywhere, not just First Sacrifice.
- **Prompt/calls/behavior:** preserve-fallback changes nothing for uncovered scenes (byte-identical
  prompt); stage-only REMOVES the "declare environment_elements yourself" instruction for covered
  scenes and replaces it with a fixed list — a substitution, not a net prompt-size increase.

### D3 — Exclusion enforcement: filter at the source, or reject at validation?
**Integration point:** `_targetInInventory`/`_targetInScene`, called from the E+ validator
(`app.js:268012-268049`). Enforcement itself is fixed (excluded = never eligible); the mechanism is
open.
- **Smallest option — filter the pool.** Before matching, drop any `issued_objects`/`location` entry
  whose label appears in `rec.exclusions`, so an excluded thing is structurally invisible to the
  matcher — no new fault code needed, it just can't match. *Available:* one code path, reuses the
  existing matcher unchanged. *Unavailable:* no explicit "you tried an excluded target" diagnostic.
- **Other option — explicit reject.** Match normally, then check the result against `exclusions` and
  raise a NAMED fault (mirroring the existing `_CODES` closed-set pattern for fusion's
  `impossible_because`) if it matches an excluded entry. *Available:* a debuggable, logged rejection
  reason. *Unavailable:* nothing lost; slightly more code (a second check site).
- **Engine vs canon:** pure engine; `exclusions` data already exists (arc-constraint deferrals), no
  new authoring.
- **Effect:** identical everywhere `exclusions` can be populated today — currently only via the
  arc-constraint landmark-lock path (First Sacrifice's `the_open`), so in practice this only bites
  for stories with an active arc-constraint registry entry; harmless no-op elsewhere (corridor, FF,
  most seeded starters have no `arcConstraints` defined).
- **Prompt/calls/behavior:** neither option touches the prompt (both are post-generation validation);
  no new call.

### D4 — C+'s `onStage` pool: read `present` directly, or resolve first?
**Integration point:** `_cPlusCandidateSet`'s `stage.onStage` pool (`app.js:134447-134482`), which
today comes from `_effectiveSceneRow`'s seed/plan `stage.participants` — a DIFFERENT source than the
new `state._stageState` accepted record.
- **Smallest option — direct read.** Resolve `present` (ledger ids) to `{id, label, kind}` the same
  way `_buildCurrentStageDirective`'s `labelFor` already does (reusing `present_disambiguators`), feed
  that as `stage.onStage` when an active stage exists. *Available:* C+ eligibility's `onStage` pool
  reflects the actual issued cast for ANY scene, not just seed/plan rows. *Unavailable:* nothing —
  `stage.offStage`/text-mention matching (the "Waldorf concierge" pool) is untouched either way, since
  it's inherently text-derived and out of scope for both options (per the review, §3).
- **Other option — dedicated resolution step.** A new helper mirrors `_effectiveSceneRow`'s own
  resolution shape more closely (e.g. preserving `role`/`presence` fields C+ code may read beyond
  label/kind). *Available:* closer parity with the seed/plan shape if C+ code turns out to depend on
  fields the direct read doesn't supply. *Unavailable:* first must confirm (not yet checked) whether
  `_cPlusCandidateSet` reads anything beyond `{id,label,kind}` off `onStage` entries — if it doesn't,
  this option is pure extra engine work for no gain.
- **Engine vs canon:** pure engine either way.
- **Effect:** identical across seeded/corridor/CG/literary/FF — `_cPlusCandidateSet` itself doesn't
  branch on story shape.
- **Prompt/calls/behavior:** neither touches the prompt (C+ eligibility is a pre-generation candidate
  filter, not something shown verbatim to the model in this form) or adds a call.

### D5 — Fusion's "same stage/actor" check: bare co-occurrence, or reachability via `addressable_by`?
**Integration point:** fusion's cross-check (`app.js:268162-268169`), which currently only asks "is
there eligible cast AND a valid E+ target" — no link between WHICH actor and WHICH target.
- **Smallest option — bare co-occurrence.** Fusion is available whenever the C+ actor is in `present`
  AND the E+ target is in `issued_objects`, with no cross-reference. *Available:* simplest rule,
  matches today's existing cross-check shape almost exactly (just swaps the inventory source).
  *Unavailable:* an actor could be "fused" with an object they have no story reason to be near (e.g.
  a token object issued for someone else's use).
- **Other option — `addressable_by` reachability.** Fusion additionally requires the C+ actor's id to
  appear in the target object's `addressable_by` (already a real, validated field —
  `_validateStageProposal` already checks it references real entities). *Available:* fusion only
  proposes physically plausible actor/object pairings, using data the issuer already captures.
  *Unavailable:* nothing lost, but an object issued with a narrow `addressable_by` list correctly
  narrows fusion eligibility — a planner that never populates `addressable_by` gets the same
  permissive result as bare co-occurrence (safe default).
- **Engine vs canon:** pure engine; `addressable_by` is already-captured runtime data, not authored.
- **Effect:** identical across all story shapes — the field exists uniformly once the issuer runs.
- **Prompt/calls/behavior:** neither touches the prompt or adds a call (both are post-generation
  cross-checks on already-produced values).

### D6 — Scope of the first authorized slice
**Integration point:** none — this is a sequencing decision across D1-D5.
- **Smallest option — E+ target inventory only (D1+D2+D3).** Lowest risk: purely additive/validation-
  side, no doctrine change to C+ or fusion. Leaves C+'s `onStage` source (D4) and fusion's reachability
  rule (D5) for a later authorized step.
- **Wider option — all of D1-D5 together.** One coherent pass; avoids a second research/anchor-drift
  cycle re-reading the same functions later, at the cost of a larger single change to review/test.
- **Engine vs canon:** both pure engine; no canon changes at any scope.
- **Effect:** identical set of stories touched either way (seeded, corridor, FF); the narrower slice
  simply touches fewer FUNCTIONS per commit.
- **Prompt/calls/behavior:** narrower slice = smaller, easier-to-verify diff per commit; no functional
  difference in end-state prompt/call behavior between doing it in one pass or two.

---

**Stopping here for your decisions.** Once you pick D1-D6 (or tell me to default to the "smallest
option" across the board), the next step is a controls-first implementation slice matching this
session's existing discipline — still no Scene 2 canon, still no model calls until you separately
authorize a paid run.
