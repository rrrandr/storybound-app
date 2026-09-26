# Extractor replay — RESULT (pinned, one request) and bounded prompt diagnosis

**One dispatch of one permitted.** `ministral-8b-2512`, HTTP 200, 26.4s, `prompt_tokens 2005`
(identical to the original), **`completion_tokens 1342`**, reserved $0.001020 of $0.002. No fallback,
no retry, no scene generation, `state unchanged: true`.

## Recorded result

| Dimension | Result |
|---|---|
| Parsing | **PASS via fence recovery** — the reply was markdown-fenced despite "No markdown", so the direct `JSON.parse` failed and the regex fallback succeeded |
| Citation compliance | **FAIL** — all four knowers omitted `evidenceQuote` |
| Schema validation | **FAIL** — `knowledgeStates[2].state` invalid |
| Commitment | **NONE** — validator refused; fail-closed held |
| Semantic accuracy | **UNVERIFIED** |

## Two claims of mine, withdrawn

**"The budget fix worked" is NOT established.** The response finished at **1342 completion tokens —
below the old 1400 limit** — so it would have fit the previous ceiling too. A complete response was
observed; it cannot be attributed to the increase. The 3200 limit remains a reasonable correction to an
observed truncation, but this run does not demonstrate that it caused anything.

**"Ministral will not cite" overstates one sample.** The measured result is: **citations were absent in
both observed samples under this prompt** (`daefe5aa` and this replay).

**Semantic accuracy is UNVERIFIED, not "strong".** I called the narrower reading convincing. It is not
verified, and the reason is exactly why citations matter: **suspicion or composure does not establish
that a character remembers the erased event.** Julian `suspects` and Seren appearing composed are
consistent with remembering AND with noticing residue without memory. Without the supporting passages
the distinction cannot be checked — which is the whole point of `evidenceQuote`.

## Bounded prompt diagnosis — both failures are PROMPT defects

### `evidenceQuote`: the output schema never asks for it

The system prompt's `affectedKnowers` **schema line** (line 33) enumerates exactly five fields:
```
{ "who", "disposition", "memoryAbsent", "suspicionFromResidue", "nowKnows" }
```
`evidenceQuote` appears **only in a prose bullet** (line 15: *"EVERY entry in affectedKnowers … MUST
include evidenceQuote"*). It is **absent from the JSON shape the model is shown**.

The returned object matched that schema **exactly** — all four knowers returned all five schema fields,
**zero missing, zero extra**. The model complied with the copyable artifact and ignored the prose
demand, while the validator enforces the prose demand.

**This is the same class of defect as `2e19c342`** — a requirement the validator enforces but the shape
the model receives does not carry. There it was a builder no prompt called; here it is a prose/schema
split inside one prompt.

### `knowledgeStates[2].state`: two adjacent enums that overlap

```
knowledgeStates.state       : knows | remembers | believes | suspects | unaware      (line 22)
affectedKnowers.disposition : forgot | retained | partial | suspects | resisted | exempt | absent  (line 33)
```
Returned: `[0] the assembly → unaware` · `[1] the presiding Dohkar → unaware` ·
**`[2] Seren → 'retained'`** · `[3] Julian → suspects`.

`retained` is a valid **disposition**, not a valid **state**. The model borrowed from the neighbouring
enum — and **`suspects` appears in BOTH lists**, which is the overlap that invites exactly this
confusion. Julian drew the value valid in both; Seren drew the one valid only in the other.

## Status

No prompt rewrite, no second-pass architecture, no model change, no paid call. The two defects are now
named precisely enough to be fixed as a bounded change whenever that is authorized — the citation field
belongs in the schema, and the two enums need disambiguating — but neither is attempted here.

Artifacts: `_tempt_fate_fixtures/extractor_only_2026-09-26_23-42-18/` (response, both prompts, context,
gate log, report). The original `daefe5aa` response is untouched.
