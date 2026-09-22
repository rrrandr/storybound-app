// GEMINI STYLE-EXTRACTION — PRODUCTION WIRING CONTROL (Roman, 2026-09-22)
//
// Roman: "Gemini was prepared as the replacement, but the live switch never happened... Complete
// the previously prepared Gemini replacement for image-style extraction. Trace the real extraction
// callers and wire the tested Gemini adapter into the production path. Preserve the required
// reference-image input and response contract. Do not silently fall back to GPT-4o."
//
// 8d2e04e6 built _extractStyleViaGemini as a capability adapter only — 15/15 dry-proved
// (_gemini_vision_adapter_capability_control.mjs) but never called from a live site;
// rewritePromptWith4o remained the real path. This session renamed that function to
// rewriteImagePromptWithStyle and rewired its reference-image-driven branch to call
// _extractStyleViaGemini instead of building a GPT-4o request directly. This control proves that
// wiring against the REAL, live rewriteImagePromptWithStyle function (not the adapter in
// isolation, which the prior control already covers) — fully dry, real browser + real app, only
// the two provider endpoints stubbed (no real provider call, no real image render).
//
// Proves:
//   A. WIRING    — a scene WITH a real reference image dispatches to /api/gemini-proxy, in
//                  Gemini's own content-block shape, and NEVER to /api/chatgpt-proxy at all.
//   B. NO-FALLBACK — when the Gemini stub fails (error status) or returns nothing usable, the
//                  function returns null and /api/chatgpt-proxy is STILL never dispatched — not a
//                  silent reroute to the provider being replaced.
//   C. NO-REF BRANCH PRESERVED — a scene with NO reference images (a plain text-only style
//                  rewrite, not image-style extraction — no image ever sent) still correctly
//                  dispatches to /api/chatgpt-proxy, unchanged, and never touches gemini-proxy.
//
// usage: node _gemini_style_extraction_production_wiring_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';

const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 700) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

// A real, tiny, already-committed static asset — fetched for real from the local dev server (same
// origin, no external network, no cost) so the app's genuine ref-loading path (fetch + canvas
// compression) runs unmodified, not a mocked stand-in for it.
const REAL_REF_PATH = '/cursor-dollar-plane-64.png';
const SCENE_TEXT = 'A quiet, undramatic negotiation between two officials in an empty room.';

(async () => {
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();

  let geminiCalls = [], chatgptCalls = [];
  let geminiMode = 'success';
  const gate = await installFailClosedNetworkGate(page);
  gate.stub('/api/gemini-proxy', (req) => {
    const body = JSON.parse(req.postData() || '{}');
    geminiCalls.push(body);
    if (geminiMode === 'error') return { __gateStatus: 429, error: 'quota exceeded' };
    if (geminiMode === 'malformed') return { choices: [] };
    return {
      choices: [{ message: { role: 'assistant', content: 'digital comic illustration, bold ink linework, warm cel-shaded palette — the scene as described.' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 1800, completion_tokens: 48, total_tokens: 1848 },
      _orchestration: { role: 'PRIMARY_AUTHOR', model: 'gemini-2.5-flash', provider: 'gemini' }
    };
  });
  gate.stub('/api/chatgpt-proxy', (req) => {
    const body = JSON.parse(req.postData() || '{}');
    chatgptCalls.push(body);
    return { ok: true, content: 'digital comic illustration, plain text-only rewrite response.', canonical_instruction: 'digital comic illustration, plain text-only rewrite response.', usage: { prompt_tokens: 40, completion_tokens: 20, total_tokens: 60 } };
  });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => window.state && typeof window.rewriteImagePromptWithStyle === 'function' && typeof window._extractStyleViaGemini === 'function', { timeout: 20000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready or rewriteImagePromptWithStyle not exposed — ' + (e && e.message)); await browser.close(); process.exit(2); });

  section('A. WIRING — a scene WITH a reference image dispatches to Gemini, never to GPT-4o');
  geminiCalls = []; chatgptCalls = [];
  const wiringResult = await page.evaluate(({ path, scene }) => window.rewriteImagePromptWithStyle({ reference_images: [path] }, scene), { path: REAL_REF_PATH, scene: SCENE_TEXT });
  ok('a style prompt was returned', typeof wiringResult === 'string' && wiringResult.length > 20, JSON.stringify(wiringResult));
  ok('the request went to /api/gemini-proxy (exactly once)', geminiCalls.length === 1, JSON.stringify(geminiCalls.length));
  ok('the request NEVER went to /api/chatgpt-proxy', chatgptCalls.length === 0, JSON.stringify(chatgptCalls.length));
  ok('the actual dispatched body carries the reference image in GEMINI\'s own shape ({type:"image", mime_type, data}), not GPT-4o\'s', geminiCalls[0] && Array.isArray(geminiCalls[0].messages) && geminiCalls[0].messages[1] && Array.isArray(geminiCalls[0].messages[1].content) && geminiCalls[0].messages[1].content.some((b) => b.type === 'image' && b.mime_type), JSON.stringify(geminiCalls[0] && geminiCalls[0].messages && geminiCalls[0].messages[1] && geminiCalls[0].messages[1].content.map((b) => b.type)));
  ok('the returned prompt is the Gemini stub\'s own text, not a GPT-4o response', wiringResult === 'digital comic illustration, bold ink linework, warm cel-shaded palette — the scene as described.', wiringResult);
  ok('window._4oReferenceExtracted is true (reference-driven extraction succeeded)', await page.evaluate(() => window._4oReferenceExtracted) === true, 'not true');

  section('B. NO-FALLBACK — a Gemini failure returns null; GPT-4o is STILL never dispatched');
  geminiCalls = []; chatgptCalls = [];
  geminiMode = 'error';
  const errorResult = await page.evaluate(({ path, scene }) => window.rewriteImagePromptWithStyle({ reference_images: [path] }, scene), { path: REAL_REF_PATH, scene: SCENE_TEXT });
  ok('returns null on a real Gemini error (429) — no fabricated prompt', errorResult === null, JSON.stringify(errorResult));
  ok('Gemini WAS attempted (this is a real failure, not a skip)', geminiCalls.length === 1, JSON.stringify(geminiCalls.length));
  ok('GPT-4o was NEVER dispatched as a fallback — the deliberate no-silent-fallback behavior', chatgptCalls.length === 0, JSON.stringify(chatgptCalls.length));
  ok('window._4oReferenceExtracted is false after the failed extraction', await page.evaluate(() => window._4oReferenceExtracted) === false, 'not false');

  geminiCalls = []; chatgptCalls = [];
  geminiMode = 'malformed';
  const malformedResult = await page.evaluate(({ path, scene }) => window.rewriteImagePromptWithStyle({ reference_images: [path] }, scene), { path: REAL_REF_PATH, scene: SCENE_TEXT });
  ok('returns null on a malformed Gemini response too', malformedResult === null, JSON.stringify(malformedResult));
  ok('GPT-4o was NEVER dispatched on the malformed-response path either', chatgptCalls.length === 0, JSON.stringify(chatgptCalls.length));
  geminiMode = 'success';

  section('C. NO-REF BRANCH PRESERVED — a scene with NO reference images still uses GPT-4o (unchanged, not extraction — no image sent)');
  geminiCalls = []; chatgptCalls = [];
  const noRefResult = await page.evaluate((scene) => window.rewriteImagePromptWithStyle({ style_anchor: 'clean modern digital illustration' }, scene), SCENE_TEXT);
  ok('a style prompt was returned', typeof noRefResult === 'string' && noRefResult.length > 10, JSON.stringify(noRefResult));
  ok('the request went to /api/chatgpt-proxy (the plain text-only rewrite, unchanged)', chatgptCalls.length === 1, JSON.stringify(chatgptCalls.length));
  ok('/api/gemini-proxy was NEVER dispatched for the no-ref branch', geminiCalls.length === 0, JSON.stringify(geminiCalls.length));
  ok('the dispatched GPT-4o body carries NO image content at all (a plain string, not an array of blocks) — confirms this really is not image-style extraction', typeof chatgptCalls[0]?.messages?.[1]?.content === 'string', JSON.stringify(chatgptCalls[0] && chatgptCalls[0].messages && chatgptCalls[0].messages[1] && typeof chatgptCalls[0].messages[1].content));

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('GEMINI STYLE-EXTRACTION PRODUCTION WIRING CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
