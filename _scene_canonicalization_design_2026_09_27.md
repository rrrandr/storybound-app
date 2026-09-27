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

**The sidecar must not depend on visible labels.** Each entry carries `[start, end)` into the final text,
`sourceType` (`speaker` | `narrator`), the **validated beat speaker identity** taken from `beat.speaker`
resolved through the identity authority (§6), and `labelSpan` recorded **as actually emitted** by the
projection — not detected in the text afterwards. A renderer that stops printing `NAME:` prefixes must not
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
- **Any rewrite creates a new projection and a new hash, and invalidates an older pending extraction.** A
  pending record whose hash no longer matches the record at its uid is **invalidated**, never silently
  re-pointed at the new text: a citation verified against a superseded projection is not evidence about
  current canon. Invalidation is recorded, so a scene can be re-extracted deliberately rather than having
  its evidence quietly swapped.
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
1. **Single-producer proof (AST/source):** exactly one function writes a scene record's `.text`, and it is
   the projection. No other assignment to `.text` on a scene record exists — this is what forbids a second
   projection from reappearing later, and it is the check that would have caught `:237444`.
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

# 6. Identity consistency — a separate prerequisite

**`_resolvePcIdentity` is unambiguously the intended authority.** This is not an open question; the
codebase already declares it twice:

- `:132273` — *"Identity selection has exactly one owner now: `_resolvePcIdentity`."*
- `:32382` — *"PC LABEL — READ THE CANONICAL RESOLVER, NEVER A PRIVATE CHAIN … precisely the mistake
  `_resolvePcIdentity` exists to prevent (\"Every consumer reads this — never its own chain\")."*

The relationship anchor was already brought into line for exactly this reason. **`_sbSpeakerLabel`
(`:237064`) was not**, and still runs its own chain:

| consumer | chain | fallback |
|---|---|---|
| relationship anchor (compliant) | `_resolvePcIdentity`: seed cast → `playerName` → `name` → `identity.playerName` → `picks.identity.playerName`, placeholder-filtered | `'the protagonist'` |
| **speaker label (non-compliant)** | `picks.identity.playerName` → `playerName` | `'I'` |

Different precedence, different fallbacks, no placeholder filter — so they can disagree, and when they do
the invoker is not nameable in the terms the evidence uses.

**Required:** every consumer of a PC display name reads `_resolvePcIdentity` — **including the speaker
label and the relationship anchor**. The same applies to the LI name, which `_sbSpeakerLabel` also resolves
privately. A source-level control should assert that no private PC-name chain exists outside the resolver,
in the same style as the single-producer proof above.

**Still unproven, and not made proven by this design:** the empty `invokerName`. The mechanism is known —
`_tfoBuildExtractionContext` reads `_relLedger(false)`, which returns `null` before reaching
`_relEnsureAnchors` when no ledger exists for the `storyId`, so the field degrades silently to `''`. No
retained artifact contains a live ledger. **This remains unproven until a live-shaped ledger path is
observed.** Two requirements meanwhile:
- the capture must **fail loudly** — either ensure the ledger at capture, or record
  `invokerUnresolved: true` so "unresolved" is distinguishable from "unnamed";
- `EXEMPT(invoker, invoker_anchor)` stays licensed by the **mechanic**, so an unresolved invoker degrades
  naming only. It is a naming defect, not an evidentiary one.

---

# 7. Migration plan — historical records only

Every accepted scene that exists today predates the uid, the projection and the sidecar.

## What migration does

1. **Assign a uid** to each historical scene record, derived from stable data already on it (story id +
   position at migration time), recorded as `uidProvenance: 'migrated'`. This gives old records a stable
   identity going forward. It does **not** claim the uid was the one in force when the scene was written.
2. **Freeze the existing `.text` as the canonical text for that record.** It is whatever the historical
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
| 6 | one PC identity authority | independent; required before invoker naming is trusted |
| 7 | historical migration | needs 1 and 2 defined, not deployed |

**Extraction stays blocked until 1–5 are done and proven.** 6 is independent and does not gate them. 7 can
be specified now and applied with the same release.

Nothing implemented. No replay authorized.
