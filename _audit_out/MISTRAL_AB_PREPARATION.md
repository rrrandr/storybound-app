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

## 2. Every permitted candidate is refused by the LOCAL GOVERNOR — and what that figure is

**Correction to my earlier wording.** I called 274,623 a "governor reservation" without saying what
it measures. `reservationFor` (api/_mistral-governor.js:86) is:

```js
for (const m of messages) bytes += utf8Len(m.content);
return bytes + maxTokens;
```

So for the frozen Scene 2 request it is **266,623 UTF-8 bytes + 8,000 reserved output tokens**. It
is a deliberately conservative local admission figure. It is **not** a measured Mistral token count
and **not** a context-window requirement. For the same request Grok reported **59,195 input
tokens** — 4.50 bytes/token — so the reservation is **4.6× the actual usage Grok measured**.

Against that figure:

```
  mistral-small-2603    tpm=   20000  OVERSIZED
  mistral-small-latest  tpm=   20000  OVERSIZED
  mistral-medium-latest UNCONFIGURED — no MODEL_LIMITS entry; refused before dispatch
  mistral-large-latest  UNCONFIGURED — no MODEL_LIMITS entry; refused before dispatch
  ministral-8b-2512     tpm=  625000  admissible
```

**Adding Medium's limits does not by itself make the request admissible.** Two conditions must both
hold, and I will verify them before anything is spent:

1. Medium's recorded **TPM must be ≥ 274,623**, because the governor refuses outright when
   `reserve > limits.tpm` ("a request that cannot fit its model's ENTIRE minute can never be
   admitted, so waiting is not a remedy"). Ministral 8B's 625,000 clears it; Small's 20,000 does
   not. If Medium's TPM is below that, the comparison stays blocked whatever we add.
2. The **current minute must have that much free** in the shared Postgres bucket. Buckets are
   shared — `mistral-small-latest` and `mistral-small-2603` already share one — so any shared
   allowance matters.

Note also that the governor reserves `max_tokens` **in full**, so raising the output allowance for
reasoning raises the reservation one-for-one and makes admission harder, not easier.

## 3. Two further recorded findings that bear on the premise

- **Reasoning on Small 4 is operationally unavailable on this account** (2026-09-24): eight attempts
  plus a canary after 16 minutes of total Mistral quiet all returned HTTP 429 `rate_limited` code
  1300, `"governor": false` — provider-side, not local. $0 spent, since a 429 refuses before
  generation.
- **No cache hits were observed in our earlier Mistral calls** — `cached_tokens` was 0 on every
  one, on 86–93k-token prompts. That is the supported claim. **"Mistral has no prompt caching" is
  not supported and is withdrawn**: current Mistral pricing explicitly includes a cached-input
  rate. This experiment is budgeted with **no cache savings**, which is the prudent assumption for
  a first call on a cold prompt, not a statement about the provider.
- Medium 3.5 list pricing is $1.50/M in / $7.50/M out. An earlier note here called it "not a
  candidate" on price alone. **That judgement is set aside**: the point of this comparison is to
  measure its writing and its actual billed cost, not to reject it beforehand.

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

## 5. Cost estimate — revised, with its uncertainty labelled

**Correction.** My first estimate priced the Mistral arm using **Grok's** 59,195 input tokens.
Different tokenizers need not agree, and no Mistral tokenizer is available locally. Two better
anchors, both from this project's own measurements:

- Mistral's **measured** `prompt_tokens` on comparable author legs: **85,978** and **92,123**.
- This request is 266,623 UTF-8 bytes; at 3.1–3.2 bytes/token that is **~83,000–86,000 tokens**,
  consistent with those measurements.

So Mistral reads this request as roughly **1.4× more tokens than Grok does** — the single largest
correction to the estimate.

| | tokens | medium 3.5 | note |
|---|---|---|---|
| input | ~83,000–86,000 | $0.1250–$0.1290 | estimated from bytes, anchored on measured Mistral author legs; **not** Grok's count |
| output | ~6,250 | $0.0469 | prose ~1,350 + **reasoning ~2,500 + beat metadata ~2,400** — the allowance covers all three, and only the prose is counted as writing |
| **Mistral arm** | | **~$0.172–$0.176** | vs my earlier $0.1225 — I underestimated by ~40% |

| component | cost |
|---|---|
| fresh opening through Scene 2 committed (22 calls, measured) | $0.4455 |
| 700–1000-word target delta on the Grok author call | $0.0128 |
| Mistral arm (above) | $0.1760 |
| retained-unresolved allowance | $0.0134 |
| **total** | **~$0.648** |

Committed to date **$9.3054242**. With ~15% contingency on an estimate this uncertain, the ask is a
cumulative ceiling of **$10.10**. The remaining $0.1945758 is not permission to begin.

## 5b. The exact version must be pinned, not an alias

`mistral-medium-latest` is a drifting alias; a comparison recorded against it is not reproducible.
Before dispatch I need the **pinned snapshot id** (e.g. `mistral-medium-<YYMM>`) that the account
currently serves, and it goes in the allowlist and the limits entry. If only the alias is
dispatchable, the proxy's echoed `resolvedModel` becomes the identity of record and will be
reported as such for both arms.

Historical Small-model 429s do **not** establish anything about Medium's availability or its
writing. That was my inference and it is withdrawn.

## 6. What the comparison would and would not establish

One pair is a diagnostic comparison. It would not establish a winning model, a good ten-scene story,
or suitability for explicit scenes — this scene is non-explicit. Length is necessary but not
sufficient: 800 words of repeated stillness is not success. The reported measures will be
reader-facing word count (prose only, never reasoning or metadata), whether interactions develop
through action → response → consequence, repetition and replay of the completed opening, continuity,
speaker attribution, schema validity, latency, and total billed cost including reasoning — with
requested and returned model identities recorded and automatic fallback disabled for both arms.

---

# REVISED SCOPE (2026-10-11): THREE AUTHORS, ONE FROZEN REQUEST

Medium is **out** of this experiment and I have stopped waiting for its limits. The earlier
exclusion of Ministral is **withdrawn**. Three arms, one identical assignment:

| arm | model | source of the response |
|---|---|---|
| A/B/C | Grok 4.3 | the fresh run's **own** Scene 2 response — not paid for twice |
| | `ministral-8b-2512` | one call on the frozen request |
| | `ministral-3b-2512` | one call on the frozen request |

## Admission verified against the real governor, before spending

Frozen Scene 2 request, 266,623 UTF-8 bytes; reservation = bytes + `max_tokens`.

```
max_tokens=8000  -> reservation 274,623
  ministral-8b-2512   tpm=  625000  rps= 3.13  bucket=ministral-8b-2512  ADMISSIBLE
  ministral-3b-2512   tpm= 1300000  rps=12.50  bucket=ministral-3b-2512  ADMISSIBLE
max_tokens=12000 -> reservation 278,623   both still ADMISSIBLE
```

Both limits are **already recorded account facts** —
`source=https://admin.mistral.ai/plateforme/limits`, `readOn=2026-09-04` — so nothing is invented.
The two arms sit in **separate buckets**, so they cannot contend with each other.

**One minimum provider-interface change is required:** `ministral-3b-2512` is in `MODEL_LIMITS` but
not in the proxy allowlist (`api/mistral-proxy.js`), so it would be rejected before the governor saw
it. Adding it is the only change; production routing is untouched.

## Model facts, from this project's verified routing matrix (not inferred from names)

| model | ctx | structured outputs | `reasoning_effort` | price /M |
|---|---|---|---|---|
| `ministral-8b-2512` | 256k | yes | **no** | $0.15 |
| `ministral-3b-2512` | 256k | yes | **no** | $0.10 |

**Neither Ministral accepts `reasoning_effort`** — it exists only on Small and Medium. So "reasoning
where applicable" is **not applicable** to either arm, which also avoids the recorded trap where a
prompt omitting the field is silently served as ordinary non-reasoning Mistral. 256k context
comfortably holds the ~83–86k tokens this request is estimated at.

Fallback is disabled per call via `extra.noFallback` → `_gBody._noFallback`, and the response's
`upstreamAttempts` must come back as exactly 1 — so which model wrote each result is verifiable from
the response, not assumed.

## One total estimate

| component | cost |
|---|---|
| fresh opening through Scene 2 committed (22 calls, **measured**) | $0.4455 |
| 700–1000-word target delta on the Grok author call | $0.0158 |
| `ministral-8b-2512` arm (83–86k in + 3,750 out @ $0.15/M) | $0.0135 |
| `ministral-3b-2512` arm (83–86k in + 3,750 out @ $0.10/M) | $0.0090 |
| retained-unresolved allowance | $0.0146 |
| **total, upper end** | **$0.4983** |

Input tokens are **estimated** from the byte count and anchored on this project's measured Mistral
author-leg `prompt_tokens` (85,978 / 92,123) — **not** on Grok's 59,195. No cache savings assumed.
Output allowance covers prose (~1,350) plus beat metadata (~2,400); only the prose will be counted
as writing.

Committed to date **$9.3054242**. With 15% contingency that is **$9.8785**, so the ask is a
cumulative ceiling of **$9.90**. The current $9.50 leaves $0.1945758, which is not enough. This is a
scope change, not an open-ended increase.

## What will be reported

Three complete passages, labelled A/B/C with identities revealed afterwards, judged on: substantial
development through interaction and consequence; continuity and whether the completed opening is
replayed; character-specific dialogue, attribution and repetition; reader-facing word count and
schema validity; actual tokens, cost and latency. An invalid or truncated response is a reported
result, not permission to repair it. No winner declared from length alone, and no generalisation
from one sample.
