# Two tracks: scene canonicalization (core correctness) · interim Tempt Fate (human review)

Plan only. No code, no provider call, no push. Automatic Tempt Fate extraction and automatic
commitment are **out of scope for both tracks** and stay blocked until Track A is live and the
sidecar's real yield can be measured.

---

# TRACK A — Scene canonicalization

**Framing:** a core-correctness project, justified independently of Tempt Fate. Three competing text
projections, asynchronous mutation after acceptance, and index-based identity already affect
save/resume, the next scene's prior-scene context, and any feature that cites prose.

## A0. The write surface, as it actually exists

Seven writers touch `state.scenes`, across **three distinct scene-creating paths** — this is the real
scope, and it is wider than the CG path the traces examined:

| line | writer | text expression |
|---|---|---|
| 102035 | **literary path** push | `text: body` |
| 237074 | **CG/staged** push | `text: proseAssembled` (labels) |
| 267596 | third push path | `text: _sanitizedBody` |
| 140719 | seeded-first-page push | `pending` |
| 204791 / 204799 | OAS archive `splice` / assign | `text: ''` + `oasArchive` |
| 237444 | **CG re-sync overwrite** | `beats.map(b => b.text)` (no labels) |
| 87221 / 114980 | resets (`= []`) | — |

**Consequence for scope:** the projection-write API must serve **all** creating paths, not only CG.
The literary and third paths do not build from beats at all, so the API needs a **projection kind** —
`beats` (CG, produces a sidecar) and `body` (literary/sanitized, produces a sidecar with a single
`narrator` entry spanning the whole text). Pretending one shape fits both is how a second projection
reappears.

## A1. Scope, in dependency order

| # | change | depends on |
|---|---|---|
| **A1** | Mint the scene UID at the start of each completion path, before the first `await`; carry it on plan, **scene record**, pending ctx, archive entry | — |
| **A2** | Projection-write API: builds `{ text, attributionSidecar }`, hashes, sets `projectionRevision`, writes once. Two kinds (`beats` / `body`). Promote `_sbSpeakerLabel` out of its closure into the `beats` projection with typed identity resolution | A1 |
| **A3** | Route **every** creating path through the API; **delete** the rival projection at 237444 — its scrub becomes a *revision through the API*, not a direct `.text` assignment | A2 |
| **A4** | DOM panels render from the persisted projection; prior-scene-tail and other `.text` consumers read it | A3 |
| **A5** | Revision/hash handling: a rewrite bumps `projectionRevision` and replaces `hash`, **keeps `uid`**, and invalidates dependents | A2 |
| **A6** | Migration of historical records (§A4 below) | A1, A2 |
| **A7** | Dry proofs | all |

**Not in Track A** (named so they are not absorbed): automatic extraction; automatic commitment; the
sidecar's *consumers*; the typed-identity fix for `_sbSpeakerLabel`'s **PC** chain — that one is
Track B's A-adjacent prerequisite and is listed there because Track B needs it first.

## A2. Affected consumers — 66 `state.scenes` references, five classes

1. **Text consumers (must move to the canonical projection).** `100318` (previous-scene text for
   context), `143464`, `150967`, `258772` (by index), `54624`, `231974` (last scene). These are the
   sites that silently changed meaning when 237444 rewrote `.text`; they are the reason this is a
   correctness project.
2. **Count / ordinal consumers (unchanged by text, endangered by the array).** `98630`, `220892`,
   `305574`, `311756`, `255805`, `290346`, `22423` — several compute a scene ordinal as
   `Math.max(state.scenes.length, state.turnCount)`.
3. **Archive consumers (index-based).** `204786`, `204787`, `206185`, and `258772`'s `state.scenes[idx]`.
   These must gain a uid path, with a dual-read window.
4. **DOM / page render.** `14251` (`currentPageIndex`) and the panel renderer — A4's target.
5. **Save/resume serialization.** The scene record gains `uid`, `hash`, `projectionRevision`,
   `attributionSidecar`. Anything that validates or version-checks the saved shape is affected.

## A3. Migration risk

| risk | why | mitigation |
|---|---|---|
| **Sidecar size in saves** | offsets + identity per beat, per scene, for every scene in a story | store the sidecar **beside** the record, lazily loadable, or cap it; it is not needed to render, only to cite |
| **Old saves lack uid/hash** | every pre-migration record | migration assigns `uidProvenance: 'migrated'`, `projectionProvenance: 'historical_unbuilt'`, revision 0; **no re-render** |
| **Index-based archive lookups** | `oasArchive` is found by position today | dual-read (uid first, index fallback) for one release, then drop the fallback behind a proof that nothing resolves by index |
| **`scenes.length` as a scene ordinal** | the archive already splices non-narrative entries into the array, so length already over-counts | **pre-existing and adjacent — flag, do not absorb.** Track A must not change numbering semantics; it must not make them worse either, which means migration assigns uids without reordering |
| **Partial migration** | a story half-migrated across a reload | migrate per-story, idempotently, at load, and mark the story `canonicalizationVersion`; a record without it is treated as historical |
| **The re-sync becoming a revision** | it currently runs after two `await`s; as a revision it bumps the hash | correct behaviour, but it means most scenes will have **revision 1, not 0** — any proof asserting "revision 0" would be wrong |

## A4. Dry-proof plan (no live test, no provider call)

| proof | asserts |
|---|---|
| 1. **API route proof** (AST/source) | no ordinary code path assigns a scene record's `.text` directly; all creating paths call the API; migration uses its declared exception entry point. *Would have caught 237444.* |
| 2. **Three-way byte identity** (real path, stubbed network) | persisted `.text` === DOM render input === any consumer's read, all by uid, all matching `hash` |
| 3. **Offset proof** | for every sidecar entry, `text.slice(start,end)` equals that beat's contribution; every `labelSpan` lies inside its entry |
| 4. **Label-independence proof** | with label emission suppressed, every entry's speaker identity is byte-identical |
| 5. **Source-typing proof** | typing derives from `kind` + validated `speaker`, never `beat.dialogue`; a `kind:'dialogue'` beat with an unresolved speaker stays `sourceType:'speaker'`, not narration |
| 6. **Revision proof** | a rewrite bumps `projectionRevision`, replaces `hash`, **keeps `uid`**, and invalidates dependents |
| 7. **Uid stability across splice** | after an OAS archive splice, every record still resolves to itself; nothing resolves by index |
| 8. **Both projection kinds** | the `body` kind produces a whole-text `narrator` sidecar and satisfies proofs 2–4 |
| 9. **Migration proof** | a historical record migrates to uid + frozen text + `attributionAvailable:false`, is **byte-unchanged**, and re-running migration is a no-op |
| 10. **Consumer-parity proof** | each class-1 text consumer reads the same string before and after the change for an unrevised scene — the regression guard for A4 |

Proof 1 and proof 10 are the two that matter most: the first prevents a second projection reappearing,
the second prevents the migration from silently changing what existing consumers see.

## A5. Estimate

**Larger of the two tracks, and the one with real regression surface.**

- A1 + A2: the projection API and uid minting — contained, one focused pass, but A2 carries the typed
  identity resolution and both projection kinds.
- A3: touching **three creating paths** plus deleting 237444's rival projection. This is where the risk
  is, because the literary and third paths were never examined by the traces.
- A4: ~6 text consumers plus the panel renderer.
- A6: migration, idempotent, per-story.
- A7: 10 dry proofs, of which 2, 9 and 10 need the real path with a stubbed network.

**Sequencing gate:** A3 should not land until proof 1 and proof 10 exist, because they are what make the
change safe to make at all. Expect the literary/third-path work to need its own trace first — **the
present traces covered only the CG path**, so A3's true cost is not yet measured. Treat any estimate for
A3 as provisional until that trace is done.

---

# TRACK B — Interim Tempt Fate, human review by default

**Framing:** no automation of semantic judgment. Tempt outcomes are resolved by a person; the system's
job is to preserve the invocation honestly and stop planners inventing consequences.

**Independent of Track A.** Nothing in Track B reads the sidecar or requires a canonical projection: the
blocked-invocation record's evidence is the wish text, which already exists in whatever text the record
has. Track B can ship first.

## B1. Scope, in dependency order

| # | change | depends on |
|---|---|---|
| **B1** | **Typed invoker identity**: resolve the PC through `_resolvePcIdentity` at capture. Fix `_sbSpeakerLabel`'s private PC chain (picks-first, `'I'` fallback, no placeholder filter) to read the resolver. LI keeps its own anchor authority; do **not** route it through the PC resolver | — |
| **B2** | **Non-blocking unresolved-invoker status**: `extractor_blocked: 'invoker_unresolved'`, terminal-for-automation. No throw escaping capture, no revert, no interruption | B1 |
| **B3** | **Immutable blocked-invocation record**: `invocationId` + separable `evidence` block; append-only; no status field written back | B2 |
| **B4** | **Lifecycle exclusions**: excluded from `_tfoResumePending`, `_tfoUnresolvedPending`, and `_tfoContinuationBlocked` | B3 |
| **B5** | **Downstream uncertainty directive**: the four points, wish-scoped, firing only while the invocation is current | B3 |
| **B6** | **Human resolution / dismissal**: append-only, referencing `invocationId`; original scene untouched | B3 |
| **B7** | **Human review by default**: route Tempt outcomes to review rather than to extraction | B3–B6 |
| **B8** | Dry proofs | all |

**Deferred to post-Track-A:** the evidence re-check on revision (needs `projectionRevision`, which Track
A introduces). Until then a blocked-invocation record records the text it saw and is not re-checked —
acceptable because nothing revises scene text through an API yet, and the record asserts only that an
invocation occurred.

## B2. Affected consumers

1. **The pending lifecycle**: `_tfoWritePending`, `_tfoResumePending`, `_tfoUnresolvedPending`,
   `_tfoContinuationBlocked`, `_tfoPendingKey`.
2. **`_tfoBuildExtractionContext`**: gains the typed invoker resolution and the blocked status; stops
   silently recording `invokerName: ''`.
3. **Planner and author payload builders**: one new directive block (B5). The existing durable-consequence
   renderer is the precedent — including its lesson that a caveat placed in a block that does not always
   render never fires.
4. **`_sbSpeakerLabel`** (B1) — a **render-visible change**: a PC label could change from `I:` to the
   resolved name, or from a placeholder to a real name. This is the one user-visible edit in Track B.
5. **Review surface** (B7): wherever the queue is presented.

## B3. Migration risk

| risk | mitigation |
|---|---|
| **Existing pending records** whose prose came from `_extractCGSceneText` cite a text that is no version of their scene record | **invalidate, not migrate** — `invalidated: 'pre_canonicalization_provenance'`; they become review items |
| **A stalled story** if `extractor_blocked` is mistaken for an ordinary pending | proof that `_tfoContinuationBlocked` ignores it — this is the failure that would be worst in production |
| **`_sbSpeakerLabel` change alters rendered text** for scenes generated after the fix, while earlier scenes in the same story keep the old label | accept and state it; it is a correctness fix, and labels are not canon claims. Do **not** retro-edit earlier scenes |
| **Directive over-breadth** freezing ordinary scenes | proof that the directive forbids derivation *from the wish* and does not forbid independently motivated action — the specific over-broad wording already withdrawn twice in this workstream |

## B4. Dry-proof plan

| proof | asserts |
|---|---|
| 1. **Typed resolution** | `'protagonist'` → `_resolvePcIdentity`; `'li'` → the LI anchor; a named NPC → cast-validated; unvalidated → `unresolved`. Each route recorded |
| 2. **No private PC chain** (source) | no PC-name chain outside the resolver. Explicitly does **not** assert this of the LI |
| 3. **Scene survives** | an unresolved invoker leaves the accepted scene byte-identical, still persisted, with no throw escaping the capture and no revert |
| 4. **Continuation proceeds** | with an `extractor_blocked` record present, the next continuation is **not** gated |
| 5. **No retry** | `_tfoResumePending` does not pick it up; no provider request is attempted |
| 6. **Immutability** | the record is never edited; status is derived from appended entries; two appends against one `invocationId` are distinguishable |
| 7. **Two invocations, one scene** | two records in one scene get distinct `invocationId`s and are independently resolvable — the case `sceneUid` alone could not express |
| 8. **Directive content** | the real planner and author requests carry all four points, wish-scoped, and fire only while current — not once resolved, dismissed or superseded |
| 9. **Directive does not freeze** | a later scene establishing an effect on its own evidence commits as a **new observation** with its own provenance, and does **not** resolve the invocation |
| 10. **No commitment** | no durable outcome commits automatically while a blocked record stands; a human resolution against `invocationId` does commit, with `human_review` provenance |

Proof 4 and proof 9 are the ones that protect the reader's experience; proof 10 is the one that keeps
automation honest.

## B5. Estimate

**Substantially smaller than Track A, and lower-risk.** It adds records and a directive rather than
changing how text is produced; its only render-visible edit is B1's label fix. Roughly: B1 contained,
B2–B6 one connected pass over the pending lifecycle plus one directive block, B7 a surface, B8 ten dry
proofs of the kind this workstream already builds routinely.

**Track B is the one to start.** It is cheaper, independent, ships the honesty guarantee immediately, and
does not need Track A's traces to be finished.

---

# What stays blocked

Automatic Tempt Fate extraction and automatic canon commitment remain disabled through both tracks. They
are reconsidered only after Track A is live and the sidecar's **measured** yield on real new scenes is
known — not its projected yield. The current measurement, 1 committable claim across 3 retained accepted
scenes with speech at 0/6, is a **pre-canonicalization** number and must not be quoted as the
post-canonicalization one.

## Open question this plan does not answer

**Track A3's true cost is unmeasured.** The traces covered the CG path only; the literary path (102035)
and the third push path (267596) have not been examined, and they are two of the three creating paths the
API must serve. A read-only trace of those two is the cheapest next step for Track A, and it is a
prerequisite for any A3 estimate worth relying on.
