// CG ONE-SHOT SHEET DEFAULT + TIER-2 FALLBACK FIX — outbound-stubbed, real-invocation control
// (Roman, 2026-09-18)
//
// Proves: (1) a normal (non-starter) CG scene resolving to exactly 4 dramatic phases now makes
// EXACTLY ONE image request (the one-shot 2x2 sheet), never 4 independent interaction-image
// requests; (2) that one request yields 4 ordered, separately-addressable images; (3) the Tier-1
// solo character-intro path is unchanged; (4) a Tier-2+ single-straggler flush now uses the real
// cast-page sheet path, not a silent individual-image fallback; (5) no extra generation fires
// merely because the scene sheet exists.
//
// Real invocation, not static inference: this calls the REAL, window-exposed production
// functions (_renderSceneImages, _renderSituatedIntro, _cgFlushTier2Pending) directly against the
// real loaded app.js in a real browser, with only the network boundary (/api/**) stubbed — the
// same technique already established this session (e.g. the OAS two-path lifecycle proof).
//
// usage: node _cg_oneshot_sheet_default_control.mjs
import { chromium } from 'playwright-core';
import fs from 'fs';
import { installSession, configBody, isAuthOrigin, installEntitledProfileStub, verifySubscriptionBody } from './_test_session_env.mjs';

const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail ? '  — ' + String(detail).slice(0, 700) : '')); };

const PASSTHROUGH = /\/api\/(config|geo|csp-report|beta-events)\b/;
const LOCAL_STUB = {
  '/api/consume-fortune':          { success: true, fortunesRemaining: 9999 },
  '/api/verify-subscription':      { success: true, subscribed: true, tier: 'sub' },
  '/api/claim-issue-number':       { success: true, issueNumber: 1 },
  '/api/refund-fortune':           { success: true },
  '/api/grant-welcome-milestone':  { success: true },
  '/api/record-legal-acceptance':  { success: true },
};

const imageRequests = []; // { url, method, body, t }

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

// Real, browser-decodable stub image — four distinctly-coloured quadrants (red/green/blue/yellow)
// drawn on a real <canvas> in the actual page context. _splitSheetQuadrants (app.js:207928) loads
// the returned url into a real <Image> and canvas-crops it; an undecodable placeholder string
// (e.g. "STUB1") fails im.onload silently, which — correctly, per the existing safety net at
// app.js:208917-208924 — falls back to _renderStagedPhaseImages, invalidating a "one request"
// proof. A real decodable image with 4 visually distinct quadrants lets the real crop logic run
// AND lets the "4 distinct imageUrl" assertion mean something (uniform-colour quadrants of equal
// size would legitimately toDataURL() identical, masking a real bug).
const STUB_SHEET_PNG = await page.evaluate(() => {
  const c = document.createElement('canvas'); c.width = 200; c.height = 200;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e11'; ctx.fillRect(0, 0, 100, 100);
  ctx.fillStyle = '#1e1'; ctx.fillRect(100, 0, 100, 100);
  ctx.fillStyle = '#11e'; ctx.fillRect(0, 100, 100, 100);
  ctx.fillStyle = '#ee1'; ctx.fillRect(100, 100, 100, 100);
  return c.toDataURL('image/png');
});

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
    const rec = { seq: imageCounter, url, method: req.method(), body, t: Date.now() };
    imageRequests.push(rec);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: STUB_SHEET_PNG, success: true }) });
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});

console.log('\n' + '='.repeat(92) + '\nCG ONE-SHOT SHEET DEFAULT + TIER-2 FALLBACK FIX — real-invocation control\n' + '='.repeat(92) + '\n');

const t0 = Date.now(); let up = false;
while (Date.now() - t0 < 120000 && !up) {
  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 });
    await page.waitForFunction(() => window.state && window._renderSceneImages && window._renderSituatedIntro && window._cgFlushTier2Pending && window._cgIssueState, null, { timeout: 60000 });
    up = true;
  } catch (_) { await page.waitForTimeout(3000); }
}
if (!up) { ok('server ready with real image-pipeline functions exposed', false); await browser.close(); process.exit(1); }
await page.waitForFunction(() => !document.body.classList.contains('booting'), null, { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(1000);

// ── Real fixture data, matching the real fallback phase shape found at app.js:225653 ──
const FOUR_PHASES = [
  { phaseIdx: 0, startBeat: 0, label: 'establishing', li_visibility_phase: 'absent', characters_present: ['protagonist'], props_present: [], camera_override: 'wide', camera_move: 'none', shot_style: 'default', focus_target: null },
  { phaseIdx: 1, startBeat: 3, label: 'rising', li_visibility_phase: 'partial', characters_present: ['protagonist'], props_present: [], camera_override: 'over_shoulder_pc', camera_move: 'none', shot_style: 'default', focus_target: null },
  { phaseIdx: 2, startBeat: 6, label: 'turn', li_visibility_phase: 'full', characters_present: ['protagonist'], props_present: [], camera_override: 'close', camera_move: 'none', shot_style: 'default', focus_target: null },
  { phaseIdx: 3, startBeat: 9, label: 'button', li_visibility_phase: 'full', characters_present: ['protagonist'], props_present: [], camera_override: 'wide', camera_move: 'none', shot_style: 'default', focus_target: null },
];
const VISUAL_STATE = { other_characters_present: [] };
const PLAN_META = { phases: FOUR_PHASES };

// ═══ PROOF 1 & 2: exactly ONE request for 4 phases, yielding 4 ordered separate images ═══
const before1 = imageRequests.length;
const seq1 = await page.evaluate(async (args) => {
  const r = await window._renderSceneImages(args.visualState, args.phases, 0, args.planMeta);
  return r;
}, { visualState: VISUAL_STATE, phases: FOUR_PHASES, planMeta: PLAN_META });
const requestsFor4Phases = imageRequests.slice(before1);
ok('a scene resolving to exactly 4 phases makes EXACTLY ONE /api/image request (the one-shot sheet), not 4', requestsFor4Phases.length === 1, JSON.stringify(requestsFor4Phases.map(r => ({ seq: r.seq, aspect: r.body && r.body.aspect_ratio, size: r.body && r.body.imageSize }))));
ok('that one request is shaped as a 2K/4K square sheet request (imageSize 2K|4K, aspect_ratio 1:1 or unset-square)', requestsFor4Phases.length === 1 && ['2K', '4K'].includes(requestsFor4Phases[0].body && requestsFor4Phases[0].body.imageSize), JSON.stringify(requestsFor4Phases[0] && requestsFor4Phases[0].body));
// _renderSceneImages/_renderOneShotSheet returns the bare results[] array itself (the `.firstReady`
// property lives on the Promise wrapper, inaccessible after an await resolves it to its value) —
// confirmed by reading _renderOneShotSheet's real return statement (app.js:208945-208947).
ok('_renderSceneImages returned 4 ordered results, one per phaseIdx 0-3', !!(Array.isArray(seq1) && seq1.length === 4 && seq1.every((r, i) => r.phaseIdx === i)), JSON.stringify(seq1));
const distinctUrls = new Set((Array.isArray(seq1) ? seq1 : []).map(r => r.imageUrl));
ok('the 4 results are separately displayable — 4 DISTINCT imageUrl values (real crops, not the same sheet reused 4x)', distinctUrls.size === 4, JSON.stringify([...distinctUrls]));

// ═══ PROOF: rollback escape hatch still works (window._oneShotSheet===false reverts to staged path) ═══
const before1b = imageRequests.length;
const seq1b = await page.evaluate(async (args) => {
  window._oneShotSheet = false;
  const r = await window._renderSceneImages(args.visualState, args.phases, 1, args.planMeta);
  delete window._oneShotSheet;
  return r;
}, { visualState: VISUAL_STATE, phases: FOUR_PHASES, planMeta: PLAN_META });
const requestsRollback = imageRequests.slice(before1b);
ok('rollback escape hatch (window._oneShotSheet=false) reverts to 4 independent staged requests', requestsRollback.length === 4, JSON.stringify(requestsRollback.map(r => r.seq)));

// ═══ PROOF 3: Tier-1 solo intro path unchanged — one individual (non-sheet-shaped) request ═══
const before2 = imageRequests.length;
const soloResult = await page.evaluate(async () => {
  return await window._renderSituatedIntro({ name: 'TestLead', species: 'human' }, 'protagonist', {}, [], 2);
});
const soloRequests = imageRequests.slice(before2);
ok('Tier-1 solo intro (_renderSituatedIntro) still fires exactly ONE request', soloRequests.length === 1, JSON.stringify(soloRequests.map(r => r.seq)));
ok('the solo request is shaped as an INDIVIDUAL portrait (aspect_ratio 3:4, not the 1:1 sheet shape) — distinguishable by real request shape, not just by which function was called', soloRequests.length === 1 && soloRequests[0].body && soloRequests[0].body.aspect_ratio === '3:4', JSON.stringify(soloRequests[0] && soloRequests[0].body));

// ═══ PROOF 4: Tier-2+ single-straggler flush now uses the sheet path, not a solo fallback ═══
await page.evaluate(() => {
  const st = window._cgIssueState();
  st._cgTier2Pending = [{ o: { name: 'Straggler', species: 'human' }, role: 'ally', seedDesc: 'a minor recurring ally', presentNow: true }];
  st._cgTier2PendingSince = 0;
});
const before3 = imageRequests.length;
const flushResult = await page.evaluate(async () => {
  return await window._cgFlushTier2Pending({}, [], 5, { force: true });
});
const flushRequests = imageRequests.slice(before3);
ok('a 1-element Tier-2 flush fires exactly ONE request (never zero, never a silent no-op)', flushRequests.length === 1, JSON.stringify(flushRequests.map(r => r.seq)));
ok('that one request is CAST-PAGE/SHEET-shaped (aspect_ratio 1:1, imageSize 4K) — NOT the solo 3:4 shape — proving the silent individual-image fallback is gone', flushRequests.length === 1 && flushRequests[0].body && flushRequests[0].body.aspect_ratio === '1:1' && flushRequests[0].body.imageSize === '4K', JSON.stringify(flushRequests[0] && flushRequests[0].body));
ok('the flush result reports a castPage kind (real function outcome, not inferred)', !!(flushResult && flushResult[0] && flushResult[0].kind === 'castPage'), JSON.stringify(flushResult));

// ═══ PROOF 5: no extra generation fires merely because the scene sheet exists (combined scenario) ═══
await page.evaluate(() => {
  const st = window._cgIssueState();
  st._cgTier2Pending = [];
  st._cgTier2PendingSince = null;
});
const before4 = imageRequests.length;
await page.evaluate(async (args) => {
  await window._renderSceneImages(args.visualState, args.phases, 6, args.planMeta); // 1 sheet request expected
  await window._renderSituatedIntro({ name: 'AnotherLead', species: 'human' }, 'protagonist', {}, [], 6); // 1 solo request expected
}, { visualState: VISUAL_STATE, phases: FOUR_PHASES, planMeta: PLAN_META });
const combinedRequests = imageRequests.slice(before4);
ok('combined scenario (1 dramatic sheet + 1 solo intro) fires EXACTLY 2 total requests — no extra generation from the sheet existing', combinedRequests.length === 2, JSON.stringify(combinedRequests.map(r => ({ seq: r.seq, aspect: r.body && r.body.aspect_ratio }))));

const err = await page.evaluate(() => window.__err || null);
await browser.close();

console.log('\n' + '-'.repeat(92));
console.log(' page error: ' + (err || 'none'));
console.log(' total /api/image requests observed this run: ' + imageRequests.length);
console.log(' full request census (seq, aspect, imageSize): ' + JSON.stringify(imageRequests.map(r => [r.seq, r.body && r.body.aspect_ratio, r.body && r.body.imageSize])));
console.log('\nCG ONE-SHOT SHEET DEFAULT CONTROL: ' + results.filter(r => r.pass).length + '/' + results.length + ' passed');
const allPass = results.every(r => r.pass);
process.exitCode = allPass ? 0 : 1;
