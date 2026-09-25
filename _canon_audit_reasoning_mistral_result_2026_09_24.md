# Reasoning Mistral calibration — NO DATA (provider-inconclusive)

Run 2026-09-25 01:25:12, pinned to `mistral-small-2603` + `reasoning_effort: "high"`, prompt arm
**v2**. Evidence: `_tempt_fate_fixtures/canon_calibration_2026-09-25_01-25-12/`.

**Reported independently of both `ministral-8b-2512` and `gpt-4o-mini`. Scores are not merged, and
there is no score to merge.**

## Result: NOT A MODEL RESULT

All eight fixtures returned **HTTP 429 `rate_limited`, code 1300**, from Mistral's API.
`"governor": false` — this was the provider refusing, not our local quota governor.

```
usable responses   0/8          reds caught 0/4        greens passed 0/4
dispatches         8            reserved $0.013200 of $0.020000
REALIZED cost      $0.000000    0 tokens in / 0 out
```

**$0 was spent.** A 429 is refused *before* generation — the proxy's own accounting classes it as
proven-unspent and releases the reservation. The $0.01320 figure is the reservation, not a charge.

This says **nothing whatsoever** about reasoning Mistral as a canon auditor. It is not a pass, not
a failure, and must never be cited as one. Reasoning Mistral remains **untested**.

## What the run DID prove

The request itself was exactly right. Every outgoing body carried:

```json
{ "model": "mistral-small-2603", "reasoning_effort": "high", "max_tokens": 2000 }
```

The pre-dispatch enforcement, the single-tier pin, the endpoint lock and the $0.02 ceiling all held.
No fallback to Ministral, Grok, OpenAI or an alias was attempted. The plumbing works; the provider
was simply closed for business.

## Two defects of mine, both exposed by this run

### 1. The fail-fast did not cover a provider rate limit

I built the infra fail-fast after the last wasted run, and scoped its signature to **502 +
`NO_RESPONSE_FROM_FUNCTION`**. A 429 is neither. So the rule never fired and the run sent **eight
requests into a wall that had already refused the first one** — the exact "six pointless
dispatches" defect, wearing a different status code.

Fixed: `isRateLimited()` + `RATE_LIMIT_STOP_AFTER = 2`, kept as its **own state** rather than folded
into infra. The two are genuinely different: a dead local function layer will not fix itself, while
a 429 is provider-side, time-dependent, and free. The summary now reports
**PROVIDER-INCONCLUSIVE** distinctly, and such a run can never read as ENABLE.

### 2. The report claimed model identity over an empty set

The run printed:

> `model identity : clean — every served response was mistral-small-2603 at reasoning_effort=high`

for a run in which the provider served **nothing**. Both mismatch filters were empty, so the
conjunction was vacuously true. That is exactly the kind of line that would later be quoted as
evidence the model was tested.

Fixed: identity is now checked against a **served** count, and an unserved run prints
`NOT CHECKABLE — 0 of 8 fixtures were served; there is nothing to verify`.

### 3. (Test hygiene) A "retained" artefact that another control rewrote

The v2 control proved the packet fix against
`_canon_packet_polarity_out/green_mundane_invention_packet.json` — a file the polarity diagnostic
**regenerates on every run**. Once the fix landed it was no longer a pre-fix artefact and the
assertion went red for the right reason. A file a test rewrites is not evidence. It now reads the
prompt **as actually sent** in the paid gpt-4o-mini run, preserved under `_tempt_fate_fixtures` and
never rewritten.

## Where this leaves the question

Three candidates, and the scoreboard is still only two entries long:

| Candidate | Prompt arm | Result |
|---|---|---|
| `ministral-8b-2512` | v1 | REJECTED — 1/4 reds substantively caught, 0/4 greens |
| `gpt-4o-mini` | v1 | REJECTED — 3/4 reds, 0/4 greens, all eight verdicts "violation" |
| `mistral-small-2603` + reasoning high | v2 | **NO DATA** — provider 429 on all eight, $0 |

Nothing about v2 has been tested against any model yet.

## Next step needs your authorization — I am not re-running anything

The rate limit is time-dependent, so the same run may simply work later. I have **not** retried, and
I have **not** touched the environment, restarted the dev server, or changed any configuration.

Two options, both priced honestly (reservation basis = enforced maximum, not a realized estimate):

- **Re-run reasoning Mistral** as specified — `$0.00165 x 8 = $0.01320` under the $0.02 ceiling.
  Now with the rate-limit fail-fast, a repeat refusal stops after two, not eight.
- **gpt-4o-mini against v2** — `$0.00081 x 8 = $0.00648` under the $0.01 ceiling. Its v1 scores are
  an existing control arm, so this isolates the prompt variable. You ordered reasoning Mistral
  first, so this stays unrun unless you say otherwise.

A standing rate limit may also indicate something else on the account is consuming Mistral quota.
That is worth checking before spending again, and it is not something I should investigate by
firing more requests.

## Status, unchanged

Production semantic auditor **DISABLED**. Deterministic canon checks **active**. Routing order
untouched. Nothing wired in. No scene generated, no story mutated, no Tempt Fate architecture
reopened.

Suite green: 71/71 · 33/33 · 30/30 · 16/16 · 38/38 · 56/56 · 43/43.
Cumulative session spend unchanged at ≈ **$0.496** — this run added nothing.
