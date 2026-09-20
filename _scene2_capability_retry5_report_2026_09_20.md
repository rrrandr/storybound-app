# Scene 2 Capability Retry #5 — Real Result (2026-09-20)

First real, live test of the Grok-primary planner + Planner Function Gate combination (retry sheet
v7). Same Boundary card, same Say/Do as retries 1-4. Capability evidence, not approved prose.

## Real cost and usage

| Call | Model | Cost |
|---|---|---|
| scene2-planner | grok-4-1-fast-non-reasoning (served as grok-4.3) | $0.00981465 |
| **Total** | | **$0.00981465** |

1 physical request settled — well under the $0.45 / ≤8-request ceiling. **The author was never
dispatched — zero author cost.** Full raw log:
`_scene2_repair_replay_sample_out/run_1789941616227.jsonl`.

## What happened

The planner (Grok, now primary per the sheet-v7 policy) produced a real, structurally-valid reply:

- `tactical_move`: "Escalate Lirael's counter to Julian's interrogation into a public claim of
  mutual desire, forcing the assembly to witness the attraction as interference evidence."
- `state_change`: "Lirael declares she wants Julian to burn for her and his posture answers visibly
  to the assembly."
- `forces_choice`: "forces Lirael to choose between claiming the interference openly or letting the
  assembly keep its assumption"

The replay script then exited (`exit code 2`) reporting "the real Scene 2 author call... never
settled with a 200 response" — because no author call was ever dispatched. Confirmed by direct
inspection of the persisted log: exactly one real network exchange occurred under the
`scene2-structural-author` phase (the planner call); no `/api/proxy` request at `max_tokens: 8000`
(the author's signature) exists anywhere in the log.

## Evaluation, in the order requested

**1. Did Grok choose an allowed, forward-moving event instead of prolonging the confrontation? —
NO.** "Declares she wants Julian to burn for her, his posture answers visibly" stays inside the same
immediate confrontation — a desire-declaration and a reaction, not a move toward accusation/
preliminary-review/investigation/fallout. Worth flagging honestly: Grok's phrasing echoes the
Fate-card's literal "burn for me" almost verbatim into the state_change, rather than translating it
into a clearly different dramatic action the way ministral's retries 3-4 did (turning it into a
mouth-band confession, or turning the misalignment onto Julian). On this one sample, Grok's read was
not obviously more register-aware than ministral's — a real, disclosed finding against the working
hypothesis that a stronger model would automatically read posture better.

**2. Did the planner explicitly carry aftermath/procedure/investigation/fallout obligations? — NO.**
`aftermath`/`reserved` are both just status echoes (confirming nothing already-true was reversed,
nothing reserved was touched) — no new aftermath/procedure content was introduced.

**3. Did the Planner Function Gate pass for the right reasons, not by loophole? — It did not pass;
it correctly rejected, and the rejection holds up under direct re-verification.** Real evidence:
zero author dispatch, zero author cost. Direct dry re-check, same day, against this exact real
`stateChange` (read verbatim from the log): `_detectPlannerFunctionGap` returns
`{"rejected": true, "reason": "...no aftermath/procedure/consequence-movement signal..."}`. This is
the gate doing its job for the first time in a real, live, paid run — not a loophole, a genuine
catch, and it saved the ~$0.085-0.09 the author call would otherwise have cost dramatizing a plan
that was going to fail adequacy anyway.

**4. Did the author preserve mouth-band continuity, cosmology, protected facts, OAS history? —
N/A.** The author was never dispatched. Nothing to evaluate — honestly not claimed as a pass.

**5. Prose quality (description/dialogue/interiority/plot direction/LI pressure/end choice)? —
N/A.** No scene was generated. Nothing to evaluate.

## One honest process gap, disclosed

Whether the full "reject → one bounded retry → stop resumable" sequence completed cleanly (a
second planner attempt was also rejected) or whether the replay script's own settlement-detection
exited before a possible second attempt could complete is **not fully certain** from the persisted
log alone — only one dispatch/response pair is recorded. The OUTCOME that matters (zero author
spend on an inadequate plan) is fully confirmed either way. Separately: `console_tail.txt` from
this run was restored via `git checkout` (the routine fixed-filename cleanup this session has done
after every retry) before I checked whether it held run-specific diagnostic content beyond what the
jsonl log already captures — it likely only mirrored the same information, but that specific file's
content from this run is not recoverable now. Neither gap affects the confirmed real-cost or
gate-outcome evidence above.

## Reading

This is a genuine, real-world proof that the Planner Function Gate works in production — the first
time a bad plan was caught and stopped before any author spend, live, not in a dry stub. It is NOT
yet evidence that Grok-as-planner produces better plans than ministral did — on this one sample it
produced a comparably weak one, just now caught before costing anything. A single sample from either
model is not a fair comparison; the gate, not the model swap, is what saved money this time.

## Status

Not shipped, not patched, not hand-authored — no scene was generated at all. Preserved as the fifth
real capability sample: a gate-rejection, not a failed generation. Per Roman's explicit instruction,
no further retry follows this one.
