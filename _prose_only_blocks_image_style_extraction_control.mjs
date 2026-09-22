// PROSE-ONLY HARNESS BLOCKS IMAGE-PREPARATION OPERATIONS — DRY CONTROL (Roman, 2026-09-22)
//
// Roman (first pass): "this run explicitly prohibited ANY image-style extraction... Also fix the
// prose-test harness so 'no image-style extraction' blocks that operation before dispatch,
// regardless of provider or shared endpoint. An endpoint allowlist alone is insufficient when
// prose and extraction share an endpoint."
//
// Roman (same-day follow-up, after reviewing the first fix): "reference-image style extraction now
// uses Gemini, with no automatic GPT-4o fallback. That closes the unfinished switch. One remaining
// scope issue: the prose harness still permits the text-only image-prompt rewrite on GPT-4o. It
// isn't reference extraction, but it's still image preparation — and unnecessary spending during a
// prose-only test. Finish the prose-only boundary: block both reference-image style extraction and
// text-only image-prompt rewriting before provider dispatch. Keep both available during authorized
// image workflows. Prefer an explicit operation-purpose identifier for this boundary; retain the
// signature-text check as additional protection."
//
// Two real image-preparation operations, now both blockable via `blockImagePreparation`:
//   'image_style_extraction' — the reference-image-driven (vision) extraction (Gemini, per the
//                              wiring fix; formerly GPT-4o).
//   'image_prompt_rewrite'   — the no-reference text-only rewrite (no image sent — still image
//                              preparation, still unnecessary spend on a prose-only test).
// Classification: PRIMARY signal is the request's own `purpose` field (carried on the wire by both
// real callers via orchestration-client.js's payload.purpose passthrough and
// _extractStyleViaGemini's direct fetch body). SECONDARY/fallback signal (retained): the request's
// own system-message text, matched against two patterns — the narrow "STYLE-ONLY EXTRACTION
// (HARD)" phrase (ref-driven only) and the broader "visual art director for a comic book / graphic
// novel" opening line (shared by BOTH image-preparation branches, safe to use now that BOTH are in
// scope for blocking).
//
// SAFETY NOTE: sections proving the "not blocked" side of this behavior unit-test
// isImagePreparationRequest directly (imported from the gate module, zero network calls) rather
// than dispatching a real request through an allowlisted "real" lane — dispatching a genuinely
// non-extraction-shaped body through the real lane would hit the ACTUAL dev server and could
// trigger a real, paid provider call, which this correction explicitly does not need or want ("No
// paid calls or candidate prose edits"). Sections proving BLOCKING are safe to test via the real
// lane because a blocked request is route.abort()'d BEFORE route.continue() — no bytes ever leave
// the browser, no cost is possible.
//
// Proves, fully dry:
//   A. REF-DRIVEN EXTRACTION BLOCKED (Gemini) — the real, live rewriteImagePromptWithStyle's
//      reference-driven branch is blocked before dispatch, even with /api/gemini-proxy fully
//      allowlisted and a phase active.
//   B. REF-DRIVEN EXTRACTION ALSO BLOCKED ON GPT-4O — the same extraction shape sent directly to
//      /api/chatgpt-proxy (simulating the OLD real call, or a future regression) is also blocked —
//      proving the classifier is provider-agnostic.
//   C. NO-REF TEXT-ONLY REWRITE BLOCKED — the real, live rewriteImagePromptWithStyle's no-reference
//      branch (the NEWLY-closed gap) is ALSO blocked before dispatch — the specific finding this
//      pass closes.
//   D. PRIMARY SIGNAL — a request carrying `purpose: 'image_style_extraction'` or
//      `'image_prompt_rewrite'` is classified as image preparation even with unrelated/blank
//      system text — proving the purpose field alone is sufficient, not just a convenience.
//   E. SECONDARY SIGNAL RETAINED — a request with NO purpose field, but carrying either known
//      signature phrase in its system text, is STILL classified as image preparation — proving the
//      text-based fallback survives the purpose-field addition, per Roman's explicit "retain the
//      signature-text check as additional protection."
//   F. PROSE UNAFFECTED — real, unrelated request shapes this pipeline actually sends (a
//      SCENE-SPINE planner body with no purpose field, a genuine GPT-4o chat completion with no
//      purpose field and unrelated system text) are NOT classified as image preparation.
//
// usage: node _prose_only_blocks_image_style_extraction_control.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { installFailClosedNetworkGate, isImagePreparationRequest } from './_e2e_network_gate.mjs';

const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 700) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

const REAL_REF_PATH = '/cursor-dollar-plane-64.png';
const SCENE_TEXT = 'A quiet, undramatic negotiation between two officials in an empty room.';
const EXTRACTION_SYSTEM_TEXT = 'You are a visual art director for a comic book / graphic novel. The reference image(s) are ILLUSTRATED ART — treat them as comic or webtoon panels, never as photography.\n\n— STYLE-ONLY EXTRACTION (HARD): The reference image(s) may DEPICT specific compositions. DO NOT carry the SUBJECT COMPOSITION of the reference image into your output.';
const NO_REF_SYSTEM_TEXT = 'You are a visual art director for a comic book / graphic novel.\n\nRules:\n- 60-120 words maximum\n- Output MUST be comic book / manga / webtoon illustration — NEVER photorealistic\n- Start with the art medium\n- Be visually specific (faces, pose, lighting, color)\n- All people must be clearly adults (mid-to-late 20s or older)\n- Always produce a full color image\n- Output ONLY the prompt, no explanation';

section('D. PRIMARY SIGNAL — the purpose field alone classifies a request, regardless of system text');
{
  ok('purpose="image_style_extraction" + unrelated system text is classified as image preparation', isImagePreparationRequest({ purpose: 'image_style_extraction', messages: [{ role: 'system', content: 'irrelevant text' }] }) === true, 'not classified');
  ok('purpose="image_prompt_rewrite" + unrelated system text is classified as image preparation', isImagePreparationRequest({ purpose: 'image_prompt_rewrite', messages: [{ role: 'system', content: 'irrelevant text' }] }) === true, 'not classified');
  ok('purpose="image_style_extraction" + NO messages at all is still classified (purpose alone is sufficient)', isImagePreparationRequest({ purpose: 'image_style_extraction' }) === true, 'not classified');
  ok('an UNRELATED purpose value (e.g. a future, different operation) is NOT classified as image preparation', isImagePreparationRequest({ purpose: 'scene_planning', messages: [{ role: 'system', content: 'irrelevant text' }] }) === false, 'misclassified');
}

section('E. SECONDARY SIGNAL RETAINED — no purpose field, but a known signature phrase, still classifies correctly');
{
  ok('the ref-driven extraction system text (no purpose field) is STILL classified via the text fallback', isImagePreparationRequest({ messages: [{ role: 'system', content: EXTRACTION_SYSTEM_TEXT }, { role: 'user', content: [] }] }) === true, 'not classified');
  ok('the no-ref rewrite system text (no purpose field) is STILL classified via the broadened text fallback', isImagePreparationRequest({ messages: [{ role: 'system', content: NO_REF_SYSTEM_TEXT }, { role: 'user', content: 'STYLE:\n...' }] }) === true, 'not classified');
}

section('F. PROSE UNAFFECTED — real, unrelated request shapes (no purpose field, no signature text) are not classified');
{
  const plannerBody = { role: 'STRUCTURE_GENERATOR', model: 'grok-4-1-fast-non-reasoning', max_tokens: 1200, messages: [
    { role: 'system', content: 'You are the SCENE-SPINE planner for an interactive romance engine. The scene has ONE organizing event: a STATE CHANGE...' },
    { role: 'user', content: 'READER POSTURE -> LOCAL OBJECTIVE\n...' }
  ] };
  ok('a genuine SCENE-SPINE planner request is NOT classified as image preparation', isImagePreparationRequest(plannerBody) === false, JSON.stringify(plannerBody));

  const chatCompletionBody = { role: 'PRIMARY_AUTHOR', model: 'gpt-4o', max_tokens: 50, messages: [
    { role: 'system', content: 'You are a helpful assistant that writes short scene titles.' },
    { role: 'user', content: 'Title for: Lirael faces the assembly.' }
  ] };
  ok('a genuine, unrelated GPT-4o chat completion (SAME endpoint both extraction operations use) is NOT classified as image preparation', isImagePreparationRequest(chatCompletionBody) === false, JSON.stringify(chatCompletionBody));

  ok('malformed/empty request bodies do not throw and are NOT classified as image preparation', isImagePreparationRequest(null) === false && isImagePreparationRequest({}) === false && isImagePreparationRequest({ messages: [] }) === false, 'threw or misclassified');

  ok('sanity check: the REAL ref-driven extraction body (purpose field present, as it now ships) IS classified', isImagePreparationRequest({ purpose: 'image_style_extraction', messages: [{ role: 'system', content: EXTRACTION_SYSTEM_TEXT }, { role: 'user', content: [{ type: 'image_url', image_url: { url: 'data:image/png;base64,AAAA' } }] }] }) === true, 'not classified');
  ok('sanity check: the REAL no-ref rewrite body (purpose field present, as it now ships) IS classified', isImagePreparationRequest({ purpose: 'image_prompt_rewrite', messages: [{ role: 'system', content: NO_REF_SYSTEM_TEXT }, { role: 'user', content: 'STYLE:\n...' }] }) === true, 'not classified');
}

(async () => {
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();

  const LOG_FILE = '/tmp/_prose_only_blocks_extraction_control_out.jsonl';
  try { fs.unlinkSync(LOG_FILE); } catch (_) {}
  const gate = await installFailClosedNetworkGate(page, { logFile: LOG_FILE, blockImagePreparation: true });
  // A permissive real-lane scope, matching what a prose harness realistically allowlists — the
  // point of this control is that the CONTENT classifier, not a narrower allowlist, is what stops
  // both image-preparation operations, even when the endpoint is otherwise fully authorized.
  gate.allowRealPaths(['/api/proxy', '/api/gemini-proxy', '/api/chatgpt-proxy']);
  gate.setPhase('prose-only-continuation', 8);

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => window.state && typeof window.rewriteImagePromptWithStyle === 'function', { timeout: 20000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready — ' + (e && e.message)); await browser.close(); process.exit(2); });

  section('A. REF-DRIVEN EXTRACTION BLOCKED (Gemini) — aborted before dispatch (safe: an aborted request never reaches the real server)');
  const geminiAttempt = await page.evaluate(({ path, scene }) => window.rewriteImagePromptWithStyle({ reference_images: [path] }, scene), { path: REAL_REF_PATH, scene: SCENE_TEXT });
  ok('rewriteImagePromptWithStyle returns null — the extraction never completed', geminiAttempt === null, JSON.stringify(geminiAttempt));
  ok('no /api/gemini-proxy call was ever tracked as a settled real dispatch', gate.realCalls().filter((c) => c.url.includes('/api/gemini-proxy')).length === 0, 'a real call was tracked');

  section('B. REF-DRIVEN EXTRACTION ALSO BLOCKED ON GPT-4O — the SAME shape, sent directly, is also aborted before dispatch');
  const chatgptAttempt = await page.evaluate(async ({ sysText }) => {
    try {
      const r = await fetch('/api/chatgpt-proxy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'PRIMARY_AUTHOR', model: 'gpt-4o', purpose: 'image_style_extraction', max_tokens: 200, temperature: 0.4, messages: [
          { role: 'system', content: sysText },
          { role: 'user', content: [{ type: 'image_url', image_url: { url: 'data:image/png;base64,AAAA' } }, { type: 'text', text: 'SCENE:\ntest' }] }
        ] })
      });
      return { threw: false, ok: r.ok, status: r.status };
    } catch (e) { return { threw: true, message: e && e.message }; }
  }, { sysText: EXTRACTION_SYSTEM_TEXT });
  ok('the fetch failed (network error) rather than completing — Playwright route.abort() surfaces as a rejected/failed fetch', chatgptAttempt.threw === true || chatgptAttempt.ok === false, JSON.stringify(chatgptAttempt));
  ok('no /api/chatgpt-proxy call carrying this shape was ever tracked as a settled real dispatch', gate.realCalls().filter((c) => c.url.includes('/api/chatgpt-proxy')).length === 0, 'a real call was tracked');

  section('C. NO-REF TEXT-ONLY REWRITE BLOCKED — the NEWLY-closed gap: rewriteImagePromptWithStyle\'s no-ref branch is also aborted before dispatch');
  // NOTE: unlike the Gemini branch (which never throws — _extractStyleViaGemini catches its own
  // fetch internally), this branch's callChatGPT call is not internally wrapped — the SAME as the
  // original rewritePromptWith4o before this session. In production the ONE real call site already
  // wraps the whole rewriteImagePromptWithStyle call in try/catch (public/app.js ~line 297555:
  // "catch (_4oErr) { console.warn('[STYLE-EXTRACT FAILED...']") — a blocked/aborted fetch is
  // handled there identically to any other extraction failure. This test reproduces that same
  // wrapping (not a change to the function itself) so a blocked-before-dispatch outcome and a
  // null-returned outcome are both accepted as "the extraction never completed."
  const noRefAttempt = await page.evaluate(async (scene) => {
    try { return { threw: false, value: await window.rewriteImagePromptWithStyle({ style_anchor: 'clean modern digital illustration' }, scene) }; }
    catch (e) { return { threw: true, message: e && e.message }; }
  }, SCENE_TEXT);
  ok('rewriteImagePromptWithStyle never completes the no-ref rewrite (returns null OR throws, matching how the real call site treats any extraction failure) — this is the gap Roman named: "the prose harness still permits the text-only image-prompt rewrite"', noRefAttempt.value === null || noRefAttempt.threw === true, JSON.stringify(noRefAttempt));
  ok('no /api/chatgpt-proxy call from the no-ref rewrite was ever tracked as a settled real dispatch', gate.realCalls().filter((c) => c.url.includes('/api/chatgpt-proxy')).length === 0, 'a real call was tracked — the no-ref rewrite dispatched for real');

  await browser.close();
  try { fs.unlinkSync(LOG_FILE); } catch (_) {}

  console.log('\n' + '='.repeat(100));
  console.log('PROSE-ONLY BLOCKS IMAGE-PREPARATION CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
