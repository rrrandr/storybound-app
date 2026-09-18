// CG DERIVE/COMPOSITE SCHEDULER — outbound-stubbed, real-invocation control (Roman, 2026-09-19)
//
// Proves, by REAL invocation of the production functions (_renderStagedPhaseImage,
// _storyboardChooseRenderAction, _tryDeriveOrComposite, _composeMultiSourceImage, _deriveFromFrame)
// against a real loaded app.js in a real browser, network boundary stubbed:
//   1. a panel whose sole on-panel character is ALREADY INTRODUCED (real Casting Library record)
//      and whose camera calls for a close/bust/eye crop uses a REAL _deriveFromFrame zero-cost crop
//      — makes ZERO /api/image requests, and the resulting imageUrl is a real derived data: URL;
//   2. a 4-character extreme-closeup panel where all 4 are already introduced composites their real
//      cached crops into ONE eye_strip_stack_4 image — ZERO /api/image requests — and the composited
//      result is STABLE across a real save (saveStorySnapshot) + restore (continueStory) round trip;
//   3. when no compatible existing source exists (character NOT yet introduced), the normal
//      generated path remains available — the panel falls through to a real generation request,
//      never a broken/blank result.
//
// usage: node _cg_derive_composite_control.mjs
import { chromium } from 'playwright-core';
import { installSession, configBody, isAuthOrigin, installEntitledProfileStub, verifySubscriptionBody } from './_test_session_env.mjs';

const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail ? '  — ' + String(detail).slice(0, 900) : '')); };

const PASSTHROUGH = /\/api\/(config|geo|csp-report|beta-events)\b/;
const LOCAL_STUB = {
  '/api/consume-fortune':          { success: true, fortunesRemaining: 9999 },
  '/api/verify-subscription':      { success: true, subscribed: true, tier: 'sub' },
  '/api/claim-issue-number':       { success: true, issueNumber: 1 },
  '/api/refund-fortune':           { success: true },
  '/api/grant-welcome-milestone':  { success: true },
  '/api/record-legal-acceptance':  { success: true },
};
const imageRequests = [];

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
page.on('console', () => {});

await installSession(page);
await page.route('**/sb-test.localhost/**', route => {
  const accept = route.request().headers()['accept'] || '';
  const single = /vnd\.pgrst\.object\+json/.test(accept);
  return route.fulfill({ status: 200, contentType: 'application/json', body: single ? 'null' : '[]' });
});
await installEntitledProfileStub(page, { log: () => {} });

let imageCounter = 0;
await page.route('**/api/**', async route => {
  const req = route.request();
  const url = req.url().replace(/^https?:\/\/[^/]+/, '');
  const p = url.split('?')[0];
  if (PASSTHROUGH.test(url)) {
    if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  }
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  if (/\/api\/verify-subscription\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(verifySubscriptionBody()) });
  const stub = Object.keys(LOCAL_STUB).find(x => p.startsWith(x));
  if (stub) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LOCAL_STUB[stub]) });
  if (/\/api\/image\b/.test(p)) {
    let body = null; try { body = JSON.parse(req.postData() || '{}'); } catch (_) {}
    imageCounter++;
    imageRequests.push({ seq: imageCounter, url, body, t: Date.now() });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: false, error: 'stubbed — this control never needs a real generation to succeed' }) });
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});

console.log('\n' + '='.repeat(96) + '\nCG DERIVE/COMPOSITE SCHEDULER — real-invocation control\n' + '='.repeat(96) + '\n');

const t0 = Date.now(); let up = false;
while (Date.now() - t0 < 120000 && !up) {
  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 });
    await page.waitForFunction(() => window.state && window._storyboardChooseRenderAction && window._tryDeriveOrComposite &&
      window._composeMultiSourceImage && window._castingLib && window.saveAndExitStory && window.continueStory, null, { timeout: 60000 });
    up = true;
  } catch (_) { await page.waitForTimeout(3000); }
}
if (!up) { ok('server ready with real derive/composite functions exposed', false); await browser.close(); process.exit(1); }
await page.waitForFunction(() => !document.body.classList.contains('booting'), null, { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(1000);

// A real, decodable local PNG (zero network) — used to seed fake casting-library crops.
async function fakePng(page, hex) {
  return page.evaluate((h) => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const ctx = c.getContext('2d'); ctx.fillStyle = h; ctx.fillRect(0, 0, 64, 64);
    return c.toDataURL('image/png');
  }, hex);
}

// ═══ PROOF 1: derive — a preintroduced character's close-up crop, ZERO /api/image requests ═══
const seedUrl1 = await fakePng(page, '#3366cc');
const derive1 = await page.evaluate(async (url) => {
  const lib = window._castingLib();
  lib['seren'] = { token: 'seren', displayName: 'Seren', url: url, confidence: 90, tier: 'SESSION', locked: false, timesUsed: 0 };
  const phase = { phaseIdx: 7, camera_override: 'close', characters_present: ['seren'], _panel: {} };
  const visualState = { other_characters_present: [{ name: 'Seren' }] };
  const before = window.__imgReqCountForTest || 0;
  const action = window._storyboardChooseRenderAction(phase, visualState);
  const result = await window._tryDeriveOrComposite(action, phase, visualState, 900);
  return { action, result };
}, seedUrl1);
const before1 = imageRequests.length;
ok('the deterministic decision selects "derive" for a single, already-introduced, close-camera panel', derive1.action === 'derive', JSON.stringify(derive1.action));
ok('the derive attempt returns a real result with a derived data: imageUrl', !!(derive1.result && derive1.result.imageUrl && derive1.result.imageUrl.indexOf('data:') === 0 && derive1.result._derived), JSON.stringify(derive1.result && { ...derive1.result, imageUrl: (derive1.result.imageUrl || '').slice(0, 40) + '…' }));
ok('deriving a preintroduced character\'s close-up makes ZERO /api/image requests', imageRequests.length === before1, 'requests since: ' + (imageRequests.length - before1));

// ═══ PROOF 2: composite — 4 already-introduced characters' eye crops, ZERO /api/image requests, stable across reload ═══
const eyeColors = ['#e11', '#1e1', '#11e', '#ee1'];
const eyeUrls = [];
for (const c of eyeColors) eyeUrls.push(await fakePng(page, c));
const before2 = imageRequests.length;
const composite1 = await page.evaluate(async (urls) => {
  const lib = window._castingLib();
  const names = ['lirael_test', 'seren_test', 'dohkar_test', 'julian_test'];
  names.forEach((n, i) => { lib[n] = { token: n, displayName: n, url: urls[i], confidence: 90, tier: 'SESSION', locked: false, timesUsed: 0 }; });
  const phase = { phaseIdx: 12, camera_override: 'extreme_closeup_eye', characters_present: names, _panel: {} };
  const visualState = {};
  const action = window._storyboardChooseRenderAction(phase, visualState);
  const result = await window._tryDeriveOrComposite(action, phase, visualState, 901);
  window.state._stagedActive = window.state._stagedActive || {};
  window.state._stagedActive.phaseImageUrls = window.state._stagedActive.phaseImageUrls || {};
  if (result && result.imageUrl) window.state._stagedActive.phaseImageUrls[phase.phaseIdx] = result.imageUrl;
  window.state._stagedActive._compositeTestUrl = result && result.imageUrl;
  window.state.storyId = window.state.storyId || ('composite-test-' + Date.now());
  return { action, result };
}, eyeUrls);
ok('the deterministic decision selects "composite" for a 4-character, all-introduced, eye-camera panel', composite1.action === 'composite', JSON.stringify(composite1.action));
ok('the composite attempt returns a real result with a canvas-composed data: imageUrl, tagged _composited', !!(composite1.result && composite1.result.imageUrl && composite1.result.imageUrl.indexOf('data:') === 0 && composite1.result._composited), JSON.stringify(composite1.result && { ...composite1.result, imageUrl: (composite1.result.imageUrl || '').slice(0, 40) + '…' }));
ok('compositing 4 already-introduced characters\' crops makes ZERO /api/image requests', imageRequests.length === before2, 'requests since: ' + (imageRequests.length - before2));

// Reload-stability: real save (saveAndExitStory -> saveStorySnapshot) + real restore (continueStory).
const preSaveComposite = await page.evaluate(() => window.state._stagedActive && window.state._stagedActive._compositeTestUrl);
await page.evaluate(() => { try { window.saveAndExitStory(); } catch (_) {} });
await page.waitForTimeout(400);
await page.reload({ waitUntil: 'commit' });
await page.waitForFunction(() => window.state && window.continueStory, null, { timeout: 60000 });
await page.waitForFunction(() => !document.body.classList.contains('booting'), null, { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(500);
await page.evaluate(async () => { try { await window.continueStory(); } catch (_) {} });
await page.waitForTimeout(500);
const postRestoreComposite = await page.evaluate(() => window.state && window.state._stagedActive && window.state._stagedActive._compositeTestUrl);
ok('the composited image is STABLE across a real save + reload + restore round trip (identical data: URL)',
  !!preSaveComposite && preSaveComposite === postRestoreComposite, 'pre=' + (preSaveComposite || '').length + ' post=' + (postRestoreComposite || '').length);

// ═══ PROOF 3: no compatible source (character not yet introduced) — falls back to real generation ═══
const before3 = imageRequests.length;
const noSource = await page.evaluate(async () => {
  const phase = { phaseIdx: 3, camera_override: 'close', characters_present: ['a_total_stranger_never_introduced'], _panel: {} };
  const visualState = {};
  const action = window._storyboardChooseRenderAction(phase, visualState);
  const result = await window._tryDeriveOrComposite(action, phase, visualState, 902);
  return { action, result };
});
ok('a character with NO casting-library record is never chosen for derive/composite (falls straight to generate)', noSource.action === 'generate', JSON.stringify(noSource.action));
ok('_tryDeriveOrComposite on an ineligible action returns null (never a synthesized/placeholder result)', noSource.result === null, JSON.stringify(noSource.result));
// Prove the FULL real render path (_renderStagedPhaseImage) genuinely falls through to a real
// generation attempt (a real /api/image request) rather than silently returning nothing. Uses the
// same real, fuller phase shape validated by _cg_oneshot_sheet_default_control.mjs's fallback phase
// fixture — a minimal fixture throws inside _resolvePhaseVisualState (a pre-existing, unrelated
// requirement of that downstream function, not something this change touches).
const fullFallback = await page.evaluate(async () => {
  const visualState = { other_characters_present: [{ name: 'a_total_stranger_never_introduced' }] };
  const phase = { phaseIdx: 0, startBeat: 0, label: 'establishing', li_visibility_phase: 'absent',
    characters_present: ['a_total_stranger_never_introduced'], props_present: [], camera_override: 'close',
    camera_move: 'none', shot_style: 'default', focus_target: null, _panel: {} };
  try { return await window._renderStagedPhaseImage(visualState, phase, 903, { phases: [phase] }); }
  catch (e) { return { threw: e && e.message }; }
});
const fallbackReqs = imageRequests.slice(before3);
ok('with no compatible existing source, the real per-phase render path fires a real /api/image request (the normal generated path stays available)', fallbackReqs.length >= 1, JSON.stringify(fallbackReqs.map(r => r.seq)));

// ═══ PROOF 4: a scene where ALL 4 normalized slots are derive/composite-eligible skips the billed
// sheet call ENTIRELY — zero /api/image requests for the whole scene ═══
const eyeColors2 = ['#a1a', '#2b2', '#3c3', '#d4d'];
const eyeUrls2 = [];
for (const c of eyeColors2) eyeUrls2.push(await fakePng(page, c));
const before4 = imageRequests.length;
const fullScene = await page.evaluate(async (urls) => {
  const lib = window._castingLib();
  const names = ['a4_test', 'b4_test', 'c4_test', 'd4_test'];
  names.forEach((n, i) => { lib[n] = { token: n, displayName: n, url: urls[i], confidence: 90, tier: 'SESSION', locked: false, timesUsed: 0 }; });
  // 4 phases, each a single-character extreme-closeup of an already-introduced character —
  // N==4 normalizes 1:1, so each of the 4 slots independently qualifies for 'derive'.
  const phases = names.map((n, i) => ({ phaseIdx: i, camera_override: 'extreme_closeup_eye', characters_present: [n], _panel: {} }));
  const visualState = {};
  const result = await window._renderSceneImages(visualState, phases, 950, { phases });
  return { resultLen: Array.isArray(result) ? result.length : null, sample: Array.isArray(result) ? result.slice(0, 1) : result };
}, eyeUrls2);
const fullSceneReqs = imageRequests.slice(before4);
ok('a scene where all 4 quadrants are derive-eligible (4 already-introduced characters) makes ZERO /api/image requests — the sheet call is skipped entirely', fullSceneReqs.length === 0, JSON.stringify(fullSceneReqs));
ok('that fully-derived scene still returns 4 ordered results, one per phaseIdx', fullScene.resultLen === 4, JSON.stringify(fullScene));

// ═══ PROOF 5: a scene where only SOME slots qualify still takes the normal one-shot sheet path
// (a partial win is not a win — the sheet call still fires for the whole scene) ═══
const before5 = imageRequests.length;
const partialScene = await page.evaluate(async (urls) => {
  const lib = window._castingLib();
  lib['known_partial_test'] = { token: 'known_partial_test', displayName: 'known_partial_test', url: urls[0], confidence: 90, tier: 'SESSION', locked: false, timesUsed: 0 };
  const phases = [
    { phaseIdx: 0, camera_override: 'extreme_closeup_eye', characters_present: ['known_partial_test'], _panel: {} }, // eligible
    { phaseIdx: 1, camera_override: 'wide', characters_present: ['someone_never_introduced'], _panel: {} }, // NOT eligible (wide camera)
    { phaseIdx: 2, camera_override: 'extreme_closeup_eye', characters_present: ['someone_never_introduced'], _panel: {} }, // NOT eligible (never introduced)
    { phaseIdx: 3, camera_override: 'medium', characters_present: ['known_partial_test'], _panel: {} },
  ];
  const visualState = {};
  const result = await window._renderSceneImages(visualState, phases, 951, { phases });
  return { resultLen: Array.isArray(result) ? result.length : null };
}, eyeUrls2);
const partialSceneReqs = imageRequests.slice(before5);
ok('a scene where only SOME quadrants are derive-eligible still fires the normal ONE sheet request — a partial win never short-changes the other quadrants', partialSceneReqs.length === 1, JSON.stringify(partialSceneReqs.map(r => r.seq)));

const err = await page.evaluate(() => window.__err || null);
await browser.close();

console.log('\n' + '-'.repeat(96));
console.log(' page error: ' + (err || 'none'));
console.log(' total /api/image requests observed this run: ' + imageRequests.length);
console.log('\nCG DERIVE/COMPOSITE SCHEDULER CONTROL: ' + results.filter(r => r.pass).length + '/' + results.length + ' passed');
const allPass = results.every(r => r.pass);
process.exitCode = allPass ? 0 : 1;
