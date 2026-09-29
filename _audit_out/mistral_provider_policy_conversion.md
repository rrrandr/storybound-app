# Mistral provider policy — corrected measurement + option-1 alignment (2026-09-13)

## Correction to the earlier report
The earlier "reservation" table reported `bytes + max_tokens` against Mistral Small's 20,000 TPM ceiling without distinguishing "raw request bytes" from "the number the governor actually uses to decide admission" — both happened to be the same computation, but presenting it as one column invited exactly the confusion Roman called out. Corrected below: the governor's `reservationFor()` (`api/_mistral-governor.js`) is, by its own documented design, **UTF-8 byte count standing in for a token estimate** — deliberately conservative (bytes over-state real tokens by roughly 4x for English text), never a real token count. That IS the number that determines admission; there is no separate "real" token count the governor consults. What changed is that this report now runs the **actual governor code** (`createGovernor(...).admit(...)`, with the real `memoryStore` test adapter already used by this project's own governor tests) against synthetic messages of the exact measured byte lengths, and reports the real `outcome` enum the governor returns — not a hand comparison against the ceiling.

## Corrected measurement (real governor run, `_measure_governor_admission.mjs`)

| Role | Request bytes | Prompt-token reservation estimate (= bytes) | Max completion reservation | Final admitted-token total | mistral-small-latest allowance | Outcome vs. Small |
|---|---|---|---|---|---|---|
| PC body bible | 35,035 | 35,035 | 2,500 | 37,535 | 20,000 TPM | `reservation_exceeds_model_allowance` |
| LI body bible | 68,848 | 68,848 | 3,000 | 71,848 | 20,000 TPM | `reservation_exceeds_model_allowance` |
| Romance-plot shape (rplot) | 12,286 | 12,286 | 1,200 | 13,486 | 20,000 TPM | `admitted` |
| CG scaffold | 23,458 | 23,458 | 2,000 | 25,458 | 20,000 TPM | `reservation_exceeds_model_allowance` |

(Request-byte figures are the largest observed across the real reload-proof run's repeated firings of each role, the conservative choice for an admission check. Full per-attempt figures are in the harness's own console output, captured 2026-09-13.)

## Option 1: align both layers on real, already-sourced numbers — no invention
`ministral-8b-2512` was already present in the governor's `MODEL_LIMITS` table with a real, dated, sourced entry (`625,000 TPM / 3.13 RPS`, `source: https://admin.mistral.ai/plateforme/limits`, `readOn: 2026-09-04`) — read from the real account limits page in a prior session, not invented here. It was simply never added to `api/mistral-proxy.js`'s `ALLOWED_MISTRAL_MODELS`, so a request naming it would have been rejected at the proxy before the governor ever saw it. **Added 2026-09-13** (one line, `api/mistral-proxy.js`). No new number was obtained or guessed — both layers now agree on a number that was already real.

Re-run against the real governor, all four roles, two additional scenarios beyond plain admission:

- **ISOLATED** (each role alone, fresh bucket — the pure size question): all four `admitted` on `ministral-8b-2512` (and, for completeness, on `ministral-3b-2512`/`ministral-14b-2512` too — all three Ministral tiers have enough TPM headroom for every role).
- **REALISTIC BURST** (all four roles fired together, unspaced, one shared bucket — exactly how the real Genesis-gate setup fires them today): only the FIRST call admits; the other three get `quota_exhausted_rps` — on **every** Ministral tier, not just 8B. TPM headroom does not fix an RPS ceiling; picking a bigger model does not solve this.
- **REALISTIC SPACED** (all four roles, spaced by the model's own `ceil(1000/rps)` interval): all four `admitted` on every tier.

**Why `ministral-8b-2512` over 3B or 14B**: all three admit every role's real payload with room to spare. The differentiator is the spacing a real 4-call burst needs: 3B needs ~80ms between calls, 8B ~320ms, 14B a full 2,000ms (14B's low RPS is explicitly flagged in the governor's own comments as "the poorest fit for anything bursty"). Four calls spaced at 320ms adds under a second of setup latency; at 14B's spacing it's 6-8 seconds. 8B also has prior consideration in this codebase's history (referenced in the governor's own comments re: an "8B-vs-14B preprocessor choice"). This is a judgment call, stated plainly — Roman can pick 3B or 14B instead if he weighs it differently; nothing about the admission math forces 8B specifically.

## The shared helper (built, `public/app.js`, beside `_setupMistralPost`)
`_callTieredProvider(roleTag, messages, opts)` — tries, in order: **primary** Mistral (`ministral-8b-2512`, spaced through `_tierPaced()` so a real burst never trips the RPS ceiling) → **fallback** Grok (`grok-4-1-fast-reasoning`) → **terminal** Claude/OpenAI (`gpt-4o-mini`, only reached after both above throw or return empty content). Every attempt, every tier, logs role/tier/provider/model/fallback-reason/attempt-number to `window._providerTierLog` BEFORE the network call — the outbound-boundary declaration Roman required. Returns `{content, usage, _orchestration:{model}, tier, provider, attempt}`, matching the shape `_setupMistralPost` already returns, so cost telemetry (`_recordProxyTextCost`) can attribute cost to whichever provider actually served the request. `node --check public/app.js` clean.

## Still to do (handed to a spec'd implementation pass, not done as of this writing)
Convert the four generators' own network-call sites to use `_callTieredProvider` (prompt-building logic UNCHANGED — no trimming, as instructed) — held as ONE complete four-role conversion, not a partial rplot-only rollout. Build the required controls (healthy/Mistral-fail/Mistral+Grok-fail/no-unknown-calls/concurrent-coalescing/full regression). Update the reload-proof harness's chatgpt-proxy census so a direct Claude/OpenAI primary attempt for these four roles is a test failure, not a silent pass.

## §2 — "No unknown outbound calls" investigation, closed with real findings (2026-09-13)

The first control run's FAIL was treated as a hard blocker, not a loose end, per instruction. Investigated on a fresh process, with full request-content capture (not 100-char heads) — the SYS/USR content was matched against real code, not left as "the classifier didn't recognize it."

**Four real calls identified, all in the same Genesis-gate lifecycle window as the original four roles:**

| Call | Endpoint (before) | What it actually is | Verdict |
|---|---|---|---|
| ×2 `mistral-small-latest` | `/api/mistral-proxy` | The 5-body-tell reroll INSIDE `_generatePCBodyBibleUncached` (app.js ~254084) — a pre-existing, already-Mistral-routed sub-call, gated on a billionaire-modern world/archetype combination | Not a policy violation (never touched OpenAI/Claude). Given its own explicit, non-generic classification in the control so it's never left as "unclassified" again. |
| `gpt-4o-mini` "architect of WHY THIS PAIR" | `/api/chatgpt-proxy` | `_generatePairBond()` (app.js ~51919) — a sixth same-lifecycle generator, single caller, fires right after the bibles/rplot | Real silent OpenAI primary. **Converted** to `_callTieredProvider('pairBond', ...)`. |
| `gpt-4o-mini` "editorial auditor reviewing an R-plot" | `/api/chatgpt-proxy` (via the SHARED `_auditPost` helper) | `_auditRPlotShape()` (app.js ~262254) — a quality-check pass on the rplot, single caller | Real silent OpenAI primary. **Converted** — but only THIS call site's dispatch, not `_auditPost` itself (17 total callers across the app; the other 16 are unrelated to this lifecycle and were left untouched, to avoid a broad, out-of-scope change). |

**Also found and converted, not from the classification investigation but from the same "no silent primary" principle**: `_generateAntagonistBodyBibleUncached()` (app.js ~255072) — a self-gated (named Shape-A/B antagonist only) same-lifecycle generator, previously `gpt-4o-mini` direct primary. **Converted** to `_callTieredProvider('antagonistBodyBible', ...)`.

**Total conversion footprint: 7 call sites** — `pcBodyBible`, `liBodyBible`, `rplot`, `scaffold` (original four), plus `antagonistBodyBible`, `pairBond`, `rplotAudit` (found during this investigation). All 7 confirmed by grep (`_callTieredProvider('` appears exactly 7 times) and `node --check public/app.js` clean.

**Control harness corrected in three ways**, not just re-labeled:
1. `TIERED_ROLES` expanded to all 7; classifier given explicit markers for the tell-reroll (non-violating) and the two newly-converted roles, so nothing falls through as "unclassified" again.
2. The per-scenario assertions were wrongly requiring EVERY role to fire exactly once — `antagonistBodyBible` is legitimately self-gated and does not fire on every story. Fixed to: a role that didn't fire is reported separately (visible, not silently assumed fine); a role that DID fire must show the correct single-Mistral-attempt (or correct fallback/terminal) shape — never both-or-nothing conflated.
3. The "no unknown outbound calls" assertion was scoped too broadly — it was flagging harmless, unrelated non-generative traffic (image rendering, bug-report telemetry) as if it were a policy violation. Rescoped to LLM-endpoint traffic specifically, matching "no unknown GENERATIVE-PROVIDER calls" precisely.

**Re-run, clean: 13/13.** Healthy case — 6 of 7 roles fired this run (antagonistBodyBible correctly self-gated off), every one exactly one Mistral attempt, zero Grok, zero Claude/OpenAI. Mistral-fail — every fired role falls to Grok exactly once with a real, named reason. Mistral+Grok-fail — every fired role reaches the terminal OpenAI tier only after two genuine prior attempts, in order. No unknown generative-provider calls anywhere across all three scenarios. Coalescing — two concurrent synthetic callers for the same bible still produce exactly one real attempt.

## §3 — Real, unresolved finding: bible generation still duplicates in the ACTUAL production flow (not fixed, not covered by the synthetic coalescing test)

The synthetic coalescing scenario (two same-tick calls to `_generatePCBodyBible()`) passes — `_bodyBibleOnce`'s in-flight dedup is sound for that case. But an independent, real-click-path diagnostic (`_classify_genesis_setup_calls.mjs`, First Sacrifice, real Genesis charge, no shortcuts) showed `pcBodyBible` and `liBodyBible` **each firing twice** in the real flow — reproduced twice, independently. The two firings' user-prompt byte counts differ slightly (22,709 vs 22,785 bytes), meaning they are NOT a same-tick race — they are two temporally-separated, independently-triggered generation attempts.

There are at least 6 distinct call sites across the codebase that each independently attempt `_generatePCBodyBible()`/`_generateLIBodyBible()` (app.js ~96322, ~217029, ~225649, ~257189, ~264253, plus the one inside `handleBeginStory` itself) guarded only by `!state.pcBodyBible` — and `handleBeginStory()` itself has 15+ call sites across the app. Leading hypothesis, **not confirmed**: two of these call sites fire from genuinely separate invocations of the surrounding setup flow, and the first attempt hasn't written `state.pcBodyBible` back yet by the time the second one checks its guard. This needs direct instrumentation of `handleBeginStory`'s entry (or the specific bible call sites) to confirm — not done here, given the time already spent on this investigation.

**This is a real, pre-existing defect, independent of the provider-policy conversion** (it existed before this work and is not something the tiered conversion introduced or fixes). It is NOT claimed fixed. Flagged as open, separate from the "no unknown outbound calls" gate, which IS resolved.

## §4 — Full regression, run directly (2026-09-13), all green

| Command | Result |
|---|---|
| `env DRY=1 E2E=1 node _author_packet_integration.mjs` | PACKET TEST (RED=none): 12 rows · 12 passed · 0 failed |
| `env DRY=1 node _page_preservation.mjs` | PRESERVATION TEST (RED=none): 6 rows · 6 passed · 0 failed |
| `node _cg_beat_narration_loss_control.mjs` | PRESERVE 3/3 · CONTROL 3/3 |
| `node _cg_beat_presentation_control.mjs` | 17/17 |
| `node _cplus_render_regression.mjs` | C+ RENDER REGRESSION: 10 rows · 10 passed · 0 failed |
| `env OAS=1 node _first_sacrifice_seed_contract.mjs` | SEED CONTRACT (EDITORIAL): 49 rows · 49 passed · 0 failed |
| `env LAUNCH=afterboot node _baked_screen_probe.mjs` | BAKED SCREEN PROBE (afterboot): 11 rows · 11 passed · 0 failed |
| `node _cg_oas_library_reload_proof.mjs` | CG/OAS LIBRARY RELOAD PROOF: 35 rows · 35 passed · 0 failed |

The reload-proof's own new `TIERED-PROVIDER-CENSUS` assertion (added this pass) confirms: the FIRST observed request for each of pcBodyBible/liBodyBible/rplot/scaffold is a `mistral-proxy` call in the harness's real healthy run — never `chatgpt-proxy` first. Its ChatGPT-proxy count dropped from **11 → 2** across the whole journey. The remaining 2 are both identified, not vague: a "WOUND→LI SWAP TEST" story-structure auditor and a "RUNTIME COMMIT verifier" — two further, genuinely SEPARATE audit/verification features, unrelated to the bible/scaffold/rplot family this policy targeted. Not converted — flagged as a separate, later scope decision, not silently absorbed into this pass.

## Summary — what is proven, what remains open
**Proven, with real evidence, independently re-run by the main session:** 7 generation call sites (pcBodyBible, liBodyBible, rplot, scaffold, antagonistBodyBible, pairBond, rplotAudit) now route Mistral (ministral-8b-2512) primary → Grok fallback → Claude/OpenAI terminal-only, telemetry-first, RPS-paced. Healthy/Mistral-fail/Mistral+Grok-fail/no-unknown-generative-calls/coalescing all green (13/13). Full regression green (packet/preservation/CG-narration/CG-presentation/C+/seed-contract/baked-probe/reload-proof all pass). No paid call made anywhere in this work.
**Open, not resolved, reported honestly:** (1) bible generation still duplicates in the real Genesis-gate flow via a mechanism the synthetic coalescing test doesn't cover — root cause hypothesized (multiple call sites across `handleBeginStory`'s many invocations, each independently guarded) but not confirmed. (2) Two further audit-family OpenAI calls identified (wound-swap test, runtime-commit verifier) — real, but out of this pass's scope; not converted.

## §5 — Final closure (2026-09-13): both mandatory items, done with real corrections along the way

### Item 1 — wound-swap auditor + runtime-commit verifier converted
Both are genuine semantic-judgment calls (does prose deliver a proposed transition; is a wound truly bound to the LI) — not reducible to deterministic local logic, so both were converted, not replaced. `_commitScene`'s runtime-commit verifier (app.js ~97657) and `_auditWoundLIIntegration` (app.js ~262382, routed around the shared `_auditPost` — same pattern as the R-plot auditor, that helper's other 16 callers untouched) now go through `_callTieredProvider`. **Total conversion footprint: 9 call sites.** The full reload-proof's ChatGPT-proxy count is now **0** across the entire real journey (was 11, then 2, now 0).

### Item 2 — bible duplication: the original claim was WRONG, retracted with evidence
Re-tested with real, valid fixture content (not the inadequate ad hoc stub used for the original byte-size measurement): `_generatePCBodyBible()` fires **exactly once** when the first attempt succeeds — no duplication. The originally-reported "confirmed duplicate" was an artifact of a throwaway diagnostic script returning `{"ok":true}` for the bible content, which fails validation and legitimately triggers the SAME retry-on-failure mechanism Roman's own item 2 asks the system to have. This correction is recorded here plainly, not smoothed over.

**Built anyway, as real hardening**, since an explicit, durable, fingerprinted state machine is more correct and auditable than relying on implicit truthy-checks, and because it's what closes the ACTUAL scenario Roman named (retry-after-a-real-failure, and a conflicting-result race) with proof rather than inference:
- `state._bibleArtifacts.{pc,li}` — a persisted per-story record: `absent → pending → committed | failed`, fingerprinted on the DECLARED INPUTS that actually vary the prompt (subject name, gender, archetype/mask, world/subtype, A-plot goal), with attempt count and timestamps.
- Reuse a committed artifact when the fingerprint matches; join a pending one (same fingerprint) rather than issuing a second request; an explicit refresh (fingerprint changed) is logged by name; a failed attempt retries deliberately, logged as a retry, never silently indistinguishable from a fresh first attempt.
- An attempt-numbered ownership token closes a real gap the pre-existing key-only ownership check (`_bodyBibleStillOwned`, story+subject only) did not cover: an input change that leaves the subject name the same. A stale attempt superseded by a newer one is discarded on late arrival, logged, never overwrites the canonical value.
- Backward-compatible: a story saved before this ledger existed (bible already set, no ledger record) is backfilled as committed, not regenerated.

**Two real bugs found and fixed while building the control for this, not left for later:**
1. **The gate function had no "join a pending attempt" case at all** — every caller, even a genuinely concurrent one, fell through to "start a new attempt." This silently broke the pre-existing, already-proven coalescing behavior (caught immediately by re-running the existing coalescing control, which went from passing to failing). Fixed.
2. **`_tierPaced`'s queue serialized on full request completion, not just dispatch spacing** — a slow or held-open response to any role would have blocked every later caller to the same model indefinitely, not just for the rate-limit interval. Found while building the conflicting-result control (which deliberately holds a response open) — a real production latency risk, not exercised by any prior test. Fixed: the next caller only waits for the spacing gap, never for a prior call's full completion.

**Controls, `_bible_artifact_ledger_control.mjs`, 6/6**, run directly through the real `window._generatePCBodyBible()`, not a reimplementation: the real delayed-retry-after-failure path (all 3 tiers genuinely exhausted, then a separate later call succeeds, recognized and logged as a deliberate retry, exactly one canonical bible committed) and the conflicting-result red control (a slow, stale attempt superseded by a real explicit refresh is discarded on late arrival, never overwrites the canonical value, discard logged).

### Full regression, re-run after both fixes: all green
`_tiered_provider_policy_control.mjs` 13/13 · `_bible_artifact_ledger_control.mjs` 6/6 · packet 12/12 · preservation 6/6 · CG narration 3/3+3/3 · CG presentation 17/17 · C+ regression 10/10 · seed contract 49/49 · baked probe 11/11 · **reload proof 35/35, ChatGPT-proxy count: 0 across the whole real journey**.
