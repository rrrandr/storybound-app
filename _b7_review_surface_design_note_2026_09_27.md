# B7 — review surface for unresolved Tempt Fate invocations (design note only)

Design only. No UI, no scene generation, no extraction re-enable, no push. **Automatic extraction and
automatic outcome commitment stay disabled.**

## Standing position

Canonical text and attribution (Track A) solved **provenance**. They did not solve the extractor's
**unsupported semantic judgments**, which is why automation stays off. B7 is the surface through which a
person supplies the judgment the machine may not.

Without it, the human-resolution path exists only in internal records: `_tfoResolveInvocationByHuman` and
`_tfoDismissInvocation` are real and proven, and nothing in the product reaches them.

## What already exists (this note designs no new data)

| need | existing accessor |
|---|---|
| open ordinary records | `_tfoUnresolvedInvocations(state)` |
| fail-safe-marked records | `_tfoUnresolvedFailsafeMarkers(state)` |
| derived status for one record | `_tfoInvocationStatus(state, invocationId)` |
| the scene's canonical text + provenance | `_sbSceneProjectionByUid(uid)` → `{ text, revision, hash, kind, provenance, attributionAvailable }` |
| resolve | `_tfoResolveInvocationByHuman(id, { basis, reviewer, claims })` |
| dismiss | `_tfoDismissInvocation(id, { basis, reviewer })` |
| promote a fail-safe marker | `_tfoRecoverInvocationFromFailsafe(marker)` |

B7 is a **view plus two calls**. If it needs a new field, that is a signal the design drifted.

## Where it lives

A **reviewer tool, never a reader surface.** It must not appear in the reading UI, must not gate play, and
must not be reachable by a reader mid-story: an open invocation is already non-blocking by design
(`_tfoContinuationBlocked` is a no-op while automation is off), and a review panel that interrupted reading
would undo that.

---

## The panel: one invocation at a time

**One record per screen, no bulk actions, no "resolve all".** A reviewer adjudicates a specific scene or
does nothing. Batch affordances are the fastest route to unexamined canon.

### Four regions, in this order — the order is the argument

1. **THE ACCEPTED SCENE — primary evidence.** The canonical projection text for the scene, read by uid,
   with its `revision` and `provenance` shown. This is what the reader read and the only thing a claim may
   rest on. It comes first because every other region is context for it.
2. **THE INVOCATION RECORD — immutable, shown as such.** `invocationId`, `invokedAtScene`, the invoker and
   whether it resolved, `acceptance.kind`, and the wish text **labelled `observed at capture`**. Rendered
   read-only, visibly: no edit affordance anywhere, because the record genuinely cannot be edited and a
   greyed-out input would imply otherwise.
3. **PROVENANCE AND WHAT IT PERMITS.** `projection.provenance` (`api_built` / `historical_unbuilt` /
   `archive_entry`), `revision`, and `attributionAvailable`. This region decides what the form below may
   offer — see *Attribution gating*.
4. **THE DECISION.** Resolve, dismiss, or leave open.

### The wish text is context, not a citation

It is displayed under its own heading — *"what the reader asked for, as recorded when the scene was
accepted"* — and explicitly **not** as a quote from the scene. The record already carries
`evidence.currentCanon: false` and a note saying it is not a citation; the surface must render that note,
not bury it. A reviewer who mistakes the wish for scene evidence will resolve from the request rather than
from what the prose established, which is the exact error the whole workstream has been correcting.

### Attribution gating

`attributionAvailable === false` (every historical record, every archive entry) means **no sidecar exists
and none can be manufactured.** In that state the form must not offer a quote or span field at all — an
empty citation box invites a reviewer to type a quote the system cannot verify. It shows instead: *"This
scene predates attribution capture. A claim here rests on your reading, recorded as such."* The resolution
is still permitted; what changes is that nothing pretends to be machine-checked.

---

## The decision form

**Three mutually exclusive outcomes, none preselected:**

- **Resolve** — commits a durable outcome, with claims the reviewer states.
- **Dismiss** — reviewed, no durable outcome.
- **Leave open** — the default. Closing the panel without choosing changes nothing, and that must be true
  in the code as well as in the wording: no autosave, no draft that later looks like a decision.

**Basis is required for both resolve and dismiss.** Already enforced — both calls return `null` on a
missing or whitespace basis — so the form must surface that refusal rather than work around it. The basis
is free text and should be prompted concretely: *"What in the scene supports this?"* not *"Notes"*.

**Both actions APPEND.** The surface states it plainly, because it changes what a reviewer believes they are
doing: a resolution appends a resolution entry against `invocationId` **and** a separate durable outcome
tagged `provenance: 'human_review'` with `resolves: { invocationId }`. **The invocation record is not
modified and the scene text is not touched** — proven byte-identical before and after in
`_tempt_fate_trackb_invocation_control` and again across the real-click lifecycle. The panel should show
the resulting record after the action, so the reviewer sees a new entry appear beside the original rather
than the original changing.

**Dismissal is a decision, not a deferral.** The copy must separate it from *leave open*: *"reviewed, and
the scene establishes no durable outcome"*. That distinction is why dismissal is stored — so "nobody looked"
and "someone looked and found nothing" stay distinguishable forever.

---

## Reviewers must not be able to silently infer an outcome

This is the part most likely to be designed wrong, because every convenience here is a nudge.

| forbidden | why |
|---|---|
| **A pre-filled or suggested disposition** | the surface would be making the judgment and asking the human to confirm it. No default selection, no "looks like: forgot". |
| **Any model-produced candidate outcome** | extraction is disabled; there is nothing to show. A pre-canonicalization pending record may still carry extractor output — it must be displayed, if at all, as **invalidated evidence** with its `invalidatedReason`, never as a starting point. |
| **Precedent from other invocations** | "3 similar wishes were resolved as *forgot*" manufactures consensus from a sample of one reviewer's habits. |
| **Bulk actions, or a keyboard path that resolves without a basis** | speed here buys nothing and costs the only safeguard. |
| **Inferring scope from the wish's wording** | scope needs a declared closed population plus evidence of the exact requested proposition; a form that offers `full` for *"everyone forgets"* invites exactly the `narrower`-vs-`undetermined` error already corrected once. Offer `undetermined` as the unselected-but-obvious value and make `full` require the reviewer to state the closed population. |
| **Treating an open invocation as evidence of anything** | the panel's own header should say what the downstream directive says: *an invocation occurred, no outcome is committed, do not assume it landed or failed*. |

**One positive requirement:** the panel should show the **downstream directive text currently being sent to
the planner** for this invocation. A reviewer who can see exactly what the story is being told is far less
likely to imagine it is being told something else — and it makes the "derive nothing from this wish" rule
concrete rather than abstract.

---

## The four record states, and which are populated today

| state | source | what the surface does |
|---|---|---|
| **Ordinary unresolved** | `_tfoUnresolvedInvocations` | a queue item; full decision form |
| **Fail-safe-marked** | `_tfoUnresolvedFailsafeMarkers` | a queue item, **visibly flagged**: the full record could not be written, and the marker carries the write error. Offers **Recover** (`_tfoRecoverInvocationFromFailsafe`) as a first step, which promotes it into an ordinary record; only then the decision form. Recovery is not a decision and must not read as one. |
| **Resolved / dismissed** | derived from `_tfoInvocationStatus` | **out of the queue**, readable in a history view with the appended entries and their bases. Not re-openable from here: a new decision is a new append, and the code already treats a resolved record's status as derived from the latest entry. |
| **Superseded / inapplicable** | **nothing produces this yet** | specified in the design (`superseded_or_inapplicable`, appended when a later canonical projection no longer contains the invocation's evidence) and **deliberately not implemented**: Track B deferred it because it needs `projectionRevision`, and Track A landed that only after. The surface should reserve the state — shown as *closed by supersession, no decision needed* — but it must not claim to detect it. **Until a producer exists, treat this row as unreachable.** |

An **invoker-unresolved** record is not a fifth state: it is an ordinary unresolved record carrying
`reviewFlags: ['invoker_unresolved']`, shown as a badge. It is reviewable and never blocking.

### One real data gap to handle honestly

An invocation record's `sceneUid` may be **null** for records created before A3, because
`plan.__sceneUid` was minted after the capture point. The surface must therefore resolve the scene by
`sceneUid` when present and fall back to `sceneIdx` otherwise — **with a visible caveat that a positional
link may point at the wrong scene after an archive splice.** Silently resolving by index is precisely the
identity bug Track A removed; doing it without saying so in a review tool would reintroduce it at the one
place a human is about to write canon.

---

## Smallest viable scope

1. A list of open items (ordinary + fail-safe), count only, no aggregates.
2. The four-region panel for one item.
3. Resolve / dismiss / leave open, basis required, append-only.
4. Recover, for fail-safe markers.
5. A read-only history of appended entries.

Not in scope: editing anything; re-opening a closed item; bulk operations; any suggestion engine; any
re-enabling of extraction.

## What B7 does not change

It does not make the extractor usable, does not re-enable automatic commitment, and does not make
literary continuations citable. It converts a correct-but-invisible mechanism into one a person can
actually reach — nothing more. The value is entirely in that, and the risk is entirely in adding
convenience to it.

## Open decisions for you

1. **Who reviews, and where.** A dev-only panel behind a flag, or a real authoring tool? That decides how
   much of the copy above needs to survive contact with a non-author.
2. **Whether `claims` is structured or free text at first.** The durable-outcome contract has 11 universal
   fields; a form demanding all of them will not get used, and one accepting a sentence will not produce
   canon downstream code can read. A middle path — `changed[]` plus `scopeMatch` restricted to
   `undetermined` / `full`-with-declared-population — is the smallest thing that is both fillable and usable.
3. **Whether to build the supersession producer first.** It is the only unpopulated state, and building the
   surface without it means one row of the design is untested until later.
