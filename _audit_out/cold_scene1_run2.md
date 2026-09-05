# Replacement cold Scene 1 — Run 2 (2026-09-04)

**Status: the measurement path is repaired and proven; the SCENE still did not complete.
This is again NOT a valid Scene 1 cost figure. Run 1's 12 calls / $0.032 are superseded and
should not be quoted either.**

- Commit `6462d31` · `public/app.js` sha256[0:16] = `e06958b61ac78ea0`
- Run window (UTC): **2026-09-04T15:40:03Z → 15:42:07Z**
- Stopped after one run, as instructed. No third attempt.

## What the repair fixed — proven, not asserted

| check | result |
|---|---|
| exactly one `handleBeginStory` entry (no boot auto-begin race) | **ok** — entries=1 |
| access state survived hydration | **ok** — subscribed=true fortunes=9999 |
| **no model request reached storybound.love** | **ok** — 12 targets, 0 off-dev |
| every model dispatch intercepted, nothing to an unrouted origin | **ok** — escaped=0 |
| no unpermitted provider or route paid for | **ok** — 0 refusals |
| every provider seen was in the frozen permitted census | **ok** — openai, xai, mistral |
| every dispatch attributed to a provider | **ok** — 0 unresolved |
| wire ledger ≥ in-app ledger | **ok** — wire=12, in-app=**1** |

Run 1's central fault is gone: all 12 dispatches were re-issued to `http://localhost:3000`, so
the local proxy handlers executed with local keys. No traffic went to the live site.

The permitted census was frozen **before** dispatch from the dry rehearsal
(`_audit_out/permitted_call_census.json`: 3 providers, 3 routes, 9 route|role pairs). Zero
novel route/role pairs appeared and zero calls were refused.

## What still failed — and it is not the harness

| check | result |
|---|---|
| the flow reaches the author (`NARRATIVE_AUTHOR`) | **FAIL** — 0 author dispatches |
| every dispatch completed at the transport | **FAIL** — 2 × `/api/mistral-proxy` HTTP **429** |

Call sequence: two `NORMALIZATION`, four `PRIMARY_AUTHOR`, the Grok planner
(`STRUCTURE_GENERATOR grok-4.3`, succeeded), three more `PRIMARY_AUTHOR`, then two
`PROMPT_PREPROCESSOR` calls to Mistral that both returned **429 Rate limit exceeded**
(`type: rate_limited, code: 1300`), confirmed in the dev-server log as Mistral's own response.

`orchestration-client.js:~1712` excludes 429 from retry as terminal — correct policy, but it
means a rate-limited `PROMPT_PREPROCESSOR` ends that branch, and the run settles without ever
reaching the Grok author.

**The Mistral account is rate-limited.** This is an external quota condition, not a code or
harness defect, and no amount of harness work will get past it. It is also the corrected
diagnosis of Run 1's "missing Mistral usage": those were redirects then, these are 429s now —
in both cases failed calls, and the repaired ledger now labels them as such
(`httpStatus: 429, transportOk: false`) rather than as usage-less successes.

## Costs actually incurred (dispatches that happened, NOT a Scene 1 cost)

| provider | calls | prompt | cached | visible | reasoning |
|---|---|---|---|---|---|
| openai | 9 | 47,048 | 1,792 | 5,262 | 0 |
| xai | 1 | 21,849 | 192 | 1,247 | 761 |
| mistral | 2 | — | — | — | — (both 429) |

- **xAI: $0.032130 — exact.** One `grok-4.3` planner call. Reasoning was 761 of 2,008 billed
  output tokens (38%), `reasoning_effort` unset.
- **OpenAI: counts exact, cost not stated.** I am not quoting gpt-4o-mini rates from memory.
- **Mistral: no tokens.** Both calls were rejected before any usage existed.
- **All-in: PARTIAL** — xAI $0.032130 exact, 9 OpenAI dispatches unpriced here, 2 failed.

## Reconciliation — xAI

Console pull for **2026-09-04 15:40:03Z–15:42:07Z** should show exactly **one** `grok-4.3`
request: prompt 21,849 · cached 192 · completion 1,247 · reasoning 761. Run 1's corroboration
matched on call count and timestamp but the console did not expose a token breakdown, so the
four usage fields remain independently unverified. Until they are, $0.032130 is **provisional**.

## The blocker for any future run

A cold Scene 1 cannot complete while the Mistral account returns 429. That has to clear — or
`PROMPT_PREPROCESSOR` has to be routed elsewhere, which would be a routing change and needs its
own decision — before a third run could produce the number originally asked for.

Artifacts: `_audit_out/cold_scene1_wire.json` (authoritative, per-call, counts only) ·
`_audit_out/permitted_call_census.json` (frozen pre-dispatch) ·
`_audit_out/measurement_path_fixes.md` (what was repaired and why).
