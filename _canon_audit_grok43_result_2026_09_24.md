# grok-4.3 (reasoning high) against v2 — FAILS the pre-registered standard, 6/8

Run 2026-09-25 02:07:53. `grok-4.3` only, `/api/proxy`, `reasoningEffort: "high"` enforced
pre-dispatch, single tier, no fallback. Prompt v2, fixtures, scoring and validator unchanged.
Reserved $0.074000 of the $0.08 ceiling. Evidence: `_tempt_fate_fixtures/canon_calibration_2026-09-25_02-07-53/`.

**Realized: $0.042571**, taken from xAI's own reported `cost_in_usd_ticks`.
26,185 prompt / 540 completion / **4,041 reasoning** tokens.

## Verdict: FAIL — 2/4 supported red catches

The pre-registered standard was 4/4 supported reds, 4/4 greens, zero unsupported citations. Grok
returns **4/4 greens and 2/4 supported reds**. By the standard set before the run, it fails, and
per your terms the LLM semantic-auditor design is abandoned: no fifth model, no further prompt
revision. Nothing was wired or enabled.

## The full scoreboard

| Candidate | Arm | Greens | Reds (supported) | Outcome |
|---|---|---|---|---|
| `ministral-8b-2512` | v1 | 0/4 | 1/4 | REJECTED |
| `gpt-4o-mini` | v1 | 0/4 | 3/4 | REJECTED |
| `gpt-4o-mini` | v2 | 1/4 | 2/4 | REJECTED |
| `mistral-small-2603` reasoning | v2 | — | — | UNAVAILABLE (account 429) |
| **`grok-4.3` reasoning high** | **v2** | **4/4** | **2/4** | **FAIL (6/8)** |

**The greens are a first.** No previous candidate passed a single green under v1, and gpt-4o-mini
managed one under v2. Grok passes all four — including `green_tempt_history_rewrite`, where
gpt-4o-mini restated the exempting qualifier verbatim and violated it anyway. So the v2 prompt
repairs do work, on a model able to apply them. That part of the diagnosis is confirmed.

## What you need to know before accepting the FAIL

**Both "unsupported" reds are, on inspection, correct catches.** Grok returned `violation` on all
four reds — the right verdict every time — and its two rejected findings are well-grounded:

| Fixture | Grok's finding | Assessment |
|---|---|---|
| `red_contradicted_knowledge` | `other`, cites **`ev_0`** — *"'no one names the accusation' is still true after the rupture"*, against a plan where the Dohkar names it in detail | **Correct and precisely grounded.** It used the surviving-evidence fact v2 added, exactly as intended. |
| `red_invalidated_objective` | `other`, cites **`neg_0`** — *"convening the formal inquiry is LATE-ISSUE-1 content; early scenes must never include the convened inquiry itself"* | **Correct**, and arguably better grounded than the expected `inv_0`: this is an explicit production constraint forbidding precisely this plan. |

My rubric rejected them because it demands a specific category (`contradicted_knowledge`,
`invalidated_objective`) paired with a whitelisted fact kind (`know`/`dc`, `inv`). Grok used
category `other` with `ev_`/`neg_` facts — and v2's own menu tells it to: *"other — only if a
supplied fact affirmatively forecloses the plan and no category above fits."* It followed the
instruction it was given.

The `supportingFactKinds` whitelist was written **before `ev_` facts existed** — I added them in
v2, in the same pass, and never widened the rubric to accept them. That is a defect in my scoring
harness, not in the model.

**I have not changed the rubric, and I will not.** Re-scoring after seeing the result is exactly
the post-hoc tuning that would void the experiment. The pre-registered verdict stands as FAIL and
I am reporting it as binding. But you asked for a conclusive test, and the honest conclusion is
narrower than the score: **on substance Grok was 8/8; on my category bookkeeping it was 6/8.**
Whether that changes "abandon" is your call, not mine — I am surfacing it, not acting on it.

## Two reporting defects of mine, both found by this run

**1. I understated the cost by ~43%.** I printed `$0.034081`. The true figure is **$0.042571**.
`completion_tokens` on xAI **excludes** reasoning tokens — arithmetic proves it, on the real
object: `total_tokens 4142 − prompt 3229 − completion 120 = 793 = reasoning_tokens` exactly. My
calculation charged only `completion_tokens` and ignored 4,041 billed reasoning tokens. Fixed: the
runner now adds reasoning tokens to billed output and **prefers the provider's own reported cost**
where one exists — xAI publishes `cost_in_usd_ticks`, which matches list-price arithmetic to within
$0.000005 on the real numbers. Under the ceiling either way, but the number I printed was wrong.

**2. A false "MISMATCH" alarm on all eight.** The run printed *"This run does NOT describe
grok-4.3 in reasoning mode. Do not score it as such."* **That was wrong** — reasoning plainly ran,
at 793 reasoning tokens per fixture. My effort check assumed every provider echoes the setting
back; `/api/mistral-proxy` returns `_orchestration.reasoning_effort`, but `/api/proxy` returns
role/model/timestamp and no effort field. A missing echo is **unknown**, never a mismatch. Fixed,
and reasoning is now corroborated independently from `reasoning_tokens` for providers that do not
echo. Had this gone unnoticed, a valid run would have been filed as measuring the wrong thing.

Both fixes are dry-proven (86/86) against the **real** usage object this run returned, not a
synthetic one.

## Latency, which matters if you ever revisit this

4.5s–19.9s per call, median ~6s. As a pre-author gate that is paid on **every scene**, including
the large majority that are perfectly legal. Any future use would have to be selective or
risk-triggered rather than unconditional — as you already framed it.

## Status

Production semantic auditor **DISABLED**. Deterministic canon checks **active**. Routing order
**untouched**. Nothing wired, enabled or reordered. No scene generated, no story mutated, no prompt
or fixture edited after seeing the result. No fifth model.

Cumulative session spend ≈ **$0.543**.
