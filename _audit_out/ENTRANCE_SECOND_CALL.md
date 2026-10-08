# The entrance's second OAS call: a model-chain fallback (2026-10-08)

Determined from execution records, not from model names or log position.

## The evidence

`_fs_live_out/run_2026-10-08T06-41-08-474Z/calls.json` — 16 calls, 8 of them large (~200 KB):

```
n=1   requested=grok-4-1-fast-reasoning       chars=200561  maxTok=400   <- entrance
n=2   requested=ministral-8b-2512             chars=200561  maxTok=400   <- entrance
n=7   requested=grok-4.20-0309-non-reasoning  chars=200721  maxTok=400   <- loop turn 1
n=8   requested=grok-4.20-0309-non-reasoning  chars=201986  maxTok=400   <- loop turn 2
n=9   requested=grok-4.20-0309-non-reasoning  chars=204127  maxTok=400   <- loop turn 3
n=11  requested=grok-4.20-0309-non-reasoning  chars=202900  maxTok=400   <- loop turn 4
n=13  requested=grok-4.20-0309-non-reasoning  chars=202709  maxTok=400   <- loop turn 5
n=15  requested=grok-4.20-0309-non-reasoning  chars=202876  maxTok=400   <- loop turn 6
```

Three facts decide it:

1. **Calls 1 and 2 carry a BYTE-IDENTICAL payload** — `chars=200561` for both, with the same
   `maxTokens`. A growing conversation changes the payload every turn (200721 → 204127 across the
   loop), so an identical size means the *same prompt re-sent*, not a new turn.
2. **They go to DIFFERENT models** — `grok-4-1-fast-reasoning`, then `ministral-8b-2512`. A retry
   re-sends to the same model; a duplicate dispatch would also be the same model. A different
   model with the same prompt is a **chain step**.
3. **Every loop turn is a SINGLE dispatch** on one model. So this is specific to the entrance's
   first-turn path, not a per-turn behaviour.

**Conclusion: the second entrance call is a fallback to the next model in the chain.** Not a
retry, not a duplicate dispatch.

## A hypothesis I had and discarded, with its evidence

`console.log:306` shows `[OAS:SPECULATIVE:GATE] INCLUDE alternates (only 0 prior card-clicks —
defaulting to include)`, which fires at the entrance because the reader typed instead of playing a
card. I suspected the second call was that speculative generation. **It is not:**
`[OAS:SPECULATIVE:GEN] 5/5 alternates parsed` appears five times while the loop turns show only one
dispatch each — the alternates are **parsed out of a single reply**, not fetched separately. Had
they been separate dispatches, the loop turns would be paired too. They are not.

Also checked and absent: production logs no provider fallback marker for this
(`grep -iE "reject|invalid|parse|unusable|failed|retry"` over the OAS lines returns only
`regex_fallback` in `[INTIMACY-STATE]`, the prewrite-suppression note, and unrelated CSP/header
lines). So the chain step happens without an explanatory log line — worth adding one.

## What this changes, and what it does not

- it does **not** change the exchange count: two attempts for one reader submission remain **one
  exchange**, as long as one reply is accepted and rendered;
- it does change **cost and authorship** for that turn — on a live run the entrance would dispatch
  two ~200 KB prompts rather than one, and the accepted reply may be the fallback model's;
- it is **untested live**: this run was `SB_FIXTURES`, and whether the first model's reply is
  rejected the same way against a real provider is unknown.

## Still open on deliverable 1

The entrance's one exchange is attributed to nothing (`rendered 7 vs attributed 6`). The next step
is to tie the accepted reply of calls 1–2 to the first rendered history entry and credit that
exchange once — whichever of the two produced it.
