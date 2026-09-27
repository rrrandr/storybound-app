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

---

# BOUNDED PROMPT CORRECTION (dry) AND SECOND-REPLAY PROPOSAL

## Evidence described accurately

- **Citation instructions and the output schema were INCONSISTENT.** `evidenceQuote` was demanded in a
  prose bullet and absent from the `affectedKnowers` shape. It was shown — in prose — not withheld
  entirely; my "never actually shown" overstated it.
- **Enum confusion occurred; its CAUSE is not established.** Both enums were supplied correctly, each
  beside its own field. The model put a valid `disposition` value (`retained`) into `state`. Sharing
  `suspects` does not make the lists contradictory, and I withdraw the suggestion that overlap caused
  it. What is observed is the misplacement, not its reason.

## The two changes, shown explicitly

Exactly two schema lines replaced; the system prompt grew 7,535 → 8,550 chars. Everything else —
including the entire user message carrying the retained prose — is byte-identical.

**1. `affectedKnowers` — the citation field is now IN the output shape**, carrying the requirement it
already had: required for every entry except one whose disposition is `"absent"`; 10–120 characters
copied exactly and checked verbatim; and an uncitable party goes to `unaccountedParties` rather than
receiving an invented quote. The line also now states that **disposition describes what the rupture
DID to the party**, that it is a different field from `knowledgeStates.state`, and that a value from
one is never valid in the other.

**2. `knowledgeStates.state` — labelled beside its own field**: it describes what the party KNOWS, its
only permitted values are the five on that line, and using an `affectedKnowers.disposition` value there
is prohibited by name. **Both enums are preserved intact, overlap included** — `suspects` remains
available to both, which the line says explicitly is not a licence to interchange them.

**The validator is unchanged.**

## Dry results

| Control | Result |
|---|---|
| `_tempt_fate_outcome_contract_control` (extended, not duplicated) | **62/62** |
| `_tempt_outcome_extractor_replay_dry_proof` | **28/28** |
| `_tempt_outcome_extractor_runner_dry_proof` (rejection tests retained) | **51/51** |
| `_tempt_fate_outcome_integration_control` | **73/73** |

The contract control now inspects the **real extractor request** for the citation field with its
conditional and verbatim constraints, and for both field-specific enums with the no-transfer rule — via
the same `required` list and the same prompt builder it already used. No second schema checker was
introduced. Rejection tests for missing quotes, fabricated quotes and invalid states are retained and
still pass.

## Second-replay proposal

Same retained prose, same model, same temperature, same 3200 limit; only the two schema lines differ,
and that difference is asserted line by line. Configuration otherwise unchanged: pinned to
`ministral-8b-2512` on `/api/mistral-proxy`, **one provider request**, no cascade, no retry.

- **Single-call reservation $0.001020**, replay ceiling **$0.002**
- Transport failure → **NO DATA**; malformed or uncited → **FAILED SAMPLE**
- Report parsing · citation validity · schema validity · semantic accuracy **separately**

**Proposed phrase** (the previous replay phrase is spent):
```
replay the extractor once more against the retained prose with the corrected schema, pinned to ministral-8b-2512, one provider request only, $0.002 reservation
```

**What it can and cannot settle.** It can show whether this model supplies citations and a valid `state`
when the schema asks for them in the shape. It cannot establish that semantic accuracy is right even if
it does — the citations then make that a checkable human read, which is the point. One sample, one prose
fixture, one model.

**No paid call made. Nothing authorized by this section.**
