# Grok vs Mistral author comparison — provider-free preparation

$0 spent. No provider call made. No production routing changed.

## 1. There is no separate Mistral reasoning model

Established and recorded in this project (`project_mistral_thinking_evaluation`, probe 2026-08-15):

> Magistral is deprecated (retired 2026-07-31); reasoning is a parameter on Small 4 / Medium 3.5,
> not a separate model.

So the arm cannot be "a stronger Mistral reasoning model" — it has to be a stronger *model* with
`reasoning_effort` set. Candidates on the proxy allowlist (`api/mistral-proxy.js`):
`mistral-medium-latest`, `mistral-large-latest`, `mistral-small-latest`, `mistral-small-2603`,
`ministral-8b-2512`.

**Response format is already solved, verified:** with reasoning on, `choices[0].message.content` is
an **array of blocks** (`{type:'thinking'}` + `{type:'text'}`). `_flattenProviderContent` normalises
it in one place — text blocks concatenate into the string consumers expect and thinking is returned
separately as `.thinking`. So reasoning is never counted as prose. The proxy forwards
`reasoning_effort` (`none|low|medium|high`) and echoes it back as
`_orchestration.reasoning_effort`.

⚠️ Recorded trap: the proxy auto-defaults `reasoning_effort=high` **only** for author-class payloads
(detected by the "STORYBOUND ARCHITECTURE LAWS" system prompt). Any other prompt omitting the field
is served as ordinary non-reasoning Mistral with no error.

## 2. EVERY PERMITTED CANDIDATE IS REFUSED BEFORE DISPATCH — measured

Run against the **real governor** (`api/_mistral-governor.js`) with the **real frozen request**
(Scene 2's author messages from `wire/017_req.json`, `max_tokens=8000`):

```
governor reservation: 274,623 tokens

  mistral-small-2603    tpm=   20000  OVERSIZED — reservation exceeds the whole minute
  mistral-small-latest  tpm=   20000  OVERSIZED — reservation exceeds the whole minute
  mistral-medium-latest UNCONFIGURED — no MODEL_LIMITS entry; refused before dispatch
  mistral-large-latest  UNCONFIGURED — no MODEL_LIMITS entry; refused before dispatch
  ministral-8b-2512     tpm=  625000  admissible
```

- The Small models are configured at **20,000 TPM** against a 274,623-token reservation. The
  governor's own comment is explicit that this is not a waiting problem: "A request that cannot fit
  its model's ENTIRE minute can never be admitted, so waiting is not a remedy."
- Medium and Large have **no `MODEL_LIMITS` entry**, so admission returns `UNCONFIGURED` and the
  call never reaches the provider. The governor requires `tpm`, `rps`, `source` and `readOn`.
- `ministral-8b-2512` is the only admissible route, and it is excluded by instruction.

**So the comparison cannot be dispatched on any permitted model.** I am not requesting a ceiling for
a run that cannot happen.

## 3. Two further recorded findings that bear on the premise

- **Reasoning on Small 4 is operationally unavailable on this account** (2026-09-24): eight attempts
  plus a canary after 16 minutes of total Mistral quiet all returned HTTP 429 `rate_limited` code
  1300, `"governor": false` — provider-side, not local. $0 spent, since a 429 refuses before
  generation.
- **Mistral gave no prompt caching**: `prompt_tokens_details.cached_tokens` was 0 on *every* Mistral
  call measured, on 86–93k-token prompts. Grok 4.3 reads cache at $0.20/M against its $1.25/M
  input. Medium 3.5 at $1.50/M in / $7.50/M out was already assessed here as "worse than Grok on
  both sides — not a candidate".

## 4. What unblocks it — one decision

The governor needs the **real account limits** for the model to be compared, from
`admin.mistral.ai/plateforme/limits`, which only you can read:

```
'mistral-medium-latest': { tpm: <TPM>, rps: <RPS>, source: '<url>', readOn: '<date>' }
```

That is a configuration addition of measured account facts — not a routing change and not a model
switch. With it, `mistral-medium-latest` + `reasoning_effort:'high'` becomes dispatchable and the
comparison can run.

If those limits are not available, the alternatives are both outside the brief: use
`ministral-8b-2512` (excluded by instruction), or raise the Small models' recorded TPM (which would
be recording a limit we have not verified — not acceptable).

## 5. Cost estimate, ready for when it is unblocked

Measured from `run_2026-10-11T01-54-31-949Z`. The Grok arm is the fresh run's own Scene 2 response,
so it is not paid for twice.

| component | cost |
|---|---|
| fresh opening through Scene 2 committed (22 calls) | $0.4455 |
| 700–1000-word target delta on that author call | $0.0128 |
| Mistral arm, same frozen request (medium 3.5: 59,195 in @ $1.50/M, ~4,500 out @ $7.50/M, no caching) | $0.1225 |
| retained-unresolved allowance | $0.0134 |
| **total** | **$0.5942** |

Committed to date **$9.3054242**, so this needs a cumulative ceiling of **$10.00** ($0.69 headroom,
~16% above the projection). The remaining $0.1945758 is not permission to begin.

For reference, the same frozen request on `mistral-small-2603` would be $0.0116 — but it is
OVERSIZED and cannot be dispatched.

## 6. What the comparison would and would not establish

One pair is a diagnostic comparison. It would not establish a winning model, a good ten-scene story,
or suitability for explicit scenes — this scene is non-explicit. Length is necessary but not
sufficient: 800 words of repeated stillness is not success. The reported measures will be
reader-facing word count (prose only, never reasoning or metadata), whether interactions develop
through action → response → consequence, repetition and replay of the completed opening, continuity,
speaker attribution, schema validity, latency, and total billed cost including reasoning — with
requested and returned model identities recorded and automatic fallback disabled for both arms.
