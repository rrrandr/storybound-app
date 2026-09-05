# (superseded — see Run 2 below) 
**Status: INCOMPLETE RUN. The scene did not finish. These are the actual costs of the
dispatches that occurred, not the cost of a complete cold Scene 1.**

- Branch/commit: `6462d31` · `public/app.js` sha256[0:16] = `e06958b61ac78ea0`
- Run window (UTC): **2026-09-04T07:35:23Z → 07:36:48Z** — use this for console reconciliation
- Wall time to settle: 74.3 s · ceiling refusals: 0 (never reached the 45-dispatch ceiling)
- No provider-side spend cap was in place; the run was authorized without one.

## Production defaults, verified in-page

| condition | value |
|---|---|
| hostname | `storybound.love` (not localhost, not `*.vercel.app`) |
| `isDevMode()` | **false** |
| override globals present | **none** (`_forceAudits`, `_forceDeckMandate`, `_forceScene1Onboarding`, `_forceHotOpener`, `_canonGateSpineSignal`, `_armA50`, `_auditSampleRate` all absent) |
| reasoning setting | unconfigured — `XAI_REASONING_EFFORT: null`, `reasoning_effort` omitted from the request |
| `/api/config` | served real (`has_XAI_API_KEY: true`) — never faked |

Running under a production hostname was necessary, not cosmetic: the audit sample gate
(`app.js:7756`) runs the telemetry audits **full on localhost** and samples at 5% everywhere
else, so a localhost run would have billed audits a real user never triggers.

Two things were stubbed, both billing/identity and neither model-routing:
`/api/consume-fortune` (wallet charge) and the Supabase origin (identity). The session is a
dummy token seeded under the real project's storage key — without it production correctly
refuses to sell the issue and nothing dispatches at all.

## Exact dispatch count: 12

Counted at the **network boundary**, not from in-app instrumentation. This matters: the
ledger in `orchestration-client.js` recorded **1 of 12** calls, because most dispatches are
issued by direct fetches in `app.js` that never reach its cost-capture function. Any count
taken from that ledger would have been wrong by an order of magnitude.

| provider | calls | prompt | cached | visible | reasoning |
|---|---|---|---|---|---|
| openai | 8 | 41,052 | 1,792 | 3,892 | 0 |
| xai | 1 | 20,318 | 192 | 1,352 | **1,512** |
| mistral | 3 | — | — | — | — (no usage returned) |

By role: `PRIMARY_AUTHOR @gpt-4o-mini` ×6 · `NORMALIZATION @gpt-4o-mini` ×2 ·
`STRUCTURE_GENERATOR @grok-4.3` ×1 · `STRUCTURE_GENERATOR @mistral-small-latest` ×1 ·
`PROMPT_PREPROCESSOR @mistral-small-latest` ×2.

## Cost

**xAI: $0.032356 — exact.** One `grok-4.3` call (the opening planner), priced at the published
rates: 20,126 uncached prompt @ $1.25/M + 192 cached @ $0.20/M + (1,352 visible + 1,512
reasoning) @ $2.50/M. Reasoning was **53% of billed output tokens** on that single call, with
`reasoning_effort` unset — the exposure that motivated the cap request is real and measurable.

**OpenAI: token counts exact, cost not stated.** I am not quoting gpt-4o-mini rates from
memory into a cost report whose purpose is to contain no estimates. 41,052 prompt (1,792
cached) and 3,892 output tokens across 8 calls; price them from the dashboard.

**Mistral: UNKNOWN, not zero.** All three `/api/mistral-proxy` responses returned an empty
`usage` object (`keys=[]`). Their token counts are unrecoverable from this run. This is an
instrumentation gap in the Mistral proxy path, not a zero.

**All-in: PARTIAL.** xAI $0.032356 exact, plus 11 non-xAI dispatches unpriced here — three of
which have no token counts at all.

## Why this is not the number you asked for

The scene aborted. No prose was produced (`currentSceneText` empty), and the Grok **author**
(`NARRATIVE_AUTHOR`) never fired — only the Grok planner did. The expensive call never
happened, which is exactly why the total looks small.

Observed at the end of the run, not yet proven as the cause: profile hydration reported
`Subscribed: false | Fortunes: 0`, overwriting the staged access state, and a **second**
`handleBeginStory()` fired afterwards — consistent with the boot-time `CHECKOUT_RETURN`
auto-begin at `app.js:11686` identified earlier in this work. The 6 `PRIMARY_AUTHOR
@gpt-4o-mini` calls are the terminal-fallback author, not the Grok author, which suggests the
Grok author path was never entered rather than that it failed.

Per instruction the run stopped here. It was not repeated.

## Reconciliation status: PROVISIONAL

Every figure above comes from `usage` blocks in provider responses captured at the wire. None
has been reconciled against xAI's own usage or billing records. Pull the xAI console for
**2026-09-04 07:35:23Z–07:36:48Z**; there should be exactly **one** `grok-4.3` request with
20,318 prompt / 192 cached / 1,352 completion / 1,512 reasoning tokens. Until that matches,
treat $0.032356 as provisional.

Artifacts: `_audit_out/cold_scene1_wire.json` (authoritative, per-call) ·
`_audit_out/cold_scene1_cost.json` (in-app ledger, shown for the coverage comparison).
Token counts and pricing metadata only — no prose was retained in either.
