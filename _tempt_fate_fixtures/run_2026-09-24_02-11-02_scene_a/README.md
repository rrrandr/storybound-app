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

And accounting for him would not have been enough on its own. The record could have named Julian as
`retained`, left `unaccountedParties` empty, and still claimed `full` — structurally complete, and
still a narrower grant than the wish asked for. Coverage and delivery are now checked separately.

### What changed in response

`TEMPT_OUTCOME_CONTRACT`'s `memory_perception` class now requires, and `_validateTemptFateOutcomeReport`
now enforces:

- `invokerExemption` — the invoker is `exempt` / `invoker_anchor` **by default**, needing no
  justification in the prose. Self-targeting is permitted but must be *declared* as
  `wish_explicitly_includes_self` or `ambiguous_wording_consequence`, never applied silently.
- `targetPopulation` — `all_present_except_invoker | named_subset | collective | self |
  other_declared`. The wish's intended reach is now a stated, checkable claim rather than an
  implicit one the model can shrink to fit whatever it wrote.
- `affectedKnowers[]` — `disposition` (`forgot | retained | partial | suspects | resisted | exempt |
  absent`) **plus** `memoryAbsent` and `suspicionFromResidue`. Separating these is the point:
  *accounted for* is not *affected*.
- `unaccountedParties[]` — and `scopeMatch: "full"` requires it to be **empty**.

**Coverage** is checked against the **composite roster** `_temptOutcomeSceneRosterDetailed(plan,
sceneIdx)`, built entirely from already-resolved production identities — the relationship ledger's
invoker and love-interest anchors, the accepted stage record's `present` (resolved through the same
labels the author's `PRESENT:` directive uses), the accepted objective's own present list, the
seed-declared `collectives`, and the rendered `beat.speaker` list. No prose is parsed. The earlier
speaker-only roster was too weak in one direction: a silent named character or a declared collective
(which *never* speaks, by construction) was invisible to it.

**Effect** is checked separately, and only against the **declared target population**: under `full`,
`forgot` qualifies; `suspects` qualifies only when `memoryAbsent` **and** `suspicionFromResidue` are
both true; `partial`, `retained`, `resisted` and a non-invoker `exempt` all force `narrower`. A
named-subset wish therefore never has to make unrelated bystanders forget — they need accounting,
not amnesia.

`_tempt_fate_outcome_contract_control.mjs` §3b replays **this run's exact record** against **this
run's real composite roster** and it is rejected, naming *every* omitted party; the same record with
no roster still validates, proving the rejection comes from the coverage check and not some
unrelated field. §8 covers the seven delivery cases, including the one this record would still have
passed before: Julian listed as `retained`, `unaccountedParties` empty, `scopeMatch: full`.

### Two production defects found while building this — both real, neither invented

1. **PC anchor label — FIXED 2026-09-24.** `_relEnsureAnchors` resolved the PC through
   `state.name || state.playerName || 'the protagonist'`: a private chain that never consulted the
   starter seed's own PC, never consulted the nested `picks.identity.playerName`, and had no
   placeholder test — so `state.playerName` holding the *kernel* ("the one who carries the story")
   beat the real name. First Sacrifice's PC anchor therefore labelled itself *"the protagonist"*,
   and every author-facing relational directive built from the ledger carried that instead of
   *Lirael*. It now reads `_resolvePcIdentity`, the app's canonical resolver, whose own header
   already said **"Every consumer reads this — never its own chain."** A carried ledger's
   placeholder label is upgraded **in place** (same entity id, edges intact, old label kept as an
   alias); a real name already on the entity is never overwritten. The Tempt roster's temporary
   local fallback is deleted — it consumes the shared anchor.
   Proof: `_rel_pc_anchor_resolution_control.mjs`, 20/20, and **8 of those 20 go red** when the old
   chain is restored.
2. **Plan-row indexing.** A generation's `sceneIndex` is *not* the plan's 1-based scene number. The
   first attempt read row 3 instead of row 2 and silently found no collectives — caught only because
   the roster log prints its sources. `_tfoPlanSceneNum` now derives the row the way the planner
   does, verified empirically rather than assumed.

### The roster boundary is intended, not a shortfall

Accepted stage/objective presence, declared collectives, and structured beat participation **are**
the scene's authoritative epistemic census. An author inventing an undeclared silent named character
is an *author-contract* violation — the cast is declared upstream, and `_validateLocalObjective` and
`validateCGSpeakerDisplayNames` already police who may appear. It is not something this outcome
validator should chase with prose regex, which would trade a precise, provable census for a guess.

### Secondary quality finding — NOT conflated with the above

**Length and register.** 867 chars / 17 beats, markedly terser than the 2338- and 2905-char scenes
from earlier runs. The cold-romance register noted previously is, if anything, more pronounced here.
This remains a separate open quality question.
