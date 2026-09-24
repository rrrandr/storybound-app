# Extractor-only live authorization — NOT YET AUTHORIZED

**Status: prepared for review. No paid call has been made and none is authorized by this document.**

Roman, 2026-09-24: *"Don't buy another full Scene A merely to test the extractor. Test the new role
directly against the already-paid, preserved scene for a fraction of the cost."*

This isolates one question — **does the new extractor prompt work against a real model?** — using
prose we already own, for roughly 1/100th of a Scene A.

---

## 1. Scope — exactly one role, nothing else

| | |
|---|---|
| Role dispatched | `temptOutcomeExtractor`, and **only** that role |
| Roles explicitly NOT dispatched | author, planner, scaffold, bible, commitVerifier, gravityAudit, wishClassifier, sceneAmbient, characterDisclosure, any image endpoint |
| Story mutation | **none.** No scene is generated, persisted, appended, or altered. No durable consequence is committed. No ledger, save, or `state.scenes` write. |
| Input | the **already-paid** accepted scene from `_tempt_fate_fixtures/run_2026-09-24_02-11-02_scene_a/`, read from disk |
| Context | an immutable extraction context rebuilt from that run's own preserved facts |

The run reconstructs the frozen context from preserved artifacts — proposal `tfl_1`, wish
*"everyone forgets the ceremony happened"*, invoker `Lirael`, the composite roster the real run
logged, and the accepted prose — then calls `_extractTemptOutcome(ctx)` and
`_validateTemptFateOutcomeReport` + `_tfoVerifyCitations`. It does **not** call
`_tfoResolvePendingRecord`, so no commit path is entered at all.

## 2. Request census — 1 expected, 3 permitted

| tier | provider / model | when it fires |
|---|---|---|
| primary | `mistral` / `ministral-8b-2512` | always |
| fallback | `grok` / `grok-4-1-fast-reasoning` | only if primary returns empty/unparsable or errors |
| terminal | `openai` / `gpt-4o-mini` | only if both above fail |

This is `_callTieredProvider`'s **default chain**, unchanged — the extractor passes no `opts.tiers`
override. It is the same chain already censused for `characterDisclosure`.

- **Expected maximum real dispatches: 3** (one pass, worst-case full cascade).
- **Phase-gate allowance: 3**, as `gate.setPhase('extractor-only', 3)`.
- **Reservation basis: 3 request-equivalents.**

All three numbers are the same number, deliberately.

**Stop policy:** ONE primary pass. The tier cascade is the *only* permitted retry, and it is a
failover, not a re-attempt — a tier fires only because the previous one produced nothing usable.
**No bounded validation retry is authorized here.** If the extraction returns but fails validation
or citation checking, the run **stops and reports the failure**; it does not re-dispatch. That is a
deliberate difference from the Scene A policy, and it is why this sheet reserves 3 rather than 6.

## 3. Cost ceiling — its own, not inherited

Rates are verbatim from `public/app.js`'s `TEXT_PRICING` (~4764-4811), the same table the app's real
accounting uses. Tokens are the censused worst case for this role: **3600 in / 1400 out**.

| tier | worst-case cost |
|---|---|
| `ministral-8b-2512` | $0.000750 |
| `grok-4-1-fast-reasoning` | $0.008000 |
| `gpt-4o-mini` | $0.001380 |
| **full 3-tier cascade** | **$0.010130** |
| expected (primary succeeds) | **$0.000750** |

**Proposed ceiling: $0.02.**

This run does **not** inherit the $0.40 Scene A budget, and must not be accounted against it. A
dedicated ceiling is the point: at $0.02 a breach is structurally impossible to confuse with a
Scene A overrun, and the headroom over the $0.010130 worst case is a little under 2×.

For scale: a full Scene A costs ~$0.10. This is **~0.75% of that** if the primary tier answers, and
~10% in the worst case.

## 4. What the run must preserve

Written to a unique, permanent fixture directory that refuses to reuse an existing one (the same
guard the Scene A runner uses):

- the **raw extractor request** (system + user prompts, verbatim)
- the **raw extractor response**, before any parsing
- the parsed outcome object
- the **validation result** — `_validateTemptFateOutcomeReport` errors and `_tfoVerifyCitations`
  errors, separately
- the tier attempt log (which tier answered, and why any earlier tier did not)
- the reconstructed immutable context, so the input is auditable
- realized cost, and the gate's own tracked-call record

## 5. What the run is testing — the questions only a real model can answer

| # | question | pass condition |
|---|---|---|
| 1 | **Citations.** Can the model quote the page verbatim? | every non-`absent` knower carries an `evidenceQuote` found verbatim in the accepted prose |
| 2 | **Roster coverage.** Does it resolve every party the composite roster names? | `Lirael`, `Julian`, `the assembly` each resolved, or openly listed in `unaccountedParties` |
| 3 | **Invoker anchor.** Does it apply the default exemption without being told to justify it? | `invokerExemption = {who: "Lirael", status: "exempt", reason: "invoker_anchor"}` |
| 4 | **Requested vs delivered scope.** Does it state both, and judge the match? | `requestedScope`, `deliveredScope`, `scopeMatch` all populated and internally consistent |
| 5 | **Julian's disposition — the original defect.** | Julian resolved with a disposition and both `memoryAbsent` / `suspicionFromResidue` booleans, cited to the page |

**Question 5 is the whole point.** The paid run's own record named only *"the assembly"* and claimed
`scopeMatch: "full"`. If the extractor reading that same prose now resolves Julian by name — and
cites *"The question stands."* or *"Julian has not moved, yet his gaze finds mine across the
clearing."* — the migration is doing exactly what it was built for, on the exact scene that exposed
the gap.

**No semantic verdict is rendered by the script.** It reports what came back and whether it
validated. Whether the reading is *right* stays a human judgement, as it has throughout.

## 6. What could still fail, stated up front

- The extractor prompt has **never dispatched for real**. Its instructions are proven only against
  injected fixtures. A real model may ignore the citation requirement, or quote approximately.
- `ministral-8b-2512` is a small model being asked for a large structured object with verbatim
  quoting. It is entirely plausible that the primary tier fails validation and the honest result is
  *"the primary tier is not capable of this; the chain needs reordering."* That is a **useful**
  outcome and is why the tier attempt log is preserved.
- A validation failure here costs $0.0008–$0.0101 and teaches us the prompt needs work. That is the
  cheapest possible way to learn it.

## 7. Preconditions

- [x] `temptOutcomeExtractor` censused, capped, reserved and sheet-listed (Scene A sheet, `864c0db9`)
- [x] extractor lifecycle control **40/40**, including the four legacy-provenance proofs
- [x] full Tempt regression green: contract 53/53, integration 73/73, harness 30/30, framing 22/22
      (now proving the real end-to-end path with the extractor stubbed), precedence 26/26,
      UI order 16/16, seal 17/17, cost audit 31/31, QA miss 13/13
- [x] legacy trust requires stamped provenance; a hallucinated obsolete field cannot bypass citations
- [ ] **the runner script itself** — not yet written; will be written only if this sheet is approved
- [ ] **Roman's explicit authorization**

## 8. The authorization line, if you want it

> Run the extractor-only live test once against the preserved 2026-09-24 Scene A, under a $0.02
> ceiling. One primary pass, tier cascade only on failover, no validation retry. No author, planner,
> scaffold, image, or story mutation. Preserve the raw request, raw response, validation result and
> tier log, then stop.

Until that line is given, nothing runs.
