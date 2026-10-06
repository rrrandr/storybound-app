# Four corrections — 2026-10-05

No paid dispatch. Ledger and authorization unchanged. The charging-boundary product change remains
**unapplied**, pending approval. No fixture issue was launched for this: everything below comes from
preserved artefacts and targeted controls.

---

## 1. Run attribution restored

I conflated two different runs. Corrected, and verified against the preserved artefact
`_fs_issue_corpus_out/run_2026-10-02T22-42-28-298Z/log.txt`:

| run | evidence |
|---|---|
| **2026-10-02, nine generated scenes** | **$0.827537 receipted** · $0.062583 unmeasured across 8 receiptless calls · **$0.890120 total exposure** of a $2.90 ceiling |
| **2026-10-05, OAS attempt** | **$0.5095313 receipted** — *not* nine scenes; this is the OAS ledger in `_fs_live_out/BUDGET.json` |

The artefact's own line reads `MEASURED (receipts): $0.827537`, and the nine scene rows (2–10) are
in the same table. So:

> **$0.827537 ÷ 9 = $0.09195 per generated scene, receipted.**

The ~9.2¢ per scene figure was real, and it excludes the receiptless verifier estimates. The
author/planner split ($0.77055185 + $0.05698565) is Codex's recalculation — their two figures sum
to the receipted total exactly, but this log does not pair receipts to stages on a single line, so
I did not independently reproduce the split and do not claim to have.

---

## 2. What the budget protection actually is

**Withdrawn:** *"the run would be refused at admission rather than part-way."* That is not
implemented and I should not have said it.

What `_fs_live_sequence.mjs:307` actually does, per dispatch:

1. estimate the **next** call from its prompt size and requested `max_tokens`;
2. refuse that call if `exposure() + estimate > CEILING`, returning 503;
3. otherwise hold the estimate as `inFlight`, persist the reservation **to disk before the request
   leaves**, and settle it against the receipt when one comes back.

So it is **per-dispatch reservation and settlement**, not whole-run admission. A run whose summed
estimates exceed the remaining authorization **can start** and will halt mid-way at the first call
that would cross the line — leaving a partial corpus, which is the outcome worth planning for.

**Also withdrawn:** *"a fresh run necessarily costs more than these figures."* Extra calls (fresh
setup, live OAS) add cost, but cached input and shorter real completions can reduce the estimated
portion, and the estimate is driven by *requested* `max_tokens` rather than by what a model returns.
The direction of the net difference is **not established**.

---

## 3. Reservation-rate coverage is incomplete — and under-reserves in one direction

**Withdrawn:** *"WORST_RATE is right for a hard cap."* `WORST_RATE` is the maximum over the guard's
**three Grok entries only** (`_fsc_cost_guard.mjs:14`), so it is not an upper bound across providers.

Audited against `public/app.js` TEXT_PRICING (`_rate_coverage_control.mjs`, 5/5):

| model | vs WORST_RATE in | vs WORST_RATE out | verdict |
|---|---|---|---|
| grok-4.3 / grok-4-1-fast-* | — | — | priced in guard |
| grok-4.20-0309-non-reasoning | ok | ok | absent, but covered |
| gpt-4o-mini · mistral-small-latest · ministral-8b-2512 | ok | ok | absent, but covered (over-reserved) |
| **gpt-4o** | **2.0× over** | **4.0× over** | **absent and UNDER-reserved** |
| **gpt-4-turbo** | **8.0× over** | **12.0× over** | **absent and UNDER-reserved** |

`gpt-4o` is the **terminal author fallback** — precisely the model a Grok failure routes to — so the
guard can under-reserve exactly when a fallback fires. Three further models referenced in
`public/app.js` (`mistral-medium-latest`, `mistral-large-latest`, `mistral-small`) are priced in
**neither** table, so they fall to `WORST_RATE` with no published rate to check against.

The guard is conservative for Grok and Mistral-small-class traffic and **not** conservative for
GPT-4o-class traffic. Stated plainly rather than called safe. Not changed here — adding rates to the
guard changes what it refuses.

---

## 4. Preview identity is enforced, not decorated

**Withdrawn:** printing the current encounter/turn beside a match. Codex exercised the classifier and
an **old encounter's** record matched while being reported with the **new** identity.

Preview response records now carry the `encounter` and `turn` they were **served under**
(stamped by `setPreviewContext` as the runner moves through the OAS turns and each scene end), and
matching requires them to equal the submission's identity. A pair that matches a record from another
identity is reported as `UNKNOWN`, naming the identity it really came from.

`_preview_provenance_control.mjs` — **13/13**, exercising the shipped classifier (lifted out of the
runner, not copied):

- a pair served in **this** encounter and turn → `matched-response`
- **the same pair at a different turn → `UNKNOWN`**, evidence naming `turn=2`
- the same pair in a different **encounter** → `UNKNOWN`
- a legitimately tiny dialogue (`"mm"`) still matches when the **pair** matches
- dialogue alone matching → `UNKNOWN`, reported as a partial match
- empty matches empty; empty never matches text
- no card id, or no record → `UNKNOWN`
- cache-only → `matched-cache`, stating the writing model is not established
- the title placeholder → `template-fallback`, never a preview

---

## Decision input, unchanged

| | |
|---|---|
| Remaining under the existing ceiling | **$0.9232852** |
| Measured, 2026-10-02 | **$0.09195 per generated scene** receipted (nine scenes, $0.827537) |
| Summed per-dispatch estimates for the observed 76-call sequence | $2.2302 as the guard would reserve; $1.8691 repriced per-model |
| Fresh setup, live OAS completions | unmeasured; net direction not established |

The guard will not refuse such a run up front — it will stop it part-way. That is the trade-off to
decide on, and I am not proposing a figure as the bill.
