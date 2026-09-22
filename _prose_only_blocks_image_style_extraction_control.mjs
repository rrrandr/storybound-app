// PROSE-ONLY HARNESS BLOCKS IMAGE-STYLE EXTRACTION — DRY CONTROL (Roman, 2026-09-22)
//
// Roman: "There's also a separate failure here: this run explicitly prohibited ANY image-style
// extraction. Switching providers alone wouldn't fix that unauthorized call... Also fix the
// prose-test harness so 'no image-style extraction' blocks that operation before dispatch,
// regardless of provider or shared endpoint. An endpoint allowlist alone is insufficient when
// prose and extraction share an endpoint... Verify: the real extraction path selects Gemini
// [separate control], and a prose-only continuation cannot dispatch extraction through either
// Gemini or GPT-4o."
//
// Real finding this closes: Temptation attempt 4 ran under _scene2_repair_replay_sample.mjs's
// allowRealPaths(['/api/proxy', '/api/mistral-proxy', '/api/deepseek-proxy', '/api/chatgpt-proxy'])
// — an endpoint allowlist. That endpoint also carries other legitimate real calls this same
// pipeline makes, so it could not be removed outright; nothing inspected the CONTENT of what went
// out on it, so the image-style-extraction call (a "visual art director" prompt fed a reference
// image) rode straight through as authorized real traffic. Fixed: _e2e_network_gate.mjs's new
// blockImageStyleExtraction option inspects every real-lane request's own body for the
// image-style-extraction shape (isImageStyleExtractionRequest, now a module-level export) and
// aborts it before dispatch — independent of which allowlisted endpoint it would have used.
//
// SAFETY NOTE: sections C/D below prove the "not blocked" side of this behavior by unit-testing
// isImageStyleExtractionRequest directly (imported from the gate module, zero network calls of any
// kind) rather than by dispatching a real request through an allowlisted "real" lane — dispatching
// a genuinely non-extraction-shaped body through the real lane would hit the ACTUAL dev server and
// could trigger a real, paid provider call, which this correction explicitly does not need or want
// ("No paid calls or regeneration are needed for this correction"). Sections A/B, which prove the
// BLOCKING behavior, are safe to test via the real lane precisely because a blocked request is
// route.abort()'d BEFORE route.continue() — no bytes ever leave the browser, no cost is possible.
//
// Proves, fully dry:
//   A. GEMINI BLOCKED    — the real, live rewriteImagePromptWithStyle's reference-driven branch
//                          (which, per the companion wiring control, now calls Gemini) is blocked
//                          before dispatch when blockImageStyleExtraction is active — even though
//                          /api/gemini-proxy is fully allowlisted and a phase is active. Safe: an
//                          aborted request never reaches the real server.
//   B. GPT-4O ALSO BLOCKED — a raw request carrying the SAME extraction shape, sent directly to
//                          /api/chatgpt-proxy (simulating the OLD real call, or any future
//                          regression that reintroduces it), is ALSO blocked before dispatch —
//                          proving the classifier is provider-agnostic, not a Gemini-specific
//                          patch. Safe for the same reason.
//   C. PROSE UNAFFECTED   — isImageStyleExtractionRequest, unit-tested directly against a genuine
//                          SCENE-SPINE planner body and a genuine non-extraction chat-completion
//                          body (both real shapes this pipeline actually sends), returns false —
//                          proving the classifier does not over-block real prose sharing the same
//                          endpoint. Zero network calls.
//   D. NO-REF STYLE REWRITE UNAFFECTED — same unit-test technique against the no-reference
//                          text-only rewrite's own real system prompt (no image, not extraction) —
//                          also returns false.
//
// usage: node _prose_only_blocks_image_style_extraction_control.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { installFailClosedNetworkGate, isImageStyleExtractionRequest } from './_e2e_network_gate.mjs';

const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 700) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

const REAL_REF_PATH = '/cursor-dollar-plane-64.png';
const SCENE_TEXT = 'A quiet, undramatic negotiation between two officials in an empty room.';
// The exact, load-bearing signature phrase both real callers send verbatim — reused here (not
// paraphrased) so this control tests against the SAME text the classifier itself matches.
const EXTRACTION_SYSTEM_TEXT = 'You are a visual art director for a comic book / graphic novel. The reference image(s) are ILLUSTRATED ART — treat them as comic or webtoon panels, never as photography.\n\n— STYLE-ONLY EXTRACTION (HARD): The reference image(s) may DEPICT specific compositions. DO NOT carry the SUBJECT COMPOSITION of the reference image into your output.';

section('C. PROSE UNAFFECTED — the classifier, unit-tested directly against real non-extraction request shapes, returns false');
{
  const plannerBody = { role: 'STRUCTURE_GENERATOR', model: 'grok-4-1-fast-non-reasoning', max_tokens: 1200, messages: [
    { role: 'system', content: 'You are the SCENE-SPINE planner for an interactive romance engine. The scene has ONE organizing event: a STATE CHANGE...' },
    { role: 'user', content: 'READER POSTURE -> LOCAL OBJECTIVE\n...' }
  ] };
  ok('a genuine SCENE-SPINE planner request is NOT classified as image-style extraction', isImageStyleExtractionRequest(plannerBody) === false, JSON.stringify(plannerBody));

  const chatCompletionBody = { role: 'PRIMARY_AUTHOR', model: 'gpt-4o', max_tokens: 50, messages: [
    { role: 'system', content: 'You are a helpful assistant that writes short scene titles.' },
    { role: 'user', content: 'Title for: Lirael faces the assembly.' }
  ] };
  ok('a genuine, unrelated GPT-4o chat completion (SAME endpoint the extraction call uses) is NOT classified as extraction', isImageStyleExtractionRequest(chatCompletionBody) === false, JSON.stringify(chatCompletionBody));

  ok('malformed/empty request bodies do not throw and are NOT classified as extraction (fail-open on shape, not fail-closed into blocking everything)', isImageStyleExtractionRequest(null) === false && isImageStyleExtractionRequest({}) === false && isImageStyleExtractionRequest({ messages: [] }) === false, 'threw or misclassified');
}

section('D. NO-REF STYLE REWRITE UNAFFECTED — the real no-ref system prompt is NOT classified as extraction');
{
  const noRefSystemText = 'You are a visual art director for a comic book / graphic novel.\n\nRules:\n- 60-120 words maximum\n- Output MUST be comic book / manga / webtoon illustration — NEVER photorealistic\n- Start with the art medium\n- Be visually specific (faces, pose, lighting, color)\n- All people must be clearly adults (mid-to-late 20s or older)\n- Always produce a full color image\n- Output ONLY the prompt, no explanation';
  const noRefBody = { role: 'PRIMARY_AUTHOR', model: 'gpt-4o', max_tokens: 200, temperature: 0.4, messages: [
    { role: 'system', content: noRefSystemText },
    { role: 'user', content: 'STYLE:\nclean modern digital illustration\n\nSCENE:\n' + SCENE_TEXT + '\n\nRewrite into a clean image prompt.' }
  ] };
  ok('the real no-ref rewrite body (opens with the SAME "visual art director" line, but no image, no STYLE-ONLY EXTRACTION clause) is NOT classified as extraction', isImageStyleExtractionRequest(noRefBody) === false, JSON.stringify(noRefBody));

  const refBody = { role: 'PRIMARY_AUTHOR', model: 'gpt-4o', max_tokens: 200, temperature: 0.4, messages: [
    { role: 'system', content: EXTRACTION_SYSTEM_TEXT },
    { role: 'user', content: [{ type: 'image_url', image_url: { url: 'data:image/png;base64,AAAA' } }, { type: 'text', text: 'SCENE:\ntest' }] }
  ] };
  ok('sanity check: the REAL ref-driven extraction body IS classified as extraction (the positive case the negatives above are contrasted against)', isImageStyleExtractionRequest(refBody) === true, JSON.stringify(refBody));
}

(async () => {
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();

  const LOG_FILE = '/tmp/_prose_only_blocks_extraction_control_out.jsonl';
  try { fs.unlinkSync(LOG_FILE); } catch (_) {}
  const gate = await installFailClosedNetworkGate(page, { logFile: LOG_FILE, blockImageStyleExtraction: true });
  // A permissive real-lane scope, matching what a prose harness realistically allowlists — the
  // point of this control is that the CONTENT classifier, not a narrower allowlist, is what stops
  // the extraction call, even when the endpoint is otherwise fully authorized.
  gate.allowRealPaths(['/api/proxy', '/api/gemini-proxy', '/api/chatgpt-proxy']);
  gate.setPhase('prose-only-continuation', 8);

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => window.state && typeof window.rewriteImagePromptWithStyle === 'function', { timeout: 20000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready — ' + (e && e.message)); await browser.close(); process.exit(2); });

  section('A. GEMINI BLOCKED — the real reference-driven extraction path is aborted before dispatch (safe: an aborted request never reaches the real server)');
  const geminiAttempt = await page.evaluate(({ path, scene }) => window.rewriteImagePromptWithStyle({ reference_images: [path] }, scene), { path: REAL_REF_PATH, scene: SCENE_TEXT });
  ok('rewriteImagePromptWithStyle returns null — the extraction never completed', geminiAttempt === null, JSON.stringify(geminiAttempt));
  const realCallsAfterA = gate.realCalls().filter((c) => c.url.includes('/api/gemini-proxy'));
  ok('no /api/gemini-proxy call was ever tracked as a settled real dispatch', realCallsAfterA.length === 0, JSON.stringify(realCallsAfterA.map((c) => c.status)));

  section('B. GPT-4O ALSO BLOCKED — the SAME extraction shape, sent directly to the GPT-4o endpoint, is also aborted before dispatch');
  const chatgptAttempt = await page.evaluate(async ({ sysText }) => {
    try {
      const r = await fetch('/api/chatgpt-proxy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'PRIMARY_AUTHOR', model: 'gpt-4o', max_tokens: 200, temperature: 0.4, messages: [
          { role: 'system', content: sysText },
          { role: 'user', content: [{ type: 'image_url', image_url: { url: 'data:image/png;base64,AAAA' } }, { type: 'text', text: 'SCENE:\ntest' }] }
        ] })
      });
      return { threw: false, ok: r.ok, status: r.status };
    } catch (e) { return { threw: true, message: e && e.message }; }
  }, { sysText: EXTRACTION_SYSTEM_TEXT });
  ok('the fetch failed (network error) rather than completing — Playwright route.abort() surfaces as a rejected/failed fetch', chatgptAttempt.threw === true || chatgptAttempt.ok === false, JSON.stringify(chatgptAttempt));
  const realCallsAfterB = gate.realCalls().filter((c) => c.url.includes('/api/chatgpt-proxy'));
  ok('no /api/chatgpt-proxy call carrying this extraction shape was ever tracked as a settled real dispatch', realCallsAfterB.length === 0, JSON.stringify(realCallsAfterB.map((c) => c.status)));

  await browser.close();
  try { fs.unlinkSync(LOG_FILE); } catch (_) {}

  console.log('\n' + '='.repeat(100));
  console.log('PROSE-ONLY BLOCKS IMAGE-STYLE EXTRACTION CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
