# Live run 2 — VOID. No model prose was produced. 2026-10-06

Authorized: explicit go, cumulative ceiling **$2.00** (read as cumulative; prior $0.9126265 carried
forward, $1.0873735 spendable). Nothing fixed; reporting as found.
Artefacts: `_fs_live_out/run_2026-10-06T05-55-51-294Z/`.

---

## The run is void as an evaluation

**All 29 provider responses came back as `NO_RESPONSE_FROM_FUNCTION`** — the local Vercel dev
runtime's error page, not JSON. Counted from the saved wire bodies:

```
wire responses: real JSON 0 | NO_RESPONSE_FROM_FUNCTION 29 | other non-JSON 0
li_dialogue present in any response: 0
```

**No Grok prose exists in this run.** The five exchanges that appear to have "landed" were rendered
from the app's own fallback bank — generic, story-agnostic lines, repeated across turns:

```
SAY "Not yet. Not like this."
DO  "Decide now what you will and won't permit—before the moment decides for you."
SAY "(The thing you almost said folds back into your chest.)"
DO  "Let the silence carry what your words won't. Julian can feel the absence."
```

So there is **nothing to assess** for writing, continuity or repetition. The earlier run's
repetition finding stands on its own evidence; this run adds nothing to it.

The functions **did** reach providers — `_vercel_dev.log` carries real `[MISTRAL-PROXY] usage`
records — but the dev runtime never returned the responses to the browser. That is a local
environment failure, not a product defect and not a provider outage.

## What the guards did right

- **No placeholder was ever submitted.** The shared submission gate held through all five turns;
  every provenance line was `matched-cache` or `UNKNOWN (partial)`, never `template-fallback`.
- **The ceiling stopped the run before dispatch**, exactly as designed:
  `*** HALTED BEFORE DISPATCH — ceiling: exposure $1.945650 + next $0.077531 would exceed $2.00`
- **`gpt-4o` appeared in the chain** — the terminal author fallback firing because the tiers above
  it were failing. Its rate is now in the guard (added yesterday), which is why its reservation was
  $0.159672 rather than a Grok-priced under-estimate.

## The ledger, and why the number is misleading

| | |
|---|---|
| calls dispatched | 29 |
| **with receipts** | **0** — every body was an error page, so `JSON.parse` threw |
| retained as unmeasured estimate | **$1.033023** |
| ledger now | **$1.945650 of $2.00** (receipted $0.838376 + unresolved $1.107274) |

**That $1.945650 is not $1.945650 of measured spend.** $1.107274 of it is *estimate* retained for
calls whose receipts could never be read, and the estimator is deliberately pessimistic — requested
`max_tokens` × 1.5 reasoning × 1.2 safety, with no cache credit.

The only real figures available are the six surviving Mistral usage records:

```
9,371 prompt + 1,742 completion = 11,113 tokens
at ministral-8b-2512 ($0.15/$0.15 per MTok) ≈ $0.0017
```

Other calls may have reached providers before the runtime dropped their responses; that portion is
**unknown**. Real spend for this run is therefore somewhere between roughly $0.002 and the retained
$1.03, and I cannot narrow it from the artefacts — the receipts were the proof and they never
arrived.

**I have not touched the ledger.** Whether those retained estimates should be reconciled against
reality is a real-money accounting decision, and it is yours. As it stands the ledger shows only
**$0.054350 remaining under the $2.00 ceiling**, which would refuse almost any further call.

## Before any retry

1. **Fix the local dev server.** Every response was `NO_RESPONSE_FROM_FUNCTION`; a retry today
   would reproduce it and consume more authorization for nothing. A restart of `vercel dev` is the
   first thing to try, and the first two calls of a retry should be checked for receipts before
   letting it run on.
2. **Decide the ledger question** above, since the remaining $0.054350 cannot fund a run.
3. The evaluation path itself is unchanged and still proven provider-free: six exchanges → reader
   exit → interruption → decision → Scene 2 → Scene 10.

No fixes attempted, per the standing rule to report a paid run before changing anything.
