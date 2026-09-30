# Addendum to the planning-scaffold audit

**Status:** audit addendum. No design, no implementation. `_invariantRuntimeV0` stays OFF. 2026-09-30.

Companion to the audit delivered 2026-09-30 and to `pre_author_continuation_selection.md` (whose §1
catalogue assumption is superseded by item 4 below).

---

## 1. The two universal scaffolds, identified separately

The architecture is stated in the codebase itself at `app.js:60368` — **four owners, disjoint fields**,
writing into **two** generated containers. `aPlot` is one of the four owners *and* its own third
container. That is why it is not automatically either scaffold.

### Story-wide: `state.cgScaffold`

Generated `_buildCGScaffold` (`226104`) via `_ensureCGScaffold` (`227180`); tiered provider
ministral-8b → grok-4-1-fast → gpt-4o-mini (`6362`). One write site only: `227253`. Persisted; restored
verbatim (`116450`). **Never mutated after generation.** Universal — generic spine ALWAYS ON since
2026-07-05 (`226047`); `STARTER_SEEDS`/`STARTER_PLANS` never write to it (a seed only *defers* the paid
call for a Tier-0 starter, `226093`).

Generated top-level fields and consumers:

| Field | Consumer | Kind |
|---|---|---|
| `runThesis`, `thematicDirection`, `visualThesis` | `_renderCGScaffoldBlock` `227294`; CG visual block `174153` | advisory |
| `worldPhysics`, `hiddenPressure`, `socialGeometry`, `permittedAnomalyStyle` | `_renderCGScaffoldBlock` `227299` | advisory |
| `motifBank` | `227337`; subplot generator `65892` | advisory / planner input |
| `voiceAnchors.{pc,li}_register` | `227342`; `_spineSeedClause` `30942` | advisory |
| `characterIcebergs` | `buildCharacterDisclosureDirective` `33831` (indexes next layer) | advisory, deterministic pick |
| `forbiddenDefaults` | `227347`; subplot generator `65893` | advisory |
| `storyId` | idempotency check `226099` | hard gate |
| `storyShape`, `worldArc` | — written `226724`, **never read** | **unused** |
| `characterPortfolios` | scrubbed unconditionally `138904`; routed to relationship ledger | never present on the object |

### Issue-wide: **a slice, not an object**

There is no separate generated issue scaffold. The issue-wide layer is:

- **`cgScaffold.issueArcs[i]`** — a per-issue slice *inside* the story-wide container; and
- **`rPlot.issueRelationshipStates[i]` / `rPlot.issuePressures[i]`** — parallel per-issue arrays in a
  second container (schema `62091-62092`, generated `_ensureRPlot` `276796`, written `226812`,
  consumed `100394`, `226524-226530`, `62804`; reset per story `82460`).

`issueArcs[i]` generated fields and consumers:

| Field | Consumer | Kind |
|---|---|---|
| `thesis`, `issueLabel` | `227302`; `_spineSeedClause` `30977`; `buildOASSpineDirective` `93203` | advisory |
| `pressureVectors` | `227307`; `93204` | advisory |
| `ambiguityTargets` | `227304`; `93205` | advisory |
| `endingShape` | `227309` only — no branch tests its value | advisory |
| `regimePhase` | `_inferRegimePhase` `66123`; committed-truth reveal window `45161` | **hard gate** |
| `cliffShape.escalation` | `_spineEscalationShape` `201330` → alters climb/cool probabilities `201374`, amplitude `201428` | **hard gate** |
| `cliffShape.preferred/avoidFamilies` | `_selectCliffArchetype` weighting `48906` | hard gate (soft-weighted) |
| `visualArc.*` | `227323`; `174157` | advisory |

**The structural consequence, and it governs everything below.** Because the issue layer is a frozen
slice of a frozen object, it inherits every property of the story-wide container: generated once, never
mutated, **count never validated** (`_expectedIssueCount` sizes the prompt and `max_tokens` but is never
compared to `parsed.issueArcs.length`), and degrading via `issueArcs[ii-1] || issueArcs[last]` to
**silent permanent reuse of the last arc** with no detection. It therefore has nowhere to record live
state — nothing in it can be marked deferred, impossible, or replaced.

And the issue cursor is scene-count-derived: `_currentIssueIndex()` = `state.issueIndexInRun` (`143186`),
set by `Math.floor(sceneIndex / pricing.scenesPerIssue) + 1` (`143199`).

### Third container: `state.aPlot` — issue-local author-prompt schedule

Reclassified. Not a scaffold. Per-issue (nulled by `_resetStoryState` `82402`, which runs at issue
transitions `102325`); regenerated from scratch each issue with new `id`, new milestones,
`currentTurn = 0`. Carry-forward (`66314`) is for **tier upgrades only**. Its `milestones` array is a
flat `atScene` schedule whose sole delivery is advisory prompt text (`68411-68418`); `triggered` is set
by `atScene <= turn` (`64873`) and nothing else.

---

## 2. Intended future responsibility — and the gap in each row

| Layer | Intended responsibility | Present state |
|---|---|---|
| generated **issue** scaffold | live pressures · **candidate destinations** · pacing | pressures YES (`pressureVectors`, `issuePressures`); pacing partly (`regimePhase`, `cliffShape`); **candidate destinations: absent entirely** |
| generated **story** scaffold | cross-issue posts · durable constraints | posts YES (`issueArcs[].thesis`, `endingShape`); durable constraints only as advisory text (`forbiddenDefaults`, `worldPhysics`) — nothing machine-checkable |
| runtime | must NOT create plot facts, force milestones by scene number, or infer events from prose | **all three are violated today**: `_tickAPlot` forces by scene number (`64873`) and flips completion on one row (`66143`); `InvariantRuntimeV0.evaluatePriorScene` infers from prose (`:401`, writes canon `:461`) — inert only because the flag is off |
| runtime | MAY verify a pre-author selection is declared by a scaffold layer and remains compatible with canon/branch | does not exist |

**Two named absences.** (a) No field in either generated scaffold enumerates possible next world
events. The only thing resembling it is `reservedEvents`, which is seed-only, has no generator, and is a
*refusal gate before its due scene / silence after* — never a candidate list. (b) "Live" pressures are
not live: the issue slice is immutable, so there is no surface on which a candidate's status could be
recorded.

---

## 3. The missing branch capability, concretely

A candidate destination needs a status that is derived from canon, never authored and never scheduled.
The four states requested, plus one distinction the routes force:

1. **available** — preconditions hold; may be selected this scene.
2. **deferred** — preconditions hold; not selected. Stays available indefinitely. No timer, no
   escalation to mandatory.
3. **ineligible (reversible)** — a precondition is currently false but *restorable*. Not selectable
   now; becomes available again if canon restores the precondition.
4. **impossible (irreversible)** — a precondition is contradicted in a way canon cannot undo.
   Permanently unselectable, and must not be silently reused.
5. **unresolved** — the issue ends with the candidate neither realized nor impossible. A legal terminal
   state, not an error.

**The distinction between 3 and 4 is load-bearing** and the requested four-state list conflates it.
Route B needs reversibility; route C needs irreversibility. Without both, flight either permanently
destroys the hearing (wrong for B) or the catastrophe leaves it eligible forever (wrong for C).

### The three First Sacrifice routes

**A — stays / hearing.** Hearing candidate is `available` from the opening (accused present and
answerable; a convener with standing). It sits `deferred` across however many scenes the player spends
on aftermath, then is selected when the scene is actually about the convening. Requires only: deferral
with no timer. *Today:* row 14 fires at scene 14 regardless, and `_reconcileSeededMilestones` never
touches `atScene`/`triggered`, so First Sacrifice is scheduled exactly like any other story.

**B — flight / pursuit / return.** Flight makes "present and answerable" false → hearing becomes
`ineligible (reversible)`, not deferred and not impossible. Pursuit candidates occupy several scenes.
On return or negotiated surrender the precondition is restored → hearing returns to `available` and can
land much later. Requires: reversible ineligibility, and pursuit candidates that exist. *Today:*
neither. No universal layer declares pursuit, and no `*ByBranch` field is populated in any of the 20
authored rows.

**C — catastrophe / open war / repeated Tempt Fate.** Conditions for a hearing are destroyed
irreversibly → `impossible (irreversible)`. The issue then needs either an **alternative destination in
the same family** (the pressure "Lirael is answerable for what she did" resolving as tribunal-in-absentia,
exile, or a war settlement rather than a hearing) or a legal `unresolved` end. Requires: sibling
alternatives and a supported unresolved terminal. *Today:* expressible in no layer. `aPlot.milestones`
has no invalidation at all; the v0 DAG has obsolescence but is a linear `A→B→C→D→E` chain, so retiring a
node frees or obsoletes dependents and offers no replacement.

---

## 4. The decision: who authors a branch-appropriate next pressure?

This is a decision, not an implementation detail, and it is genuinely open. The runtime's role is
settled in all options — **validate and record, never invent.** What is unsettled is where the candidate
set comes from.

The older docs (`docs/invariant-gated-serialization-design.md` §5,
`docs/does-the-milestone-layer-survive.md`) answer this with a **fourth** option that has now been ruled
out: *"the evaluator decides WHETHER it truly happened"* by reading finished prose
(`invariant-runtime-v0.js:401`, writing canon at `:461`). Ruling that out removes the authored design's
canon source and leaves the question genuinely unanswered — it does not automatically select a
replacement. Hence three live options:

**(a) Generated scaffold, at story generation.** Candidate destinations per issue are emitted when
`cgScaffold` is generated. *For:* one source, already universal, already persisted; nothing new is
authored mid-story. *Against:* the candidate set is fixed before any branch is known, so an
unanticipated branch finds an empty set — and an empty set is exactly the state route B hits today.
Inherits the unvalidated-count and last-arc-reuse fragilities.

**(b) Structured interpretation of the player's choice.** Candidates derived from the recorded decision
and Say/Do. *For:* branch-responsive by construction; the recording already exists (`_sceneDecisions`,
`_scenePosture`) — though only for seeded/baked stories (`205821`). *Against:* the interpreter is a model
deciding what is *possible*, which is close to inventing plot facts; and the inputs are seed-scoped
today, so it is not universal without new work.

**(c) A declared pre-author source re-derived per issue.** Candidates generated at each issue boundary
from current canon plus the branch already taken. *For:* the only option where flight can *produce*
pursuit candidates rather than merely failing to find them; keeps authorship before prose and outside
the runtime. *Against:* a new generated artifact and a new generation cost per issue, and it needs a
place to live, since the issue layer is currently an immutable slice of the story scaffold.

The trade-off in one line: **(a) cannot answer route B or C, (b) risks a model inventing possibility,
(c) costs a new per-issue artifact.** A hybrid is available — (a) or a seed supplies the initial set and
(c) re-derives after a branch — and is not being recommended here, only noted as a fourth shape the
decision may take.

---

## 5. What becomes of `aPlot`

**None of the three options as posed, applied wholesale.** The verdict must split by field group,
because `aPlot` is not one thing.

- **`milestones` (+ `triggered`, `atScene`, and `_tickAPlot`'s authority over them):** should become
  **nonbinding writer context, or a projection of the real scaffold.** This is the part the audit
  disqualifies. Two bindings must be re-sourced first: `_curMs` scene anchoring (`100421`) and the
  `regimePhase` completion flip, which today is `.some(m => m.kind === 'resolution' && m.triggered)` —
  one scheduled row declaring the story resolved (`66143`).
- **The rest of `aPlot`: keep.** It carries real hard gates and planner inputs nothing else supplies —
  `tier` and `timelineLength` (climax-window math `68164`), `goal` (presence gates the whole directive
  `68138`), `antagonistShape`/`antagonistSubject` (gate whether the antagonist bible generates at all,
  `285932-285934`), `romanceEngine` (`278273`), plus the wound and stake fields feeding other
  generators. Retiring the container would break those.
- **Retire outright: no**, on this evidence.
- **Dead weight to drop whenever it is touched:** `resolutionShape`, `plotShape`, `sourceFlavor` —
  written and never read again (joining `cgScaffold.storyShape` / `worldArc`).

`aPlot` must not become the source of truth for what is true. It may remain the source of *pressure
phrasing* for the writer.

---

## Smallest proposed data flow

Not code. Five steps, one gate, one `none` path.

```
1. DECLARE   generated scaffold layer declares candidate destinations, each with
             preconditions stated against canon atoms.
             story-wide: cross-issue posts + durable constraints
             issue-wide: live pressures + candidate destinations + pacing
                ↓
2. ELIGIBLE  deterministic filter over CURRENT canon + committed ledger + player branch.
             No scene number in the predicate. Yields: available / deferred /
             ineligible(reversible) / impossible(irreversible).
                ↓
3. SELECT    explicit pre-author branch selection — chooses AT MOST ONE candidate
             from the eligible set, BEFORE prose, or NONE.
             Runtime validates: is it declared by a scaffold layer? is it still
             compatible with canon and the player's branch?
             It never invents a candidate and never promotes on a schedule.
                ↓
4. RECORD    selection recorded with its source (which layer declared it, which
             branch and decision it was selected against) — and, only if one was
             selected, the fact committed to canon BEFORE the payload is built.
                ↓
5. BRIEF     Grok receives the already-committed fact as a declarative statement,
             in the compact register the Fate brief already uses. No machinery,
             no ids, no candidate set. It renders; it cannot add or decline.
                ↓
   VERIFY    existing acceptance gate: did the committed fact land, and was no
             canon added? Reject without persisting if not.
```

**`none selected` path** — the normal case, not an error:

```
3'. SELECT NONE   eligible set empty, or nothing is what this scene is about.
                    ↓
4'. RECORD        record the empty/none result WITH its reason and the eligible
                  set as evaluated. Commit nothing. An empty set is evidence, not
                  silence — it is the signal that a branch has no declared
                  candidates and the scaffold needs extending.
                    ↓
5'. BRIEF         scene proceeds on pressures, consequence and relationship
                  material from the scaffold layers. No plot fact is asserted.
                  Nothing is substituted for the missing candidate — specifically,
                  the default destination is never reinstated.
```

Two states this flow must treat as legal terminals, neither an error: **`none selected`** on any scene,
and **`the default destination is no longer possible`** for an entire issue.
