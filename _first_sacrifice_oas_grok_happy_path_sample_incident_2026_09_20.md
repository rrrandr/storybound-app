# Incident Record — Grok Happy-Path Sample: OAS/Fate-Card Succeeded, Scene 2 Never Reached

**Date:** 2026-09-20
**Status:** inconclusive for Scene 2. Real, priced OAS content captured. Two real spend components
have genuinely **unknown** cost (not zero) as of this record. **The $0.65 combined ceiling cannot
be described as "held" — that claim in my prior report was unsupportable and is corrected here.**

## What was authorized

One live, explicitly-authorized happy-path run: candidate opener (zero-call) → one real player
reply, one real Grok OAS response → real interruption/Fate-Card/Submit path → one real Scene 2
CG-author response. Capped at 8 physical text requests, $0.65 combined ceiling, no images, no
retries beyond the declared normal path.

## What actually happened — exact dispatched call count: 5

| # | Role | Route | Model | Status | Cost |
|---|---|---|---|---|---|
| 1 | OAS turn reply | `/api/proxy` | `grok-4-1-fast-reasoning` | 200 | **$0.031707** (provider-authoritative `cost_in_usd_ticks`) |
| 2 | Fate-card batch | `/api/mistral-proxy` | `ministral-8b-2512` | 200 | **unknown** — no sourced price row at the time this ran |
| 3 | Scene 2 commit-verifier | `/api/mistral-proxy` | `ministral-8b-2512` | 200 | **unknown** — no sourced price row at the time this ran |
| 4 | Scene 2 scene-spine planner | `/api/mistral-proxy` | `mistral-small-latest` | **429** | none (no usage block on a 429) |
| 5 | Scene 2 scene-spine planner (2nd attempt) | `/api/mistral-proxy` | `mistral-small-latest` | **429** | none |

The operation then settled with nothing left in flight and the browser closed cleanly — the actual
Grok Scene 2 author call (`_authorFullScenePolicy`, `max_tokens: 8000`, `/api/proxy`) **never
dispatched at all**, despite 3 of the 8 permitted request slots still being unused.

## Corrected cost accounting

**Known spend: $0.031707.** Calls #2 and #3 both real-succeeded on `ministral-8b-2512`, a model
with no sourced price row in `TEXT_PRICING` at the time of this run — their true cost is
**unknown, not zero**, and was never estimated or invented. Calls #4 and #5 returned no usage block
(429s aren't billed on completion tokens, but this record does not assert they cost nothing either
— it simply reports what the provider returned: nothing).

**Correction to my own prior report in this conversation:** I described the $0.65 ceiling as
"held with wide margin either way." That is not a supportable claim — two real, successful calls
have unpriced cost. The only thing this record can state is that **known** spend ($0.031707) is
comfortably under $0.65; **total** spend, including calls #2 and #3, is unknown until
`ministral-8b-2512` has a sourced price (see the pricing fix accompanying this record).

## What is explicitly NOT claimed here

- **Not a Scene 2 sample.** No Scene 2 prose of any kind was produced or captured.
- **Not evidence the $0.65 ceiling held or was breached.** Genuinely unknown pending pricing.
- **Not a provider outage.** Two real, specific 429s on `mistral-small-latest` at
  `/api/mistral-proxy`, most plausibly a real rate-limit collision from three Mistral-family calls
  (#2, #3, and the first attempt at #4/#5) landing close together in one continuous operation —
  consistent with `mistral-small-latest`'s sourced 1 RPS ceiling (`api/_mistral-governor.js`
  `MODEL_LIMITS`). Not confirmed as the exact mechanism without server-side logs; stated as the most
  plausible explanation, not asserted as certain.
- **Not evidence this specific reply/context combination cannot ever reach Scene 2.** The blocker
  is structural (the scene-spine planner has no fallback and appears to be able to halt the whole
  pipeline on failure — see the accompanying dry repair work), not something specific to this
  session's Say/Do text.

## What is preserved

Real content captured before the halt (both genuinely produced, both real):
- Julian's live OAS reply: *"The hunger in your gaze called louder than the rite itself. Ask, if
  you dare name it before them all."*
- Boundary Fate-Card preview: *"I want you to burn for me, as the First-Favored did for the old
  gods."*

`_first_sacrifice_oas_grok_happy_path_sample_out/`: `report.json` (phases 0-2 only — phase 3's
`phaseReports.scene2CgAuthor` was never reached before `safeExit`), `partial_tracked_calls.json`
(the full 5-call record, all phases), `console_tail.txt`, the persisted `.jsonl` request/response
log.

## What changed as a result

See the accompanying commit: a sourced `ministral-8b-2512` pricing entry, a root-cause trace of why
the scene-spine planner's failure halts the pipeline instead of advancing to a fallback, a repair
routing that planner through an admission-aware tiered policy, and a dry proof of the exact
Fate-Card → verifier → planner-failure → fallback → Grok-author sequence, including the
cross-call rate-limit shape observed here.

**No further live operation has been authorized or attempted.**
