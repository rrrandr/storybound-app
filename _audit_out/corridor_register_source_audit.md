# Audit: original/Corridor sources for the protected register

**Status:** read-only, provider-free audit. No implementation. `_invariantRuntimeV0` OFF. 2026-09-30.

Tenth of the planning thread. Audits the original/Corridor column of the register source table in
`canon_mutation_policy.md` §2, which I flagged as inference rather than verification.

**Method, stated honestly:** this is a **static trace** of the lifecycle — launch → planner → commit →
consumers — read from source. It is not a driven Corridor playthrough, because that requires paid
generation and this audit is provider-free. So it establishes what the code *does*; it does not
establish what a real Corridor story's ledger *contains* after ten scenes.

---

## 0. Correction to my own audit — a third canon writer, live and default-on

My original audit reported two canon-writing mechanisms: `_tickAPlot` (scene-number) and
`InvariantRuntimeV0` (prose inference, inert behind a flag). **I missed the one that is actually
running.**

`state._committedState = { facts, tableau, pendingIntent }` (`app.js:82496`, `99839`) — *"COMMITTED
STATE v0 … the transactional runtime: ONE canonical owner of story position"*.

`_commitScene(prevText, prevProposal, prevSceneNum)` (`99860`), awaited at `100369` inside the planner
path — *"ONE commit point"* — does this:

1. takes the **previous scene's rendered prose**;
2. sends it to a **verifier LLM** which returns `DELIVERED` / `PARTIAL` / `MISSED` plus a tableau;
3. on `DELIVERED`, `_commitTransition(prevProposal.event, …)` (`99937`) pushes a fact into
   `cs.facts` with `provenance: 'delivered'`.

**Kill switch `_committedStateV0` is never assigned anywhere** — only ever read as `=== false`
(`99862`, `100359`, `31981`). So it is **enabled by default, for every story.**

Those facts then reach the planner as irreversible truth (`100647`):

> `COMMITTED WORLD STATE — facts already TRUE (irreversible; do NOT re-establish or re-flip; your event MUST build FROM these)`

**In fairness, this is not "invent a fact from prose."** The event was *proposed before prose*
(`prevProposal.event`); the prose decides only whether it **landed**. That is a third ordering —
propose-before, commit-after-verification — and it has a real virtue: nothing becomes canon that the
reader did not see. It differs from the ordering you chose (seal before prose, then gate that the prose
rendered it) in what happens on mismatch: `_commitScene` keeps the prose and leaves canon unmoved; your
ordering moves canon and rejects the prose.

**But the code already documents its own hazard** (`101074-101076`):

> *"production commits on the verifier LLM's unsupported say-so, and `cs.facts` can record events the
> prose never delivered. Committed state is downstream authority for every later scene, so a false
> commit poisons all subsequent planning."*

The evidence-grounded fix shipped behind `_structuredEventHandoff`, which is **default OFF**;
`_evidenceCommitCheck` (default ON) covers only the producer→verifier slot path.

This belongs in the thread's record because it is a live, model-judgment canon writer that neither the
audit nor the policy notes accounted for.

## 1. Classification of every proposed Corridor source

| Proposed source | Verdict | Evidence |
|---|---|---|
| `cgScaffold.socialGeometry` | **advisory planning/scaffold context** — REMOVE | only consumer is `_renderCGScaffoldBlock:227299` (prompt string) + devtools; no branch tests its value; no post-parse validation of the scaffold at all (`_expectedIssueCount` never compared to `issueArcs.length`) |
| `cgScaffold.worldPhysics` | **advisory planning/scaffold context** — REMOVE | same: `227299`, devtools only |
| `aPlot.antagonistOrAntiForce` | **advisory + planner input** — REMOVE | interpolated `68271`; fed to `_generateAntagonistBodyBibleUncached:267661`. **Decisive:** `aPlot` is nulled by `_resetStoryState:82402`, which runs at issue transitions (`102325`) — a field regenerated every issue cannot be protected canon |
| `cgScaffold.issueArcs[].thesis` and siblings | **advisory** — REMOVE | prompt text; `regimePhase`/`cliffShape` are runtime gates but are *pacing*, not entities |
| `_committedState.facts[]` | **accepted structured ledger record, but INVALID as an entity source** | entries are `{fact: <prose ≤200 chars>, sourceEvent, committedAtScene, provenance}`. The codebase already excludes it for exactly this reason (`134496`): *"`_committedState.facts[]` has NO subject ref at all and is deliberately excluded as a source"* |
| `_committedState.tableau.charactersPresent` | **advisory** — model-emitted name strings, no stable ids | emitted by the verifier prompt (`99880`) as `[names]` |
| `_pcCommittedFoundationForPrompt` | **not available for Corridor** | returns null for Corridor (`53295`) — a fixed-starter mechanism |
| `_sceneObjectives[n]` (`status:'accepted'`) | **accepted structured record**, but its `present[]` is *labels* validated against a seed roster — and Corridor has no roster (`205876` returns null) | `_validateLocalObjective:206005` |
| reader-owned PC/LI identity | **established canon** | reader-supplied and durable; the one unambiguous Corridor canon anchor |
| **`_relationshipLedger` entities** | **established canon / accepted structured record** — the correct source | see §2 |

**So three of the four scaffold-derived sources I proposed are advisory and must come out.** You were
right to suspect them: protecting a planning suggestion would turn the scaffold into a hidden canon
writer and make a revisable suggestion immutable.

## 2. The structured entity substrate already exists — and it already matches the spec

This is the audit's most useful finding. `_proposeNewEntity` / `_validateEntityCreationProposal` /
`_validateStageProposal` (`app.js:206118-206200`) already implement nearly everything you specified:

| Your requirement | Already built |
|---|---|
| system-owned identity, never planner-supplied | `id = 'ent:stage:' + (++L.seq)` — *"backend-minted, sequential, never planner-supplied"* (`206144`). The validator **rejects** a proposal that supplies one: *"proposal supplies its own id — the backend mints ids, never the caller"* (`206122`), and likewise its own provenance (`206123`) |
| type + display name | `kind` (checked against `_STAGE_ALLOWED_ENTITY_KINDS`) + `label`, both required (`206125-206127`) |
| aliases / collectives / offices need a declared identity relationship | `aliases[]` **and** `roleHint`, plus `identityClaims: { <existing id>: { kind, anchorRole, role_instance_id } }` — *"a claim that conflicts with that id's own record is the one identity-conflict red case — **never a name check**"* |
| `existingRefs[]` must be ids, not nouns | already enforced: *"`present` (and any object `owner_or_caretaker_ref`/`held_by`/`addressable_by`) must be **STABLE LEDGER IDS ONLY** — a bare name or an id with no matching entity is rejected"* |
| reject-only, never rewrites | *"STRICTLY READ-ONLY … a reject-only validator that mutates `_relationshipLedger` on its rejected path is not reject-only"* |

It even has a hook reserved for exactly the locked-canon check this policy needs:
`window._stageArcConstraintCheck` (`206132-206135`), which today always passes because no registry
exists to check against.

**The one thing that is missing:** *"NOT YET WIRED into genesis/migration/resume call sites … **no
production path consumes this substrate yet** — the only real caller today is `_acceptStageProposal`
itself."* (`206158-206161`)

So `introducedEntities[]` and `existingRefs[]` are not new schema to invent. They are **this substrate's
existing proposal shape**, and the work is wiring it as the canon path and deriving the register from it.

## 3. Corrected universal source table

The register derives from **structured entity records only** — never from prose text in any record.

```
protectedRegister(story) =
    { entities in _relationshipLedger with established provenance }      ← anchors + accepted
  ∪ { entities from accepted introducedEntities[] (= _proposeNewEntity records) }
  ∪ { seed-declared entities, where a seed exists }
```

| Kind | Seeded story | Original / Corridor story |
|---|---|---|
| named characters | seed `cast` → ledger anchors | reader-owned PC/LI anchors; ledger entities of `kind` named |
| groups / institutions | seed `collectives` | ledger entities of the collective/institution `kind` |
| offices / titles | the culture's declared ladder (Fatelands: `16721-16726`) | ledger `roleHint` / `anchorRole` via `identityClaims` |
| artifacts + ownership | seed artifact facts | ledger object entities + `owner_or_caretaker_ref` / `held_by` |
| historical facts | seed `truths` | **no structured source today** — see §5 |

**Explicitly NOT sources:** `cgScaffold.*` (any field), `aPlot.*` (any field),
`_committedState.facts[]` text, `tableau.charactersPresent`, and any noun appearing in record prose.

Alias/collective/office disambiguation is handled structurally, which answers your Aeryn's Reach
example: "Aeryn's Reach" is one entity with `aliases`; its governance is either the same entity with a
`roleHint`/`anchorRole` or a distinct entity related by `identityClaims`; an unnamed patrol is a
separate entity of a collective kind. Which of those it is, is **declared**, not inferred from name
similarity — and `identityClaims` conflicts are the one red case.

## 4. Provider-free proofs

1. **A generated planning field alone cannot enter the register.** Populate `cgScaffold.socialGeometry`,
   `cgScaffold.worldPhysics` and `aPlot.antagonistOrAntiForce` with entity-like strings; assert the
   derived register is **unchanged** and that a later proposal altering any of them is **not** classified
   tier 3.
2. **An accepted tier-2 introduction does enter it.** Run a proposal through `_proposeNewEntity`; assert
   a backend-minted `ent:stage:N` id, that a proposal supplying its own `id` or `provenance` is
   **rejected**, and that the new entity appears in the derived register **with no register-mutation
   write** (protection is derived).
3. **Prose text is never a source.** Commit a `_committedState.facts` entry whose text names a
   plausible institution; assert the register does **not** contain it, and that altering that institution
   is **not** tier 3.
4. **Identity relationships are declared, not guessed.** Assert "Aeryn's Reach" and "the Reach
   governance" resolve to one entity only when related by `aliases`/`identityClaims`, and to separate
   entities otherwise — never merged by name similarity.
5. **`aPlot` regeneration cannot drop protection.** Seal a tier-2 entity, cross an issue transition
   (which nulls `aPlot`), and assert the entity is still in the register and still tier-3 protected.

Each shown RED first.

## 5. What this leaves open

1. **Historical facts have no structured Corridor source.** Every other kind resolves to a ledger entity;
   history does not. Either history stays seed-only for now, or it needs its own structured record kind —
   a decision, not an inference.
2. **`_commitScene` (§0) needs its own decision.** It is a live, default-on, model-judgment canon writer
   whose own comment says it can record undelivered events. It is not in scope for the register (its
   facts are excluded as a source), but it is downstream authority for all planning, and the ordering it
   uses is not the ordering you approved.
3. **The substrate is unwired.** Its ledger, ids and validators exist and are controlled green, but no
   production path consumes it, so nothing above is proven against real Corridor data.
4. **This was a static trace, not a driven playthrough.** What a real Corridor ledger holds after ten
   scenes is unverified.

No implementation. No provider call. No authorization requested.
