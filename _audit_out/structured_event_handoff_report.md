# Report: `_structuredEventHandoff`

**Status:** report only. **Not enabled.** No code change, no provider call. 2026-09-30.

Requested separately from the referential-integrity repair (`10ceb44c`), which deliberately did not touch
it.

---

## 1. The important correction: half of it is already on

The name suggests one switch. There are two, and only one is off.

| | flag | default | what it governs |
|---|---|---|---|
| **producer → verifier** | `_evidenceCommitCheck` | **ON** (`!== false`) | the planner emits `event_slots`; they ride on the transition; the verifier checks them against the actual prose |
| **author payload** | `_structuredEventHandoff` | **OFF** (`=== true`) | additionally puts an EVENT CONTRACT block (~`93276`) in the **author's** payload, so the author is told the slots it must land |

Both are read at `99974` and `101192`. So **evidence-grounded verification is already running in production.** The
slot-evidence check is live in `_commitScene`, and it can only make the verdict stricter — `99926`:

```js
if (_slotFail && _delivery === 'DELIVERED') { _delivery = 'MISSED'; }
```

What `_structuredEventHandoff` adds is not verification. It is **telling the author what the verifier will
check.**

## 2. What evidence it adds

The slot set is Precondition / Actor / Action / Target / Exit-State, each requiring a verbatim quote from
the prose as evidence; empty evidence → false. Today the author receives the event *sentence*; the
verifier checks the *slots*.

The measured defect it was built for is recorded in the code (`101177`): *"Fixes the determinism loss
(\"confess to Julian\" → prose confessed to the ELDERS → verifier said close-enough)."* With
`_evidenceCommitCheck` on, that substitution is now **caught** — target evidence fails, delivery becomes
MISSED. So the current state is: the substitution is detected but the author was never told not to make
it.

## 3. The trade-off

**What turning it on should reduce — false negatives, and specifically wasted scenes.** Today an author
that substitutes a slot produces a scene that fails slot evidence → MISSED → no commit → replan. The
prose still stands (it was accepted and mounted); the story does not move. That is precisely the
*circling* failure this whole thread exists to prevent, and it is currently self-inflicted: the author is
being judged against a contract it was not shown.

**What it risks — false positives of a different kind, and there is prior evidence against it.** A more
prescriptive author payload can flatten rendering, because the author optimises toward literal slot
wording rather than the scene. This codebase has already measured something adjacent and negative:
[[project_contract_loop_authoring]] records that a contract-driven repair loop behaved as a **competing
author**, and that *"pen OFF wins."* That finding was about a repair loop, not this handoff, so it is not
decisive — but it is the closest evidence available and it points the other way.

There is also a standing constraint: the `⛔ FROZEN INTERFACE` notice at `101169-101173` declares the
planner→author→verifier protocol validated for current production semantics and the
`_verifier_regression.mjs` suite (101 lines), instructing that the slot set, evidence rules, precondition
semantics and verifier judgment must not change unless a regression case breaks. Enabling the author-side
block does not change the slot set, but it does change the author payload — which is exactly the
"creative planning behavior" the last instruction held out of scope.

## 4. Provider-free evaluation plan — and the honest split

**The half that is free.** The verifier's own accuracy can be measured against **saved real prose**, with
no new generation:

- corpus: real recorded (proposal, prose) pairs already on disk —
  `_scene2_repair_replay_sample_out/run_1789884119160.jsonl` (real author replies) and the
  `_tempt_fate_fixtures/` runs;
- for each pair, run the slot-evidence check and, independently, a **blind human read** of whether the
  proposed event actually landed;
- report **false positives** (slot check says delivered, reader says it did not) and **false negatives**
  (slot check says missed, reader says it landed) separately — an aggregate accuracy figure would hide
  exactly the asymmetry that matters, since a false positive poisons canon while a false negative only
  wastes a scene;
- extend `_verifier_regression.mjs` with any pair where the two disagree, per the frozen-interface rule
  that new cases grow the suite rather than change the interface.

This measures the verification half, which is the half already running in production — so it is worth
doing regardless of whether the flag is ever flipped.

**The half that is not free.** Whether *telling the author* the slots reduces the MISSED rate cannot be
measured on saved prose: you cannot retro-fit an author payload to prose already written. It needs a
paired A/B generation — same canon state, same posture, flag on vs off — scored blind on both delivery
rate and prose quality, with the verdict pre-registered. That is paid, and it needs its own
authorization and ceiling.

## 5. Recommendation

**Leave it off, and run the free half first.** The reasoning:

1. the evidence-grounded verification it is usually credited with is **already on** — enabling the flag
   buys the author-side contract only;
2. the only measurable justification for the author-side contract is a reduced MISSED rate, which needs
   paid A/B, so flipping it now would be unmeasured;
3. the closest existing evidence about prescriptive author contracts in this codebase is negative
   ("pen OFF wins");
4. the free verifier-accuracy measurement is useful either way, and its false-positive number is the one
   that bears on canon integrity — including for the repair just shipped, since a false `DELIVERED` still
   activates a sealed fact the prose did not render.

Point 4 is the real reason to prioritise it: the referential-integrity repair guarantees that a committed
fact is *exactly what was proposed*, but not that the prose *rendered* it. That remaining gap is a
delivery-accuracy question, and the free evaluation above measures it.

No code, no provider call, no authorization requested. Flag unchanged.
