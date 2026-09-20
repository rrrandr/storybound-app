# Scene 2 Planner/Author Replay — Updated Authorization Sheet (2026-09-20, second pass)

Supersedes the ceiling in `_scene2_repair_replay_sample.mjs`'s header (the $0.45 replay run 2 of
this same day) for a **new** replay, now that the planner budget/retry repair below is committed.
Scope is unchanged from that run: **planner + author only**. No OAS, Fate-Card, or scaffold
recharge — this replay reuses the same already-paid, persisted real content via the same
zero-cost test-only replay mechanism (`gate.stub()` fed from a prior real run's `.jsonl` log),
making real calls only from the repaired planner call onward.

## What changed since the last replay attempt

- `_scMaxTok`'s always-active production branch raised 640 → 1200 (`public/app.js`, commit
  `e30677fa`). The prior real replay's planner response truncated at exactly 640/640
  completion_tokens (`finish_reason:"length"`) — definitive truncation, not inferred.
- The bounded retry is now dry-proven (not just statically traced): on a genuinely unusable
  planner response, it dispatches a second, real, independent attempt under its declared
  conditions, and if that also fails, `state._cgResumable` records a real, named, observable
  terminal reason — never a silent "retrying" with no outcome. (`_scene2_planner_budget_and_retry_repair_control.mjs`,
  10/10, fully dry, real retained data throughout.)
- A structurally complete version of the real retained response (same prose, finished) was proven
  to reach the real Scene 2 author call boundary once validated — confirming the repaired path
  actually delivers a planner→author handoff, not just a cleaner rejection.

## Updated cost ceiling

The planner's real captured prompt is 2,933 tokens on `ministral-8b-2512` ($0.15/M flat,
in and out). At the new 1200-token cap, one full planner attempt costs at most
≈ (2,933 + 1,200) × $0.15 / 1,000,000 ≈ **$0.0006**; two attempts (if a retry is needed)
≈ **$0.0012** — negligible against the existing $0.05 planner line-item, which is **kept
unchanged**. The dominant cost is the real Grok Scene 2 author call (`max_tokens: 8000`);
the existing $0.40 author line-item is also kept unchanged, since nothing in this repair
changes that call's shape or model. **Combined ceiling: unchanged at $0.45.**

| Phase | Ceiling (USD) | Physical requests |
|---|---|---|
| scene2-planner (repaired, 640→1200, retry-proven) | $0.05 | ≤2 (primary + one bounded retry) |
| scene2-author (unchanged) | $0.40 | ≤2 (commit-verifier + Grok author) |
| **Total** | **$0.45** | **≤8** (hard ceiling, unchanged) |

No images. No retries beyond the declared normal path. No new OAS/Fate-Card/scaffold spend —
those phases stay on the stub lane, replayed from the same persisted real content used in the
prior $0.45 run (`_first_sacrifice_oas_grok_happy_path_sample_out/run_1789878699028.jsonl`).

## What this replay would (and would not) prove

Would prove: the repaired planner now produces a usable objective within its new budget on a
real `ministral-8b-2512` call, and — if it doesn't on the first try — that the retry and
terminal-reason mechanics behave in production exactly as the dry control showed. Would finally
produce real Scene 2 CG prose from the actual player journey.

Would not prove: a cold-start end-to-end run (this still reuses the already-paid real scaffold,
as disclosed in the prior replay's own corrected framing) — that remains a separate, not-yet-run
proof.

## Status

Repaired, dry-proven, committed locally (`e30677fa`), not pushed. **No provider calls made in
this repair pass.** Awaiting explicit authorization before running this replay for real.
