# OAS / Full-Scene Author Role → Provider Ledger (2026-09-20)

Corrects and supersedes the implicit assumption in earlier session work that "Mistral Small can
serve OAS dialogue roles" — that held for the **opener** (short prompt, unmeasured but plausible)
and does **not** hold for the **live turn reply** (measured, confirmed oversized by a real,
deterministic governor refusal). Four distinct roles exist across the OAS/full-scene surface; each
has its own real, current eligible provider chain. Do not treat them as interchangeable.

## 1. Authored opener (zero-call, when present)

- **Function:** `_fireIntimacyOpener` (app.js ~185405), authored short-circuit (~185420-185453).
- **Chain:** none — zero model call. Renders `d._authoredFrame.oasOpening.text` directly when a
  baked/candidate package supplies it.
- **Status:** proven dry, 2026-09-19/20 (`_first_sacrifice_candidate_oas_opener_mount_control.mjs`,
  20/20) — zero text/LLM calls, real candidate text renders verbatim, reaches the next turn's
  prompt correctly.
- **Currently shipped:** `public/starter-scenes.js`'s `starter_first_sacrifice` has **no**
  `oasHandoff.oasOpening` yet — every live session today falls through to the live-generated path
  below. The real, final candidate text exists at
  `_first_sacrifice_draft_v7_attempt8_full_package/13_final_field_correction.json`
  (`draft.oasOpening` / `draft.postInterruptionBeat`) but has not been wired into the shipped file.

## 2. Opener, live-generated fallback (when no authored opening exists)

- **Function:** `_fireIntimacyOpener`'s live path → `callOASTurnLLM` (orchestration-client.js
  ~5776), roleTag `oas-opener`.
- **Chain:** FAST chain (default) — Mistral Small primary (`window._oasSmallEnabled`
  kill-switched), Grok fallback at the established 45s timeout (fixed 2026-09-19, was 12s — the
  confirmed cause of a real `net::ERR_ABORTED` on the first live Boundary sample). Deliberate,
  documented, "validated 2026-06-25" cost/speed choice — kept as-is; **out of scope for the
  2026-09-20 reclassification below.**
- **Mistral Small eligibility:** presumptively viable — the opener's prompt is short
  (`max_tokens: 250`, no kink memory/power-dynamic/POV/honeypot/author-floor blocks). **Not
  independently measured** against Mistral Small's 20,000 TPM ceiling; carried forward on the
  original reasoning, not re-verified here.
- **Now has:** governor-refusal detection, request/cost/cache accounting (fixed 2026-09-19 — see
  `_oas_turn_chain_repair_control.mjs`, 21/21).

## 3. Live OAS turn reply — RECLASSIFIED 2026-09-20

- **Function:** `_handleIntimacyTurn` → `window._authorFullScenePolicy` (app.js ~5148), roleTag
  `oas-turn`. **No longer calls `callOASTurnLLM`.**
- **Chain:** Grok primary (model chosen by the existing noise/opening-turn sniffer —
  `grok-4-1-fast-reasoning` when `_preferReasoning`, else `grok-4.20-0309-non-reasoning`) →
  `ministral-8b-2512` admission-gated fallback (real governor check against its 625,000 TPM
  ceiling, mirrors `api/_mistral-governor.js`) → `gpt-4o` terminal.
- **Mistral Small: REMOVED from this role's eligible chain entirely.**
- **Why:** the real paired OAS quality sample (2026-09-19, `_first_sacrifice_oas_paired_quality_sample_out/report.json`)
  pinned this exact turn to `mistral-small-latest` and got a real, terminal governor 507:
  ```
  "error":"reservation_exceeds_model_allowance","governor":true,"terminal":true,
  "detail":"conservative reservation 103176 exceeds the model allowance of 20000 tokens/min",
  "reserved_tokens":103176,"limit_tpm":20000
  ```
  This is a **static, deterministic** pre-dispatch check (`used_tokens:null` — not a rolling-window
  rate limit), driven by the turn-reply prompt's own directive stack (kink memory, power dynamic,
  POV rules, honeypot, author floor, recent turns, current state, new user input) — reply-length
  independent. A retry would fail identically for any similarly-shaped reply. 103,176 reserved
  tokens is comfortably under `ministral-8b-2512`'s 625,000 TPM ceiling, which is why that tier is
  viable here in a way Mistral Small structurally cannot be.
- **Real sample, Grok tier (2026-09-19):** SUCCESS — `grok-4-1-fast-reasoning`, real cost
  **$0.031952** (provider-authoritative `cost_in_usd_ticks`; see §5 for the accounting fix this
  triggered), 38.1s. Preserved in `_first_sacrifice_oas_paired_quality_sample_out/`. **This is an
  initial sample, not a quality certification** — one short exchange cannot establish that the OAS
  can sustain the full scene arc (accusation → escalating flirtation → interruption).
- **Proven dry, 2026-09-20:** `_oas_turn_reply_long_context_reclassification_control.mjs`, 23/23 —
  source-level (the turn-reply region calls `_authorFullScenePolicy`, never `callOASTurnLLM`, never
  references `mistral-small-latest`; the opener region is confirmed unchanged) and behavioral (Grok
  wins on success with zero Mistral attempts; `ministral-8b-2512` — never `mistral-small-latest` —
  is the real fallback dispatch when Grok fails).

## 4. Fate-card preview batch

- **Function:** the intimate fate-card previewer (orchestration-client.js ~6499-6514) →
  `callGrokIntimateFate` (~6013) → `callMistralIntimateFate` (~6360) → null (never ChatGPT).
- **Chain:** Grok primary (single attempt, 45s timeout, no internal fallback) → Mistral fallback
  (6s timeout, **no explicit `model` field in the request body** — relies on `/api/mistral-proxy`'s
  server-side default, not confirmed here which model that resolves to).
- **Mistral eligibility:** **not reclassified, not measured.** This prompt is structurally much
  smaller than the turn-reply's (scene context + a 300-char recent-scene slice + a focused
  two-line action/dialogue task — no kink memory, power dynamic, POV, honeypot, or author-floor
  blocks), so the turn-reply's oversized finding does **not** automatically transfer here. Left
  unchanged; flagged as an open question, not silently assumed safe.
- **Cost/cache accounting:** **not wired** — neither `callGrokIntimateFate` nor
  `callMistralIntimateFate` calls `_recordProxyTextCost`. A real, disclosed gap; not fixed here
  (out of the scope actually requested — an adjacent defect, its own decision).

## 5. Full-scene authoring (CG screenplay, bounded repair, literary author)

- **Functions:** `_runCGScreenplayGenInner`, `_repairViaMistral`, `_grokLiteraryAuthor` — all call
  `_authorFullScenePolicy` (documented 2026-09-19, `_full_scene_author_routing_control.mjs`, 35/35;
  unaffected by today's change, still 35/35 after it).
- **Chain:** identical shape to §3 above (Grok primary / `ministral-8b-2512` admission-gated /
  `gpt-4o` terminal) — §3 is now the same policy applied to a second, distinct role.
- **Mistral Small: excluded**, for the original reason (a real, measured ~205KB CG screenplay
  payload exceeds Mistral Small's TPM by 6-20x — `_first_sacrifice_scene2_call_census_2026_09_19.md`).

## Cost accounting fix (2026-09-20)

`estimateTextCost` (app.js) and `_authorFullScenePolicy`'s cost recording previously priced Grok
reasoning calls from `usage.completion_tokens` alone, omitting
`usage.completion_tokens_details.reasoning_tokens` — which xAI bills as output at the same rate.
Confirmed on the real 2026-09-19 sample: token-derived estimate $0.029742 vs the provider's own
authoritative `usage.cost_in_usd_ticks` (319521500 → $0.031952 at 1 tick = 1e-10 USD, an OBSERVED
conversion, not from a published xAI doc) — a ~7.5% undercount. Fixed: `estimateTextCost` now
prefers `cost_in_usd_ticks` when present (authoritative, immune to local pricing-table drift or
reasoning-token gaps); otherwise its fallback estimate includes reasoning tokens. The cost
accumulator (`createSceneCostAccumulator().addText`) now records `costSource`
(`'provider_ticks'` | `'estimated'`) alongside the already-preserved raw `usage` block, so any
downstream reader can tell a ground-truth cost from a derived one. Proven dry, 2026-09-20
(`_oas_turn_reply_long_context_reclassification_control.mjs` §2/§5, part of the 23/23).

**Adjacent, disclosed, not fixed:** `estimateTextCost`'s cache-discount logic only reads
Anthropic-style `usage.cache_read_input_tokens`, never OpenAI/Grok-style
`usage.prompt_tokens_details.cached_tokens` — meaning the *estimate* path (used only when
`cost_in_usd_ticks` is absent) never applies Grok's real cache discount. Found while fixing the
reasoning-tokens gap above; a separate root cause, its own decision, not actioned here.
