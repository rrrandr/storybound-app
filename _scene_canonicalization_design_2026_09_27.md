# Scene canonicalization — revised implementation design + historical migration

Design only. No code, no provider call, no push, no new live test.

## Reframing

**This is not an extractor defect. It is a scene canonicalization problem.** Three competing text
projections, asynchronous mutation after acceptance, and index-based identity make *any* citation system
unreliable — the extractor is merely the first consumer to depend on citations and therefore the first to
expose it.

**Status: extraction is BLOCKED BY SCENE CANONICALIZATION.** Automatic canon commitment stays disabled.
No paid replay.

## The canonical decision (Roman)

**The final persisted scene record is canonical, and the DOM is rendered from that same projection.** If
the DOM differs, that is a **rendering bug to fix** — never a reason to give the extractor its own text
source. `_extractCGSceneText` ceases to be an evidence source; a second projection is the defect, not a
workaround for it.

---

# The five changes

## 1. Mint the scene UID before any asynchronous work

**Current state, traced:** `plan.__sceneUid` is first assigned at `:237358` — **after** the scene push
(`:237074`), **after** the extraction context is frozen (`:237086`), and **after** both `await`s
(`:237342`, `:237355`). So the pending record is built with a **null** uid and falls back to `sceneIdx` in
`_tfoPendingKey`. Index identity is not a design choice today; it is a consequence of minting too late.

**Required:**
- Mint the uid at the **start** of the scene's completion path, before the first `await` and before any
  mutation — it must exist before anything can be reordered around it.
- Carry it on **four** records, not one: the plan, **the persisted scene record**, the pending extraction
  context, and the archive entry.
- **Archival movement:** the OAS archive currently `splice`s at `state.turnCount` (`:204791`), shifting
  every later index. With a uid on the scene record, movement becomes harmless: nothing resolves a scene
  by position. This is the specific reason the uid must reach the scene record and not only the plan.
- **Reload:** the uid is part of the persisted record, so resume rebinds by uid. Nothing re-derives it.

## 2. One atomic projection, after the final scrub, returning text *and* sidecar together

A single named function — the only producer of a scene's canonical text — called **once**, after the last
mutator (today: after the re-sync at `:237444`), returning:

```
{ text, attributionSidecar }
```

**Why together and not in two passes:** offsets are only valid against the exact string they were computed
from. Computing them in a second pass means re-deriving positions, which is the string-guessing this
design exists to remove. The trace measured the projection as a sequential map-and-join over beats —
18/18 beats mapping to exactly one `[start, end)` with no ambiguity — so offsets accumulate naturally *as
the text is built*, and only there.

**Source typing reads the same beat fields the projection reads — `kind`, `text`, validated `speaker` —
and never `beat.dialogue`.** This is not a detail; `beat.dialogue` is the field whose emptiness caused the
present loss of labels (6/6 validated identities dropped), because `_extractCGSceneText` gated its label
branch on it while the author populates `kind: 'dialogue'` with the speech in `text`. Deriving the sidecar
from the same fields as the projection makes typing and text **incapable of disagreeing**:

- `sourceType = 'speaker'` iff `kind === 'dialogue'` **and** the speaker resolves (§6); otherwise
  `'narrator'`.
- the span's content comes from `text`, the same string the projection concatenated.
- a `kind === 'dialogue'` beat whose speaker does **not** resolve is `sourceType: 'speaker'` with
  `speaker: unresolved` — **not** silently reclassified as narration. Its quoted line must not become
  admissible narrator evidence by losing its attribution.

Note that `validateCGSpeakerDisplayNames` deliberately accepts either shape (`b.dialogue || b.kind ===
'dialogue'`) because it is called from several callers. That tolerance is right for a validator and wrong
for the sidecar: the sidecar must read exactly what the projection read, or offsets and typing can drift
apart.

**The sidecar must not depend on visible labels.** Each entry carries `[start, end)` into the final text,
`sourceType`, the **validated beat speaker identity** resolved through the **typed** authority for that
speaker's role (§6) — recording which authority resolved it — and `labelSpan` recorded **as actually
emitted** by the projection — not detected in the text afterwards. A renderer that stops printing `NAME:` prefixes must not
change attribution by one byte. The trace confirmed why: label presence is conditional (the double-label
guard suppresses it), and label *length* varies with the resolved name, so nothing about attribution can
be recovered from the text.

**What the current inline closure must become:** `_sbSpeakerLabel` (`:237061`) is a function-local closure
inside `_completeStagedSceneFromScreenplay`. It is promoted into the projection. The re-sync's own
label-less `beats.map(b => b.text).join('\n\n')` is deleted — not kept alongside. Two projections is the
bug.

## 3. Persist the projection and its hash once; render the DOM from it

- Persist `{ uid, text, attributionSidecar, hash }` on the scene record, in **one** write.
- **The DOM panels render from the persisted projection**, so there is exactly one text in the system.
- **Extraction context is built from the uid, text and sidecar only** — after this write, never from a
  plan. `_tfoBuildExtractionContext`'s `prose` argument stops being a caller-supplied reconstruction and
  becomes a read of the persisted record by uid.
- `hash` covers the text; the sidecar is bound to that hash and is invalid without it.

## 4. Remove the pre-re-sync microtask from the extraction lifecycle

**Current state, traced:** extraction is queued at `:237095` as `Promise.resolve().then(...)`, which runs
at the first `await` (`:237342`) — i.e. **before** the re-sync at `:237444`. Extraction therefore begins
against text that is still going to change, and its network call is in flight across the rewrite. There is
no ordering guarantee in either direction.

**Required:**
- **Delete that queue point.** Extraction is triggered from **after** the single persist in §3, from the
  same place, in order. Not earlier and not speculatively.
- **A rewrite creates a new projection REVISION and hash. It does NOT create a new scene identity.** The
  uid is the scene; the revision is the text. So a rewrite bumps `projectionRevision` and replaces `hash`
  while `uid` stays exactly as minted — reload, archival movement and every cross-reference keep resolving.
  Conflating the two would make every scrub look like a new scene.
- **A rewrite invalidates an older pending extraction.** A pending record carries the `uid` *and* the
  `hash`/`revision` it was built against; when the record at that uid no longer matches, the pending
  extraction is **invalidated** — never silently re-pointed at the new text, because a citation verified
  against a superseded revision is not evidence about current canon. Invalidation is recorded against the
  same uid, so the scene's history is one chain rather than a set of orphans, and re-extraction is a
  deliberate act.
- Fire-and-forget remains acceptable *after* the persist — the reader still must not wait on extraction,
  and the existing continuation block already prevents a silent failure from letting the next scene
  proceed. What changes is only *when* it may start.

## 5. Prove byte-identity across all three consumers

The invariant, stated as one equality rather than three checks:

```
persisted record .text  ===  DOM render input  ===  extraction context prose
```

byte-for-byte, all resolved by the same uid, all hashing to the stored `hash`.

**How to prove it without a live test** (dry controls, in the existing style):
1. **Projection-write API proof (AST/source):** every ordinary scene write goes **through one
   authoritative projection-write API**, and no ordinary code path assigns a scene record's `.text`
   directly. "Exactly one function writes `.text`" was the earlier wording and it is too brittle — it
   forbids legitimate second writers (a later revision, the migration pass) and breaks the moment anyone
   adds one, which pressures the next author to bypass the rule rather than use it. The durable rule is
   about the **route**, not the count: the API owns building the projection, hashing it, bumping the
   revision, and invalidating dependent pending extractions, so a caller cannot write text without those
   things happening. **Migration is an explicit, provenance-marked exception** (§7) that calls a distinct
   entry point and is recognised as such by the proof rather than smuggled past it. This is still the check
   that would have caught `:237444`, because that line assigns `.text` directly.
2. **Three-way identity proof (real path, stubbed network):** run one accepted scene through the real
   completion path; assert the persisted `.text`, the string handed to the DOM renderer, and
   `ctx.prose` are byte-identical and all match `hash`.
3. **Offset proof:** for every sidecar entry, `text.slice(start, end)` equals that beat's rendered
   contribution, and every `labelSpan` lies inside its entry.
4. **Label-independence proof:** with label emission suppressed, every sidecar entry's speaker identity is
   unchanged. This is the assertion that keeps attribution out of presentation.
5. **Invalidation proof:** rewrite the record after a pending extraction exists; assert the pending record
   is invalidated and recorded as such, and that the old citations are not re-verified against the new
   text.
6. **Ordering proof (source order):** the extraction trigger appears after the persist, with no function
   boundary between, and no microtask queue point survives before the re-sync. This mirrors the existing
   commit-at-persistence ordering proof, which already works this way.
7. **Uid stability proof:** after an OAS archive splice, the pending record still resolves to its own scene
   record; no consumer resolves a scene by index.

---

# 6. Speaker identity resolution is TYPED, by role

**Correction to the previous revision.** It said "every consumer of a PC display name reads
`_resolvePcIdentity`… The same applies to the LI name." **The second half was wrong.**
`_resolvePcIdentity` is the authority **for the PC only**. Routing every identity through it would make
the PC resolver the owner of people it knows nothing about.

Speaker resolution has **three typed routes and one refusal**, chosen by what `beat.speaker` names:

| `beat.speaker` | authority | resolves to |
|---|---|---|
| `'protagonist'` | **`_resolvePcIdentity`** — the declared PC owner | the canonical PC display name |
| `'li'` | **the relationship/cast LI authority** — the ledger's `anchorRole: 'li'` anchor entity, addressed by `_relLiId()`, whose label `_relEnsureAnchors` resolves. `_relResolveRef` already maps `loveInterestName`/`partnerName` back to that same id, so the anchor is the canonical LI reference, not a convenience copy | the canonical LI display name |
| any other name (`'Seren'`, `'the presiding Dohkar'`, …) | **validated cast/beat identity** — the name must clear the existing cast validator (`validateCGSpeakerDisplayNames`, `:36961`, which already rejects a missing speaker on a dialogue-carrying beat and rejects internal underscored keys used as display names) against the story's known display names | the validated display name, plus the validator that cleared it |
| anything unvalidated | **none** | **`unresolved`** — recorded, never inferred |

The sidecar records **which authority resolved each entry**, so a later reader can see *how* a speaker was
established. That is also what keeps the routes honest: a PC-resolved entry and a cast-validated entry are
not interchangeable evidence.

## The PC's own single-owner rule still applies, and is still violated

`_resolvePcIdentity` is unambiguously the intended authority **for the PC**, declared twice in the code:

- `:132273` — *"Identity selection has exactly one owner now: `_resolvePcIdentity`."*
- `:32382` — *"PC LABEL — READ THE CANONICAL RESOLVER, NEVER A PRIVATE CHAIN … precisely the mistake
  `_resolvePcIdentity` exists to prevent (\"Every consumer reads this — never its own chain\")."*

The relationship anchor was brought into line for exactly this reason. **`_sbSpeakerLabel` (`:237064`) was
not**, and still runs its own PC chain:

| consumer | PC chain | fallback |
|---|---|---|
| relationship anchor (compliant) | `_resolvePcIdentity`: seed cast → `playerName` → `name` → `identity.playerName` → `picks.identity.playerName`, placeholder-filtered | `'the protagonist'` |
| **speaker label (non-compliant)** | `picks.identity.playerName` → `playerName` | `'I'` |

Different precedence, different fallbacks, no placeholder filter — so they can disagree, and when they do
the PC is not nameable in the terms the evidence uses.

**Required:** the projection resolves `'protagonist'` through `_resolvePcIdentity` and `'li'` through the
LI anchor, rather than through `_sbSpeakerLabel`'s private chains. A source-level control asserts no
private **PC**-name chain exists outside the resolver. It must **not** assert the same about the LI, whose
authority is the anchor.

---

# 6b. The unresolved invoker never touches the accepted scene

**Correction.** The previous revision said the capture must "fail loudly", which is ambiguous enough to be
read as aborting. **It must not be.** An empty or unresolvable invoker identity:

- **must NOT reject, roll back, or interrupt the accepted scene.** The scene is already the reader's;
  persistence has happened, and nothing about an extractor's naming problem may undo it. No throw that
  escapes the capture, no revert of the record, no interruption of the completion path.
- **must produce an explicit status** on the pending record — `extractor_blocked: 'invoker_unresolved'` —
  distinguishable from both "resolved" and "no invoker exists".
- **must prevent automatic outcome commitment.** Blocked means blocked: no claim is committed from a report
  whose invoker could not be named.
- **surfaces as pending review**, so a person can resolve the identity and release it deliberately.

**One interaction to get right.** `_tfoContinuationBlocked` currently holds the next continuation while a
pending record is unresolved. If `extractor_blocked` were treated as an ordinary unresolved pending, the
story would stall on a naming defect — the opposite of "the story continues". So
`extractor_blocked_pending_review` must be a **terminal-for-automation** state, not an in-flight one: it
stops automatic commitment and does **not** gate the next scene. The continuation gate keeps its purpose —
catching a *retryable* extraction that silently failed — and stops catching a decision that is waiting on a
human.

**Scope of the consequence, unchanged:** `EXEMPT(invoker, invoker_anchor)` is licensed by the **mechanic**,
not by the prose, so an unresolved invoker degrades the system's ability to **name** the exempt party. It is
a naming defect, not an evidentiary one — which is exactly why it must block automation without touching
the story.

## Still unproven

The mechanism behind the empty field is known: `_tfoBuildExtractionContext` reads `_relLedger(false)`, which
returns `null` before reaching `_relEnsureAnchors` when no ledger exists for the `storyId`, so the field
degrades silently to `''`. No retained artifact contains a live ledger. **This remains unproven until a
live-shaped ledger path is observed**, and this design does not make it proven — it only makes the failure
explicit instead of silent.

---

# 6c. Blocked-invocation propagation

**The policy hole.** Letting continuation proceed after `extractor_blocked` must not make the Tempt Fate
invocation **disappear from downstream canon**. If the next planner sees nothing, it will confidently assume
one of two things — that the wish landed, or that it didn't — and either assumption is fabricated.

The distinction that makes this tractable: **the invocation is reader-visible canon; only its outcome is
unresolved.** The wish is on the page (*"If only everyone would forget the ceremony happened."*) and the
reader remembers making it. What no one knows is what it did. So the record must carry the invocation
forward while licensing nothing from it.

## The unresolved-invocation record

Persisted **immutably**, and identified by its own **`invocationId`** — not by `sceneUid`, which is not
unique enough: **a scene can be revised, and may eventually contain more than one invocation.** Keying
resolutions on the scene would make two wishes in one scene indistinguishable, and a second wish added by a
revision unaddressable.

```
{ invocationId,                        // opaque, immutable, minted at block time — THE handle
  sceneUid, proposalId, invokedAtScene,
  evidence: {                          // minted WITH the final projection, and re-checkable against it
    wishText,                          // the exact invocation text as it appears in the canonical text
    span: { start, end },              // its offsets in that revision
    projectionRevision, textHash,      // the revision it was observed in
    sourceType, speakerIdentity        // from the sidecar: who, if anyone, uttered it
  },
  reason: 'invoker_unresolved',
  blockedAt }
```

**The ID and the evidence are deliberately separate.** `invocationId` is an opaque, stable handle — it is
**not** derived from offsets or hashes, because those change across revisions and a handle that changes is
not a handle. `evidence` is the re-checkable part: it records what was seen, where, and in which revision,
so a later revision can be tested against it rather than assumed compatible.

**Every resolution and dismissal references `invocationId`** — never `sceneUid` alone, never
`sceneUid + revision`.

**Append-only, and genuinely immutable — no status field is ever written back.** Current status is
**derived** by looking for a later resolution entry that references this `sceneUid`. A mutable `status` on a
record called immutable is a contradiction that erodes the first time someone needs to flip it; deriving it
keeps the guarantee real and keeps the scene's history a single readable chain.

## Revision handling — an invocation is not immune to every revision

**Correction.** The previous revision said an unresolved-invocation record "is **not** invalidated by a
later revision." **That was too strong.** If a later canonical projection removes or materially changes the
wish text, downstream canon cannot go on asserting that exact invocation occurred. The rule is neither "all
revisions invalidate" (a pending extraction's rule) nor "no revision matters" — it is a **re-check of the
evidence** against the new canonical text:

| on a new projection revision | outcome |
|---|---|
| the exact `evidence.wishText` is still present **verbatim**, and its containing sidecar entry has the **same `sourceType` and speaker identity** | the record **survives** a formatting-only revision. Append an **evidence re-anchor** entry: same `invocationId`, new `projectionRevision`, new `span`, new `textHash`. The invocation stays current canon. |
| the wish text is **absent**, or present but with a **changed `sourceType` or speaker** (e.g. it moved from the PC's interior exposition into someone else's dialogue) | append an explicit **`superseded_or_inapplicable`** record referencing `invocationId`, with the reason. **Stop presenting that invocation as current canon** — the blocked-invocation directive stops firing for it. |

Re-anchoring is an **append**, like everything else here: the original record is never edited, and the
chain reads as "observed at r3, re-anchored at r4, superseded at r7."

**The material-change test is verbatim presence, deliberately.** This design refuses synonymy everywhere
else and cannot adopt it here: "materially changed" is operationalised as "the exact substring is no longer
there." **Known conservatism:** a purely cosmetic edit *to the wish line itself* — whitespace, a changed
comma — fails the verbatim test and is treated as material, producing a `superseded_or_inapplicable` record
for what a person would call a formatting change. That errs toward not asserting, which is the right
direction. The only safe relaxation is an **explicitly declared normalization applied identically to both
sides** of the comparison, never fuzzy or semantic matching.

**Contrast with a pending extraction, which still differs.** A pending extraction is invalidated by *any*
revision, because its citations span the whole scene and all of them were verified against superseded text.
An unresolved invocation depends on **one** piece of evidence, so it can be re-checked and may survive.
Two records, two rules — related by the same re-check discipline, not by a shared verdict.

## It must not retry and must not stall

- **Excluded from the retry set.** It is not a pending extraction. `_tfoResumePending` must not pick it up,
  and it must not appear in `_tfoUnresolvedPending`.
- **Excluded from the continuation gate.** `_tfoContinuationBlocked` must not hold the next scene on it —
  that is the whole point of terminal-for-automation (§6b).
- **Its directive fires only while it is current** — not once superseded, and not once resolved or
  dismissed. All three are derived from appended entries referencing `invocationId`.
- **The accepted scene is untouched.** No rewrite, no revert, no new revision. Creating this record changes
  nothing about the scene's text, hash, or revision.

## What it tells downstream planning

The planner/author directive built from this record must state **exactly four things**, and nothing that
could be read as a consequence:

1. **An invocation occurred** at the named scene, with its wish text — the reader made this wish and
   remembers it.
2. **No durable outcome was automatically committed.**
3. **Do not assume the requested effect landed, or that it failed.** Both readings are refused, not one.
4. **Derive nothing FROM THAT WISH** — the planner may not presuppose or derive memory, possession,
   history, relationship, exemption, or scope **as a consequence of this invocation**.

This is a **third kind of canon entry**, and it must not be collapsed into either of the existing two. It
resembles the `undetermined`-scope machinery already built — refuse both readings of the reach, keep
established effects usable — but is strictly stronger: there **are** no established effects here, so nothing
is usable. `undetermined` says *"this much happened, the reach is open."* This says *"a wish was made and we
do not know what it did."*

## The prohibition is scoped to the wish, and must not freeze ordinary scenes

**Correction.** The previous revision said "any world state that would only be true if it had worked, or
only if it hadn't… A scene may not show the assembly remembering, nor forgetting." **Withdrawn — that
freezes the story.** Almost any subsequent scene touches memory or relationship somehow, and a blanket ban
would make an unresolved invocation more paralysing than a stall.

The prohibition is **causal and wish-scoped**, not topical:

- **Forbidden:** presupposing or deriving memory, possession, history, relationship, exemption or scope **as
  a consequence of this wish**; writing a character's state *because* the wish did or did not land; treating
  the requested effect as achieved or as refused.
- **Not forbidden:** independently motivated present action; a character's ordinary behaviour; **newly
  observed evidence** the scene establishes on its own terms. A later scene *may* show the assembly failing
  to recall the ceremony — it simply may not do so *on the authority of the wish*, and the planner may not
  be *told* to produce it.

**If later prose explicitly establishes an effect, it is a NEW OBSERVATION with its own provenance** —
committed under the ordinary evidence rules (§2–§3: a span in that scene's canonical projection, resolved
through its own sidecar), tagged to the scene that established it, and standing on that evidence alone.

**It does NOT silently retroactively resolve the invocation.** The unresolved invocation stays unresolved,
because nothing in the later scene establishes *causation* — only that a state now obtains. Closing the
invocation remains a human act referencing `invocationId`, and a reviewer may legitimately **cite that
observation as their basis** for doing so. What is forbidden is the machine inferring the link. This keeps
two facts separable that a silent resolution would fuse: *"the assembly does not recall the ceremony"* and
*"the wish is why."*

## Human resolution, without rewriting the original scene

Resolution is an **append**, never an edit:

- A reviewer reads the scene and the pending-review queue and decides the outcome.
- That creates a **separate durable outcome record** with provenance `human_review`, carrying
  `resolves: { invocationId }` — the ID, so it stays unambiguous when a scene holds two invocations or is
  revised — plus its own claims and the reviewer's basis, which may cite a later scene's observation.
- **The original scene is not rewritten** — not its text, not its hash, not its revision. It was always
  intact; resolution does not make it otherwise. The scene's canonical projection is independent of whether
  anyone ever resolved the invocation.
- The unresolved-invocation record is likewise **not modified**. It stands as the permanent fact that
  automation declined; the resolution stands beside it as the permanent fact that a person decided.
- From that point the durable outcome propagates exactly like any other committed consequence, and the
  blocked-invocation directive **stops firing** for that scene because a resolution now references it.
- **Dismissal is also an append** — a resolution entry against `invocationId` recording "reviewed, no
  durable outcome" — so "nobody has looked at this" and "someone looked and found nothing" are
  distinguishable forever.
- **A superseded invocation needs no resolution.** If `superseded_or_inapplicable` was appended because the
  wish text left the canonical text, the review item is closed by that record; asking a person to adjudicate
  an invocation the canon no longer contains would be asking them to resolve nothing.

---

# 7. Migration plan — historical records only

Every accepted scene that exists today predates the uid, the projection and the sidecar.

## What migration does

0. **Go through the projection-write API's explicit migration entry point**, not around it. Migration is the
   one provenance-marked exception to the ordinary write route (§5-1): it writes a record whose text it did
   **not** build, so it must say so rather than impersonate a normal projection write.
1. **Assign a uid** to each historical scene record, derived from stable data already on it (story id +
   position at migration time), recorded as `uidProvenance: 'migrated'`. The uid is then **stable for the
   life of the record**, exactly as for new scenes — a later revision of a migrated record bumps its
   revision and hash, never its identity. This gives old records a stable
   identity going forward. It does **not** claim the uid was the one in force when the scene was written.
2. **Freeze the existing `.text` as canonical revision 0 for that record**, marked
   `projectionProvenance: 'historical_unbuilt'` so it is never mistaken for API-built output. It is whatever the historical
   pipeline last left there — for CG scenes, the label-less re-sync output (B). Hash it and store the hash.
   This is canonical *for that record* by definition, because it is what the reader's save contains.
3. **Mark the absence of attribution explicitly:** `attributionAvailable: false`. Absence must never read
   as "no speakers were present."
4. **Do not re-render, do not rebuild, do not backfill.** A fresh projection over retained beats produces a
   *different* string (the trace measured 867 / 830 / 813 bytes for one scene) and nothing can establish
   which the reader saw. A re-render is a new artifact, not the accepted one.

## What migrated records can support

- **Narrator-sourced claims only**, on the existing terms: the span must explicitly name a roster party and
  state the proposition.
- **All speech is permanently `unresolved`** for these records. The speaker identities exist in retained
  plans, but binding them to spans in a text built by a *different* projection would be attribution by
  reconstruction — the exact defect being removed.
- **Scope stays `undetermined`** wherever any party is unaccounted, which for these records is the normal
  case.

## The stated cost

The retained four-party fixture yields exactly **one** claim —
`LOST_KNOWLEDGE(the assembly, "the accusation")`, narrator-sourced — and will never yield more. Its three
speech lines are unrecoverable as evidence. Across all three retained accepted scenes the total is **one**
committable claim. That is the price of not manufacturing identity retrospectively, and it is the right
price.

## Pending extractions that exist at migration time

Any pending record whose ctx prose came from `_extractCGSceneText` is citing a text that is not any version
of its scene record. These must be **invalidated, not migrated** — recorded as
`invalidated: 'pre_canonicalization_provenance'`. Re-extraction is a deliberate, separately authorized act.

---

# Dependency order

| # | change | blocks |
|---|---|---|
| 1 | uid minted before async work, carried on all four records | 3, 4, 7 |
| 2 | one atomic projection returning `{ text, attributionSidecar }` | 3, 5 |
| 3 | single persist; DOM renders from it; ctx built from it | 4, 5 |
| 4 | extraction sequenced after the persist; rewrite ⇒ new hash ⇒ invalidate | 5 |
| 5 | byte-identity proofs (7 dry controls) | unblocking extraction |
| 6 | typed speaker authority: PC via `_resolvePcIdentity`, LI via the anchor, others via the cast validator | 2 (the projection resolves speakers) |
| 6b | unresolved-invoker status: blocks automation, never the scene | 6c |
| 6c | blocked-invocation propagation: immutable append-only record, four-point directive, append-only resolution | — (6b is incomplete without it) |
| 7 | historical migration, via the API's provenance-marked exception | needs 1, 2 and the write API defined, not deployed |

**Extraction stays blocked until 1–5 are done and proven.** 6 feeds the projection and so travels with it;
6b and 6c are independent of 1-5 and can land at any time, but **6b must not ship without 6c**: allowing
continuation while the invocation vanishes from downstream canon is worse than stalling, because a planner
then invents an outcome instead of waiting for one. 7 can be specified now and applied with the same release.

Nothing implemented. No replay authorized.
