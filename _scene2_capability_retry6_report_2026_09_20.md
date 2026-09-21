# Scene 2 Capability Retry #6 — Real Result: INCONCLUSIVE, infrastructure failure (2026-09-20)

Authorized retry testing the required-scene-function planner contract (retry sheet v8), same
Boundary card/Say-Do as retries 1-5. **This run did not test the contract at all** — it failed on a
real, transient upstream error before any planner content was ever generated.

## What happened

Real cost: **$0.00.** Exactly one real network exchange occurred under the
`scene2-structural-author` phase: a dispatch to `/api/proxy` (the Grok-primary planner tier,
`grok-4-1-fast-non-reasoning`, `max_tokens: 1200`) that returned **HTTP 502** after 28.9 seconds —
`usage: null`, no billable content. Confirmed by direct inspection of the persisted NETWORK log
(`_scene2_repair_replay_sample_out/run_1789944826136.jsonl`): no ministral fallback REQUEST is
recorded anywhere in that log, and no author call was ever dispatched.

**Correction (added after retry #7, 2026-09-21):** this report originally concluded the ministral
fallback "did not fire." That claim was based on the NETWORK log only — this run's console output
(`console_tail.txt`) was restored via the routine fixed-filename cleanup before being read, so
whether the app's own `_callTieredProvider` code actually logged a fallback attempt for THIS run is
**unverified, not confirmed absent**. Retry #7 (below the fixed harness, same failure shape) DID
capture that console evidence and showed the fallback logic firing correctly
(`_scene2_capability_retry7_report_2026_09_20.md`) — which means the original "the documented
fallback did not fire" framing in this report was too strong a claim for what was actually verified
here. Corrected below.

The replay script exited (`exit code 2`) reporting "the real Scene 2 author call... never settled
with a 200 response" — technically accurate, but the more precise fact is that the *planner* call
itself never succeeded on any tier.

## Evaluation, in the order requested — all N/A

None of the five requested evaluation points can be assessed, because the planner never produced
any content:

1. Did the planner instantiate the required scene function before applying posture? — **N/A**, no
   planner reply exists.
2. Did it avoid echoing "burn"/raw Fate-card phrasing? — **N/A**.
3. Did it choose an allowed event lane? — **N/A**.
4. Did the Planner Function Gate pass for substantive reasons? — **N/A** — the gate never ran; there
   was no plan to evaluate. This was not a gate rejection.
5. Prose/continuity checks? — **N/A**, the author never ran.

## A real, disclosed process concern: no ministral REQUEST was ever tracked (corrected framing)

The scene-spine planner's tier policy is: Grok primary → ministral-8b-2512 fallback, triggered on
transport/parse failure. A 502 is exactly the kind of transport failure that policy is meant to
catch — and no ministral network request appears anywhere in this run's persisted log. At the time
this report was first written, that was read as "the fallback did not fire." Retry #7's console
evidence (preserved this time) showed the app's own code DOES correctly log a fallback attempt
after a Grok 502 — the planner-policy code is not the problem. What both retries 6 and 7 actually
share is narrower: **the fallback's resulting network request never got tracked/settled by the test
harness before the browser closed** — a harness observation gap, not a confirmed defect in
`_callTieredProvider` or the Grok-primary planner policy. See
`_scene2_capability_retry7_report_2026_09_20.md` and
`_scene2_planner_fallback_console_evidence_2026_09_21.md` for the preserved evidence and full
account. The exact mechanism of the harness race (why the tracked request never appears) remains
unresolved — a real, still-open question, not attributed to any specific cause without further
evidence.

## Status

Not a capability result — neither a pass nor a fail of the required-scene-function contract. Real
cost: $0.00. Per Roman's explicit instruction, no further retry follows this one. The
required-scene-function contract remains untested against a real generation; retry sheet status is
unchanged from the eighth revision except for this disclosed infrastructure note.
