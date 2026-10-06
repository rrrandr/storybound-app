# Readiness — 2026-10-05

Scope fixed: **Scene 1 (fixed) → interrupted OAS → Scenes 2–10.** Ledger, ceiling and the
charging-boundary code are unchanged. No paid dispatch.

---

## The wiring fix

`_fs_live_sequence.mjs` rebuilt a stripped body (`{ messages, max_tokens }`) before calling the
repaired estimator, so an `_sbModelOverride` of `grok-4.7` was **discarded at the call site** —
refused when the estimator was invoked directly, priced as `grok-4.3` through the runner. The
helper was repaired; its caller was not.

The caller now passes `model`, `_sbModelOverride` and `reasoningEffort` alongside the messages.

`_runner_override_control.mjs` (9/9) tests **the caller's own argument construction**, lifted out of
the runner source so that stripping a field again fails the control:

```
the runner's actual argument:
  { messages: body.messages || [], max_tokens: body.max_tokens, model: body.model,
    _sbModelOverride: body._sbModelOverride, reasoningEffort: body.reasoningEffort }

through the runner's argument:  REFUSED
with the full request body:     REFUSED        (they now agree)

order in the source: estimateUsd @23961 · bounded-check @24515 · route.fetch @30864
```

So the refusal happens **before `route.fetch`**, returns 503, and halts the run. A priced override
(`grok-4.3`) and an ordinary Grok dispatch still pass.

---

## The card breakdown, corrected

My "all 9 scene-end cards matched" was wrong. There are **eight** scene-end selections, and the
ninth match was OAS turn 1. From the saved records:

| selection | provenance |
|---|---|
| OAS turn 1 | `matched-response` |
| OAS turns 2–6 | **UNKNOWN** — the pair matches the text of the beat-1 batch (call 3) but fails the generation-identity check |
| OAS turn 7 | **UNKNOWN** — no card id was recorded for the selection |
| scene-end selections ×8 (scenes 2–9, leading from Scene 2 through Scene 10) | all `matched-response` |

**9 matched · 6 unknown of 15.** Eight scene-end choices leading Scene 2 → Scene 10 is the intended
sequence.

**Withdrawn: the "most likely the per-archetype fallback bank" attribution.** That was speculation,
and the evidence points elsewhere — the submitted text for turns 2–6 *does* match the earlier
batch's text. What is established: the pairs match the beat-1 batch's text and fail the newer
generation-identity check. That supports **investigating stale reuse**; it does not prove the
source. Turn 7 has a different cause (no recorded card id) and should not be grouped with them.

---

## Readiness

**The requested corpus is ready.** Scene 1 → interrupted OAS → Scenes 2–10 completes provider-free:
nine generated records, Scene 10's projection accepted, nine history notes, no afterglow, the
authored Dohkar interruption and the run-or-remain decision both serviced. The opening branch is an
explicit recorded parameter (`SB_OPENING_BRANCH`, default `run`).

**Separate and still open — the counter defect.** `_isLastSceneOfIssue()` is `false` at position
9 of 10, so production does not recognise issue completion for a baked-opening story. It affects the
Submit swap and the next-issue charge. One helper (`_getSceneInIssue`), unapplied pending approval.
It does not block generating or evaluating the corpus.

**An explicit limitation of the live evaluation, not a blocker.** OAS preview provenance is
unestablished for 6 of 7 turns. A live run can evaluate the prose and the reader-visible
interactions; it cannot say where each OAS suggestion originated. Reported as `UNKNOWN` rather than
guessed.

**Spend.** Remaining authorization **$0.9232852**, untouched. The only measured figure is
2026-10-02's **$0.09195 per generated scene** receipted ($0.827537 over nine scenes; $0.890120
exposure including receiptless estimates). Summed per-dispatch estimates for the observed 76-call
sequence are $2.2302 as the guard would reserve, $1.8691 repriced per-model — neither a bill.
Whether a run completes under the remaining ceiling is **uncertain**: reservations are released as
smaller receipts settle them, so summed estimates cannot predict it either way.

Awaiting authorization with an explicit ceiling before any paid dispatch.
