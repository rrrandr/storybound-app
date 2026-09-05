# Authority-Delivery Ledger — design spec (run #1)

**Status:** DESIGN ONLY. Nothing in `app.js` is instrumented yet. Written during a collision window
while a concurrent session edits `app.js`; implement only after that lands and commits are clean.

## The question this run answers

Not "is the issue good?" — that is a separate reading. This run separates two things Storybound has
historically conflated:

> **Storybound failed to tell the model** vs **Storybound told the model correctly and the model disobeyed.**

Those are radically different engineering problems. Everything below exists to tell them apart.

**Current rendering is the CONTROL.** Nothing changes during the run: no camera-ownership flip, no extra
instrumentation, no scanner work. One variable under test.

## Three observations, never collapsed

Each authority records three *separate* things. Collapsing any two into "present" is what hid
`visual_anchor` for weeks.

| Column | Meaning |
|---|---|
| **AUTHORITY VALUE** | what Storybound *decided* (the value at the producer) |
| **PAYLOAD EVIDENCE** | what the model *actually received* (the value found in the final assembled payload) |
| **OUTPUT EVIDENCE** | what *appeared* in the prose/image |

### Verdicts

| Verdict | Condition |
|---|---|
| `DELIVERY_FAILURE` | authority value exists; absent from final payload |
| `COMPILER_FAILURE` | authority travelled but an intermediate layer mutated its meaning before the payload |
| `OBEYED` | delivered, and output materially follows it |
| `MODEL_NONCOMPLIANCE` | delivered clearly, output contradicts or ignores it |
| `AMBIGUOUS` | delivered, but output cannot settle it |

`AMBIGUOUS` must stay honest and common. The tracer is **not** an LLM judge; it must never invent
causality. When in doubt, `AMBIGUOUS`.

Camera additionally carries `AGREE / CONFLICT / UNCOMPARABLE`. That is an **authority-relationship**
diagnostic, *not* a behavioural verdict — keep the columns separate.

## Scope — exactly these seven, run #1

Scoped to authorities where we have **already found a delivery failure** or **suspect authority
competition**. Everything else is deliberately excluded to keep the ledger readable.

| # | Authority | Producer | AUTHORITY VALUE | PAYLOAD EVIDENCE (how) | OUTPUT EVIDENCE (how) |
|---|---|---|---|---|---|
| 1 | **Spine event / location** | spine staging compiler (`state._spineStaging`) | the concrete setting + event | grep the assembled **author** payload for the literal setting noun (e.g. `marketplace`) | does the scene predominantly take place there? |
| 2 | **Scene mission** ⭐ | scene planner → local `sceneMission` | mission string | grep author payload for the mission text under `SCENE MISSION` | does the protagonist pursue that intent? |
| 3 | **`visual_anchor`** | Body Bible (PC/LI/antagonist) | `{focus, detail}` detail string | grep author payload for the **detail value** | does the anchor appear in prose? |
| 4 | **Staging roles** | staged phase schema | `focus`, `actor`, `target`, `anchor`, `subject_positions` | grep the **image** payload for each name + `FOCAL SUBJECT` / `CAST ROLES` | does the rendered image preserve those relationships? (human judgement) |
| 5 | **Camera** | compiler (derived) + planner (`camera_override`) | both cameras + axis | which camera string reached the image payload | is the composition spatially coherent? |
| 6 | **Continuity state** | committed state | 1–2 concrete facts that materially constrain *this* scene | grep author payload for the fact | does the prose respect it? |
| 7 | **Species / visual law** | `_FF_LOOK` / staged species contract | the *applicable* constraint only (not the whole law) | grep image payload for the constraint text | does the render obey it? |

⭐ = the positive control. See preflight.

### Scene-sensitivity gate (required)

**Do not log an authority that has no causal claim on this particular output.** Each row is emitted only
if its authority is *applicable* to the scene:

- continuity fact → only facts that constrain this scene
- species law → only if a non-human is on stage
- staging roles → only if ≥2 figures share the frame
- spine location → only if the spine names a setting

Excluded from run #1 unless the chosen scene materially depends on them: LI/relationship state, weapons,
Fate/wishes, wounds, intimacy state. A ledger full of inapplicable rows is as unreadable as no ledger.

## Preflight — MANDATORY before the paid run

The camera ledger nearly shipped unable to compare underscore enums with prose; every row would have read
`UNCOMPARABLE` while *looking* like a working instrument reporting an inconclusive result. That is the
worst failure mode, because it is indistinguishable from a finding. So:

**The instrument must prove it can detect both presence and absence before it is trusted on anything.**

| Control | Fixture | Required result |
|---|---|---|
| **POSITIVE** | `sceneMission` — value known to travel correctly through a local variable into the author prompt (`app.js` ~248066, `• SCENE MISSION`) | must be detected **DELIVERED** |
| **NEGATIVE** | a synthetic sentinel value injected into no payload (e.g. `zzq-sentinel-4417`) | must be detected **ABSENT** |

**If the positive control reports missing, STOP. Do not interpret any other row.** The instrument is
broken, not the pipeline. Same rule if the negative control reports present (false-positive matching —
likely a substring collision; lengthen the sentinel).

Run preflight free, with `MOCK=1`-style gating or a single cheap scene, before spending the real issue.

## Read protocol — order is load-bearing

```
payload-proof the spine → ownership-clean commits → implement ledger → PREFLIGHT →
one instrumented issue → READ THE LEDGER FIRST → read prose/images SECOND
```

Never invert the last two. Judging the output first biases the diagnosis of whether Storybound even
supplied the information meant to govern it: a good image hides a missing authority, a bad one gets
blamed on the model. **Determine what Storybound TOLD the models before judging what they DID with it.**

## Implementation notes (for when it is time)

- Hook at the **last mutation point before dispatch** — the assembled payload string actually handed to
  the provider, not the builder's intermediate. Anything earlier proves arrival, not delivery.
- Record the payload **verbatim slice** around a hit, not a boolean. A boolean cannot distinguish
  `OBEYED` from `COMPILER_FAILURE`.
- Search for the **VALUE, never the field name**. Serialization may strip names while preserving content;
  finding `visual_anchor` inside instructions proves nothing.
- Emit as one array on `state`, dumped by a console helper (as `window._cgCameraLedgerSummary()` does),
  so a run can be read without re-instrumenting.
- Temporary by design. Remove or flag-gate after the run; do not let it become a subsystem.

## What already exists

- **Camera row is built and vocabulary-tested** — `_cgRecordCameraAuthority` / `window._cgCameraLedgerSummary()`,
  observation-only, declared camera still ships.
- **`visual_anchor` links 1–5 proven statically**; only `CAUSAL EFFECT` is open — this run closes it.
- **Staged composition transport proven statically**; blocking geometry now reaches the production prompt.
- **Spine** needs its payload proof once the concurrent session lands.
