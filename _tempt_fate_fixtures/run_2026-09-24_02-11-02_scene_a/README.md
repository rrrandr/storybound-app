# Paid run — fourteenth revision, Scene A only, `remain` branch — DELIVERED AND COMMITTED

Raw artifacts, written directly here by the run. Nothing in this directory is reconstructed, and
nothing clears it: each run now gets its own permanent fixture directory and refuses to reuse one.

Authorized: fourteenth-revision sheet, Scene A only, `remain` branch, additional hard cap $0.20,
stop unconditionally after Scene A, no Scene B, no images, no retries beyond the declared policy,
no automated semantic approval.

## Structural result — everything the pipeline is supposed to do, it did

| | |
|---|---|
| Scene delivered | yes (867 chars) |
| Outcome report populated | yes |
| Committed to the owned proposal | yes (`tfl_1`) |
| Planner `ACTIVE INVOCATION` | yes |
| Author `ACTIVE INVOCATION` | yes |
| Author historical `MEMORY CALLBACK` | no |
| Declared `ruptureClass` | `memory_perception` |
| Declared `scopeMatch` | `full` |
| Preflight invariant | passed before dispatch |

`invalidatedPlans` carries *"the formal inquiry cannot be justified without memory of the events"* —
the event-frame precedence fix doing its job: the scheduled `dohkar_preliminary_review` was no
longer forced through, and the scene reports it as unjustifiable instead.

## Accounting

| Role | Model | Status | Cost |
|---|---|---|---|
| wish classifier | `gpt-4o-mini` | 200 | $0.000049 |
| scaffold | `ministral-8b-2512` | 200 | $0.001110 |
| planner | `grok-4-1-fast-non-reasoning` | 200 | $0.013048 (ticks) |
| author | `grok-4-1-fast-reasoning` | 200 | $0.088923 (ticks) |
| gravity audit | `ministral-8b-2512` | 200 | $0.000619 |
| **Total** | | | **$0.103750** of $0.20 |

**5 of 33 permitted requests** (Scene A 4/32, classifier 1/1). Zero real image dispatches. Clean
`safeExit`.

**Note for the census:** the two post-scene roles (`sceneAmbient`, `characterDisclosure`) did **not**
fire in this run, so only 4 Scene A calls appeared rather than the 6 seen previously. They remain
reserved and capped; this run simply did not reach them before settlement. Their absence is not
evidence they cannot fire.

## Human adjudication (Roman, 2026-09-23) — the script renders no semantic verdict

### KEPT: the mass-memory rupture succeeded

This run did what the earlier partial grant did not. The Dohkar asks *"What gathering is this?"* and
Seren says *"We were to begin the rite"* — the **gathering itself** is gone, not merely the
accusation. That is a real supernatural memory alteration at collective scale, and it stands as a
success finding. `invalidatedPlans` correctly reports the scheduled review as unjustifiable.

### REJECTED: unaccounted non-invoker scope

The rejection reason is **not** Lirael's retained memory. Her memory is *intended*:

> The Tempt Fate invoker should normally retain an anchor to what they changed; otherwise they
> couldn't experience or navigate the consequence. That exemption should be automatic unless the
> wording explicitly includes the self or is dangerously ambiguous enough for Fate to exploit.

The earlier note above — that Lirael's exemption had to be "earned on the page" — was wrong, and the
schema language demanding it has been removed.

The actual defect is **Julian**. He speaks a line on the page — *"The question stands."* — which
reads as retained continuity, and the outcome record never mentions him. `knowledgeStates` and
`classDetail.affectedKnowers` both name only *"the assembly"*, `scopeNote` is empty, and the report
still claims `scopeMatch: "full"`. Seren and the presiding Dohkar are likewise unresolved. Whether
Julian forgot, resisted, suspects a gap, or was exempted is exactly what the record had to say and
did not. A party who is merely absorbed into a collective is not accounted for.

### What changed in response

`TEMPT_OUTCOME_CONTRACT`'s `memory_perception` class now requires, and `_validateTemptFateOutcomeReport`
now enforces:

- `invokerExemption` — the invoker is `exempt` / `invoker_anchor` **by default**, needing no
  justification in the prose. Self-targeting is permitted but must be *declared* as
  `wish_explicitly_includes_self` or `ambiguous_wording_consequence`, never applied silently.
- `affectedKnowers[].disposition` — `forgot | retained | partial | suspects | resisted | exempt`.
  Naming a party without resolving them is no longer an account.
- `unaccountedParties[]` — and `scopeMatch: "full"` requires it to be **empty**.
- Witness coverage against `_temptOutcomeSceneRoster(plan)`, read from `beat.speaker` on the real
  rendered plan (the same display names `validateCGSpeakerDisplayNames` checks against the cast —
  a roster read, not a keyword scan of prose). Every speaking party must be resolved somewhere.

`_tempt_fate_outcome_contract_control.mjs` §3b replays **this run's exact record** against **this
run's real roster** and it is now rejected, naming Julian; the same record with no roster still
validates, proving the rejection comes from the coverage check and not some unrelated field.

### Secondary quality finding — NOT conflated with the above

**Length and register.** 867 chars / 17 beats, markedly terser than the 2338- and 2905-char scenes
from earlier runs. The cold-romance register noted previously is, if anything, more pronounced here.
This remains a separate open quality question.
