# Gemini Style-Extraction Wiring + Prose-Harness Extraction Block (2026-09-22)

Roman: "Gemini was prepared as the replacement, but the live switch never happened. Claude's
earlier report for `8d2e04e6` explicitly said the Gemini adapter was dry-tested, while
`rewritePromptWith4o` remained unchanged and 'nothing is wired live.' I should have kept that
unfinished step visible. There's also a separate failure here: this run explicitly prohibited ANY
image-style extraction. Switching providers alone wouldn't fix that unauthorized call."

Two fixes, both dry, no paid calls, no regeneration.

## 1. Gemini wired into the production path

`8d2e04e6` (2026-09-20) built `_extractStyleViaGemini` as a capability adapter — proven 15/15
(`_gemini_vision_adapter_capability_control.mjs`) but never called from any live site;
`rewritePromptWith4o` (the ONE real style-extraction call site, `public/app.js` ~line 297523)
remained unchanged and continued to use GPT-4o for both its reference-driven and no-reference
branches.

Renamed `rewritePromptWith4o` → `rewriteImagePromptWithStyle` and split its two branches by
provider:

- **Reference-image-driven (vision) branch** — same reference-loading logic (unchanged: anchor
  selection, scene-matched references, `_loadStyleRefBase64`), same prompt text, same 8-image
  structure — now calls `_extractStyleViaGemini(_refImages, scene)` instead of building a GPT-4o
  request directly. This is the branch `_extractStyleViaGemini` was built and capability-tested
  for.
- **No-reference text-only branch** — unchanged, still GPT-4o. No image is ever sent on this
  branch; it is not image-style extraction by the term's own meaning, and was explicitly out of
  scope for the Gemini adapter ("the no-reference text-only fallback isn't part of this
  comparison" — `_extractStyleViaGemini`'s own doc comment, unchanged).
- **No silent fallback** — on a Gemini failure or empty response, the function returns `null`. It
  does NOT retry via GPT-4o. This is the same visible "no style rewrite this pass" outcome the
  function always had on any extraction failure — not a silent reroute to the provider being
  replaced.

Proof: **NEW** `_gemini_style_extraction_production_wiring_control.mjs` (16/16), exercising the
REAL, live `window.rewriteImagePromptWithStyle` (not the adapter in isolation, which the prior
control already covers) — a real, tiny, already-committed static asset
(`/cursor-dollar-plane-64.png`) is fetched for real from the local dev server (same origin, no
external network, no cost) so the genuine ref-loading path runs unmodified:
- **A. WIRING** — a scene with a reference image dispatches to `/api/gemini-proxy` in Gemini's own
  content-block shape, never to `/api/chatgpt-proxy`.
- **B. NO-FALLBACK** — a Gemini error (429) or malformed response returns `null`; GPT-4o is never
  dispatched as a fallback in either case.
- **C. NO-REF BRANCH PRESERVED** — a scene with no reference images still dispatches to
  `/api/chatgpt-proxy` as a plain string (no image content at all), unchanged, and never touches
  Gemini.

`_gemini_vision_adapter_capability_control.mjs` (the original 2026-09-20 capability control)
re-verified unaffected: 15/15.

## 2. The prose-test harness now blocks image-style extraction before dispatch, regardless of provider or endpoint

Wiring Gemini in alone does not close the gap Roman named separately: Temptation attempt 4 ran
under an authorization that explicitly excluded "any image-style extraction," and the harness's
endpoint allowlist (`/api/proxy`, `/api/mistral-proxy`, `/api/deepseek-proxy`, `/api/chatgpt-proxy`)
let the extraction call through anyway, because that same endpoint also carries other legitimate
real calls this pipeline makes — an endpoint allowlist cannot discriminate by content, and after
the Gemini wiring above, the same extraction could equally route through `/api/gemini-proxy`, which
wasn't even in that allowlist to begin with. Roman: "An endpoint allowlist alone is insufficient
when prose and extraction share an endpoint."

Fix: `_e2e_network_gate.mjs` gains a new option, `blockImageStyleExtraction`, and a module-level
export `isImageStyleExtractionRequest(requestBody)` — inspects the REQUEST'S OWN BODY for the
`"STYLE-ONLY EXTRACTION (HARD)"` signature phrase, present verbatim in the reference-driven system
prompt BOTH real callers send (Gemini and GPT-4o, by design — they mirror each other's prompt
text), and absent from every other real shape this pipeline sends, including the no-reference
rewrite (which opens with a similar but distinct "visual art director" line — a narrower phrase was
deliberately chosen over that broader one specifically to avoid over-blocking that harmless
branch). Body-content-based, never URL/endpoint-based — works identically whichever provider or
endpoint carries the call. When active, a request whose body matches is `route.abort()`'d before
dispatch, even on an endpoint that is otherwise fully allowlisted with an active phase — logged as
its own violation kind (`abort-image-style-extraction`), never silently downgraded to a stub or
rerouted to a different provider.

Wired into `_scene2_repair_replay_sample.mjs` (the harness that ran Temptation attempts 1–4):
`installFailClosedNetworkGate(page, { logFile: LOG_FILE, blockImageStyleExtraction: true })`.

Proof: **NEW** `_prose_only_blocks_image_style_extraction_control.mjs` (9/9):
- **A. GEMINI BLOCKED** — the real `rewriteImagePromptWithStyle` reference-driven path is aborted
  before dispatch even with `/api/gemini-proxy` fully allowlisted and a phase active; returns
  `null`; no dispatch is ever tracked as settled real traffic.
- **B. GPT-4O ALSO BLOCKED** — the identical extraction shape, sent directly to
  `/api/chatgpt-proxy` (simulating the exact call Temptation attempt 4 made, or any future
  regression reintroducing it), is also aborted before dispatch — proving the block is
  provider-agnostic, not a Gemini-specific patch.
- **C/D. NOT OVER-BLOCKING** — `isImageStyleExtractionRequest`, unit-tested directly (zero network
  calls — a deliberate safety choice, see below) against a real SCENE-SPINE planner body, a real
  unrelated GPT-4o chat-completion body (the SAME endpoint the extraction call uses), and the real
  no-reference rewrite's own system prompt, correctly returns `false` for all three; a sanity-check
  positive case (the real extraction shape) correctly returns `true`.

**A safety note on how C/D were tested**: an earlier draft of this control proved "prose is
unaffected" by dispatching genuinely non-extraction-shaped requests through the allowlisted real
lane — but a request on the real lane that the classifier does NOT block goes all the way through
to the actual dev server, which could dispatch a REAL, PAID provider call. Since this correction
was explicitly authorized as dry-only ("No paid calls or regeneration are needed for this
correction"), that approach was replaced before ever running it: `isImageStyleExtractionRequest`
was promoted from a function nested inside `installFailClosedNetworkGate`'s closure to a
module-level export, so it can be unit-tested directly against realistic request bodies with zero
network activity of any kind. Sections A/B, which test the BLOCKING behavior, remain safe to run
through the real lane precisely because a blocked request is aborted before any bytes leave the
browser.

## Reclassification of the $0.0452025 charge

Preserved and classified as originally reported: **outside Temptation attempt 4's authorized
scope** ("no image generation or image-style extraction") — see
`_scene2_capability_temptation_attempt4_report_2026_09_21.md`. This fix prevents a recurrence; it
does not and cannot retroactively change what already happened. No refund/correction to that run's
cost record — the original real cost figure ($0.1449127) stands unedited, per the established
pattern of never rewriting a prior real-run record.

## What this does NOT do

- Does not retry Temptation, or run Silence/Confession, or generate any image.
- Does not touch the no-reference GPT-4o branch's behavior.
- Does not change `_extractStyleViaGemini`'s own internals (proven unmodified via the 15/15
  re-verification) — only where it's called from.
- Does not add `blockImageStyleExtraction` to any control OTHER than
  `_scene2_repair_replay_sample.mjs` — the one harness explicitly implicated. Other dry controls in
  this repo never dispatch anything real in the first place.

## Status (as of the original fix, superseded below)

Dry, committed. No provider or image calls. No branch retry, no regeneration.

---

## Addendum: the prose-only boundary finished — the no-ref rewrite closed too (2026-09-22, same day)

Roman, after reviewing the fix above: "reference-image style extraction now uses Gemini, with no
automatic GPT-4o fallback. That closes the unfinished switch. One remaining scope issue: the prose
harness still permits the text-only image-prompt rewrite on GPT-4o. It isn't reference extraction,
but it's still image preparation — and unnecessary spending during a prose-only test... Prefer an
explicit operation-purpose identifier for this boundary; retain the signature-text check as
additional protection."

### What was missing

`rewriteImagePromptWithStyle`'s NO-REFERENCE branch (a plain text-only GPT-4o rewrite — no image
ever sent) was correctly left OUT of the original `blockImageStyleExtraction` classifier, on
purpose: that classifier's phrase ("STYLE-ONLY EXTRACTION (HARD)") only appears in the
reference-driven branch's system prompt, by design, specifically so the harmless no-ref branch
wasn't over-blocked. But the no-ref branch is still real spend during a prose-only test, and Roman's
point stands: "it's still image preparation."

### Fix

**1. An explicit operation-purpose identifier, carried on the wire.** `options.purpose` already
existed in `orchestration-client.js`'s `callChatGPT` as a CLIENT-SIDE-ONLY logging tag (never sent
to the server). Added one line — `if (options.purpose) payload.purpose = options.purpose;` — so it
reaches the actual outgoing payload when a caller sets it; every existing caller (none of which set
`options.purpose`) is byte-identical. Both real image-preparation call sites now set it explicitly:
- `rewriteImagePromptWithStyle`'s no-ref GPT-4o call: `purpose: 'image_prompt_rewrite'`.
- `_extractStyleViaGemini`'s direct fetch body: `purpose: 'image_style_extraction'`.

**2. The gate classifier, renamed and broadened.** `isImageStyleExtractionRequest` →
`isImagePreparationRequest` (module-level export, unchanged location). Classification order:
- **PRIMARY**: `requestBody.purpose` is one of `{'image_style_extraction', 'image_prompt_rewrite'}`
  — checked directly, no text sniffing needed for the common case (both real callers now send it).
- **SECONDARY (retained, per Roman's explicit instruction)**: the request's own system-message
  text — `"STYLE-ONLY EXTRACTION (HARD)"` (ref-driven only) OR `"visual art director for a comic
  book / graphic novel"` (the shared opening line of BOTH image-preparation branches — safe to use
  now that BOTH are in scope for blocking; the earlier, narrower pass had deliberately excluded this
  broader phrase specifically because only the ref-driven branch was being blocked then).

Gate option renamed `blockImageStyleExtraction` → `blockImagePreparation` to reflect the wider
scope. `_scene2_repair_replay_sample.mjs` updated to the new option name.

### Proof — `_prose_only_blocks_image_style_extraction_control.mjs`, rewritten, 17/17

- **A/B** — the reference-driven extraction (Gemini, and the same shape sent directly to GPT-4o) is
  still blocked before dispatch — no regression from the original fix.
- **C** — the NO-REF text-only rewrite (the gap this addendum closes) is now ALSO blocked before
  dispatch, proven against the real, live `rewriteImagePromptWithStyle` function.
- **D** — the `purpose` field alone (PRIMARY signal) classifies correctly even with unrelated or
  absent system text, including an explicit negative (an unrelated purpose value is NOT
  misclassified).
- **E** — the SECONDARY text-signature fallback still classifies both operations correctly even
  when `purpose` is absent — proving the fallback survives the new field's addition, per Roman's
  explicit "retain the signature-text check as additional protection."
- **F** — real, unrelated request shapes this pipeline actually sends (a SCENE-SPINE planner body,
  a genuine unrelated GPT-4o chat completion on the SAME endpoint) are not misclassified.

One test-harness-only fix found and made while building this control (not a production bug): the
no-ref branch's `callChatGPT` call isn't internally try/caught inside `rewriteImagePromptWithStyle`
— the same as the original `rewritePromptWith4o` before this session. In production this is fine —
the ONE real call site already wraps the whole function call in try/catch. My first draft of this
control called the function directly without that wrapper and got an uncaught rejection; fixed by
reproducing the same try/catch the real call site already has, not by changing the function.

`_gemini_style_extraction_production_wiring_control.mjs` (16/16), `_gemini_vision_adapter_
capability_control.mjs` (15/15), `_e2e_network_gate_response_correlation_control.mjs` (11/11), and
`_scene2_repair_replay_sample_slot_param_control.mjs` (23/23) all re-verified unaffected.

### What this does NOT do

- Does not block either image-preparation operation during an authorized image workflow — any
  script that doesn't pass `blockImagePreparation: true` is unaffected; both operations remain
  fully available there.
- Does not touch `_extractStyleViaGemini`'s or the no-ref branch's actual extraction/rewrite logic
  — only adds a `purpose` tag to each one's outgoing payload.
- Does not retry Temptation, run Silence/Confession, or generate any image.

### Status

Dry, committed. No provider or image calls. No branch retry, no regeneration.
