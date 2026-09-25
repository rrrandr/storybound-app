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

## FOLLOW-UP: the canary was refused too — OPERATIONAL VERDICT

After **16 minutes of complete Mistral quiet**, one single retained fixture was dispatched as an
access probe (`--canary`). It came back **HTTP 429 `rate_limited`, code 1300** again.
Stopped immediately, seven fixtures never dispatched, **$0.000000 realized**.
Evidence: `_tempt_fate_fixtures/canon_calibration_2026-09-25_01-42-23/`.

### `mistral-small-2603` + `reasoning_effort: "high"` is UNAVAILABLE as a Storybound fallback

This is an **operational** verdict, not an intellectual one. The model may well be suitable for the
canon-auditor role — that remains **untested and unknowable** until the Mistral project's model
access or rate limit is changed. It cannot serve as a fallback that the account cannot reach.

No further retries. Moving on.

### Two inspections, both answered

**Other local traffic on the same account: none.** `ps` did surface a stray process — PID 4830,
`_tempt_outcome_extractor_live_run.mjs`, alive for 17h38m, never exited (a violation of the
harness-must-exit rule). But `lsof` shows it holds **zero sockets and zero child processes**: its
browser is long gone and it has been inert, not consuming quota. Nothing else on the machine holds
a Mistral connection — `vercel dev` has only local listeners, and the unrelated `aicontact` backend
has no outbound sockets at all. **No evidence of local quota contention; the limit is account-side.**
PID 4830 was NOT killed — that needs its own authorization, and it is harmless where it sits.

**Reset/limit headers: the provider published NONE.** The proxy does forward `retry-after` /
`x-ratelimit-*` on a refusal, but `_tieredProviderDispatch` reads only the body and the network gate
records only status+body — so the first run preserved nothing. Runner-side header capture was added
(no production change, no keys logged), and the canary confirms: **no reset, limit, or remaining
value was returned on any response.** There is no published window to wait for.

### Three reporting defects of mine, found by the canary's own output

The canary printed three false things, all from the summariser:

| Printed | Truth |
|---|---|
| `usable responses : 7/8` | **0/8** — one dispatched, seven never sent. `usableResponses` subtracted unavailable+invalid but not skipped, counting seven unsent requests as usable. |
| `INFRASTRUCTURE-INCONCLUSIVE — the local function layer failed` | The local layer **worked** and relayed the provider's real 429. The flag fired on `skipped.length > 0` alone, assuming only the infra fail-fast ever skips. |
| `7 NOT DISPATCHED — run stopped on the local function layer` | Stopped on a **provider** rate limit; the per-fixture skip note also hardcoded the infra reason. |

Plus: in canary mode one 429 must be decisive, so the operational verdict prints rather than
falling through to the infrastructure branch. All four fixed and dry-proven (79/79) against this
run's exact row shape — including the converse, that a genuine 502 run is *still* called
infrastructure-inconclusive. The run's own `report.json` is preserved unedited, with
`SUMMARY_CORRECTION.md` alongside it.

## Where this leaves the question

Three candidates, and the scoreboard is still only two entries long:

| Candidate | Prompt arm | Result |
|---|---|---|
| `ministral-8b-2512` | v1 | REJECTED — 1/4 reds substantively caught, 0/4 greens |
| `gpt-4o-mini` | v1 | REJECTED — 3/4 reds, 0/4 greens, all eight verdicts "violation" |
| `mistral-small-2603` + reasoning high | v2 | **UNAVAILABLE** — provider 429 on all eight AND on a single canary probe after cooldown; $0. Intellectual suitability untested. |

Nothing about v2 has been tested against any model yet.

## Next step — reasoning Mistral is closed until account access changes

No more retries. The blocker is the Mistral project's model access or rate limit, which is an
account-side change, not something further testing can resolve.

The one experiment still standing, unrun and awaiting your call: **gpt-4o-mini against v2** —
reservation basis `$0.00081 x 8 = $0.00648` under the $0.01 ceiling (that is the enforced maximum;
the $0.003121 from its v1 run was a realized measurement, an estimate, never the bound). Its v1
scores are an existing control arm, so this isolates the prompt variable — the only remaining way
to learn whether v2's capability-rooted rule actually changes a verdict.

## Status, unchanged

Production semantic auditor **DISABLED**. Deterministic canon checks **active**. Routing order
untouched. Nothing wired in. No scene generated, no story mutated, no Tempt Fate architecture
reopened.

Suite green: 71/71 · 33/33 · 30/30 · 16/16 · 38/38 · 56/56 · 43/43.
Cumulative session spend unchanged at ≈ **$0.496** — this run added nothing.
