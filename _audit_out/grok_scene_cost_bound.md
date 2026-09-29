# DIRECT-GROK SCENE-AUTHOR COST BOUND — FROM REAL RECORDS ONLY · 2026-09-07

Gate for the HELD route switch (Grok-primary, one bounded retry, honest terminal error, no OpenAI).
Every number below is either a stored usage record, the client's own cap, or published list price
already re-verified in `project_grok_cost_levers` (docs.x.ai, 2026-09-01). Nothing is estimated;
where no record exists the row says UNKNOWN.

## 1 · Records used

| record | source | value |
|---|---|---|
| author prompt tokens, six real grok-4.3 author calls (2026-08-16) | `_validate_out/pair_A_shipped.json`, `pair_B_thinking.json`, `pair_V2A_shipped.json`, `pair_V2B_thinking.json`, `pair_B2_thinking.json`, `thinking_A.json` | 85,058 · 85,978 · 85,978 · 92,123 · 92,826 · 92,826 |
| completion tokens on the same six calls | same files | 476 · 850 · 960 · 967 · 1,276 · 2,709 |
| cached prompt tokens on the same six calls | same files | 0 on all six (cold prompts) |
| reasoning tokens per author call | **no per-call record exists** in `_validate_out` for any 85k-class author call; the reasoning counts on disk (313–1,370) all belong to prompts of 511–4,299 tokens (planner/probe-sized), and one is a stub | UNKNOWN |
| reasoning share, aggregate | xAI console Aug 11–12: 2.1 M reasoning tokens = $5.30 of $22.25 over 8,130 mixed-role requests | 24 % of spend, not attributable per call |
| client completion cap | `max_tokens` 3,000 | hard cap on completion; does NOT cap reasoning |
| list price grok-4.3 | $1.25 / M input · $2.50 / M output (reasoning billed as output); doubles at ≥ 200 k prompt tokens | verified 2026-09-01 |
| only empirical per-scene figure | console reconciliation 2026-08-12, `project_scene_cost_breakdown` | $0.12 mean per continuation (early ~$0.06, late ~$0.15), INCLUDES ~38 % cache hits and reasoning |

Correction to the working figures carried in the previous session: three per-call reasoning counts
(711 / 1,248 / 1,390) were quoted from memory as author-call records. They are not on disk and are
withdrawn. Per-call reasoning for an author call is UNKNOWN.

## 2 · Bound per call (uncached, list price)

| component | worst record | cost |
|---|---|---|
| input | 92,826 tokens × $1.25 / M | **$0.1160** (lowest record 85,058 → $0.1063) |
| completion, at cap | 3,000 × $2.50 / M | **$0.0075** (worst observed 2,709 → $0.0068) |
| reasoning | no cap, no record | **UNKNOWN** — each 1,000 reasoning tokens adds $0.0025 |
| **known part, one call** | | **$0.1235 + reasoning** |

## 3 · Bound per scene under the held policy

| case | calls | known cost | reasoning |
|---|---|---|---|
| success first try | 1 | $0.1235 | unknown (× 1) |
| one bounded retry, then success or honest terminal error | 2 | $0.2470 | unknown (× 2) |
| retry mechanisms compounding (the pre-existing client retry + the new bounded retry, if both fire) | 3 | $0.3705 | unknown (× 3) — must be prevented by design: ONE retry total |

The ≥ 200 k doubling is not reached by any record (max 92,826); it stays a late-issue risk only if
prompts grow, and prompt growth across a 20-scene issue is unmeasured.

## 4 · What is still unmeasured for the switch

1. **Reasoning tokens per author call.** Requires the usage block of the next real author call to
   be captured (the proxy already receives it; it is not stored). Until then the per-scene ceiling
   has an unknown term.
2. **Scene-1 opening planner on Grok.** Measured only as a Mistral governor reserve, and that reserve
   is UTF-8 **bytes** + max_tokens, not tokens: 80,783–84,392 before the stage-order repair; on the
   new route the planner-owned request is 90,288 bytes (sys 6,239 + usr 84,049; `scene1_planner_reserve_route.log`).
   Grok prompt tokens for that payload are UNKNOWN until measured. At the author payload's observed
   ratio (385,347 chars → 86,904 tokens, ≈ 4.43 chars/token) 90,288 bytes ≈ 20,400 tokens ≈ **$0.026
   input per call**, plus completion ≤ 2,400 × $2.50/M = $0.006 — i.e. roughly a quarter of an
   author call, not the author's price class (an earlier draft of this row said otherwise; corrected
   2026-09-07). That ratio is an inference; the capped measurement replaces it with a record.
3. **Cache hit rate under the new policy.** The console mean ($0.12) includes ~38 % cache hits; the
   bound above is the no-cache ceiling.

## 5 · Statement for the decision

Per scene, the KNOWN direct-Grok author cost is ≤ $0.1235 for one call and ≤ $0.247 with the one
bounded retry, at list price, uncached. The reasoning term is unknown per call and can only be
bounded by capturing usage on the next real author call. No number here authorizes a paid run.

## 6 · Update 2026-09-07 — the planner term is now ONE record, not a bound
Capped live measurement (`opening_planner_route_switch.md` §6): one real opening-planner call on
grok-4.3 = 18,389 prompt + 529 completion + 817 reasoning tokens with `reasoning.effort:'none'`;
exact cost per xAI's own field **$0.02615** ($0.0264 by list arithmetic). Reasoning was **61 % of
the reported output tokens** (817 / 1,346) and was billed on top of the visible completion; effort
`none` does not mean zero reasoning. This is one observation of the PLANNER. It does not bound the
AUTHOR's reasoning or per-call cost, which remain **UNKNOWN** until the author's own usage block is
captured on a real call.
