// BAKED OAS MOUTH-PREBATCH DISABLED — outbound-stubbed control (Roman, 2026-09-16)
//
// Proves the new gate in _kickoffMouthPrebatch (public/app.js, right after the existing
// literary-mode skip): for First Sacrifice's baked CG/OAS opening, ZERO /api/image (or any other
// image-generation) requests are made — no cold-start Gemini mouth-frame generation, no bespoke
// fallback attempt. The generic, static viseme placeholder tier (_resolveMouthBaseUrl ->
// /assets/test-mouths/*) is what actually renders. Non-blocking crossfade/display behavior and
// baked-prose/OAS-interactivity timing are UNCHANGED (this gate only stops an already-background,
// already-non-blocking prebatch from ever firing — it does not touch the synchronous placeholder
// seed or the display cascade).
//
// Real Library -> Read -> baked OAS -> Go launch, no renderMode/currentEngine override (same
// proven sequence as _cg_ground_truth_census.mjs / _tiered_provider_policy_control.mjs). Every
// /api/** route is intercepted; ANY request matching the image-route pattern is a HARD FAILURE.
//
// usage: node _baked_oas_mouth_prebatch_disabled_control.mjs
import { chromium } from 'playwright-core';
import fs from 'fs';
import { installSession, configBody, isAuthOrigin, installEntitledProfileStub, verifySubscriptionBody } from './_test_session_env.mjs';

const DIR = '_baked_oas_mouth_prebatch_disabled_out';
fs.mkdirSync(DIR, { recursive: true });

const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail ? '  — ' + String(detail).slice(0, 600) : '')); };

const PASSTHROUGH = /\/api\/(config|geo|csp-report|beta-events)\b/;
const LOCAL_STUB = {
  '/api/consume-fortune':          { success: true, fortunesRemaining: 9999 },
  '/api/verify-subscription':      { success: true, subscribed: true, tier: 'sub' },
  '/api/claim-issue-number':       { success: true, issueNumber: 1 },
  '/api/refund-fortune':           { success: true },
  '/api/grant-welcome-milestone':  { success: true },
  '/api/record-legal-acceptance':  { success: true },
};
const IMAGE_ROUTES = /\/api\/(image|bfl-kontext|visualize-flux|grok-image|dashscope-image|img-proxy|cine-styled-manifest|mouth-approve|verify-anatomy)\b/;
const MODEL_ROUTES = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini-proxy)\b/;

const inventory = [];
const imageRequests = []; // any request matching IMAGE_ROUTES — should stay EMPTY
const modelRoleLog = [];

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
const consoleLines = [];
page.on('console', m => consoleLines.push(m.text()));

await installSession(page);
await page.route('**/sb-test.localhost/**', route => {
  const accept = route.request().headers()['accept'] || '';
  const single = /vnd\.pgrst\.object\+json/.test(accept);
  return route.fulfill({ status: 200, contentType: 'application/json', body: single ? 'null' : '[]' });
});
await installEntitledProfileStub(page, { log: () => {} });

await page.route('**/api/**', async route => {
  const req = route.request();
  const url = req.url().replace(/^https?:\/\/[^/]+/, '');
  const p = url.split('?')[0];
  inventory.push({ url, method: req.method(), t: Date.now() });

  if (PASSTHROUGH.test(url)) {
    if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  }
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  if (/\/api\/verify-subscription\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(verifySubscriptionBody()) });
  const stub = Object.keys(LOCAL_STUB).find(x => p.startsWith(x));
  if (stub) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LOCAL_STUB[stub]) });

  if (IMAGE_ROUTES.test(p)) {
    // THIS is the thing under test — record it as a violation, but never let it reach a real
    // provider even if the gate somehow failed.
    let imgBody = null;
    try { imgBody = JSON.parse(req.postData() || '{}'); } catch (_) {}
    imageRequests.push({ url, prompt: String(imgBody?.prompt || '').slice(0, 200), t: Date.now() });
    console.error('[VIOLATION] image-route request fired: ' + url);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: 'data:image/png;base64,x', success: true }) });
  }
  if (!MODEL_ROUTES.test(p)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });

  // Model routes: minimal, generic fixtures — good enough for the pipeline to proceed. Role
  // fidelity doesn't matter for this control; only "did an image request fire" matters.
  let body = null;
  try { body = JSON.parse(req.postData() || '{}'); } catch (_) {}
  modelRoleLog.push({ url, max_tokens: body?.max_tokens, temperature: body?.temperature, t: Date.now() });
  const grokShape = (t) => JSON.stringify({ choices: [{ message: { content: t } }], usage: { prompt_tokens: 100, completion_tokens: 100, cost_in_usd_ticks: 0 } });
  const mistralShape = (t) => JSON.stringify({ choices: [{ message: { content: t } }], usage: { prompt_tokens: 100, completion_tokens: 100 } });
  const openaiShape = (t) => JSON.stringify({ content: t, usage: { prompt_tokens: 100, completion_tokens: 100 } });
  const shapeFor = (t) => p === '/api/chatgpt-proxy' ? openaiShape(t) : p === '/api/proxy' ? grokShape(t) : mistralShape(t);
  const sysMsg = String((body?.messages?.find(m => m.role === 'system') || {}).content || '');
  let respText = '{}';
  if (/opening an intimate dialogue/.test(sysMsg)) respText = JSON.stringify({ li_dialogue: 'placeholder', li_action: 'placeholder', face_state: 'intent', scene_state: 'building', release_state: 'none' });
  else respText = JSON.stringify({ ok: true, placeholder: true, core_contradiction: 'x', wound: { core: 'x' }, current_crisis: { event: 'x' }, coreTension: 'x', escalationAxis: 'trust', verdict: 'INTEGRATED', integration_mode: 'INTERACTION', runThesis: 'x', issueArcs: [] });
  return route.fulfill({ status: 200, contentType: 'application/json', body: shapeFor(respText) });
});

async function dismissPcLookModalIfOpen(page) {
  for (let i = 0; i < 10; i++) {
    const st = await page.evaluate(() => ({
      pcOpen: (() => { const m = document.getElementById('pcLookModal'); return !!(m && !m.classList.contains('hidden') && m.getClientRects().length > 0); })(),
      liOpen: (() => { const m = document.getElementById('liRenderModal'); return !!(m && !m.classList.contains('hidden') && m.getClientRects().length > 0); })(),
      warnOpen: !!document.getElementById('skipRenderWarnModal'),
    }));
    if (!st.pcOpen && !st.liOpen && !st.warnOpen) break;
    if (st.warnOpen) { try { await page.click('#skipRenderWarnModal [data-act="skip"]', { timeout: 5000 }); } catch (_) {} }
    else if (st.pcOpen) { try { await page.click('#pcLookSkipBtn', { timeout: 5000 }); } catch (_) {} }
    else if (st.liOpen) { try { await page.click('#liRenderSkipBtn', { timeout: 5000 }); } catch (_) {} }
    await page.waitForTimeout(400);
  }
}

console.log('\n' + '='.repeat(92) + '\nBAKED OAS MOUTH-PREBATCH DISABLED — outbound-stubbed control\n' + '='.repeat(92) + '\n');

const t0 = Date.now(); let up = false;
while (Date.now() - t0 < 120000 && !up) {
  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 });
    await page.waitForFunction(() => window.state && window._launchStarterStory && window.STARTER_STORIES && window._bakedScene1For, null, { timeout: 60000 });
    up = true;
  } catch (_) { await page.waitForTimeout(3000); }
}
if (!up) { ok('server ready', false); await browser.close(); process.exit(1); }
await page.waitForFunction(() => !document.body.classList.contains('booting'), null, { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(2000);

const burgerVisible = await page.evaluate(() => { const b = document.getElementById('burgerBtn'); return !!(b && b.getClientRects().length > 0); });
if (burgerVisible) {
  await page.click('#burgerBtn'); await page.waitForTimeout(400);
  await page.click('.vault-tab[data-vault-section="Account"]'); await page.waitForTimeout(300);
  await page.click('#menuLibraryBtn'); await page.waitForTimeout(1200);
}
const bookInfo = await page.evaluate(() => {
  const el = document.querySelector('.library-book[data-story-id="starter_first_sacrifice"]');
  return el ? { found: true, rectN: el.getClientRects().length } : { found: false };
});
ok('shelf book visible', bookInfo.found && bookInfo.rectN > 0, JSON.stringify(bookInfo));
if (!(bookInfo.found && bookInfo.rectN > 0)) { await browser.close(); process.exit(1); }

await page.click('.library-book[data-story-id="starter_first_sacrifice"]');
await page.waitForTimeout(800);
const tReadClick = Date.now();
await page.click('#zoomReadBtn');
// Poll for baked prose becoming visible (the OAS entry button appearing is a reliable proxy —
// it only renders once the baked scene has mounted).
let proseVisibleAt = null;
for (let i = 0; i < 40; i++) {
  const visible = await page.evaluate(() => !!document.getElementById('bakedOASEnterBtn') && document.getElementById('bakedOASEnterBtn').getClientRects().length > 0);
  if (visible) { proseVisibleAt = Date.now(); break; }
  await page.waitForTimeout(200);
}
ok('baked prose / OAS entry button became visible', !!proseVisibleAt, proseVisibleAt ? ((proseVisibleAt - tReadClick) + 'ms after Read click') : 'never appeared');
ok('zero image-route requests fired before/during prose becoming visible', imageRequests.length === 0, JSON.stringify(imageRequests));

await page.click('#bakedOASEnterBtn');
await page.waitForTimeout(1000);
const goBtnVisible = await page.evaluate(() => { const el = document.getElementById('buGoBtn'); return !!(el && el.getClientRects().length > 0); });
ok('Genesis gate #buGoBtn visible', goBtnVisible);
if (!goBtnVisible) { await browser.close(); process.exit(1); }

const tGoClick = Date.now();
await page.click('#buGoBtn');
let unlocked = false;
for (let i = 0; i < 240 && !unlocked; i++) { await page.waitForTimeout(1000); unlocked = consoleLines.some(l => /\[BAKED:GATE\] Genesis unlocked/.test(l)); }
ok('Genesis charge completes ("[BAKED:GATE] Genesis unlocked")', unlocked, unlocked ? '' : 'timed out');
await dismissPcLookModalIfOpen(page);

// Poll for OAS becoming interactive: the intimacy mouth image element mounted with a real src.
let oasInteractiveAt = null;
let mouthImgSrc = null;
for (let i = 0; i < 40; i++) {
  const st = await page.evaluate(() => {
    const img = document.getElementById('intimacyMouthImg');
    return { present: !!img, src: img ? img.getAttribute('src') : null };
  });
  if (st.present && st.src) { oasInteractiveAt = Date.now(); mouthImgSrc = st.src; break; }
  await page.waitForTimeout(200);
}
ok('OAS mouth widget mounted with a real image src', !!oasInteractiveAt, oasInteractiveAt ? ((oasInteractiveAt - tGoClick) + 'ms after Go click, src=' + mouthImgSrc) : 'never mounted');
ok('the rendered mouth image resolves to the STATIC generic viseme asset path (/assets/test-mouths/...), not a data-URL/generated frame',
  !!mouthImgSrc && /\/assets\/test-mouths\//.test(mouthImgSrc), 'src=' + mouthImgSrc);

// Give any background prebatch attempt (if the gate somehow failed) a generous window to fire —
// same 8s the ground-truth census used to let post-unlock async work surface.
await page.waitForTimeout(8000);

const _gateFired = consoleLines.filter(l => /\[MOUTH-PREBATCH\] Skipped — baked CG\/OAS opening/.test(l));
ok('the new gate log line fired ("[MOUTH-PREBATCH] Skipped — baked CG/OAS opening")',
  _gateFired.length > 0, _gateFired.length + ' matching console line(s)');
ok('ZERO image-route requests fired across the ENTIRE run (opening, entering OAS, waiting on its dialogue)', imageRequests.length === 0, JSON.stringify(imageRequests));

// Sample a few more viseme states via the same resolver the app itself uses, to confirm generic-
// asset resolution holds broadly, not just for the one state that happened to mount first.
const sampledStates = await page.evaluate(() => {
  const states = ['soft', 'parted', 'gasping', 'still', 'closed_smile', 'lip_bite', 'ahh', 'big_o'];
  if (typeof window._resolveMouthBaseUrl !== 'function') return { available: false };
  const out = {};
  states.forEach(s => { try { out[s] = window._resolveMouthBaseUrl(s); } catch (_) { out[s] = null; } });
  return { available: true, urls: out };
});
if (sampledStates.available) {
  const allStatic = Object.values(sampledStates.urls).every(u => !!u && /\/assets\/test-mouths\//.test(u));
  ok('all sampled viseme states resolve to static generic assets via _resolveMouthBaseUrl', allStatic, JSON.stringify(sampledStates.urls));
} else {
  ok('_resolveMouthBaseUrl reachable for sampling', false, 'function not found on window');
}

const err = await page.evaluate(() => window.__err || null);
await browser.close();

fs.writeFileSync(DIR + '/imageRequests.json', JSON.stringify(imageRequests, null, 2));
fs.writeFileSync(DIR + '/consoleLines.json', JSON.stringify(consoleLines, null, 2));
fs.writeFileSync(DIR + '/sampledStates.json', JSON.stringify(sampledStates, null, 2));

console.log('\n' + '-'.repeat(92));
console.log(' page error          : ' + (err || 'none'));
console.log(' image requests      : ' + imageRequests.length);
console.log(' prose visible       : ' + (proseVisibleAt ? (proseVisibleAt - tReadClick) + 'ms after Read click' : 'N/A'));
console.log(' OAS interactive     : ' + (oasInteractiveAt ? (oasInteractiveAt - tGoClick) + 'ms after Go click' : 'N/A'));
console.log('\n artifacts -> ' + DIR + '/\n');

const allPass = results.every(r => r.pass);
console.log(`\nBAKED OAS MOUTH-PREBATCH DISABLED CONTROL: ${results.filter(r=>r.pass).length}/${results.length} passed`);
process.exit(allPass ? 0 : 1);
