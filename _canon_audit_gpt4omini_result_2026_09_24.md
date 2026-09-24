# GPT-4o-mini canon-auditor calibration — REJECTED

Run once, 2026-09-24, pinned to `gpt-4o-mini` only. 8 dispatches, **$0.003121 realized** (17,600 in
/ 802 out) against a $0.01 ceiling.
Evidence: `_tempt_fate_fixtures/canon_calibration_2026-09-24_18-43-29/`.

**Reported independently of the Ministral 8B result. Scores are not merged.**

## Verdict: DO NOT ENABLE

| | `gpt-4o-mini` | `ministral-8b-2512` |
|---|---|---|
| Usable responses | **8 / 8** | 7 / 8 |
| Reds caught (substantive) | **3 / 4** | 1 / 4 |
| Unsupported findings | 1 | 2 |
| **Greens passed** | **0 / 4** | **0 / 4** |
| **False positives** | **4 / 4** | **4 / 4** |
| Parse failures | **0** | 1 |

GPT-4o-mini is **clearly better** than Ministral on every mechanical axis: every reply parsed,
every reply validated, recall is higher, and it produced only one unsupported finding
(`red_invalidated_objective`, the same fixture Ministral also failed to support).

And it fails for the identical reason:

> **All eight verdicts were `violation`. It never returned `pass`.**

## The common factor is the prompt, not the model

Two models, different vendors, different sizes, different price points — and **both flagged 100% of
the green fixtures**, including:

- Julian lifting a torn mouth-band and asking whose it is;
- a registrar reading a ledger aloud;
- a First Favored using canon-granted alignment-sense;
- building on a committed, authorised history rewrite.

When two independent models agree that ordinary dialogue is a canon violation, the most probable
cause is not two coincidental model failures. It is that the auditor prompt is **biased toward
finding violations** — it asks "does this plan assert anything the supplied canon does not
support?", which invites a yes, and the packet it supplies is a list of constraints with no
positive permission to weigh against them.

That is a hypothesis, not a finding. It is testable dry — the prompt can be rebalanced and re-run
against the same eight fixtures for the same ~$0.003–0.006 — and it should be tested before any
third model is bought, because a third rejection would otherwise tell us nothing new.

## A defect of mine, found by this run

The first attempt (`canon_calibration_2026-09-24_18-42-30`) made **zero dispatches and spent $0**:
`installCalibrationRoute` still pinned the module-level Mistral endpoint and model, so it aborted
`/api/chatgpt-proxy` before dispatch. Containment worked exactly as designed — it simply had the
wrong model pinned. Fixed: the route now reads the candidate from the holder.

A second, smaller defect surfaced in the successful run: the reservation ledger defaulted to
Mistral's per-call rate, so it reported **$0.003960 reserved** while gpt-4o-mini's rate is
$0.000810/call. It stayed under the ceiling either way, and the realized figure ($0.003121) is
computed from real usage rather than the reservation — but the reserved number was wrong for the
model being run. Fixed: `makeLedger` now takes the candidate's rate.

## Status

- Production semantic auditor: **DISABLED** (unchanged — default off, explicit opt-in only).
- Deterministic canon checks: **active** (unchanged).
- Routing order: **unchanged**. Nothing was wired in.
- Two candidates tested, two rejected, on the same bar.

Cumulative session spend ≈ **$0.496**.
