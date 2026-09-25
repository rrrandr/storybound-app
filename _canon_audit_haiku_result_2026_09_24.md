# Claude Haiku 4.5 (extended thinking) vs v2 — strict FAIL 6/8, human reading 8/8
# …and it exposed a real defect in the shared SCORER. Stopped before Grok 4.7.

Run 2026-09-25 02:36:54. `claude-haiku-4-5-20251001` only, via the isolated `/api/anthropic-proxy`,
extended thinking enabled (budget 1024, 1,836–2,221 thinking chars per fixture — it genuinely ran).
Single tier, no fallback. Prompt v2, fixtures, scoring and validator unchanged.
Reserved $0.107200 of the $0.11 ceiling. **Realized $0.068387** — 28,157 in / 8,046 out.
Model identity clean on all eight. Evidence: `_tempt_fate_fixtures/canon_calibration_2026-09-25_02-36-54/`.

## Strict automated score: FAIL — 4/4 greens, 2/4 supported reds

```
GREEN confusion_records      pass ✓        RED memory_extraction       caught ✓
GREEN alignment_sense        pass ✓        RED visible_glow            caught ✓
GREEN tempt_history_rewrite  pass ✓        RED contradicted_knowledge  unsupported
GREEN mundane_invention      pass ✓        RED invalidated_objective   unsupported
```

## Human semantic reading: 8/8

Haiku returned the **correct verdict on all eight** fixtures — `pass` on every green, `violation`
on every red. Its two rejected findings:

| Fixture | Cited | Reasoning |
|---|---|---|
| `red_contradicted_knowledge` | `other` / **`ev_0`** | *"[ev_0] commits that after the rupture, 'no one names the accusation' remains true — the Dohkar cannot name what the rupture foreclosed from being named."* |
| `red_invalidated_objective` | `other` / **`neg_0`** | *"Canon explicitly states that the formal inquiry's convening is LATE-ISSUE-1 content, forbidden in early scenes…"* |

Both are correct, precisely grounded, and well argued.

## THE STOP CONDITION: this is a scorer defect, not a model result

**Haiku cited the exact same two facts, under the exact same category, with the same reasoning, as
grok-4.3 did — independently.** Different vendor, different reasoning mechanism, identical answer.

That is not two models failing the same way. It is **two models being right the same way and my
scorer rejecting both.** There are two concrete bugs:

**1. `ev_` is in no whitelist.** I introduced `ev_` facts (surviving evidence) in the v2 packet fix
and never updated `supportingFactKinds`, which still reads `['know','dc']` and `['inv']` from the
v1 era. `ev_0` is arguably the *best available* citation for `red_contradicted_knowledge` — the
fact that explicitly forecloses it — and my scorer cannot accept it. **My own v2 fix created a fact
kind my scorer can't score.**

**2. The scorer contradicts the prompt.** v2's category menu instructs, verbatim: *"other — only if
a supplied fact affirmatively forecloses the plan and no category above fits."* Three models have
now followed that instruction and been marked as producing an unsupported finding, because `other`
appears in no `expectCategories` list. **A model that obeys the prompt loses points for it.**

This invalidates the **red half** of every v2 comparison — Haiku, grok-4.3, and partly gpt-4o-mini
v2. Running grok-4.7 now would almost certainly produce the same `other`/`ev_0`/`neg_0` findings and
score 6/8 regardless of its ability, measuring my rubric rather than the model. That is your stated
stop condition, so I stopped.

## I have not changed the rubric

Re-scoring after seeing results is the post-hoc tuning that would void everything. The strict
verdict stands as recorded. The decision is yours.

**Note that fixing this costs $0 in provider spend.** Every response, citation and verdict from all
five completed runs is preserved on disk. A corrected rubric can re-score Haiku, grok-4.3,
gpt-4o-mini v1 and v2, and Ministral **offline, with no new dispatches.**

## Three options

1. **Authorize a rubric fix, re-score everything offline ($0), then run grok-4.7** against the
   corrected scorer — the only version of this experiment that measures models rather than my
   bookkeeping. Grok 4.7 still costs $0.1504 reserved / $0.16 ceiling.
2. **Run grok-4.7 as-is**, accepting its red score is largely predetermined by the same defect.
   Its green performance would still be informative.
3. **Close now.** On the human reading, two models already clear the bar the strict scorer cannot
   express.

I recommend **(1)**, with the rubric change specified and dry-proven *before* re-scoring, so the
correction is visibly independent of the results it will produce.

## Standing comparison (strict / human)

| Candidate | Arm | Greens | Reds strict | Reds human | Realized | Median latency |
|---|---|---|---|---|---|---|
| `ministral-8b-2512` | v1 | 0/4 | 1/4 | — | $0.000495 est | ~2s |
| `gpt-4o-mini` | v1 | 0/4 | 3/4 | — | $0.003121 | ~2s |
| `gpt-4o-mini` | v2 | 1/4 | 2/4 | 3/4 | $0.004207 | ~2s |
| `mistral-small-2603` | v2 | — | — | — | $0 (429) | — |
| `grok-4.3` reasoning | v2 | 4/4 | 2/4 | **4/4** | $0.042571 | ~6s |
| **`claude-haiku-4-5`** | **v2** | **4/4** | **2/4** | **4/4** | **$0.068387** | **~14s** |

Haiku matches grok-4.3 on accuracy, costs **1.6×** more, and is **~2.3× slower** (8.1s–24.6s,
median ~14s). Per-scene if used unconditionally: **$0.0085** and ~14s added to every generation.

## Status

Production semantic auditor **DISABLED**. Deterministic checks **active**. Routing **untouched**.
No scene generated, no story mutated, no prompt/fixture/rubric edited after the result.
Combined spend against the $0.27 pair ceiling so far: **$0.068387**.
