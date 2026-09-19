# First Sacrifice Scene 2 — Dry Call/Cost Census (from the real code path)

**Date:** 2026-09-19
**Method:** Static tracing of the real, live code (`public/app.js`, `public/orchestration-client.js`) plus
three already-existing, prior-dated audit documents in this repo (`_audit_out/grok_scene_cost_bound.md`,
`_audit_out/author_routing_policy_v2.md`). **No provider call, no image call, and no server probe was made
to produce this document.** Where the trace stops short of a number, the row says `unknown` rather than a guess.

**Scope:** everything that fires after the reader presses Submit on the OAS interruption, for First
Sacrifice's actual first generated scene (code calls it scene index 1 / "Scene 2"). Fate-card generation and
image generation are identified but excluded per instruction — see §5 and §6 for why.

---

## 1 · Entry point (confirmed, traced end to end in the vertical-slice work)

`gnSubmitBtn` click → `_commitIntimateInterruption(action, dialogue)` (records the submission, no
generation) → `_advanceStagedScene(action, dialogue)` → **`_shouldUseCGScreenplayPath()` is true by default**
(`state._cgScreenplayMode` defaults ON, `public/app.js:218874`) → `_completeStagedSceneFromScreenplay(1,
action, dialogue)` → `_runCGScreenplayGen(1, action, dialogue)` → `_runCGScreenplayGenInner(...)`.

This is the real, live, default path — not a fallback or a test-only branch.

---

## 2 · Per-role table

| Role | Frequency | Provider/model/tier order (as coded) | Max tokens (in/out) | Retry/repair | Physical calls: expected | Physical calls: absolute worst case |
|---|---|---|---|---|---|---|
| A-Plot init (`initAPlot`) | **once per story** — gated `!(state.aPlot && state.aPlot.goal)` | not traced in this pass — **unknown** model/provider | unknown | unknown | 0 (already exists after Scene 1's baked setup — **unverified**: First Sacrifice's baked Scene 1 skips `handleBeginStory`, so this may fire for the first time HERE) | unknown |
| PC Body Bible / LI Body Bible / Antagonist Body Bible (`_generatePCBodyBible` / `_generateLIBodyBible` / `_generateAntagonistBodyBible`) | **once per story** — each gated on its own `!state.xBodyBible` | routed through the **TIERED PROVIDER POLICY** (`app.js:5817`): mistral `ministral-8b-2512` PRIMARY → grok `grok-4-1-fast-reasoning` FIRST FALLBACK → Claude/OpenAI TERMINAL BACKUP | not read in this pass for the Bible prompts specifically — **unknown** | tiered fallback (3 tiers) per Bible | 3 calls (one per Bible), first-tier success | 9 (3 Bibles × 3 tiers each) if every primary/fallback tier is exhausted for every Bible |
| CG Scaffold (`_ensureCGScaffold` → `_buildCGScaffold`) | **once per story** — gated `!state.cgScaffold`, **already known/deferred**, see §4 | Nominal/attribution label: `gpt-4o-mini` (generic spine, `app.js:218978`, since First Sacrifice is not one of the 2 hand-authored flavors). **Real observed first dispatch** (this session's own safely-intercepted console evidence): `[TIERED:scaffold] attempt 1 tier=primary provider=mistral model=ministral-8b-2512` — i.e. it goes through the **same TIERED PROVIDER POLICY** as the Bibles, not directly to gpt-4o-mini | not measured | tiered fallback (3 tiers); non-fatal on total failure ("scene proceeds without scaffold") | 1 call | 3 (all tiers exhausted) |
| Plot contract (`_generateLiteraryPlotContract`) | **once per continuation** (called unconditionally inside `_runCGScreenplayGenInner`) | **no model call found** — read ~300 lines of its body; it commits prior-scene state and tracks A-Plot milestones locally, no `fetch`/`callChatGPT` present in the range read | n/a | n/a | **0** (high confidence, not exhaustively verified to the function's exact closing brace) | 0 |
| Delivered-assignments minting (`_cgMintDeliveredAssignments`) | **once per continuation** | **no model call** — pure derivation from already-resolved stage/inventory state (confirmed: no `fetch`/`StoryboundOrchestration.` in its body) | n/a | n/a | 0 | 0 |
| **THE screenplay/author call** (`_callScreenplayProvider`, inside `_runCGScreenplayGenInner`) | **once per continuation** (Scene 2, Scene 3, … each call this fresh) | Chain selection depends on scene tier (`_sceneEditorialTier`, `app.js:24536`): `turn===0` → premium; climax/cliffhanger/tempt-fate-this-scene → premium; **everything else → 'normal' ("connecting")**. First Sacrifice's Scene 2 has `state.turnCount=1` at this call (not 0) and no climax/cliffhanger/tempt-fate flag set for an ordinary continuation ⇒ **'normal' tier is the expected case**. Normal/connecting chain (`_SCREENPLAY_MISTRAL_SMALL_FIRST`, `app.js:229071`): Mistral-Small (`/api/mistral-proxy`, 60s timeout) → Grok-4.1-reasoning (`/api/proxy`, 75s) → DeepSeek-V4-Pro (`/api/deepseek-proxy`, 75s) → GPT-4o (60s). *(Premium/tentpole chain, only if the tier resolves 'premium': Grok-4.1-reasoning → DeepSeek-V4-Pro → GPT-4o — no Mistral leg.)* | **`max_tokens: 8000`** on every leg of both chains (`app.js:229165,229192,229219,229232`); input tokens **not measured for this exact prompt** — see §3 for the closest real reference | Loop advances to the next provider **only on an ordinary failure/timeout/empty response**; a Mistral **governor refusal** (HTTP 429/507 + `governor:true`, `_isGovernorRefusal`, `app.js:4964`) explicitly **stops the loop — does not advance** (`app.js:229266-229270`, "STOP, DO NOT ESCALATE"). On top of the provider loop, `_completeStagedSceneFromScreenplay` retries the **entire** `_runCGScreenplayGen` call **once** if the result comes back `__staleRejected` (`app.js:229801-229824`) — a narrow, specific condition (branch/canon changed mid-generation), not a generic failure retry. | **See §4 — the connecting-scene chain is expected to fail at the first hop today; the "expected" count below assumes that finding is real** — 1 physical call (Mistral, governor-refused, $0), loop stops, CG plan is null, falls to literary (§4b) | 8 (4-provider chain × the one whole-function stale-retry), or 4 if the stale-retry never fires |
| **Literary fallback author** (`StoryboundOrchestration._grokLiteraryAuthor`, `orchestration-client.js:2938`) — **only reached if the CG screenplay call above returns no usable plan** | once per continuation, **conditional** | Non-premium ⇒ `_mistralAuthor` (Mistral-Small) attempted FIRST (`_smallAuthor` gate, `orchestration-client.js:2961-2974`) → on failure, cross-provider escape to Grok (`callGrokNarrativeAuthor`) → on failure, gpt-4o **terminal** (`orchestration-client.js:3014-3017`, Sonnet/Opus explicitly cost-deprecated, never called) | `max_tokens` defaults to 3000 unless the caller overrides it (`orchestration-client.js:2939`) | up to 3 providers, no further retry beyond the chain itself | 1 call (Mistral) if it succeeds, or however many hops the real payload size forces — **whether THIS specific literary-fallback prompt also exceeds Mistral's 20k-token governor allowance is unknown**; the ≈205k-byte figure in §3 is for the CG screenplay prompt specifically, not this one | 3 |

---

## 3 · Sourced token/cost figures (existing records, re-cited here — not re-measured)

All from `TEXT_PRICING` (`public/app.js:4764-4808`), which carries its own sourcing comments:

| Model | Input $/token | Output $/token | Cited source (in-code comment) |
|---|---|---|---|
| `gpt-4o-mini` | $0.00000015 | $0.0000006 | (no explicit citation in-line; OpenAI list pricing) |
| `gpt-4o` | $0.0000025 | $0.00001 | (no explicit citation in-line) |
| `grok-4-1-fast-reasoning` / `grok-4.3` (**all Grok model names are billed at grok-4.3 rates** — `api/proxy.js:_resolveGrokModel` maps every `grok-*` alias to `grok-4.3`, per the in-code comment) | $0.00000125 | $0.0000025 (cacheRead $0.0000002) | "xAI's published grok-4.3 cached:input ratio", re-verified `docs.x.ai` 2026-09-01 per `project_grok_cost_levers` |
| `mistral-small-latest` | $0.00000015 | $0.0000006 | "OFFICIAL list price (Roman 2026-08-13, mistral.ai/pricing/api)" |
| `deepseek-v4-pro` | $0.00000028 | $0.0000011 | "approx" — flagged in-code as approximate, not a verified list price |
| **`ministral-8b-2512`** (the scaffold/Bible tiered chain's real primary model) | **no explicit row** | **no explicit row** | **Finding, this pass:** `_resolveTextPricingKey('ministral-8b-2512')` (`app.js:4853-4875`) checks for the substring `'mistral'` — but `'ministral-8b-2512'` does **not** contain `'mistral'` as a contiguous substring (`ministral` breaks the sequence at the `n`). It falls through every branch to `return 'default'`, silently pricing at the **gpt-4o-mini** rate. This is NOT caught by the code's own `UNKNOWN_PRICE` safety check (`app.js:5532`) because `'default'` is a real, present key — the check only fires for a key that's missing entirely. **Every scaffold/Bible call actually served by ministral-8b-2512 is currently mispriced by an unknown factor** (ministral-8b's real published rate is not verified here). |
| `COST_OVERHEAD_MULTIPLIER` | applied at total() time to the sum of text+image cost | `1.4` | "Pessimistic overhead — accounts for retries, orchestration extra passes, hidden tokens, and prompt expansion" (`app.js:4851`) |

**Real, previously-measured reference points** (from `_audit_out/grok_scene_cost_bound.md` and
`_audit_out/author_routing_policy_v2.md` — both dated before this session, both explicitly "records used,"
not estimates):

- **6 real grok-4.3 author calls** (2026-08-16, literary continuation, prose not screenplay-JSON): prompt
  tokens 85,058 / 85,978 / 85,978 / 92,123 / 92,826 / 92,826; completion tokens 476 / 850 / 960 / 967 /
  1,276 / 2,709; all cold (0 cached).
- Bound per call at list price, uncached, worst observed input (92,826 tok): **$0.1160 input** + **$0.0075
  completion at the 3,000-token cap** = **$0.1235 known part** (reasoning tokens, which Grok bills on top and
  are not capped by `max_tokens`, are **unknown per call** — no per-call record exists anywhere in this repo).
- **Only empirical per-continuation figure on record: $0.12 mean** (early scenes ~$0.06, late ~$0.15),
  xAI console reconciliation 2026-08-12 — **includes ~38% cache hits and reasoning**, i.e. it is *not* a
  no-cache ceiling and should not be read as one.
- **Scene 1 (literary, for context/scale only — not this ledger's scope):** ~$0.31 measured, of which
  gpt-4o-mini setup passes were ~$0.22 (69%) and Grok ~$0.10 (2026-07-24 probe, audits forced on — an
  inflated ceiling per that probe's own note).
- **A real, measured CG-specific payload size exists on record:** "≈205k bytes CG" (`author_routing_policy_v2.md`
  §1), measured against the Mistral-Small governor's 20,000-token allowance and found to exceed it by
  6–20×. This is the closest real measurement to First Sacrifice's Scene 2 screenplay prompt — it was not
  re-measured in this pass (would require calling the real prompt builder, which risked drifting into "just
  run it," so it is cited, not reproduced). Using this codebase's own chars/token heuristics (~4–4.43
  chars/token, per the same audit doc), 205k bytes is roughly **46,000–51,000 tokens** — **well within
  range to make the Mistral-Small governor refusal in §4 the expected first-hop outcome**, not a remote edge case.

**No sourced figure exists in this repo for:**
- Reasoning-token cost per screenplay/author call (Grok bills reasoning tokens on top of `max_tokens`;
  `completion_tokens_details` telemetry is flagged in `author_routing_policy_v2.md` §5 as not yet added).
- DeepSeek-V4-Pro or GPT-4o token counts for a CG screenplay call specifically (only the Grok record exists).
- Any real token count for the Body Bibles, A-Plot init, or the tiered scaffold/Bible chain's actual dispatched
  payloads.

---

## 4 · The finding that changes the shape of this census

**(a) For an ordinary ("connecting", non-premium) Scene 2 — First Sacrifice's actual case — the CG
screenplay-native chain is expected to fail at its first hop, not run all 4 providers.**

`_sceneEditorialTier` (§2) resolves 'normal' for this call (`turnCount=1`, no climax/cliffhanger/tempt-fate
flag), which selects `_SCREENPLAY_MISTRAL_SMALL_FIRST` — Mistral-Small attempted first. The real, measured CG
prompt size (~205k bytes, §3) exceeds Mistral-Small's 20,000-token governor allowance by 6–20× — already
documented in this repo as "a guaranteed pre-dispatch refusal" (`author_routing_policy_v2.md` §1). The live
code's own governor-refusal handling (`app.js:229266-229270`) explicitly **stops the provider loop on a
governor refusal rather than advancing to Grok** — a deliberate design choice ("a governor refusal must not
advance the provider loop... it would answer 'do not spend on Mistral' by spending on Grok"), not a bug in
that specific line. The practical result: the CG screenplay call returns no usable response, `plan` stays
null, and `_completeStagedSceneFromScreenplay` falls through to the **literary fallback path** (the last row
of §2's table) instead of ever trying Grok/DeepSeek/GPT-4o on the CG side.

**Also newly confirmed, live, in `orchestration-client.js` (not just the 2026-09-06 policy doc's proposal):**
the literary fallback's own author selection (`_grokLiteraryAuthor`) picks **Mistral-Small first for the
same non-premium tier** (`_smallAuthor` gate). Whether that specific call's prompt (which may be built
differently/smaller than the CG screenplay prompt) also exceeds the governor allowance is **not traced in
this pass** — marked `unknown` in §2's last row.

**(b) The `_isComplexAuthorMode` / `_isPremiumAuthorScene` window functions the CG screenplay chain checks
are referenced but never defined anywhere in `public/app.js`.** `_complexMode` is therefore always `false`
by construction (`typeof window._isComplexAuthorMode === 'function'` is always false), and `_premiumScene`
always falls through to the `_sceneEditorialTier` check described above — this doesn't change the conclusion
for First Sacrifice's Scene 2 (still 'normal'), but it means the two routing rationales named in the code
comments ("complex mode", "premium scene" as a *distinct* signal from editorial tier) are currently dead
code, not live inputs.

---

## 5 · Fate-card generation — excluded, confirmed occurring BEFORE Submit

Per this session's own already-built and committed vertical-slice control
(`_first_sacrifice_fate_card_scene2_control.mjs`): `generateIntimateFatePreviewsBatch()` fires once, when
the interruption's 5 fate cards are dealt (`_mountIntimateInterruption`, before the reader has typed or
submitted anything) — never after Submit. Per instruction, it is excluded from this post-Submit ledger.

---

## 6 · Image generation — excluded, confirmed as a separate phase

Not traced in this pass beyond confirming (from this session's own real, network-gated console evidence)
that image-shaped requests (`/api/image`, `/api/bfl-kontext`) occur as part of the SAME deferred pipeline
but are a visibly separate phase from the text/plan generation traced above — the plan/beats must exist
first before anything renders them. Per instruction, excluded entirely from this prose-quality/cost census.

---

## 7 · Summary — what a first real Scene 2 Submit most likely costs, and what's still unknown

**Most likely real path today** (assuming the §4 finding holds and Bibles/scaffold have not already run
during a prior Scene 1 boot — unverified for First Sacrifice's baked-Scene-1-skips-`handleBeginStory` case):

1. Up to 3 one-time, once-per-story tiered calls (Bibles: PC/LI/Antagonist) — mostly priced at the
   **currently-mispriced** `ministral-8b-2512` default rate (§3) unless they fall to Grok/OpenAI fallback.
2. One one-time, once-per-story scaffold call — same tiered chain, same mispricing risk.
3. One CG-screenplay call to Mistral-Small — **expected $0, governor-refused before real dispatch**, per §4.
4. One literary-fallback author call — Mistral-Small first (same governor-size risk, untraced), cross-provider
   fallback to Grok, terminal gpt-4o if both fail. **This is the leg with the only real cost ceiling on
   record**: known part ≤ $0.1235/call (Grok, uncached, worst observed) or the $0.12 mean measured
   continuation figure (includes cache + reasoning) — reasoning-token cost is unknown on top of either.

**Absolute worst case (every fallback tier exhausted everywhere, the CG stale-retry fires once):**
9 (Bibles) + 3 (scaffold) + 8 (CG screenplay incl. stale-retry) + 3 (literary fallback) = **up to 23
physical text-generation calls** for a single Scene 2 continuation, the large majority of them $0
governor-refusals or cheap Mistral/ministral legs, with the real dollar exposure concentrated in whichever
call actually lands on Grok or gpt-4o.

**What would need to be true before a defensible total-dollar ceiling can be given:**
- A real (or at minimum a dry, locally-computed) token count for the actual First Sacrifice Scene 2 system +
  user prompt — not reproduced in this pass (the ≈205k-byte prior CG measurement is the best available
  proxy, not a measurement of this exact prompt).
- A real or documented ministral-8b-2512 price row, replacing the silent gpt-4o-mini default.
- A traced answer for whether the literary-fallback Mistral leg also exceeds its governor allowance.
- A reasoning-token cost model for Grok (currently unknown per call anywhere in this repo).

**No spend is authorized by this document.** It is the requested pre-check; live Scene 2 prose-quality
sampling does not begin until this ledger is reviewed and spend is explicitly authorized separately.
