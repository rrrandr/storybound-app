# grok-4.7 vs v3 — best accuracy yet, but the run OVERSPENT and cannot prove its own model

Run 2026-09-25 08:35:03, prompt arm **v3**, `preferredModel: grok-4.7` + `_sbModelOverride:
grok-4.7` + `reasoningEffort: high` on every wire, single client tier.
Evidence: `_tempt_fate_fixtures/canon_calibration_2026-09-25_08-35-03/`.

**I have to lead with the two failures, not the score.**

## 1. COST OVERRUN — $0.192290 realized against a $0.160000 ceiling

Reserved $0.150400. **Realized at least $0.192290 — 20% over the ceiling.** The true figure is
higher still, because `cost_in_usd_ticks` only reports the *successful* upstream call; the failed
hang-guard attempts are not counted anywhere.

Cause: **24,393 reasoning tokens.** I set `max_tokens: 2000` and priced the reservation at that
bound, on the belief it caps output. On xAI it does not cap *reasoning* — one fixture alone burned
6,292 reasoning tokens, more than 3x the entire supposed output budget. My whole cost discipline
this session has been "reserve at the bound", and **the bound was not a bound.**

The reservation ledger is pre-dispatch. It can refuse to *start* a call; it cannot cap what the
provider then spends. I did not state that limitation clearly before authorizing, and it is the
difference between a ceiling and an estimate.

## 2. THE RUN CANNOT PROVE WHICH MODEL ANSWERED

`model identity: MISMATCH` on 7 of 8 — served names came back as `grok-4-1-fast-reasoning`,
`grok-4-1-fast-non-reasoning`, `grok-4.3`. Tracing it:

- `api/proxy.js` echoes `_orchestration.model = selectedModel`, which is the **chain entry label**,
  not the model `_resolveGrokModel` actually called. So the echo was never evidence.
- `preferredModel` only reorders the chain **if it is already in that role's chain**. `grok-4.7`
  is allowlisted but in no role chain, so the reorder **silently did nothing** and the default
  legacy chain ran.
- `_sbModelOverride` *did* apply, rewriting every chain entry to `grok-4.7` — so the calls almost
  certainly went to 4.7. **Almost certainly is not proof**, and proof was the requirement.

Worse, the chain's own retries mean **"no fallback" was violated at the proxy layer**. My
single-tier client pin controls `_callTieredProvider`; it has no authority over `api/proxy.js`'s
internal multi-model chain, which retried after each 90s hang-guard timeout. Every retry is
billable and invisible to my ledger. That is the real source of the overrun.

Both observability holes are now fixed — the proxy reports `resolvedModel`, `reasoningEffort` and
`upstreamAttempts`, and warns when a `preferredModel` is silently ignored. **Too late for this
run.**

## 3. LATENCY — disqualifying on its own

| | |
|---|---|
| Greens | 19.2s, 20.0s, 36.3s, 44.9s |
| Reds | 142.3s, 162.7s, 255.0s, **278.9s (timed out)** |

Median ~90s. The fastest response was **19 seconds**. As a pre-author gate this is not viable even
selectively: a risk-triggered audit that fires on the riskiest 10% of scenes would still add one to
five *minutes* to those generations.

## The score, for completeness

**Strict v3: 3/4 reds caught, 0 unsupported citations, 4/4 greens, 1 unavailable.**
ENABLE: **NO** — blocked by the unavailable fixture (`red_memory_extraction`, hang-guard timeout,
an infrastructure failure and not a merit failure).

**Human semantic reading: 7/7 on everything that returned.** Every green correctly passed, every
red that answered was correctly caught with a properly supporting citation.

**False positives: 0. Unsupported citations: 0.**

That zero is the headline for v3: grok-4.3 and Haiku each produced 2 unsupported findings under v2.
With the corrected packet and assertion-based rubric, the same class of model produced **none** —
the `other`/`neg_0` catch now counts because the fact genuinely forbids convening the inquiry, and
nothing leaned on `ev_0`, because v3 no longer tells the auditor a moment is a rule. **Your
correction was the thing that fixed the red scores.**

## Full comparison

| Candidate | Arm | Greens | Reds | Unsupported | FP | Realized | Median latency |
|---|---|---|---|---|---|---|---|
| `ministral-8b-2512` | v1 | 0/4 | 1/4 | 2 | 4 | ~$0.0005 | ~2s |
| `gpt-4o-mini` | v1 | 0/4 | 3/4 | 1 | 4 | $0.003121 | ~2s |
| `gpt-4o-mini` | v2 | 1/4 | 2/4 | 2 | 3 | $0.004207 | ~2s |
| `mistral-small-2603` | v2 | — | — | — | — | $0 (429) | — |
| `grok-4.3` reasoning | v2 | 4/4 | 2/4 | 2 | 0 | $0.042571 | ~6s |
| `claude-haiku-4-5` thinking | v2 | 4/4 | 2/4 | 2 | 0 | $0.068387 | ~14s |
| **`grok-4.7` reasoning** | **v3** | **4/4** | **3/4** | **0** | **0** | **$0.192290** | **~90s** |

## Is grok-4.7 good enough for selective, risk-triggered auditing?

**No.** On accuracy it is the best result in the series and the only one with zero unsupported
citations. It fails on everything else:

- **Latency ~90s median, 279s worst** — minutes added to any scene it touches.
- **Cost ~$0.024/audit realized**, ~5.7x Haiku and ~29x gpt-4o-mini's v2 run. On a 20-scene issue,
  auditing even 20% of scenes is ~$0.10 — comparable to a whole scene's generation.
- **Containment is not achievable through the current proxy.** Until the internal chain can be
  disabled per-request, a "single call" is not single, cost is unbounded, and the served model is
  unprovable. That is a blocker independent of the model's quality.

**The honest reading of the whole series:** the auditor's accuracy problem was largely *mine* — a
mislabelled packet and a prefix-matching rubric. v3 fixed both, and a capable model then scored
7/7 on merit. But the models capable enough to do this well are the slow, expensive ones, and the
cheap fast ones (gpt-4o-mini at ~2s, ~$0.0005/audit) are exactly the ones that fail it.

If semantic auditing is revisited, the question worth asking is not "which model" but "can the
deterministic gate be extended to cover supernatural content falsely labelled `ordinary`" — the
specific gap you named, which no LLM in this series was cheap or fast enough to close.

## Status

Production semantic auditor **DISABLED**. Deterministic checks **active**. Routing **untouched**.
Nothing wired or enabled. No scene generated, no story mutated, no prompt/fixture/rubric edited
after seeing the result. No further model runs.

Session spend ≈ **$0.80**.
