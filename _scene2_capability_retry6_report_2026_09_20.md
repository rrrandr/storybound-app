# Scene 2 Capability Retry #6 — Real Result: INCONCLUSIVE, infrastructure failure (2026-09-20)

Authorized retry testing the required-scene-function planner contract (retry sheet v8), same
Boundary card/Say-Do as retries 1-5. **This run did not test the contract at all** — it failed on a
real, transient upstream error before any planner content was ever generated.

## What happened

Real cost: **$0.00.** Exactly one real network exchange occurred under the
`scene2-structural-author` phase: a dispatch to `/api/proxy` (the Grok-primary planner tier,
`grok-4-1-fast-non-reasoning`, `max_tokens: 1200`) that returned **HTTP 502** after 28.9 seconds —
`usage: null`, no billable content. Confirmed by direct inspection of the persisted log
(`_scene2_repair_replay_sample_out/run_1789944826136.jsonl`): no ministral fallback attempt is
recorded anywhere in the log, and no author call was ever dispatched.

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

## A real, disclosed process concern: the documented fallback did not fire

The scene-spine planner's tier policy (this session, prior pass) is: Grok primary → ministral-8b-
2512 fallback, triggered on transport/parse failure. A 502 is exactly the kind of transport failure
that policy is meant to catch — yet no ministral attempt appears anywhere in the persisted log. This
is the **second** consecutive real retry (after retry 5) where the log shows only one dispatch under
this phase and the replay script exits before a possible second attempt is visible. Two plausible,
not-yet-distinguished explanations, neither confirmed:

- `_callTieredProvider`'s fallback logic may not be firing correctly on a 502 specifically for this
  role (worth a real, separate, dry investigation — NOT done here, out of scope for this retry).
- The replay script's own settlement-detection may be racing ahead of the app's retry/fallback
  sequence, exiting before a second attempt can complete or be tracked (the same ambiguity flagged,
  unresolved, in retry 5's report).

This recurrence across two consecutive runs makes it worth investigating on its own, separately from
the planner-contract question this retry was meant to test.

## Status

Not a capability result — neither a pass nor a fail of the required-scene-function contract. Real
cost: $0.00. Per Roman's explicit instruction, no further retry follows this one. The
required-scene-function contract remains untested against a real generation; retry sheet status is
unchanged from the eighth revision except for this disclosed infrastructure note.
