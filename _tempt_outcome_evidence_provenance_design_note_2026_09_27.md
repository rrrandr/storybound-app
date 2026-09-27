# Design note — evidence provenance for the outcome extractor

Design only. No implementation, no provider call, no routing change, no push.

## HARD EXTRACTOR-READINESS BLOCKER

**The extractor is not given the reader-visible accepted scene.** It is handed a reconstruction built
from the plan (`_extractCGSceneText(plan)`), while the reader was shown the persisted scene
(`state.scenes[last]`). The two differ today: the persisted scene reads

```
THE PRESIDING DOHKAR: "What gathering is this?"
```

and the extractor received

```
"What gathering is this?"
```

This contradicts the invariant the code asserts at that very call site — *"The extractor must see
exactly what the reader saw, or its citations cannot match."*

**Status: blocking. No further extractor replays — paid or otherwise — until provenance and attribution
are resolved.** Automatic canon commitment stays disabled. Every citation the extractor has ever
produced was verified against a string the reader never saw; the checks passed only because the
reconstruction happens to share most of its substrings with the real scene.

## Correcting the previous conclusion

The label-coverage trace concluded the gap was "one unexercised branch wide." **That was wrong, and it
understated the problem.** `beat.dialogue` being unpopulated explains the *present loss of labels* and
nothing more. **Provenance and authoritative attribution are independent requirements**, and repairing
the branch satisfies neither:

| | if the `beat.dialogue` branch worked | still broken |
|---|---|---|
| **§1 Provenance** | the extractor still receives a **plan-derived reconstruction**, not the accepted artifact | ✗ unmet |
| **§2 Attribution** | identity would arrive as a **`NAME:` prose prefix** — presentation-level, parsed back out of text | ✗ unmet |

They are independent in both directions: each can fail while the other holds, and **both can be met
without touching that branch at all**, because a sidecar records attribution from validated rendered
beats regardless of which field carried the speech. The branch is a symptom; these two are the defects.

---

## 1. The prose must be the exact accepted, reader-visible scene

### The acceptance-time snapshot

At acceptance, capture the **same value that is persisted for the reader** — never rebuild it:

- Taken at the existing commit-at-persistence point. Source order there is already proven by control:
  real prose persistence (`state.scenes.push`) happens *before* the Tempt-outcome commit call, with no
  function boundary between them, so the persisted value is in hand at capture time.
- Stored on the pending record as `proseSnapshot`, alongside `proseSnapshotSha` and the scene identity
  it belongs to. The pending record already persists and already survives reload, so the snapshot
  inherits that durability.
- The extractor is fed `proseSnapshot` **and nothing else** as scene evidence. `_extractCGSceneText`
  stops being an evidence source. It may remain a renderer utility; it is not provenance.

### The byte-identity invariant

Two directions, both enforced, both fail-closed:

1. **At capture:** `proseSnapshot` must be byte-identical to the persisted reader-visible scene. Not
   "equivalent after normalization" — byte-identical, hash-compared. A mismatch means the snapshot was
   rebuilt somewhere and the capture must be refused rather than recorded.
2. **At extraction and at commit:** re-check `sha256(state.scenes[sceneIdx]) === proseSnapshotSha`. If the
   persisted scene has since changed, the pending extraction is **invalidated**, not silently re-pointed
   at the new text. A citation verified against a superseded snapshot is not evidence about the current
   canon.

### Two things to pin before specifying this further

- **Which representation is reader-visible.** `state.scenes[i]` is consumed through a text projection in
  at least one harness (`sceneToText`). If entries are not plain strings, the invariant must be stated
  against **one named canonical projection** that the renderer itself uses — single source of truth — and
  that function, not an ad-hoc join, is what the snapshot records.
- **Who writes last.** If any post-acceptance pass mutates `state.scenes[i]` (editor, deterministic
  scrub, reflow), the snapshot must be taken after the final writer, or invariant (1) will fail
  intermittently and for a reason that looks like a race. The last writer needs identifying; that is a
  read-only trace, not a design decision.

---

## 2. Attribution as structured sidecar data

Produced **at render time from validated rendered beats** — the one moment when the validated speaker
identity and the exact rendered string both exist.

### Shape

```
attributionSidecar: {
  snapshotSha,                  // binds the sidecar to ONE snapshot; meaningless without it
  entries: [
    { start, end,               // byte offsets into proseSnapshot
      sourceType: 'speaker' | 'narrator',
      speakerId,                // internal role/entity id, e.g. 'li', 'pc', entity key
      speakerDisplay,           // cast-validated display name
      validatedBy,              // the validator that cleared it
      labelSpan: { start, end } | null,   // the rendered "NAME:" prefix, if any
      beatIdx }
  ],
  coverage: 'complete' | 'partial'
}
```

### Rules

- **Offsets, not copied text.** The validator's job is to map a *cited span* to the entry containing it;
  containment on offsets is a deterministic test, whereas re-matching copied text reintroduces string
  guessing.
- **Build-time self-check:** `proseSnapshot.slice(start, end)` must equal the beat's rendered text, for
  every entry. A sidecar that does not satisfy this is rejected at construction, not trusted later.
- **Bound to one snapshot.** `snapshotSha` must match, or the sidecar is discarded. Offsets into a
  different string are worse than no attribution.
- **`narrator` entries carry no speaker.** Absence of a speaker is the record, not a gap to be filled.
- **Never parse identity out of prose.** The `NAME:` prefix is a *rendering of* the sidecar, never its
  source. If a future renderer stops printing prefixes, attribution must be unaffected.
- **`labelSpan` exists to be excluded.** A cited span that overlaps a label prefix must be refused, so a
  quote cannot smuggle attribution into the text it is being checked against. Note the corollary that
  motivates this: a prefix is imitable — an ordinary narration line containing a colon and a quotation
  mark would parse as a label. Presentation cannot carry authority.
- **`coverage`** records honestly whether every rendered segment got an entry. `partial` is usable;
  silence about partiality is not.

---

## 3. What the quote validator does

Current behaviour is a verbatim substring check against the prose it was handed. Revised:

1. **Verify the span against the snapshot**, byte-exact, and against nothing else — not live state, not a
   reconstruction, not a normalized variant.
2. **Reject a span overlapping any `labelSpan`.**
3. **Resolve the speaker only through the sidecar:** find the entry whose `[start, end]` **contains the
   span entirely**.
   - contained in a `speaker` entry with a validated identity → that is the party;
   - contained in a `narrator` entry → **narrator spans remain usable**, on the existing terms: the span
     must explicitly name the party (a roster match) and state the proposition;
   - **no containing entry, a span crossing two entries, or a `speaker` entry without a validated
     identity → `unresolved`.** Never inferred from adjacency, turn order, proximity, or a prefix.
4. **Report the resolution route** on every verified citation (`speaker_sidecar` / `narrator_named` /
   `unresolved`), so a downstream reader can see *how* a party was established, not just that it was.

A span crossing entries being unresolved is deliberate: it is exactly the grok-4.3 Julian case, where one
quoted span bundled a demeanour clause with a speech clause. Under this rule that span resolves nobody.

---

## 4. Historical records stay prose-only

Every accepted scene that exists today predates the sidecar. For those:

- **Mark absence explicitly** — `attributionAvailable: false`. Absence of attribution must never be
  readable as "no speakers were present."
- **Narrator-sourced claims only.** All speech is `unresolved`, permanently, for those records.
- **Do not backfill.** Reconstructing attribution from the retained plan would reintroduce precisely the
  reconstruction defect §1 exists to remove — and the trace established that the plan and the reader text
  *diverge*, so the plan is not evidence of what the reader saw. Re-rendering is no better: a fresh render
  is a new artifact, and nothing can prove it matches what was displayed at the time.
- **Consequence, stated rather than hidden:** the retained four-party fixture yields exactly one claim
  (`LOST_KNOWLEDGE(the assembly, "the accusation")`, narrator-sourced) and will never yield more. Its
  three speech lines are unrecoverable as evidence. That is the honest cost of not manufacturing identity
  retrospectively.

---

## 5. Invoker identity — specified as a separate trace, not performed here

The fixture's `invokerName` was `''`. **That is evidence this path is unproven, not evidence production
lacks an invoker** — the fixture harness never populated `_relLedger`, so the field had no source to read.

This trace is deliberately **not** run in this note; it is a distinct question with a distinct method.

**What to inspect:**
- `_relLedger(false).entities` — where `anchorRole === 'pc'` is assigned, and where `label` is written.
- Whether that assignment precedes scene acceptance, and whether it survives reload/resume.
- `state.picks.identity.playerName` as a competing source, and which of the two the rest of the system
  treats as authoritative — if they can disagree, that is its own single-source-of-truth defect.
- Whether the PC display name used in the **rendered** text is the same string, since the invoker has to
  be nameable in the same terms the evidence uses.

**What would count as proof:** in a *real* accepted scene rather than a harness-built context,
`invokerName` is non-empty at capture and equals the cast-validated PC display name appearing in the
rendered text. Anything less leaves `EXEMPT(invoker)` unable to name its subject.

**What it does not affect:** `EXEMPT(invoker, invoker_anchor)` is licensed by the **mechanic**, not by the
prose. A missing `invokerName` degrades the system's ability to *name* the exempt party; it does not
remove the exemption. So this is a naming defect, not an evidentiary one — which is why it traces
separately.

---

## Sequence

§1 and §2 are independent and can be specified in parallel, but **§1 gates §2**: offsets are meaningless
without a fixed snapshot to index. §3 depends on both. §4 needs no new machinery — only an explicit flag
and the discipline not to backfill. §5 is orthogonal and can run at any time.

Nothing here is built. The blocker at the top stands until §1 and §2 are resolved, and no extractor
replay should be authorized before then.
