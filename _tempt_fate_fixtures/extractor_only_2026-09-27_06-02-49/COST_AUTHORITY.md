# Cost authority for this run

**AUTHORITATIVE: $0.006450** — the provider's own figure, `usage.cost_in_usd_ticks` = 64,496,500,
at 1 tick = 1e-10 USD. Preserved verbatim in `upstream_receipt.json` and `upstream_raw_response.json`.

**`upstream_receipt.json` → `measuredUsd` = 0.005421 is INACCURATE. Do not cite it.** It is derived
from token counts (2,619 prompt × $1.25/M + 859 completion × $2.50/M) and understates the real charge
by about 19%. This repo's own convention already prefers the provider's ticks over derived arithmetic
(`estimateTextCost` in `public/app.js`; see
`_oas_turn_reply_long_context_reclassification_control.mjs`, where a ticks figure likewise disagreed
with a token-derived estimate).

The receipt is left exactly as the adapter wrote it — annotating it here rather than editing it keeps
the captured evidence intact. The field is a known reporting defect, deliberately left unfixed.
