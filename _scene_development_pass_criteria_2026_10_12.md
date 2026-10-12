# Pre-registered observations — do the revised instructions produce developed scenes?

> **Registered 2026-10-12, BEFORE any provider call of this run.**
> Authorization: explicit go from Roman, **$2 of new spend**. Prior ledger exposure $10.762199,
> so the runner ceiling is $12.762199 and this run can add at most $2.
> Baseline is the run of 2026-10-11 (`_fs_live_out/run_2026-10-12T02-16-25-745Z`).

**What changed since the baseline, and is therefore under test:** the Scene Scaffold's causal
specification (a development must change what is possible next; restatement is not development;
the count is a consequence, not a quota) and the author's format reconciliation (screenplay-native
governs FORM, not substance; neither literary-prose-cut-into-beats nor outline-as-captions).

**What is NOT under test:** the ownership chain, the evidence classification, the commit gate.
Those are closed. Nothing here reopens them.

---

## The four observations, with their baselines

| # | measure | baseline (2026-10-11) |
|---|---|---|
| D1 | `causal_outline` entries that change what is possible next, vs restatements | scene 3: 24 entries, ~7 developing, ~16 restating |
| D2 | words per delivered scene | 161 / 214 / 209 / 171 / 209 / 208 / 189 (~194 avg) |
| D3 | beat prose as a share of author output | ~1,107 chars of ~16.9 KB ≈ 7% |
| D4 | are the consequential developments answered on the page? | no — three restrictions as three bare lines, no response, cost only as simile |

**D1 is scored by reading each outline entry against the state of the scene**, before looking at the
delivered prose, and the per-scene counts are recorded before any judgement about quality.

## Pre-registered verdict

- **IMPROVED** = D1 shows materially fewer restatement entries AND D2/D4 show the real developments
  written through (answered, with a cost landing), not merely longer captions.
- **NO CHANGE** = outlines still pad with restatements, or scenes stay ~200 words of captions.
- **MIXED** = outlines improve but prose does not, or the reverse. This is a real possible outcome
  and is to be reported as such, not resolved by argument.

A longer scene that is still captions is **not** an improvement. A shorter outline whose every entry
develops **is** one.

## Secondary observations (recorded, not scored)

- Does the Issue Spine now complete under its schema-derived allowance (8,250 tokens for 2 CG
  issues × 10 rows)? It truncated 14/14 at 2,000 on the baseline run. **This is paid work inside
  the $2, not a free by-product** — inspecting the result is free; the call is not.
- Does a live spine, if it completes, fill per-issue outlines? Never yet observed.
- Verifier behaviour under the 4,800-token budget and the reconciled instructions.

## Conditions

- **Ceiling $12.762199 total** = prior $10.762199 + $2 authorized now. The runner reserves before
  dispatch and halts rather than exceed it.
- **Origin `http://localhost:3001`**, the instance whose function layer is healthy. The instance on
  3000 serves static files but its @vercel/node builder failed to install, so every /api/* call
  there answers 502. Verified provider-free before dispatch: `_proxy_health_diagnostic.mjs` 12/12
  with dev-log "Trying model" lines unchanged (172 → 172), so no upstream attempt was made.
  **That establishes the function layer receives and answers; it does NOT establish that every
  provider route is healthy upstream.** A local failure, a retained reservation and a billed
  generation are three different things and are reported separately.
- **Images BLOCKED. Entitlement/payment SIMULATED.** Scene 1 is the FIXED hand-authored opening.
- **Results reported BEFORE any fix or rerun.** No prompt or harness change while the run is live.
