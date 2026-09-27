# Read-only traces: §1 provenance, §2 sidecar feasibility, §5 invoker identity

Facts and implementation prerequisites only. No implementation, provider call, replay, routing change
or push. Reproducible via `_provenance_trace.mjs`, `_label_coverage_trace.mjs`, `_beat_shape_probe.mjs`.

---

# §1 — The canonical projection, and every writer after acceptance

## There is no single reader-visible canonical projection today

`state.scenes[i]` is an **object**: `{ title, synopsis, text, fateCard }`. The prose is `.text`.
It is built once at acceptance (`public/app.js:237072`, inside `_completeStagedSceneFromScreenplay`):

```js
var proseAssembled = plan.beats.map(function(b) { return _sbSpeakerLabel(b) + (b.text || ''); }).join('\n\n');
state.scenes.push({ title: '', synopsis: '', text: proseAssembled, fateCard: null });
```

`_sbSpeakerLabel` is a **function-local closure defined inline at 237061** — not a named, reusable
projection. It resolves `'protagonist'`/`'li'` to real names from live state, upper-cases, appends
`': '`, and returns `''` when the beat text already opens with that name and a colon.

**Three different texts exist for one accepted scene.** Measured on the retained four-party scene:

| | built by | length | labels | matches captured `state.scenes[last]` |
|---|---|---|---|---|
| **(A)** `proseAssembled` at the push | `:237072` | **867** | **YES** | **true** |
| **(B)** post-acceptance re-sync | `:237444` | 830 | no | false |
| **(C)** `_extractCGSceneText(plan)` | `:236599` | **813** | no | false |

The extractor received **(C)** — verified byte-equal to the prose in the last paid run's user prompt,
and **54 bytes shorter** than the captured reader record. (C) is not any version of the scene record.

## Every writer/mutator after `state.scenes.push`, in execution order

| # | line | what it does | mutates |
|---|---|---|---|
| — | 237053 | `_cgEnforceCalcifiedAndHook` — deterministic calcified/hook strip | `beat.text`, **before** the push (safe) |
| 0 | **237072–237074** | builds **(A)** and pushes the scene record | — |
| 1 | 237086 | `_cgTemptFateCommitAtPersistence(plan)` → freezes `ctx.prose = _extractCGSceneText(plan)` = **(C)** | pending record |
| 2 | 237095 | extraction queued as a **microtask** (`Promise.resolve().then`) | — |
| 3 | 237181 | `_neutralizeLeakedPlaceholderName` — placeholder-name leak scrub | **`beat.text`, in place** |
| 4 | **237342** | `await Promise.race([...])` — image preparation | *suspension point* |
| 5 | **237355** | `await _maybeShowIntroCards(...)` | *suspension point* |
| 6 | 237405 | `_extractAndStripDistinctivePhrases` | **`beat.text`, in place** |
| 7 | 237411 | `_extractAndStripLIMysteryMarkers` → `.stripped` | **`beat.text`, in place** |
| 8 | 237422 | `_extractAndStripLIBurdenMarkers` → `.stripped` | **`beat.text`, in place** |
| 9 | **237444** | **RE-SYNC: `state.scenes[last].text = plan.beats.map(b => b.text).join('\n\n')`** — rebuilds **(B)**, **dropping every speaker label** | **the scene record** |
| 10 | 204791 / 204799 | OAS archive `splice`/assign at `state.turnCount` — **shifts later indices** | the scenes **array** |

Items 6–9 sit **after two `await`s**, so the record's `.text` is rewritten asynchronously, potentially
long after acceptance. Both 237391 (the strip block) and 237441 (the re-sync) are unconditional for any
plan with beats — they are inside `if (plan && Array.isArray(plan.beats))`, with no further gate.

**Why the retained artifact still shows (A).** The harness captured `state.scenes[last]` while the awaits
at 237342/237355 were outstanding — image preparation is blocked in that harness — so it read the record
**before** step 9. In ordinary production those awaits resolve and **(B) becomes the durable record.**
The label-bearing text (A) is therefore transient, and the earlier claim that the reader sees
`THE PRESIDING DOHKAR: "…"` holds only for the window before the re-sync; the **persisted** record ends
up label-free. The DOM panels are a third, separate surface.

## Is a persistence-time snapshot stable through extraction and commitment?

**No. Snapshot timing must move.**

- A snapshot taken at step 0 captures (A) and is **invalidated at step 9** by a rewrite to (B).
- The rewrite lands **after two suspension points**, so it can occur *during* extraction — the extractor's
  network call is in flight across that window.
- Extraction is queued at step 2 and the microtask runs at the first `await` (step 4), so **extraction
  begins before the re-sync and can finish after it.** There is no ordering guarantee either way.
- A snapshot keyed by **index** is additionally unstable: the OAS archive can `splice` at
  `state.turnCount`, shifting every later index. The pushed scene object carries **no scene uid**, so a
  pending record (keyed `storyId::proposalId::sceneUid`) has no reliable way back to its scene entry.

**Prerequisites (§1):**
1. **Extract the projection.** Promote the inline `_sbSpeakerLabel` + join at 237072 into one named
   function, and make it the only producer of the scene record's `.text`. The re-sync at 237444 must call
   that same function instead of its own label-less `beats.map(b => b.text)` — otherwise the record's text
   changes shape mid-scene by construction.
2. **Move the snapshot to after the last mutator** (step 9), not to the push. Steps 3 and 6–8 mutate beats
   in place and step 9 rewrites the record; only after 9 is the value final.
3. **Sequence extraction after the snapshot.** Extraction is currently queued at step 2, i.e. before the
   final text exists. It must be triggered from after step 9, or the pending record must carry no prose
   until then.
4. **Persist the scene uid on the scene record**, so the byte-identity re-check resolves by uid rather than
   by index, and survives the archive splice.
5. **Decide which surface is authoritative** — the persisted record or the DOM panels — and state it. They
   are not the same text today, and the sidecar can only index one.

---

# §2 — Sidecar feasibility

**Every rendered-beat contribution is locatable in the canonical projection, without a plan
reconstruction and without reading a `NAME:` prefix** — measured on the retained scene:

- **18/18 beats** map to exactly one `[start, end)` in (A).
- **No ambiguity**: no beat's rendered segment occurs more than once.
- **3/3 dialogue beats carry a label**, and the label's own span is computable as
  `[start, start + label.length)` — from `_sbSpeakerLabel`'s return value, not by parsing the text.

This works because the projection is a **sequential map-and-join**: offsets accumulate deterministically
as it is built. It must be built that way — **by sequential construction, not by searching for text
afterwards** — since search would reintroduce string guessing and is not safe against repeated lines.

## Transformations that make offsets ambiguous

| transformation | effect on offsets |
|---|---|
| **The re-sync at 237444** rebuilding `.text` with a different projection | **fatal** — offsets computed against (A) are meaningless for (B); lengths differ by 37 bytes here |
| **In-place `beat.text` mutation at steps 3, 6, 7, 8** | **fatal if offsets are computed before them** — every beat's length can change, shifting all later offsets |
| `_sbSpeakerLabel`'s **double-label guard** (returns `''` when the beat text already opens with `Name:`) | label presence is **conditional**; `labelSpan` must be recorded as actually emitted, never inferred from the beat's kind |
| **Name resolution at label time** (`'protagonist'`/`'li'` → live-state names) | label **length varies with the resolved name**, so offsets cannot be derived from beat data alone |
| `join('\n\n')` vs `_extractCGSceneText`'s `join('\n')` | different separators shift every offset; a second projection can never share the first's offsets |
| OAS archive **splice** | does not shift offsets, but breaks the index→record binding the offsets are attached to |

**Prerequisite (§2):** build the sidecar **in the same pass that builds the final text, after the last
mutator**, emitting each entry's `[start, end)`, `labelSpan` as actually produced, `sourceType`, and the
validated speaker — and bind it to that text's hash. Any later rewrite of the text must rebuild or discard
the sidecar; it must never be allowed to survive a rewrite.

---

# §5 — Invoker identity

## The mechanism behind the empty field is identified

`_tfoBuildExtractionContext` reads the ledger with **`create = false`**:

```js
var L = (typeof _relLedger === 'function') ? _relLedger(false) : null;
Object.keys(ents).forEach(function (id) { if (ents[id] && ents[id].anchorRole === 'pc') invoker = String(ents[id].label || ''); });
```

and `_relLedger` (`:32352`) returns **`null`** before it ever reaches `_relEnsureAnchors` when no ledger
exists for the current `storyId`:

```js
if (!L || typeof L !== 'object' || L.v !== REL_V || L.storyId !== sid) {
  if (!create) return null;        // ← anchors are never ensured
  L = ...;
}
_relEnsureAnchors(L);
```

So `invokerName` is `''` **exactly when no relationship ledger exists for the story at capture time**, and
the capture **degrades silently** — no warning, no distinction between "no invoker" and "not resolvable".
The fixture harness set a fresh `storyId` and never created a ledger, which is why the field was empty.

## Can an existing accepted-scene artifact settle the live-shaped path? No.

No retained artifact contains a live relationship ledger — `anchorRole` appears only in controls and
design docs, never in a captured state dump. **The live-shaped path remains unproven.**

What *is* established:
- The resolver exists and is reload-safe: `_relEnsureAnchors` resolves the PC label via
  `_resolvePcIdentity` (first non-placeholder of `starterSeed.cast.PC.name → state.playerName →
  state.name → state.identity.playerName → state.picks.identity.playerName`), and **upgrades a
  placeholder label in place** on a carried save — same entity id, old label kept as an alias.
- Ledger creation is widespread: **20 `_relLedger(true)` call sites**, on ordinary mutation paths.

What remains **unproven**:
- That a ledger exists *by the time a scene is accepted*. Nothing in the capture path orders it; creation
  is incidental to whatever gameplay happened earlier. "20 creation sites" makes it likely, not certain.
- Whether `invokerName` is non-empty at capture in a real session.
- Whether the ledger survives reload *for this purpose* in a real session (the in-place upgrade is a dry
  control's subject, not a live observation).

## A separate defect this trace found: two divergent PC-name chains

| consumer | chain | fallback |
|---|---|---|
| ledger label (the invoker's name in `ctx`) | `_resolvePcIdentity`: seed cast → `playerName` → `name` → `identity.playerName` → `picks.identity.playerName` | `'the protagonist'` |
| **rendered** label (`_sbSpeakerLabel`, `:237064`) | `picks.identity.playerName` → `playerName` | `'I'` |

Different precedence and different fallbacks, so **they can disagree** — and when they do, the invoker is
not nameable in the same terms the evidence uses. This is a single-source-of-truth defect independent of
whether the ledger exists.

## Scope of the consequence

`EXEMPT(invoker, invoker_anchor)` is licensed by the **mechanic**, not by the prose, so an empty
`invokerName` degrades the system's ability to **name** the exempt party; it does not remove the
exemption. This is a naming defect, not an evidentiary one.

**Prerequisites (§5):**
1. The capture must **fail loudly** rather than record `''` — either ensure the ledger (`create = true`) at
   capture, or record an explicit `invokerUnresolved: true` so downstream can tell "unresolved" from
   "unnamed".
2. **One PC display-name resolver**, shared by the ledger label and the rendered label.
3. A live-shaped observation is still owed: `invokerName` non-empty at capture in a real accepted scene,
   equal to the rendered PC display name. Only a real session settles it.

---

# Implementation prerequisites, consolidated

**Blocking, in dependency order:**

1. **One named canonical projection** producing the scene record's `.text`, used by both the push and the
   re-sync. (§1-1, §2)
2. **Snapshot after the last mutator** — after the re-sync at 237444, not at the push. (§1-2)
3. **Extraction sequenced after the snapshot**, not queued before it at 237095. (§1-3)
4. **Scene uid on the scene record**, so identity survives the OAS splice and the byte-identity re-check
   resolves by uid, not index. (§1-4)
5. **Sidecar built in the projection's own pass**, bound to the final text's hash, discarded on any
   rewrite. (§2)
6. **Decide and state which surface is authoritative** — persisted record or DOM panels. (§1-5)

**Independent:**

7. **One PC display-name resolver**; capture fails loudly on an unresolved invoker. (§5-1, §5-2)
8. **A live-shaped invoker observation** in a real accepted scene. (§5-3)

Items 1–3 are the substance of the blocker: today the text the extractor cites against is not any version
of the scene record, and the version it *should* cite against does not stop changing until after two
awaits.

Nothing implemented. No replay authorized.
