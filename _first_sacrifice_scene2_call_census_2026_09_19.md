# First Sacrifice Scene 2 — Dry Call/Cost Census (from the real code path)

**Date:** 2026-09-19 (rebuilt same day, after the Grok-primary routing policy shipped)
**Method:** Static tracing of the real, live code (`public/app.js`, `public/orchestration-client.js`,
`api/_mistral-governor.js`) plus two already-existing, prior-dated audit documents in this repo
(`_audit_out/grok_scene_cost_bound.md`, `_audit_out/author_routing_policy_v2.md`). **No provider call, no
image call, and no server probe was made to produce this document.** Where the trace stops short of a
number, the row says `unknown` rather than a guess.

**Scope:** everything that fires after the reader presses Submit on the OAS interruption, for First
Sacrifice's actual first generated scene (code calls it scene index 1 / "Scene 2"). Fate-card generation and
image generation are identified but excluded per instruction — see §5 and §6 for why.

**Revision note:** this replaces the same-day earlier version of this document, which was built against the
pre-policy-change routing (Grok only for "premium" scenes, Mistral Small first for ordinary ones). That
routing has since been replaced — see `_full_scene_author_routing_control.mjs` (35/35, dry) for the proof.
Two things in the prior version are corrected here, not just updated: §4(b) below documents a real reading
error in the earlier pass (the tier functions were **not** dead code), and the "expected first hop fails"
finding is now moot because the first hop is no longer Mistral Small.

---

## 1 · Entry point (unchanged, confirmed end to end in the vertical-slice work)

`gnSubmitBtn` click → `_commitIntimateInterruption(action, dialogue)` (records the submission, no
generation) → `_advanceStagedScene(action, dialogue)` → **`_shouldUseCGScreenplayPath()` is true by default**
(`state._cgScreenplayMode` defaults ON, `app.js:~218950`) → `_completeStagedSceneFromScreenplay(1, action,
dialogue)` → `_runCGScreenplayGen(1, action, dialogue)` → `_runCGScreenplayGenInner(...)`.

This is the real, live, default path — not a fallback or a test-only branch.

---

## 2 · The new routing policy (implemented and dry-proven this pass)

**Full-scene prose authoring — every call site that writes or repairs final scene prose now shares ONE
routing function, `_authorFullScenePolicy` (`app.js`, near `_isGovernorRefusal`):**

1. **Grok — primary, unconditional, every scene.** No premium/complex/connecting tier gate anymore (the old
   gate existed only to protect Mistral Small's tiny allowance — see §4). `grok-4-1-fast-reasoning`
   requested; xAI's proxy maps every `grok-*` alias to `grok-4.3` for billing (`TEXT_PRICING` comment,
   unchanged). The xAI proxy carries no reservation governor, so Grok has no admission check to pass.
2. **`ministral-8b-2512` — the only fallback, admission-gated.** Dispatched only if the exact prompt's
   reservation (UTF-8 bytes of every message + `max_tokens`) is ≤ 625,000 — `ministral-8b-2512`'s real,
   sourced TPM allowance (`api/_mistral-governor.js` `MODEL_LIMITS`, source
   `https://admin.mistral.ai/plateforme/limits`, read 2026-09-04 — **cross-checked directly against the
   live server file in this pass**, not just cited). A prompt that fails this static check is never
   dispatched to ministral at all. A live 429/507 `governor:true` refusal from an actual dispatch (the
   server's stateful rolling-window rate, unknowable client-side) is treated identically — skip to tier 3.
   **Mistral Small never appears in this chain anywhere.**
3. **`gpt-4o` — terminal, only after both above genuinely fail** (a real error/timeout/refusal, or
   ministral's static skip). DeepSeek is dropped from this role entirely (it was in the old 4-provider CG
   chain; the new policy is explicitly 3-tier).

**Three real call sites now use this shared function** (each dry-proven in
`_full_scene_author_routing_control.mjs` §7 to actually call it, not just be described as doing so):

- **The main screenplay/author call** (`_runCGScreenplayGenInner`, `app.js`) — `max_tokens: 8000`.
- **Bounded prose repair** (`_repairViaMistral`, `app.js` — name is now historical, see its own header
  comment) — `max_tokens: 600`. Same discipline as before: preserve the original scene, change only the
  validated deficient sentence(s), smallest possible edit — only which model authors the edit plan changed.
- **The literary fallback author** (`_grokLiteraryAuthor`, `orchestration-client.js`) — `max_tokens: 3000`
  default (caller-overridable). This is also what a genuinely-exhausted CG path falls through to.

**No silent literary fallback, within what this policy layer controls:** a total 3-tier exhaustion inside
`_authorFullScenePolicy` **throws** a labeled error carrying the full per-tier `attempts` log (provider,
model, ok/fail, governor-refused flag, reserve/limit numbers) — proven in
`_full_scene_author_routing_control.mjs` §5. The CG screenplay call site still catches that thrown error,
logs it loudly (`[CG:SCREENPLAY] full-scene-author policy exhausted: ... — attempts: [...]`), and returns
`null` — which still causes `_completeStagedSceneFromScreenplay` to fall through to the literary engine as
its own last resort. **That outer architecture is unchanged and was not asked to change** — what changed is
that reaching it now requires three genuine failures (Grok + ministral + gpt-4o) instead of one structural
mismatch (Mistral Small refusing an oversized prompt it could never have admitted), and the failure is now
loud and inspectable rather than a bare `console.warn`.

**Kept, unchanged:** the test-only `window._grokOnlySceneAuthor` escape hatch (Grok primary, one bounded
retry, no fallback at all) still exists on both the CG and literary paths, gated the same way it always was.

---

## 3 · Grok cache accounting — eligible / observed hit / observed miss

Per instruction, tracked as a labeled observation, never a promised discount:

- **`_fullSceneCacheEligible(messages)`** — a structural judgment only: true iff there is a system message
  (the intended stable prefix) and the array's last message is the user turn (per-turn material appended
  after the stable prefix, not interleaved before it). All three call sites' message shapes satisfy this —
  **eligible: yes**, structurally, for the CG screenplay, repair, and literary calls alike.
- **`_classifyGrokCacheObservation(usage)`** — reads the real response's own usage block
  (`cache_read_input_tokens` or `prompt_tokens_details.cached_tokens`). Returns `hit` (cached tokens > 0
  reported), `miss` (a real usage block reported zero), or `unmeasured` (no usage block arrived at all —
  never guessed as either). This is only ever knowable **after** a real call; this document makes none, so
  every real observation for First Sacrifice's actual Scene 2 is **unmeasured** as of this writing.
- One caveat found while wiring this: the CG screenplay's system prompt has a `buildPlayerImpactDirective()`
  block **appended to `sysPrompt` itself** (reacting to off-script/Fate-adjacent player moves), not to the
  user message. When present, this shortens the stable, cacheable PREFIX to whatever precedes that append —
  still structurally eligible (the append is strictly at the end, never interspersed earlier), but the
  cacheable span is smaller on a turn where it fires than one where it doesn't. Not fixed here — out of
  scope for a routing-policy pass — but material to why eligibility ≠ a hit rate.
- Both `state._lastCGAuthorCache` (CG path) and `state._lastLiteraryAuthorCache` (literary path) now hold
  the real `{eligible, observed, cachedTokens, promptTokens}` object from whichever call actually won, for
  any future real run to read back.

---

## 4 · Per-role table

| Role | Frequency | Provider/model/tier order (as coded, post-policy-change) | Max tokens (in/out) | Retry/repair | Physical calls: expected | Physical calls: absolute worst case |
|---|---|---|---|---|---|---|
| A-Plot init (`initAPlot`) | **once per story** — gated `!(state.aPlot && state.aPlot.goal)` | not traced in this pass — **unknown** model/provider (untouched by this policy change) | unknown | unknown | 0 (already exists after Scene 1's baked setup — **unverified**: First Sacrifice's baked Scene 1 skips `handleBeginStory`, so this may fire for the first time HERE) | unknown |
| PC/LI/Antagonist Body Bibles | **once per story**, each gated on its own `!state.xBodyBible` | **untouched by this policy change** — still the separate TIERED PROVIDER POLICY (`app.js:~5900`): `ministral-8b-2512` PRIMARY → `grok-4-1-fast-reasoning` fallback → OpenAI terminal. This is STORY-SETUP work, not full-scene prose authoring — correctly out of scope for the new policy per "keep Mistral/cheaper models for structural... work." | not read in this pass | tiered fallback (3 tiers) per Bible | 3 calls (one per Bible), first-tier success | 9 (3 Bibles × 3 tiers each) |
| CG Scaffold (`_ensureCGScaffold`) | **once per story**, gated `!state.cgScaffold`, already-known/deferred | **untouched** — same tiered chain as the Bibles (real observed dispatch this session: `ministral-8b-2512` primary) | not measured | tiered fallback (3 tiers); non-fatal | 1 call | 3 |
| Plot contract (`_generateLiteraryPlotContract`) | once per continuation | **no model call** (confirmed, local state derivation) | n/a | n/a | 0 | 0 |
| Delivered-assignments minting (`_cgMintDeliveredAssignments`) | once per continuation | **no model call** (confirmed, local derivation) | n/a | n/a | 0 | 0 |
| **THE screenplay/author call** (`_authorFullScenePolicy` via `_runCGScreenplayGenInner`) | **once per continuation** | **Grok primary → ministral-8b-2512 (admission-gated) → gpt-4o terminal.** No tier branching — every scene, including First Sacrifice's Scene 2, gets this identical chain. | `max_tokens: 8000` | Provider-loop advances on ordinary failure/timeout/empty; a live ministral governor refusal escalates to gpt-4o (does **not** abort — new behavior, see §2); `_completeStagedSceneFromScreenplay` still retries the whole call once on a `__staleRejected` result (unchanged, narrow condition) | **1 call (Grok succeeds)** — the expected case under the new policy | 3 (Grok fails → ministral admitted-and-fails-or-skipped → gpt-4o) × the one whole-function stale-retry = **6**, down from 8 under the old 4-provider chain |
| Bounded prose repair (`_authorFullScenePolicy` via `_repairViaMistral`) | as needed, when a Scene-2+ contract-gap repair fires (not every scene) | **Same 3-tier policy**, `max_tokens: 600` | 600 | same 3-tier chain, no outer retry | 1 call (Grok) | 3 |
| **Literary fallback author** (`_authorFullScenePolicy` via `_grokLiteraryAuthor`) — reached only if the CG screenplay call above genuinely exhausts all 3 tiers | once per continuation, **conditional** | **Same 3-tier policy**, `max_tokens: 3000` default | 3000 (caller-overridable) | same 3-tier chain | **0 in the expected case** (CG succeeds on Grok, literary is never reached) | 3 |

---

## 5 · Sourced token/cost figures (existing records, re-cited — not re-measured)

Unchanged from the pre-policy-change version of this document; the routing changed, the prices didn't.

All from `TEXT_PRICING` (`public/app.js:~4890-4935`), which carries its own sourcing comments:

| Model | Input $/token | Output $/token | Cited source (in-code comment) |
|---|---|---|---|
| `gpt-4o-mini` | $0.00000015 | $0.0000006 | (no explicit citation in-line; OpenAI list pricing) |
| `gpt-4o` | $0.0000025 | $0.00001 | (no explicit citation in-line) |
| `grok-4-1-fast-reasoning` / `grok-4.3` (**all Grok model names are billed at grok-4.3 rates**) | $0.00000125 | $0.0000025 (cacheRead $0.0000002) | "xAI's published grok-4.3 cached:input ratio", re-verified `docs.x.ai` 2026-09-01 per `project_grok_cost_levers` |
| `mistral-small-latest` | $0.00000015 | $0.0000006 | "OFFICIAL list price (Roman 2026-08-13, mistral.ai/pricing/api)" — **no longer used by any full-scene-prose call site as of this policy change**; stays priced for whatever structural/ledger/extraction work still legitimately uses it |
| `deepseek-v4-pro` | $0.00000028 | $0.0000011 | "approx" — flagged in-code as approximate |
| **`ministral-8b-2512`** (now the real fallback model for full-scene prose too, not just scaffold/Bibles) | **still no explicit row** | **still no explicit row** | **Unresolved finding, carried over from the prior pass:** `_resolveTextPricingKey('ministral-8b-2512')` (`app.js`) checks for the substring `'mistral'` — `'ministral-8b-2512'` does not contain it (`ministral` breaks the sequence at the `n`). Falls through to `'default'` (gpt-4o-mini rate), silently, uncaught by the code's own `UNKNOWN_PRICE` check. **This is now a more consequential gap than before**, since ministral-8b-2512 is the real, load-bearing fallback for every full-scene prose call, not just setup-phase Bibles/scaffold. Not fixed in this pass (a pricing-table fix, not a routing-policy fix — kept separate). |
| `COST_OVERHEAD_MULTIPLIER` | applied at total() time | `1.4` | "Pessimistic overhead — accounts for retries, orchestration extra passes, hidden tokens, and prompt expansion" |

**Real, previously-measured reference points** (unchanged sourcing, still the best evidence available):

- **6 real grok-4.3 author calls** (2026-08-16, literary continuation, prose not screenplay-JSON): prompt
  tokens 85,058–92,826; completion tokens 476–2,709; all cold (0 cached) — i.e. all 6 were **observed
  misses**, not a cache-disabled measurement; caching was simply not hit on those 6 calls.
- Known-cost bound per call, uncached, worst observed input: **$0.1235** (input $0.1160 + completion
  $0.0075 at the 3,000-token cap). Reasoning tokens (Grok bills them on top, uncapped by `max_tokens`) are
  **unknown per call** — no per-call record exists anywhere in this repo.
- **Only empirical per-continuation figure on record: $0.12 mean** (early ~$0.06, late ~$0.15), xAI console
  reconciliation 2026-08-12 — includes ~38% cache hits and reasoning; not a no-cache ceiling.
- **A real, measured CG-specific payload size on record: ≈205k bytes** (`author_routing_policy_v2.md` §1).
  Under the OLD policy this was cited as proof Mistral Small (20,000 TPM) could never admit it. **Under the
  NEW policy this is the number that matters differently: 205,000 + 8,000 (max_tokens) = 213,000, well
  under ministral-8b-2512's real 625,000 TPM ceiling — the fallback tier can actually serve this prompt
  now**, confirmed structurally in `_full_scene_author_routing_control.mjs` §3 using this exact real figure.

**Still no sourced figure exists in this repo for:** reasoning-token cost per Grok author call; DeepSeek or
gpt-4o token counts for a CG screenplay call specifically; any real token count for the Bibles, A-Plot init,
or the tiered scaffold/Bible chain's actual dispatched payloads; a real ministral-8b-2512 price row; any
real cache hit/miss observation for a CG screenplay or literary-fallback call (structural eligibility is
confirmed; the observation itself requires a real call this document does not make).

---

## 6 · Correction to the prior version of this document

The earlier pass claimed `_isComplexAuthorMode` / `_isPremiumAuthorScene` were "referenced but never defined
anywhere in `public/app.js`," concluding they were dead code. **That was a real reading error** — both
functions ARE fully defined, in `public/orchestration-client.js` (not `app.js`, which is why the earlier
app.js-only grep missed them), and were live, meaningful tier-routing inputs on both the CG and literary
paths before this policy change. This is now moot for the routing decision itself (the new policy doesn't
branch on scene tier at all — Grok is primary regardless), but the earlier document's specific claim was
wrong and is corrected here rather than quietly dropped. Both functions remain defined and exported; they
are simply no longer read by either author-selection call site (confirmed no other call sites reference them
— see the grep evidence behind this rebuild), making them genuinely unused now, which is different from
"were always dead."

---

## 7 · Fate-card generation and image generation — excluded, unchanged from the prior pass

**Fate cards:** confirmed via the already-committed vertical-slice control
(`_first_sacrifice_fate_card_scene2_control.mjs`) that `generateIntimateFatePreviewsBatch()` fires once,
when the interruption's 5 cards are dealt — before Submit, never after. Excluded per instruction.

**Images:** `/api/image` and `/api/bfl-kontext` requests occur as a visibly separate, later phase of the
same deferred pipeline (the plan/beats must exist before anything renders them) — identified, not traced,
per instruction.

---

## 8 · Summary — what a first real Scene 2 Submit most likely costs, and what's still unknown

**Most likely real path today**, under the new policy (assuming Bibles/scaffold have not already run during
a prior Scene 1 boot — unverified for First Sacrifice's baked-Scene-1-skips-`handleBeginStory` case):

1. Up to 3 one-time, once-per-story tiered calls (Bibles) — untouched by this policy change, still priced at
   the currently-mispriced `ministral-8b-2512` default rate unless they fall to Grok/OpenAI.
2. One one-time, once-per-story scaffold call — same tiered chain, same mispricing risk.
3. **One CG-screenplay call, Grok, expected to succeed** — known-cost bound ≤ $0.1235 (uncached, worst
   observed input from the real Grok record) or the $0.12 mean measured continuation figure. This is the
   single most likely real cost of a Scene 2 Submit under the new policy — not a $0 governor-refusal.
4. Literary fallback: **not reached in the expected case.**

**Absolute worst case (every fallback tier exhausted everywhere, the CG stale-retry fires once):**
9 (Bibles) + 3 (scaffold) + 6 (CG screenplay incl. stale-retry) + 3 (bounded repair, if one fires) + 3
(literary fallback, only if CG genuinely exhausts) = **up to 24** physical text-generation calls, but unlike
the prior policy, the EXPECTED case is now dominated by ONE real, priced Grok call (~$0.12), not a chain of
$0 governor-refusals masking where the real cost actually lands.

**What would still need to be true before a defensible total-dollar ceiling can be given:**
- A real (or dry, locally-computed) token count for the actual First Sacrifice Scene 2 system + user prompt
  (the ≈205k-byte CG figure is the best available proxy, not a measurement of this exact prompt).
- A real or documented ministral-8b-2512 price row.
- A reasoning-token cost model for Grok (unknown per call anywhere in this repo).
- A real cache hit/miss observation for this specific story's Scene 2 prompt (structural eligibility is
  confirmed; the actual hit rate is not knowable without a real call).

**No spend is authorized by this document.** It is the requested pre-check; live Scene 2 prose-quality
sampling does not begin until this ledger is reviewed and spend is explicitly authorized separately.
