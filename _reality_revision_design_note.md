# Reality revision — the boundary a Tempt rewind runs inside

> **DESIGN NOTE ONLY.** No code, no provider calls, no automatic commitment, nothing pushed. This note exists
> so that "the ceremony plays again" has a defined meaning before any outcome is authored that needs one.

---

# 0. Decisions recorded (Roman, 2026-09-28)

### D1 — Lirael has no default Tempt exemption

If she belongs to the named population, she receives the literal effect. **Exact named membership outranks
protagonist privilege.** The reader may retain dramatic knowledge of the prior timeline; Lirael may not.

*Supersedes* the `invoker anchor default` as an automatic exemption. An invoker is exempt only when the
authored outcome names her as exempt.

### D2 — The interiority boundary does not bind literal rupture effects

It constrains **ordinary** consequences. A Tempt rupture **may** alter memory, attachment, reputation and
other interior states **when that is the literal authored grant** — naming target, proposition and effect.
It may **not** widen any of the three by implication: not a different mind, not a broader population, not a
stronger proposition than the wish grants.

### D3 — `evidence_of_innocence` is a world-fact outcome only

It establishes that something is **on the record**. It asserts **nobody believes it, forgives her, or acts
on it.** Belief, forgiveness and action are separate consequences requiring their own authored grants.

---

# 1. The three channels, which must never be collapsed

Every failure mode in a rewind design comes from treating these as one thing. They are three.

| channel | holds | who reads it | mutable? |
|---|---|---|---|
| **RECORD** | what was witnessed — scene text, `sceneUid`, hash, seal order | the reader, the archive | **never** |
| **CANON** | what governs future authoring | planners, payload builders | **append-only**; governance derived |
| **MEMORY** | what each named party knows | authored outcomes, per party | **append-only**, explicit per party |

**The reader lives in RECORD. The planner lives in CANON. The characters live in MEMORY.** A rewind moves
CANON and MEMORY. It never touches RECORD.

This is what lets the user's requirement hold without contradiction: *"the reader can retain the witnessed
prior timeline"* while *"future planners read the active revised canon"* while *"protagonist memory is an
explicit outcome field."* Three channels, three answers, no conflict.

---

# 2. Old scenes are immutable historical records

**Nothing a revision does may edit or delete a scene record, its text, its `sceneUid`, or its hash.**

This is not a new principle; it is the one Track A already enforces. The canonical projection is persisted
per scene with `_sbTextHash` and read back through `_sbSceneTextByUid` **with drift detection**. A design
that edits historical prose would trip that detector, and correctly so.

**Testable invariant, for the control this note anticipates:**

> After any reality revision, `_sbTextHash` for every pre-existing scene is **bit-identical** to its value
> before the revision, and no `sceneUid` has been removed from `state.scenes`.

If a future implementation cannot satisfy that, it is not implementing this note.

**What the reader sees.** A revised scene stays in the archive, readable, marked. The OAS archive already
carries per-intervention bubble markers (`_OAS_ARCHIVE_BUBBLE_TEMPT_SVG`, *"Tempt Fate took effect here"*) —
a revision marker is the same affordance, saying *this was witnessed and no longer governs*. The reader keeps
the drama of having seen it. That is the point of a rewind: **the reader must remember what the world forgot**,
or nothing was at stake.

---

# 3. A revision is an appended record, never an edit

## 3a. Shape

A Tempt rewind appends **one** reality-revision record to an append-only log — the same shape as Track B's
resolution log, where status is *derived* from appended entries rather than stored and mutated.

| field | meaning |
|---|---|
| `revId` | monotonic id, stable forever |
| `seq` | position in the shared `_fateInvocationSeq` — **seal order, not commit order** |
| `sourceInvocationId` | the accepted Tempt invocation that caused it |
| `witnessedSceneUid` | the scene whose events this revision acts on — a **pointer**, never a target for edit |
| `ceases` | explicit list of **declared fact refs** that stop governing future canon |
| `establishes` | explicit list of facts that begin governing |
| `memoryEffects` | explicit `{ party, proposition, effect }` triples — see §5 |
| `readerDisclosure` | what the archive shows the reader about this revision |

## 3b. What may be named in `ceases`

**Only declared facts.** Committed event ids (`inquiry_opened`), seed propositions (`twist_manifested`,
`interrogation_interrupted`), aftermath truths, arc-constraint states. **Never prose, never mood, never "the
scene".**

This is the bound that keeps a rewind from becoming an unbounded rewrite. *"The ceremony plays again"* is not
a licence to un-write a scene; it is a licence to cease **specific named facts** the scene established, and
to establish specific named ones in their place.

If an authored rewind outcome cannot express its effect as a list of declared fact refs, **the outcome is not
authorable** and must be redesigned or the fact must first be declared. That is a feature: it forces the
dramatic claim to be mechanically checkable.

## 3c. What a revision may never do

1. Edit or delete any scene record, text, uid or hash.
2. Cease a fact it does not name explicitly.
3. Cease a fact whose `seq` is **later** than its own — no forward reach.
4. Reach any party outside its declared `memoryEffects` roster.
5. Silently restore a ceased fact — restoration requires a **new** revision that `establishes` it.
6. Alter another revision. Revisions are as immutable as scenes.

---

# 4. Active canon is derived, never stored

**Never store "current truth" as a mutable blob.** Fold it:

> `activeCanon()` = base declared facts, with every revision applied in ascending `seq` order,
> each removing its `ceases` and adding its `establishes`.

The **active world revision** is the highest-`seq` entry in the log.

Why derived rather than stored: it is the same argument that made Track B's derived status correct, and the
same argument that made the scene projection correct. A stored current-truth blob is a second source of
truth, and it will drift from the log the first time an operation half-completes.

**Planners and payload builders read `activeCanon()`, never raw history.** Every builder that currently reads
committed facts directly is a wiring point for this — `_pcCommittedFoundationForPrompt` and its siblings.
Named here so the work is visible; **not done, and not to be done until the outcomes are authored.**

---

# 5. Protagonist memory is an explicit field

**Never inferred from being the player.** `memoryEffects` carries explicit triples:

```
{ party: 'pc:lirael', proposition: 'twist_manifested', effect: 'forgotten' }
```

## How a named population reconciles with an explicit roster

This is where D1 becomes mechanical. An outcome may *declare* a population (`the_assembly`), but **the
population is expanded to an explicit party roster before the record is sealed.** The sealed record names
`pc:lirael`, `named:seren`, `named:julian`, `role:…presiding_dohkar` individually.

So both requirements hold at once, with no exception carved anywhere:

- **explicit** — the record literally names every affected party; nothing is implied at read time;
- **no protagonist privilege** — Lirael appears in that roster because she was in the assembly, and the
  expansion has no filter that could drop her.

**The expansion must have no exemption filter at all.** That is the mechanical form of D1: not "exempt the
invoker unless X", but *no invoker rule in the expansion path*. A default with an override would reintroduce
the privilege the decision removes.

An outcome that means to exempt her must **name her exempt** in its authored text, and that exemption is then
visible in the record like any other authored fact.

---

# 6. The Tempt seal is not reopened

**The once-per-scene seal stays tied to the original accepted scene.** A reality revision does not release it.

Mechanically, in the guard as built: `_temptGuardScopeKey` derives from the latest **accepted prose scene**
uid. A revision is **not an accepted prose scene** and does not become one, so the scope key does not move and
the seal holds.

## The loop this closes

A rewind that re-plays the ceremony **will** produce new prose, and that new prose **will** be a new scene
record. Left alone, that new scene would present a fresh scope key and hand the player another Tempt — and
since that Tempt could rewind again, **Tempt would become unbounded through recursion.** The once-per-scene
decision would be void.

**Rule:** a scene that exists *because of* a revision carries `originScopeKey` = the scope key of the sealed
scene that caused it, and the guard resolves scope through `originScopeKey` when present. **The re-played
ceremony inherits the seal.** Rewinding does not buy another Tempt.

The revision still takes its own `_fateInvocationSeq` entry, so ordering across all Fate interventions stays
total and seal order continues to decide canon — latency never does.

---

# 7. Citing the active revision without mutating anything

**Every record appended after a revision carries the active `revId` it was authored under.**

| | |
|---|---|
| a new scene projection | `worldRevision: <revId>` at persist time |
| a consequence / `therefore` record | `worldRevision: <revId>` |
| a revision itself | its own `seq`, plus the `revId` it supersedes |

**Records are never rewritten to point at a later revision.** A scene authored under `rev:3` says `rev:3`
forever, even at `rev:7`. That is what makes the history reconstructible: *"what was true when this was
written"* is answerable by reading the record, with no replay and no guesswork.

The shape is deliberately the one version control already proved: **a revert is a new commit, not an edited
one.** History accumulates; nothing is rewritten; the tip is derived.

---

# 8. Worked example — *"I wish this had never happened to me"*

Illustrative, **not an authored outcome**. Shown only to prove the shape can carry a rewind.

| | |
|---|---|
| **RECORD** | the ceremony scene stays exactly as written, hash unchanged, readable in the archive, marked as revised |
| **appended** | `rev:1` — `ceases: ['interrogation_interrupted']` · `establishes: ['interrogation_never_occurred']` · `witnessedSceneUid: <ceremony uid>` |
| **CANON** | planners from now on author a world where Julian never questioned her before the assembly |
| **MEMORY** | explicit roster — every party present, **Lirael included**, per D1 |
| **READER** | still remembers the interrogation, and is the only one who does |
| **SEAL** | unchanged; the re-played ceremony inherits `originScopeKey` and grants no second Tempt |
| **next scene** | persists with `worldRevision: 'rev:1'` |

**The reader is the only witness left.** That is the dramatic engine of a rewind, and this structure is what
makes it true rather than merely claimed.

---

# 9. Bounds of this note

**In scope and settled:** immutability of records; revision as append; what may be named; derived active
canon; explicit memory with no invoker filter; the seal and the recursion it closes; forward citation.

**Deliberately not decided here:**

- **Which** rewind outcomes exist, what they cease, and what they cost. That is the re-draft, and it waits on
  approval of this boundary.
- Archive presentation of a revised scene beyond "it is marked".
- Whether a revision may cease a fact from an earlier **Issue**.
- Migration of scenes persisted before revisions exist. (Expected: absent `worldRevision` reads as `rev:0`,
  the base. Stated as expectation, not decision.)

**Not started, per instruction:** re-drafting the thirteen outcomes at corrected dramatic amplitude and
re-ranking their complete packages. That begins once this boundary is approved.
