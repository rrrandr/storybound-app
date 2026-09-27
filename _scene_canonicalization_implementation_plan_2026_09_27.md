# Two tracks: `state.scenes` canonicalization (core correctness) · interim Tempt Fate (human review)

Plan only. No code, no provider call, no push. Automatic Tempt Fate extraction and automatic
commitment are **out of scope for both tracks** and stay blocked until Track A is live and the
sidecar's real yield can be measured.

---

# TRACK A — `state.scenes` canonicalization (+ the formatStory split)

**The name matters and is deliberately narrow (Roman 2026-09-27).** This is **not** whole-app scene
canonicalization. It covers the `state.scenes` substrate and the `formatStory` text/presentation split.
**Literary continuations are OUT OF SCOPE and remain NON-CITABLE** until they have durable scene records
of their own — a separate storage project. Calling this "scene canonicalization" would promise a guarantee
the track does not deliver for every scene in the app.

**Framing:** a core-correctness project, justified independently of Tempt Fate. Three competing text
projections, asynchronous mutation after acceptance, and index-based identity already affect save/resume,
the next scene's prior-scene context, and any feature that cites prose — for the scenes that live in
`state.scenes`. Scenes that do not live there are not made citable by this track.

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

## A0b. Read-only trace of the other two creation paths (done 2026-09-27)

**Both non-CG creating paths are literary Scene-1 mounts**, not general writers:
`_mountAndTransition` (`:102028`, `text: body`) and the Scene-1 completion block at `:267596`
(`text: _sanitizedBody`). Structurally they are siblings.

**What makes them simpler than CG:**
- A single pre-authored prose **string**. No beats, no `kind`, no `speaker` — so the `body` projection
  with one whole-text `narrator` sidecar entry fits exactly, with no typed identity work at all.
- **Neither rewrites the record after acceptance.** The only `.text` assignment on a scene record
  anywhere in the file is `:237444` (CG). The literary record is written once.
- No `await` between their push and any mutation of the record.

**What makes them harder, and is new information:**

1. **They have their own reader/record divergence, by a different mechanism.** The DOM receives
   `formatStory(body)`; the record receives `body`. `formatStory` (`:322480`) is **not presentational** —
   it **strips `[LORE:…]` tags** from the text and, under the sacred-figure guard, **replaces the entire
   text** with a refusal notice. Its own comment calls it *"the single pre-display chokepoint for ALL
   scene prose"* (14 call sites). So reader text ≠ record text here too: the record keeps a `[LORE:]` tag
   the reader never saw.
   **Consequence for A2/A4:** `formatStory`'s *text* transformations must move **into** the projection,
   leaving `formatStory` purely presentational. Otherwise "the DOM renders from the persisted projection"
   is satisfied in form and violated in content.

2. **Literary CONTINUATIONS never write `state.scenes` at all.** The write surface is exhaustive — nine
   sites — and none of them is a literary continuation. For a literary story, `state.scenes` holds
   **Scene 1 only** (plus OAS archives). The de facto continuation prose record is the **paginated DOM**,
   read back through `StoryPagination.getAllContent()` and **de-tagged by regex**
   (`.replace(/<[^>]*>/g,' ')`) in at least four context builders (`:59865`, `:71167`, `:71460`,
   `:71702`).

**Therefore Track A has TWO storage substrates, not one:**

| substrate | holds | citable today |
|---|---|---|
| `state.scenes` | CG scenes; literary **Scene 1**; OAS archives | after A1–A5 |
| **paginated DOM** | **every literary continuation** | no — text is recovered by stripping HTML from a rendered accumulator |

A citation system over the second substrate would need offsets into a regex-de-tagged reconstruction,
which is the reconstruction problem again in a new place.

**Revised A3 assessment.** A3 is **larger than the original plan assumed**, and the growth is not in the
two Scene-1 mounts — those are cheap, and the `body` projection covers them. The growth is:
- moving `formatStory`'s text transformations into the projection (touches all 14 call sites' assumptions,
  including the CG path if its prose also passes through), and
- deciding whether literary continuations get real scene records at all.

**Recommendation: split the second item out.** Giving literary continuations durable, projected records is
plausibly its own project, and bundling it would make Track A open-ended. Track A should scope to the
`state.scenes` substrate plus the `formatStory` split, and **explicitly declare literary continuations
out of scope and not citable** — the same honesty the migration plan applies to historical records.

**A3 estimate, now grounded:** the two Scene-1 mounts are small; the `formatStory` split is the real
work and needs its own consumer audit of 14 call sites; literary continuations are deferred as separate
scope. A3 is no longer unmeasured, but it is no longer one change either.

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
change safe to make at all. The literary/third-path trace is **now done** (A0b): the two Scene-1 mounts are
cheap, but A3 absorbs the `formatStory` text/presentation split, and literary continuations are recommended
as **separate scope** rather than part of this track.

---

# TRACK B — Interim Tempt Fate, human review by default

**Framing:** no automation of semantic judgment. Tempt outcomes are resolved by a person; the system's job
is to record the invocation honestly and stop planners inventing consequences.

**Independent of Track A. Track B ships first.**

## B0. Four boundary corrections (Roman, 2026-09-27)

1. **The record is created for EVERY accepted active invocation** while automatic outcome commitment is
   disabled — **not only when invoker resolution fails.** The earlier plan made the record a consequence of
   an invoker defect; that was wrong. Automation is off for *all* Tempt outcomes right now, so *every*
   accepted invocation has an unresolved outcome and every one needs the record. An unresolved invoker is
   one **attribute** of a record that would exist anyway.
2. **Before Track A, the record cannot claim the wish text remains current reader-visible canon.** Current
   code still rewrites scene text directly (`:237444`), and there is no projection revision to re-check
   against. So the record describes **an accepted invocation attempt with an unresolved outcome** — a fact
   about what the reader did, not a claim about what the canonical text still contains. Track A later adds
   evidence re-anchoring and supersession; until then no such claim is made, and none is implied.
3. **Downstream receives only the safe uncertainty rule.** Not the earlier four-point directive, whose first
   point asserted current reader-visible canon that Track B cannot guarantee.
4. **No `_sbSpeakerLabel` change in Track B.** `_resolvePcIdentity` is used **only** for the record's
   invoker field. Visible render-label normalization (`I:` → resolved name) belongs with Track A's identity
   and projection work, where a label change is part of a projection change rather than a stray visible
   edit in a records-only release.

## B1. Scope, in dependency order

| # | change | depends on |
|---|---|---|
| **B1** | **Invoker field resolution only**: resolve the PC through `_resolvePcIdentity` for the record's invoker field. No render change; `_sbSpeakerLabel` untouched. LI keeps its own anchor authority and is not routed through the PC resolver | — |
| **B2** | **Unconditional invocation record**: for every accepted active invocation, while automatic commitment is disabled. Immutable, append-only, identified by `invocationId`, with an `evidence` block recording the wish text **as observed at capture** and explicitly **not** asserted to be current canon | B1 |
| **B3** | **Invoker-unresolved as an attribute**: `invokerUnresolved: true` plus a review flag on the record. Never a reason to omit the record, and never a reason to stall | B2 |
| **B4** | **Lifecycle exclusions**: excluded from `_tfoResumePending`, `_tfoUnresolvedPending` and `_tfoContinuationBlocked`. No retry, no gate | B2 |
| **B5** | **Downstream uncertainty directive** — the safe rule only (B6 below) | B2 |
| **B6** | **Human resolution / dismissal**: append-only, referencing `invocationId`; original scene untouched | B2 |
| **B7** | **Human review by default**: Tempt outcomes route to review, not to extraction | B2–B6 |
| **B8** | Dry proofs | all |

**Deferred to Track A:** evidence re-anchoring, `superseded_or_inapplicable`, and any claim tied to
`projectionRevision` — all three need a stable canonical projection that does not exist yet.

## B2. What the record says, and what it must not say

**Says:** an active Tempt Fate invocation was **accepted** at this scene; here is the wish text **as
observed at capture**; automatic outcome commitment is disabled, so **no durable outcome was committed**;
here is whether the invoker resolved.

**Must not say:** that this wish text is still present in the current canonical scene text. Nothing in
Track B can support that, because scene text is still rewritten directly and there is no revision or hash
to re-check. The `evidence` block is therefore labelled **`observedAtCapture`**, not `currentCanon`, and
downstream must not read it as a citation.

## B3. The downstream directive — the safe rule only

Reduced from four points to what Track B can actually support:

1. **An invocation was accepted** at the named scene (with its wish text, marked as observed at capture).
2. **No durable outcome was committed.**
3. **Do not derive that the effect landed or that it failed.** Both readings refused.
4. **Do not derive memory, possession, history, relationship, exemption or scope *from this wish*.**

The wish-scoped narrowing from the design note is retained in full: the directive forbids derivation **from
the wish**, and does **not** forbid independently motivated present action or newly observed evidence. A
later scene may establish an effect on its own terms; that commits as a **new observation** with its own
provenance and does **not** resolve the invocation.

Dropped from the earlier version: any assertion that the invocation "remains reader-visible canon". Track A
restores that once a projection can back it.

## B4. Affected consumers

1. **The pending lifecycle**: `_tfoWritePending`, `_tfoResumePending`, `_tfoUnresolvedPending`,
   `_tfoContinuationBlocked`, `_tfoPendingKey`.
2. **`_tfoBuildExtractionContext`**: gains typed invoker resolution for the record's field; stops silently
   recording `invokerName: ''`. It no longer needs to supply prose for extraction, since extraction is off.
3. **Planner and author payload builders**: one new directive block (B3). The durable-consequence renderer
   is the precedent — including its lesson that a caveat placed in a block that does not always render never
   fires.
4. **Review surface** (B7).
5. **No render-visible change.** With `_sbSpeakerLabel` out of scope, Track B changes no displayed text.

## B5. Migration risk

| risk | mitigation |
|---|---|
| **Existing pending records** cite prose from `_extractCGSceneText`, which is no version of their scene record | **invalidate, not migrate** — `invalidated: 'pre_canonicalization_provenance'` — and create an invocation record for each, so no accepted invocation is lost in the conversion |
| **A stalled story** if the record is mistaken for an ordinary pending | proof 4: `_tfoContinuationBlocked` ignores it. This is the worst production failure available here |
| **Directive over-breadth** freezing ordinary scenes | proof 9: the directive forbids derivation *from the wish* only. The specific over-broad wording has already been withdrawn twice in this workstream |
| **Over-claiming provenance** — a reader of the record treating `observedAtCapture` as a citation | label it in the data, not only in prose, and prove no downstream builder presents it as current canon |
| **Record volume** — now one per invocation rather than per defect | expected and correct; they are small and append-only |

## B6. Dry-proof plan

| proof | asserts |
|---|---|
| 1. **Unconditional creation** | an accepted invocation with a **fully resolved** invoker still produces a record while automatic commitment is disabled — the case the earlier plan would have missed |
| 2. **Invoker attribute** | an unresolved invoker sets the flag and the review marker, and does **not** suppress the record or change its other fields |
| 3. **Invoker resolution route** | the record's invoker comes from `_resolvePcIdentity`; the LI is **not** routed through it; `_sbSpeakerLabel` is **unmodified** (source assertion) |
| 4. **Continuation proceeds** | with records present, the next continuation is not gated |
| 5. **No retry** | `_tfoResumePending` does not pick them up; **zero provider requests** |
| 6. **Scene untouched** | the accepted scene is byte-identical, still persisted, no throw escaping capture, no revert |
| 7. **Immutability** | never edited; status derived from appended entries; two appends against one `invocationId` remain distinguishable |
| 8. **Two invocations, one scene** | distinct `invocationId`s, independently resolvable |
| 9. **Directive content and scope** | the real planner/author requests carry the four safe points, wish-scoped; **no** claim of current reader-visible canon; fires only while unresolved |
| 10. **Directive does not freeze** | a later scene establishing an effect on its own evidence commits as a new observation and does **not** resolve the invocation |
| 11. **No commitment** | nothing commits automatically while a record stands; a human resolution against `invocationId` commits with `human_review` provenance |
| 12. **Conversion** | each existing pending record is invalidated **and** yields an invocation record — nothing is dropped in the migration |

## B6b. The stated limit of the fail-safe

A failed invocation-record write leaves a durable marker on two carriers
(`state._temptFateInvocationFailsafe`, part of the state snapshot; and a field on the accepted scene
record). **Two carriers reduce the probability of loss; they do not eliminate it.**

**If both writes fail, Track B cannot guarantee downstream containment for that invocation.** The scene
stays accepted and nothing is committed, but the invocation is genuinely lost to downstream canon — no
directive will carry it. The system **detects and logs a system-level persistence failure** and nothing
more. A state object that cannot accept a plain property is not a Tempt Fate problem.

So the guarantee is bounded, and should be stated in those terms: **Track B covers every accepted
invocation whose scene state is still writable** — not every invocation under all failures.

Proven: `_tempt_fate_trackb_failsafe_proof.mjs` (41/41) covers the single-failure path end to end, with
the fault injected at a dependency rather than through a test hook. The both-carriers-fail path is
**implemented and logged but not proof-covered**; it is a detection path, not a containment one.

## B7. Estimate — NOT to be built automatically

**B7 (the review surface) is a separate product decision and is deliberately not built.** The interim
system already has the safety behaviour: records are created, uncertainty propagates, continuation
proceeds, nothing commits automatically, and resolution/dismissal work through the append-only API. A UI
is how a person reaches that, not whether the guarantee holds.

## B7-estimate (if it is ever commissioned)



Smaller and lower-risk than Track A, and now smaller than the previous version of this plan: with
`_sbSpeakerLabel` removed it makes **no render-visible change**, and with the record unconditional it has
**one** creation path instead of a conditional one. Roughly: B1 contained; B2–B6 one connected pass over the
pending lifecycle plus one directive block; B7 a surface; B8 twelve dry proofs of a kind this workstream
builds routinely.

**Start here.**

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
