# Canon auditor calibration — `ministral-8b-2512` is NOT usable as a canon auditor

Run once after a clean dev-server restart, 2026-09-24. 8 dispatches, primary tier only, reserved
$0.003960 of $0.01. Evidence: `_tempt_fate_fixtures/canon_calibration_2026-09-24_18-22-08/`.

## Verdict: DO NOT ENABLE

Scored after normalising a citation-format bug of mine (below), so these numbers reflect what the
model actually said:

| | |
|---|---|
| Reds caught | **3 / 4** |
| Greens passed | **0 / 4** |
| **False positives** | **4 / 4 — every green** |
| Missed reds (valid incorrect pass) | **0** |
| Unavailable | 1 (`red_visible_glow` — unparsable JSON) |
| Usable responses | 7 / 8 |

**The model returned `verdict: "violation"` on every single reply that parsed — all seven,
including all four greens.** It does not discriminate. Its apparent 3/4 recall is an artefact of
saying "violation" to everything; in production it would block every scene.

What it flagged as canon violations:

- **`green_mundane_invention`** — Julian lifting a torn mouth-band and asking whose it is. Flagged
  `contradicted_knowledge`. This is ordinary human action with no mechanism at all.
- **`green_tempt_history_rewrite`** — flagged `rewritten_history`, **citing `dc_1`, which IS the
  committed rewrite**. It treated the authorised change as the violation.
- **`green_confusion_records`** — a registrar reading a ledger aloud. Flagged
  `contradicted_knowledge` and `invalidated_objective`.
- **`green_alignment_sense`** — the most defensible of the four: it cited `neg_1`/`neg_2`, the
  truths that First Favored "do NOT read thoughts" and that misalignment is "NOT a psychic
  mind-read". Alignment-sense versus mind-reading is a genuinely fine distinction, and the fixture
  grounds itself in the alignment-sense truth explicitly — but a reader could see how it slipped.

The `resolvable ≠ grounded` limit I documented earlier appeared immediately in the wild:
`red_invalidated_objective` cited **`neg_0` for a `rewritten_history` finding** — a real fact id,
paired with a category it does not support. The validator accepted it, exactly as predicted.

## The one thing that did NOT happen

**Zero missed reds. No valid-but-incorrect `pass` occurred.** That was named as the most important
failure, because nothing downstream catches it. It did not appear — but the result is hollow: a
model that never returns `pass` cannot return an incorrect one.

## A defect of mine, found by the run

Five of eight replies were first scored `invalid_response` for citing "fact id(s) outside the
supplied packet": `[dc_0]`, `[inv_0]`, `[know_0]`.

Those are **real packet facts**. The prompt renders the packet as `  [dc_0] text`, so the model
copied the brackets back into `citedFactIds`, and my validator compared against bare `dc_0`. **My
formatting, not the model's comprehension.**

Fixed: `_validateCanonAuditResponse` now strips display brackets before comparing; a genuinely
invented id still fails. `_canon_audit_calibration_rescore.mjs` re-scores the retained replies
offline at zero cost, which is where the numbers above come from. The fix **raises** measured
recall from 1/4 to 3/4 and **does not change the verdict** — the false positives are untouched by
it.

## Infrastructure

The first attempt (`canon_calibration_2026-09-24_18-06-42`) returned 502 /
`NO_RESPONSE_FROM_FUNCTION` on all eight with zero provider usage and **$0 realized**. A fail-fast
was added afterwards (stop after 2 consecutive, skip the rest, mark infrastructure-inconclusive)
and dry-proven: 2 requests, 6 skipped, DO NOT ENABLE.

The dev server was then gracefully restarted (`SIGTERM` to PID 94597, both it and its workers
exited cleanly; fresh server PID 86061). Page returned 200; `/api/mistral-proxy`, `/api/proxy` and
`/api/chatgpt-proxy` each returned **405** — the function layer executing, with no provider call.
No separate paid health probe was used; the first fixture was the health check.

The fail-fast did **not** trip on the real run, correctly — the failures were parse and validation
errors, not the function-layer signature.

## What this settles, and what it does not

**Settled:** `ministral-8b-2512` cannot serve as the canon auditor. The architecture is sound and
fully wired, but its primary tier is not fit for this job.

**Not settled:** whether a stronger model can. This tested one model. `grok-4-1-fast-reasoning` at
$0.005 per fixture, or `gpt-4o-mini` at $0.00081, are both untested here — and the deliberate
primary-only pin is exactly why this run says nothing about them.

**Cost:** $0.003960 reserved, one run, $0 from the failed attempt. Cumulative session ≈ $0.493.

No further run is taken. The auditor and fixtures are unchanged apart from the citation-bracket fix,
which is a validator defect rather than a tuning change.
