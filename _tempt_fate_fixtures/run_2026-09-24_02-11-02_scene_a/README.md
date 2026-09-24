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

## Open for human review — NOT assessed by any script

The script renders no semantic verdict. Two things worth weighing against
`scene_a_rendered_text.txt`:

1. **Scope.** The model declared `scopeMatch: "full"` with `deliveredScope` = "the assembly forgets
   the ceremony and its accusations", against a requested "everyone forgets the ceremony happened".
   The prose does go further than the earlier partial grant — the Dohkar asks *"What gathering is
   this?"* and Seren says *"We were to begin the rite"*, i.e. the gathering itself is gone, not just
   the accusation. Whether "the assembly" covers "everyone", and whether Lirael's own exemption is
   earned on the page, is the human call. `knowledgeStates` lists only the assembly; the protagonist
   is not enumerated.
2. **Length and register.** 867 chars / 17 beats, markedly terser than the 2338- and 2905-char
   scenes from earlier runs. The cold-romance register noted previously as a separate quality
   finding is, if anything, more pronounced here.
