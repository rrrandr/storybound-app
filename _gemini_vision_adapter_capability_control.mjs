// GEMINI VISION ADAPTER — CAPABILITY CONTROL (Roman, 2026-09-20)
//
// Roman: "Build a Gemini vision-adapter capability control using the same eight-image request
// shape and structured style-output schema as the current GPT-4o extractor. Prove request
// serialization, response parsing, fail-closed behavior, and cost accounting against official
// Gemini pricing — without making a real call."
//
// This is a CAPABILITY control, not a swap: rewritePromptWith4o (the real, live style-extraction
// call site) is UNCHANGED. public/app.js now also carries a parallel, independently-callable
// _extractStyleViaGemini(refImagesB64, scene) — proven here, not wired to any live call site.
//
// Two sections, both fully dry:
//   A. SERVER-LEVEL (Node, no browser) — requires api/gemini-proxy.js DIRECTLY (real, unmodified
//      code) and stubs ONLY the final fetch() to generativelanguage.googleapis.com. Proves the
//      REAL server correctly converts my client's content-block shape into Gemini's native
//      `contents`/`parts`/`inline_data` format, correctly normalizes a synthetic Gemini response
//      into the OpenAI-compatible shape the client expects, and fails closed (non-200 passthrough,
//      malformed-response rejection) — without ever reaching Google's real API.
//   B. CLIENT-LEVEL (Playwright, stub lane only) — loads the real app, stubs /api/gemini-proxy,
//      calls window._extractStyleViaGemini directly. Proves the CLIENT builds the correct request
//      body (8 image blocks in Gemini's native shape, not GPT-4o's), parses a valid response,
//      returns null (fail-closed) on an error response, and records cost via the app's own
//      _recordProxyTextCost -> estimateTextCost pipeline using the OFFICIAL Gemini rate now in
//      TEXT_PRICING — not a hand-computed number.
//
// usage: node _gemini_vision_adapter_capability_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';

const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 700) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

// A short, syntactically-valid but tiny fake base64 PNG payload — content doesn't matter for
// shape/serialization proofs, only that it's a non-empty string.
const FAKE_IMG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const EIGHT_IMAGES = new Array(8).fill(FAKE_IMG_B64);
const FAKE_SCENE = 'Lirael stands before the assembly as the Answer begins to glow in Julian\'s hands.';

section('A. SERVER-LEVEL — api/gemini-proxy.js real code, only the outbound fetch stubbed');
{
  process.env.GEMINI_API_KEY = 'test-key-not-real';
  const geminiProxy = (await import('./api/gemini-proxy.js')).default;

  function mockRes() {
    const r = { _status: null, _json: null, _ended: false };
    r.setHeader = () => {};
    r.status = (s) => { r._status = s; return r; };
    r.json = (j) => { r._json = j; return r; };
    r.end = () => { r._ended = true; return r; };
    return r;
  }

  // ── A1. Valid path: my client's exact request body -> real server conversion -> synthetic
  // Gemini response -> real server normalization ──
  let capturedGeminiBody = null;
  const realFetch = global.fetch;
  global.fetch = async (url, opts) => {
    capturedGeminiBody = JSON.parse(opts.body);
    return {
      ok: true,
      text: async () => JSON.stringify({
        candidates: [{ content: { parts: [{ text: 'digital comic illustration, bold ink contours, cel-shaded color, warm rim lighting — Lirael faces the assembly as golden light spills from the Answer.' }] }, finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 3012, candidatesTokenCount: 46, totalTokenCount: 3058 }
      })
    };
  };

  const clientReqBody = {
    role: 'PRIMARY_AUTHOR', model: 'gemini-2.5-flash', temperature: 0.4, max_tokens: 200,
    messages: [
      { role: 'system', content: 'You are a visual art director for a comic book / graphic novel...' },
      { role: 'user', content: [...EIGHT_IMAGES.map((b) => ({ type: 'image', mime_type: 'image/png', data: b })), { type: 'text', text: 'SCENE:\n' + FAKE_SCENE }] }
    ]
  };
  const req1 = { method: 'POST', headers: { origin: 'http://localhost:3000' }, body: clientReqBody };
  const res1 = mockRes();
  await geminiProxy(req1, res1);
  global.fetch = realFetch;

  ok('server accepted the request (200)', res1._status === 200, JSON.stringify(res1._json));
  ok('server converted all 8 image blocks into Gemini inline_data parts (real conversion code, not reimplemented)',
    capturedGeminiBody && capturedGeminiBody.contents && capturedGeminiBody.contents[0] &&
    capturedGeminiBody.contents[0].parts.filter((p) => p.inline_data).length === 8,
    JSON.stringify(capturedGeminiBody && capturedGeminiBody.contents && capturedGeminiBody.contents[0] && capturedGeminiBody.contents[0].parts.map((p) => Object.keys(p))));
  ok('server carried the system prompt into systemInstruction (not dropped)',
    capturedGeminiBody && capturedGeminiBody.systemInstruction && /visual art director/.test(capturedGeminiBody.systemInstruction.parts[0].text),
    JSON.stringify(capturedGeminiBody && capturedGeminiBody.systemInstruction));
  ok('server normalized the synthetic response into choices[0].message.content (OpenAI-compatible shape)',
    res1._json && res1._json.choices && res1._json.choices[0] && /digital comic illustration/.test(res1._json.choices[0].message.content),
    JSON.stringify(res1._json && res1._json.choices));
  ok('server normalized usage (prompt_tokens/completion_tokens) from Gemini\'s usageMetadata',
    res1._json && res1._json.usage && res1._json.usage.prompt_tokens === 3012 && res1._json.usage.completion_tokens === 46,
    JSON.stringify(res1._json && res1._json.usage));

  // ── A2. FAIL-CLOSED: Gemini itself returns an error — server must pass a non-200 through, never
  // fabricate a 200 with invented content. ──
  global.fetch = async () => ({ ok: false, status: 429, text: async () => JSON.stringify({ error: { message: 'RESOURCE_EXHAUSTED: quota exceeded' } }) });
  const res2 = mockRes();
  await geminiProxy({ method: 'POST', headers: {}, body: clientReqBody }, res2);
  global.fetch = realFetch;
  ok('a real Gemini error response is passed through as non-200, not silently turned into a fake success', res2._status !== 200 && res2._status != null, JSON.stringify({ status: res2._status, json: res2._json }));

  // ── A3. FAIL-CLOSED: malformed Gemini response (no candidates) — server must reject, not parse
  // undefined into an empty "success". ──
  global.fetch = async () => ({ ok: true, text: async () => JSON.stringify({ someUnexpectedShape: true }) });
  const res3 = mockRes();
  await geminiProxy({ method: 'POST', headers: {}, body: clientReqBody }, res3);
  global.fetch = realFetch;
  ok('a malformed (candidates-less) Gemini response is rejected (502), not passed through as content', res3._status === 502, JSON.stringify({ status: res3._status, json: res3._json }));
}

section('B. CLIENT-LEVEL — window._extractStyleViaGemini, real app, stub lane only');
{
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  let capturedClientBody = null;
  const gate = await installFailClosedNetworkGate(page);
  let mode = 'success';
  gate.stub('/api/gemini-proxy', (req) => {
    capturedClientBody = JSON.parse(req.postData() || '{}');
    if (mode === 'error') return { __gateStatus: 429, error: 'quota exceeded' };
    if (mode === 'malformed') return { choices: [] }; // no message.content — must be treated as no usable text
    return {
      choices: [{ message: { role: 'assistant', content: 'manga panel illustration, thick ink contours, glowing gold accents — Lirael faces the assembly.' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 2900, completion_tokens: 52, total_tokens: 2952 },
      _orchestration: { role: 'PRIMARY_AUTHOR', model: 'gemini-2.5-flash', provider: 'gemini' }
    };
  });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => window.state && typeof window._extractStyleViaGemini === 'function', { timeout: 20000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready or _extractStyleViaGemini not exposed — ' + (e && e.message)); await browser.close(); process.exit(2); });

  // ── B1. Success path: request shape + response parsing + cost accounting ──
  const successResult = await page.evaluate(({ images, scene }) => window._extractStyleViaGemini(images, scene), { images: EIGHT_IMAGES, scene: FAKE_SCENE });
  ok('returns the extracted style text on a valid response', typeof successResult === 'string' && /manga panel illustration/.test(successResult), JSON.stringify(successResult));
  ok('the ACTUAL outbound request has exactly 8 image blocks in GEMINI\'s native shape ({type:"image", mime_type, data}) — NOT GPT-4o\'s {type:"image_url", image_url:{url}} shape',
    capturedClientBody && Array.isArray(capturedClientBody.messages) && capturedClientBody.messages[1] && Array.isArray(capturedClientBody.messages[1].content) &&
    capturedClientBody.messages[1].content.filter((b) => b.type === 'image' && b.mime_type === 'image/png' && typeof b.data === 'string').length === 8,
    JSON.stringify(capturedClientBody && capturedClientBody.messages && capturedClientBody.messages[1] && capturedClientBody.messages[1].content.map((b) => b.type)));
  ok('the request declares model="gemini-2.5-flash"', capturedClientBody && capturedClientBody.model === 'gemini-2.5-flash', capturedClientBody && capturedClientBody.model);
  ok('the request carries the SAME max_tokens (200) and temperature (0.4) as the GPT-4o extractor — parity, not a weaker or stronger call', capturedClientBody && capturedClientBody.max_tokens === 200 && capturedClientBody.temperature === 0.4, JSON.stringify({ max_tokens: capturedClientBody && capturedClientBody.max_tokens, temperature: capturedClientBody && capturedClientBody.temperature }));

  const costEntry = await page.evaluate(() => {
    const t = window.state && window.state._sceneCostAcc && window.state._sceneCostAcc.breakdown && window.state._sceneCostAcc.breakdown.text;
    return t && t.length ? t[t.length - 1] : null;
  });
  const OFFICIAL_GEMINI_IN = 0.0000003, OFFICIAL_GEMINI_OUT = 0.0000025; // ai.google.dev/gemini-api/docs/pricing — Gemini 2.5 Flash standard tier
  const expectedCost = 2900 * OFFICIAL_GEMINI_IN + 52 * OFFICIAL_GEMINI_OUT;
  ok('cost was recorded against the OFFICIAL Gemini 2.5 Flash rate ($0.30/M in, $2.50/M out), via the app\'s real _recordProxyTextCost -> estimateTextCost pipeline (not hand-computed here)',
    costEntry && costEntry.model === 'gemini-2.5-flash' && costEntry.category === 'style-extraction-gemini-adapter' && Math.abs(costEntry.cost - expectedCost) < 0.0000001,
    JSON.stringify({ costEntry, expectedCost }));

  // ── B2. Fail-closed: a real provider error must return null, never a fabricated style string ──
  mode = 'error';
  const errorResult = await page.evaluate(({ images, scene }) => window._extractStyleViaGemini(images, scene), { images: EIGHT_IMAGES, scene: FAKE_SCENE });
  ok('a real provider error (429) returns null — never a fabricated or partial style string', errorResult === null, JSON.stringify(errorResult));

  // ── B3. Fail-closed: a malformed/empty response must also return null, not throw or fabricate ──
  mode = 'malformed';
  let malformedThrew = false, malformedResult;
  try { malformedResult = await page.evaluate(({ images, scene }) => window._extractStyleViaGemini(images, scene), { images: EIGHT_IMAGES, scene: FAKE_SCENE }); }
  catch (e) { malformedThrew = true; }
  ok('a malformed response (no message.content) returns null without throwing', !malformedThrew && malformedResult === null, JSON.stringify({ malformedThrew, malformedResult }));

  // ── B4. Guard: no images -> immediate null, never dispatches a network call at all ──
  capturedClientBody = null;
  const noImagesResult = await page.evaluate(({ scene }) => window._extractStyleViaGemini([], scene), { scene: FAKE_SCENE });
  ok('called with zero reference images, returns null WITHOUT dispatching any request', noImagesResult === null && capturedClientBody === null, JSON.stringify({ noImagesResult, dispatched: capturedClientBody !== null }));

  await browser.close();
}

console.log('\n' + '='.repeat(100));
console.log('GEMINI VISION ADAPTER CAPABILITY CONTROL: ' + results.filter(r => r.pass).length + '/' + results.length + ' passed');
process.exitCode = results.every(r => r.pass) ? 0 : 1;
