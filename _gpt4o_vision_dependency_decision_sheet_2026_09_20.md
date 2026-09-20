# GPT-4o Vision Dependency — Decision Sheet (2026-09-20)

Scope: the two non-tiered "extra" calls found in the 2026-09-20 Scene 2 planner/author replay
(`gpt-4o-mini` emotional-gravity audit, `gpt-4o` image-style extraction). All work below is dry —
no provider or image call was made producing this sheet.

## 1. Emotional-gravity audit — FIXED

Telemetry-only (`state.rPlot._gravity`, never gates or regenerates story content), so it must
never spend on expensive fallback tiers.

- Added `_auditPostMistralOnly` (`public/app.js`), a Mistral-only, single-attempt variant of the
  existing `_auditPost` utility — scoped to this ONE audit; `_auditPost` itself and its other
  five call sites are unchanged (a separate decision).
- Routed `_auditSceneEmotionalGravity`'s dispatch to it: model `ministral-8b-2512`, no fallback
  tier. On any failure (HTTP error, no-JSON response, parse failure), the audit records
  `state.rPlot._gravitySkipped = { reason: 'audit_skipped', ... }`, logs a labeled
  `audit_skipped` line, and returns `null` — the existing callers already treat a `null` gravity
  result as "no data this scene," so this was already non-blocking; the skip is now explicit and
  observable rather than a bare early return.
- Not proven with a fresh dry control this pass — this change reuses the shape of `_auditPost`
  (already a live, real pattern in this codebase) and needs no new schema; `node --check` passed.

## 2. GPT-4o vision necessity — NOT established; Gemini is the credible cheaper candidate

GPT-4o genuinely does process the eight reference images (confirmed from the real captured
request — 8 `image_url` blocks, real 200 response) — but no evidence shows it must be GPT-4o
specifically. The Mistral models allowlisted in `api/mistral-proxy.js` are text-only; Mistral's
vision line (Pixtral) is not configured here and would be a separate integration.

**Gemini 2.5 Flash** is already integrated in this codebase (`api/gemini-proxy.js`, documented
there as "current text+vision model") and is the strongest candidate:

| | Input | Output | Image billing |
|---|---|---|---|
| GPT-4o (current) | $2.50 / M tokens | $10.00 / M tokens | — |
| Gemini 2.5 Flash | $0.30 / M tokens | $2.50 / M tokens | same rate as text/video input |

Source (official, provider pricing page): [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing?authuser=451499271)

### Built and proven dry (capability only — nothing wired to a live call site)

- `public/app.js`: new `_extractStyleViaGemini(refImagesB64, scene)` — mirrors
  `rewritePromptWith4o`'s exact system/user prompt text and 8-image structure, but built in
  **Gemini's actual content-block contract**, confirmed by reading `api/gemini-proxy.js` directly:
  `{ type:'image', mime_type, data }` / `{ type:'text', text }` — **not** the OpenAI shape
  (`{ type:'image_url', image_url:{url} }`) the GPT-4o call sends. `rewritePromptWith4o` itself is
  **unchanged**.
- Added a sourced `gemini-2.5-flash` row to `TEXT_PRICING` ($0.30 in / $2.50 out per the official
  page above) and the matching `_resolveTextPricingKey` branch — without it, a Gemini call would
  have silently priced at the `default` (gpt-4o-mini) rate, the same gap `ministral-8b-2512` had
  before this session's earlier fix.
- `_gemini_vision_adapter_capability_control.mjs` — **15/15 passed**, fully dry:
  - **Server-level** (real `api/gemini-proxy.js`, only its outbound `fetch` to Google stubbed):
    proves the server correctly converts all 8 image blocks into Gemini's native `inline_data`
    parts, carries the system prompt into `systemInstruction`, normalizes a synthetic Gemini
    response into the OpenAI-compatible shape the client expects, passes a real provider error
    through as a non-200 (never fabricates a success), and rejects a malformed
    (candidates-less) response with 502.
  - **Client-level** (real app, stub lane only): proves `_extractStyleViaGemini` builds the
    correct 8-image Gemini-native request body, parses a valid response, records cost via the
    app's own `_recordProxyTextCost → estimateTextCost` pipeline at the official rate above (not
    hand-computed in the test), returns `null` on a provider error or a malformed response
    without throwing, and never dispatches a request at all when given zero images.

**Not done:** wiring this into the live render path, or any claim that it should replace GPT-4o.
That is a separate decision — the adapter exists so a future real comparison is possible.

## 3. Grok as a vision substitute — NOT established; do not treat as a drop-in

Checked against official xAI documentation and this app's real request adapter, not asserted from
general knowledge:

- **The exact models this codebase names are retired.** `api/proxy.js`'s `ALLOWED_GROK_MODELS`
  lists `grok-4-1-fast-reasoning` and `grok-4-1-fast-non-reasoning`. Per xAI's own migration
  notice, both were retired 2026-05-15 12:00 PT and now silently redirect to `grok-4.3`
  (reasoning → low effort, non-reasoning → none effort), billed at `grok-4.3`'s $1.25 in / $2.50
  out per million tokens. Source: [xAI Model Retirements — May 15, 2026](https://docs.x.ai/developers/migration/may-15-retirement)
- **`grok-4.3`'s own model page does not document image/vision input.** It lists pricing and
  context window only.
- **The one official page that does name a vision-capable model names `grok-4.6` specifically —
  not `grok-4.3`, not the retired `4-1-fast` slugs.** Source:
  [Image Understanding | xAI Docs](https://docs.x.ai/docs/guides/image-understanding)
- **`grok-4.6` is not reachable through this app's normal request path.** In
  `api/proxy.js`, `grok-4.6` is allowlisted only for `_SB_MODEL_OVERRIDES` ("EXPERIMENT ONLY"),
  not through the role-based dispatch (`STRUCTURE_GENERATOR`/`PRIMARY_AUTHOR`) the image-style
  call would use.
- **Grok's documented vision content-block shape is a third, different shape** from both GPT-4o's
  and Gemini's: `{"type":"input_image","image_url":"data:..."}` /
  `{"type":"input_text","text":"..."}` (per the same official guide above) — neither
  `type:'image_url'` (GPT-4o/OpenAI shape) nor `type:'image'` (Gemini shape) would work here
  unmodified.
- **This app's own server-side injection scrubber doesn't recognize that shape.**
  `api/_sanitize-injection.js`'s `sanitizeUserMessages` only scrubs blocks where
  `block.type === 'text'` — Grok's documented `type:'input_text'` blocks would silently bypass
  the scrubber entirely if sent through `/api/proxy` unmodified.

**Conclusion: Grok is not currently a proven vision substitute for this call.** Establishing one
would require, at minimum: confirming `grok-4.6`'s vision support end-to-end (not just via the
guide page), moving it off the experiment-only override path, building a `type:'input_image'`-
shaped adapter analogous to the Gemini one above, and extending the sanitizer to recognize that
shape. None of that is done here, per the instruction not to claim compatibility without proving
it.

## 4. BFL redundancy — NOT established; needs a real visual A/B, not more reading

`api/bfl-kontext.js` (FLUX Kontext) already receives the raw reference images directly as
`input_image_2..8` (`public/app.js:202385`, `:203373`) — separately from, and in addition to, the
GPT-4o-derived text description. Whether the text-extraction step measurably improves the
rendered image, or is redundant given BFL's own native image conditioning, is a real open
question — but not one code-reading can answer. GPT-4o style extraction is **not removed**, and
BFL is **not declared** to make it redundant.

**Proposed future test (not run, not authorized here):** a small, separately-authorized visual
A/B — same reference images, same scene prompt, one render through the existing pipeline
(GPT-4o-extracted style text + reference images to BFL) and one render with the reference images
sent to BFL alone (no extracted style text) — compared side by side, blind, per this session's
standing comparative-evaluation practice. That is the only test that can settle it; ask for
authorization when ready to run it.

## Status

Task 1 (audit routing) is implemented and committed. Task 2 (Gemini adapter) is implemented,
proven 15/15 dry, and committed — not wired to any live call site. Tasks 3 and 4 are findings
only, no code changes, per the instruction not to claim or remove anything unproven. No provider
or image calls were made producing this sheet.
