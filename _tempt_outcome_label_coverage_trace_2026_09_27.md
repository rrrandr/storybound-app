# Label-coverage trace — is a validated speaker identity available to the extractor?

Read-only. No model call, no production change, no fix. Reproducible via `_label_coverage_trace.mjs`
and `_beat_shape_probe.mjs` (both read-only probes; delete them if you'd rather not keep them).

## Answer

**No. The staged speaker mechanism is not reachable by the extractor — and not because the identity
doesn't exist. It exists, it is validated, it is persisted, and the reader sees it. The extractor is
pointed at a different builder that drops it.**

`0 of 6` speech claims across the retained accepted scenes arrive with an authoritative speaker
identity bound to their span. All 6 identities are known upstream and all 6 are discarded in transit.

## The chain, traced end to end

The extractor's context (`_tfoBuildExtractionContext`, `public/app.js:191723`) carries exactly two
evidence channels:

- `prose` — a **flat string**
- `roster` / `rosterNames` — party names with provenance

**There is no beat array, no panel structure, and no per-line attribution field of any kind.** Verified
against the live context of the last paid run: its keys are `architectureV, bargainId, capturedAt,
invokerName, proposalId, prose, requestedScope, roster, rosterNames, sceneIdx, sceneUid, sealedAtScene,
storyId, v, wishText`. Nothing matching `beat`, `panel` or `speaker`.

So a speaker identity has exactly one possible route into the extractor: the `Name: ` prefix that
`_extractCGSceneText` writes. That branch is gated on **`beat.dialogue`**:

```js
if (typeof b.dialogue === 'string' && b.dialogue.trim()) {
  var sp = (typeof b.speaker === 'string' && b.speaker.trim()) ? b.speaker.trim() + ': ' : '';
  parts.push(sp + '"' + b.dialogue.trim() + '"');
}
```

**The author never populates `beat.dialogue`.** In the retained four-party plan, the dialogue beats look
like this:

```json
{"idx":6, "kind":"dialogue", "speaker":"the presiding Dohkar", "text":"\"What gathering is this?\""}
```

`kind: "dialogue"` ✓, `speaker` ✓ and **validated** — but the speech text is in **`text`**, and
`dialogue` is `undefined`. So the labelled branch never fires, the line falls through the `b.text`
branch as ordinary narration containing quotation marks, and the speaker is dropped.

**The divergence this creates, against the code's own stated invariant.** The comment at the call site
(`public/app.js:236694`) says:

> `_extractCGSceneText` is the production reader-facing text builder: it carries speaker-attributed
> dialogue as well as narration… **The extractor must see exactly what the reader saw, or its citations
> cannot match.**

It does not. The persisted scene — `state.scenes[last]`, which is what the reader actually read and what
the live run captured as `renderedSceneText` — contains:

```
The presiding Dohkar blinks as if waking.

THE PRESIDING DOHKAR: "What gathering is this?"
```

The extractor received:

```
The presiding Dohkar blinks as if waking.
"What gathering is this?"
```

**The authoritative labelled text is already persisted in `state.scenes`. The extractor is handed a
separate, label-stripped reconstruction built from the plan instead.**

## 1–3. Counts across the retained accepted scenes (n = 3)

| | count |
|---|---|
| **1. speech claims with an authoritative persisted speaker identity available to the extractor** | **0 / 6** |
| **2. explicit narrator assertions naming party **and** proposition** | **1** licensable (of 2 marker-bearing) |
| **3a. unlabelled speech reaching the extractor, attributable only by adjacency** | **6** |
| **3b. upstream metadata absent from extractor context** — speaker identities the plan knows | **6**, of which **6 dropped** |
| 3b (cont.) — per-line attribution structure in the context | **none exists at all** |

Per scene:

| scene | dialogue beats (plan) | with speaker | labels reaching extractor | narration parts | quoted-in-narration |
|---|---|---|---|---|---|
| `run_2026-09-24_02-11-02_scene_a` | 3 | 3 (`the presiding Dohkar`, `Seren`, `Julian`) | **0** | 18 | 3 |
| `run_2026_09_23_scene_a_no_commit` | 3 | 3 (`the presiding Dohkar`, `li`) | **0** | 38 | 3 |
| `scene_b_2026-09-24_08-41-30` | 0 | 0 | 0 | 24 | 0 |

**On the narrator count — why 2 marker-bearing assertions yield only 1 licensable claim.** The two are:

- ✅ *"The assembly settles into confusion that carries no memory of accusation."* — names a roster party
  (`the assembly`) and a proposition slot (`accusation`). **Licenses `LOST_KNOWLEDGE(the assembly,
  "the accusation")`.**
- ❌ *"No one remembers what was wished."* — carries a retention marker but names **no party**. "No one"
  is an open quantifier, not a roster member, so it resolves nobody. It also illustrates the
  population-closure problem directly: the prose asserts something about *everyone* and thereby about
  no identifiable one.

So across **3 accepted scenes, 80 narration parts and 6 dialogue beats: 1 committable claim.**

Note the `li` speaker in the second scene: an internal role token, not a cast display name. Even were the
label channel wired, a raw `li` would need cast resolution before it could name a party.

## 4. The four-party fixture — exactly what would reach the observation extractor, adding no data

**Identities that arrive** (as roster membership, with provenance):

| party | source | bound to a span? |
|---|---|---|
| `the assembly` | `declared_collective` | — (named literally in its own narration line) |
| `the presiding Dohkar` | `beat_speaker` | **no** |
| `Seren` | `beat_speaker` | **no** |
| `Julian` | `beat_speaker` | **no** |
| invoker | `invokerName` is **`''`** — empty | **no** |

This is the precise distinction the trace was asked to test. Three identities *do* survive into the
extractor — via `beat_speaker` — but only as **"this party spoke somewhere in this scene."** That is
roster membership, not attribution. It cannot bind *"What gathering is this?"* to the Dohkar rather than
to Seren or Julian without exactly the adjacency inference the design refuses.

`invokerName` being empty means even the `EXEMPT(invoker)` system-default claim cannot name its subject
in this context. **Unverified for production:** `invokerName` is read from `_relLedger` entities with
`anchorRole === 'pc'`, which the fixture harness never populated. Whether production fills it is a
separate check this trace did not make.

**Evidence that arrives:** the 813-character label-stripped prose, 18 narration parts, 3 of which contain
unattributed quoted speech.

**Safe yield for this fixture: 1 claim** — `LOST_KNOWLEDGE(the assembly, "the accusation")`, narrator-
sourced. Scope `undetermined`, three parties unaccounted.

## Safe yield by source type

| source | yield (this fixture) | yield (3 scenes) | why |
|---|---|---|---|
| **narrator** | **1** | **1** | the only channel that works today; the party must be named literally in the span, which narration sometimes does |
| **speaker** | **0** | **0** | the label branch is gated on `beat.dialogue`, which the author never populates; 6/6 identities dropped |
| **system default** (invoker exempt) | **0** | **0** | `invokerName` empty in this context; production behaviour unverified |

## What this does and does not establish

**Established, from evidence rather than assumption:**
- The extractor context has no attribution channel other than text prefixes in a flat string.
- The identity exists upstream, is validated, is persisted in `state.scenes`, and is visible to the reader.
- It is dropped by a field-name mismatch — `kind:'dialogue'` + `text` produced, `dialogue` expected — so
  the gap is **one unexercised branch wide**, not architectural.
- The extractor therefore does **not** see what the reader saw, contradicting the invariant asserted in
  the code at that call site. That divergence exists today, independently of this design.

**Not established:**
- Whether any other author path or render mode populates `beat.dialogue`. All three retained scenes come
  from the same First Sacrifice CG path, so n = 3 from one story and one pipeline.
- Whether `invokerName` is populated in production.
- Whether a `Name: ` text prefix would even be *authoritative* if the branch did fire: it would arrive as
  a parseable convention inside prose, not as structured metadata, and a narration line containing a
  colon and a quotation mark could imitate it. Reaching a genuinely authoritative channel may require
  carrying attribution as a field, not as a prefix.

## Bearing on the build decision

The conservative design's speech-sourced half currently yields **zero**, and its narrator-sourced half
yields **one claim across three scenes**. On today's wiring the design would commit one effect per two or
three Tempt scenes — too thin to justify an extraction call.

But the cause is not that the evidence is absent. It is that a validated identity the reader can see is
discarded between the plan and the extractor. **Whether to rewire that is a product/engineering decision
this trace does not make**, and the two open questions from the design note — speaker-label coverage per
render mode, and whether a thin yield justifies the call — now have their first real measurement rather
than an assumption.

Stopping here.
