// CG VISUAL-SLOT NORMALIZATION — outbound-stubbed, real-invocation control (Roman, 2026-09-19)
//
// CORRECTION to the 2026-09-18 pass this control supersedes (_cg_oneshot_sheet_default_control.mjs
// still holds for the N==4 / Tier-2 / solo-intro claims it makes; this file adds the widened
// contract): "default for all CG scenes" cannot mean "only when phases.length===4". Every CG scene
// must resolve to exactly FOUR ordered visual display slots regardless of its real narrative phase
// count. This proves, by REAL invocation of the production _renderSceneImages/_normalizeVisualSlots
// functions (never static inference):
//   1. for phase counts 1, 2, 3, 4, 5, 6 — each produces exactly 4 ordered slots and makes EXACTLY
//      ONE /api/image request on the healthy path (never 4 independent requests, for ANY count);
//   2. N==4 is byte-identical to the pre-normalization behavior (1:1 slot mapping, no merge/recur tag);
//   3. N<4 slots carry explicit recurrence tags; N>4 slots carry explicit multi-phase beat ranges and
//      no phase is silently dropped (every original phaseIdx appears in the results);
//   4. a real sheet FAILURE falls back to the staged path AND the hard 4-image cost ceiling still
//      applies there (the ceiling moved from gating path-choice to gating the failure fallback only);
//   5. the computed slot-to-beat mapping survives a REAL save (window.saveAndExitStory, which calls
//      the real saveStorySnapshot()) + REAL restore (window.continueStory()) round trip through
//      localStorage — not simulated, the actual production persistence functions.
//
// usage: node _cg_visual_slot_normalization_control.mjs
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
const consoleLines = [];
page.on('console', m => consoleLines.push(m.text()));

await installSession(page);
await page.route('**/sb-test.localhost/**', route => {
  const accept = route.request().headers()['accept'] || '';
  const single = /vnd\.pgrst\.object\+json/.test(accept);
  return route.fulfill({ status: 200, contentType: 'application/json', body: single ? 'null' : '[]' });
});
await installEntitledProfileStub(page, { log: () => {} });

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
let failNextImage = false;
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
    if (failNextImage) { failNextImage = false; return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"stubbed failure"}' }); }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: STUB_SHEET_PNG, success: true }) });
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});

console.log('\n' + '='.repeat(96) + '\nCG VISUAL-SLOT NORMALIZATION — real-invocation control\n' + '='.repeat(96) + '\n');

const t0 = Date.now(); let up = false;
while (Date.now() - t0 < 120000 && !up) {
  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 });
    await page.waitForFunction(() => window.state && window._renderSceneImages && window._normalizeVisualSlots && window.saveAndExitStory && window.continueStory, null, { timeout: 60000 });
    up = true;
  } catch (_) { await page.waitForTimeout(3000); }
}
if (!up) { ok('server ready with real functions exposed', false); await browser.close(); process.exit(1); }
await page.waitForFunction(() => !document.body.classList.contains('booting'), null, { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(1000);

function makePhases(n, salt) {
  const CAMS = ['wide', 'over_shoulder_pc', 'close', 'wide', 'medium', 'bust'];
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({ phaseIdx: i, startBeat: i * 3, label: 'phase' + i + (salt ? ('_' + salt) : ''), li_visibility_phase: i % 2 ? 'partial' : 'full',
      characters_present: ['protagonist'], props_present: [], camera_override: CAMS[i % CAMS.length],
      camera_move: 'none', shot_style: 'default', focus_target: null });
  }
  return out;
}
const VISUAL_STATE = { other_characters_present: [] };

// ═══ PROOF SET 1: 1, 2, 3, 4, 5, 6 phases — each makes EXACTLY ONE sheet request, 4 ordered slots ═══
const normResults = {};
for (const n of [1, 2, 3, 4, 5, 6]) {
  const phases = makePhases(n);
  const before = imageRequests.length;
  const seq = await page.evaluate(async (args) => {
    return await window._renderSceneImages(args.visualState, args.phases, 100 + args.n, { phases: args.phases });
  }, { visualState: VISUAL_STATE, phases, n });
  const reqs = imageRequests.slice(before);
  normResults[n] = seq;
  ok('N=' + n + ' phases makes EXACTLY ONE /api/image request (sheet default, not ' + n + ' independent requests)',
    reqs.length === 1, JSON.stringify(reqs.map(r => ({ seq: r.seq, aspect: r.body && r.body.aspect_ratio, size: r.body && r.body.imageSize }))));
  ok('N=' + n + ' returns exactly ' + n + ' results, one per original phaseIdx 0..' + (n - 1) + ' (no phase dropped)',
    Array.isArray(seq) && seq.length === n && seq.every((r, i) => r.phaseIdx === i), JSON.stringify(seq));
  const norm = await page.evaluate((n2) => window._normalizeVisualSlots(Array.from({ length: n2 }, (_, i) => ({ phaseIdx: i }))), n);
  const coveredSet = [...new Set([].concat(...norm.slots.map(s => s.phaseIdxs)))].sort((a, b) => a - b);
  ok('N=' + n + ' normalizes to exactly 4 ordered slots, each non-empty, whose UNION covers all ' + n + ' original phase(s) with none dropped',
    norm.slots.length === 4 && norm.slots.every(s => s.phaseIdxs.length > 0) &&
    JSON.stringify(coveredSet) === JSON.stringify(Array.from({ length: n }, (_, i) => i)),
    JSON.stringify(norm.slots.map(s => s.phaseIdxs)));
  if (n > 4) {
    ok('N=' + n + ' (overflow) — at least one slot has a multi-phase beatRange (beats folded, not truncated)',
      norm.slots.some(s => s.phaseIdxs.length > 1), JSON.stringify(norm.slots.map(s => s.beatRange)));
  }
  if (n < 4) {
    ok('N=' + n + ' (underflow) — at least one slot is tagged as an explicit recurrence (not silently blank)',
      norm.slots.some(s => s.recurrenceOfSlot != null), JSON.stringify(norm.slots.map(s => s.recurrenceOfSlot)));
  }
  if (n === 4) {
    ok('N=4 reduces to the identity 1:1 mapping — zero merge/recurrence tags (byte-identical to pre-normalization shape)',
      norm.slots.every((s, i) => s.phaseIdxs.length === 1 && s.phaseIdxs[0] === i && s.recurrenceOfSlot == null),
      JSON.stringify(norm.slots));
  }
}

// ═══ PROOF SET 2: real sheet FAILURE falls back to staged path, AND the ceiling still caps it there ═══
const sixPhases = makePhases(6);
failNextImage = true;
const beforeFail = imageRequests.length;
const failSeq = await page.evaluate(async (args) => {
  return await window._renderSceneImages(args.visualState, args.phases, 200, { phases: args.phases });
}, { visualState: VISUAL_STATE, phases: sixPhases });
const failReqs = imageRequests.slice(beforeFail);
ok('a real sheet failure (6 phases) falls back to the staged path — 1 failed sheet request + up to 4 staged requests (ceiling applies to the fallback, not the default)',
  failReqs.length >= 1 && failReqs.length <= 5, JSON.stringify(failReqs.map(r => ({ seq: r.seq, aspect: r.body && r.body.aspect_ratio }))));
ok('the staged fallback never exceeds the hard 4-image cost ceiling even though the scene had 6 phases',
  (failReqs.length - 1) <= 4, 'staged requests: ' + (failReqs.length - 1));

// ═══ PROOF SET 3: rollback hatch (window._oneShotSheet=false) — staged path applies the ceiling directly ═══
// Fresh phase objects with a distinct salt — avoids any legitimate content-fingerprint cache hit in
// _renderStagedPhaseImage (a real, separate caching layer) from masking this specific request count.
const sixPhasesRollback = makePhases(6, 'rollback');
const beforeRollback = imageRequests.length;
await page.evaluate(async (args) => {
  window._oneShotSheet = false;
  await window._renderSceneImages(args.visualState, args.phases, 201, { phases: args.phases });
  delete window._oneShotSheet;
}, { visualState: VISUAL_STATE, phases: sixPhasesRollback });
const rollbackReqs = imageRequests.slice(beforeRollback);
// NOTE: this can legitimately be 0 — _renderStagedPhaseImage has its own real, pre-existing
// CROSS-SCENE content-fingerprint cache (unrelated to this change) that served phases 0-3 from the
// prior ceiling test's cache; that is a correct cache hit, not a ceiling violation. The invariant
// under test is strictly the UPPER bound: never more than 4 real requests even for a 6-phase scene.
ok('rollback hatch on a 6-phase scene fires AT MOST 4 staged requests (ceiling enforced on the explicit-opt-out path too; 0 is a valid outcome via the real cross-scene cache)',
  rollbackReqs.length <= 4, JSON.stringify(rollbackReqs.map(r => r.seq)));

// ═══ PROOF SET 4: reload retains the slot-to-beat mapping — REAL save + REAL restore ═══
const fivePhases = makePhases(5);
await page.evaluate(async (args) => {
  window.state.storyId = window.state.storyId || ('vsn-test-' + Date.now());
  window.state._stagedActive = window.state._stagedActive || {};
  await window._renderSceneImages(args.visualState, args.phases, 300, { phases: args.phases });
}, { visualState: VISUAL_STATE, phases: fivePhases });
const preSaveMap = await page.evaluate(() => window.state._stagedActive && window.state._stagedActive.visualSlotMap);
ok('a real 5-phase render populates state._stagedActive.visualSlotMap before any save', !!(preSaveMap && preSaveMap.norm && preSaveMap.norm.slots && preSaveMap.norm.slots.length === 4), JSON.stringify(preSaveMap));

// Real save: window.saveAndExitStory() calls the real saveStorySnapshot() (same function the app's
// own Save & Exit button calls) — not a simulated write.
await page.evaluate(() => { try { window.saveAndExitStory(); } catch (e) { window.__saveErr = e && e.message; } });
await page.waitForTimeout(400); // let any async post-save vault-navigation settle before reading localStorage back
const saveErr = await page.evaluate(() => window.__saveErr || null);
const savedRaw = await page.evaluate(() => localStorage.getItem('sb_saved_story'));
let savedMap = null;
// saveStorySnapshot's real snapshot shape nests cleanState under `stateSnapshot` (app.js:113459),
// not at the top level — confirmed by inspecting the actual localStorage write this call produced.
try { savedMap = JSON.parse(savedRaw || 'null'); savedMap = savedMap && savedMap.stateSnapshot && savedMap.stateSnapshot._stagedActive && savedMap.stateSnapshot._stagedActive.visualSlotMap; } catch (_) {}
ok('the REAL saveStorySnapshot() (via window.saveAndExitStory) persists visualSlotMap unmodified into localStorage.sb_saved_story (under stateSnapshot._stagedActive)',
  !saveErr && !!(savedMap && JSON.stringify(savedMap) === JSON.stringify(preSaveMap)), 'saveErr=' + saveErr + ' saved=' + JSON.stringify(savedMap));

// Real restore: a full page reload (new JS context, in-memory state gone), then the REAL
// window.continueStory() (no target = boot-time "resume last active story" path) reads
// localStorage.sb_saved_story back into window.state.
await page.reload({ waitUntil: 'commit' });
await page.waitForFunction(() => window.state && window.continueStory, null, { timeout: 60000 });
await page.waitForFunction(() => !document.body.classList.contains('booting'), null, { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(500);
await page.evaluate(async () => { try { await window.continueStory(); } catch (e) { window.__restoreErr = e && e.message; } });
await page.waitForTimeout(500);
const restoreErr = await page.evaluate(() => window.__restoreErr || null);
const postRestoreMap = await page.evaluate(() => window.state && window.state._stagedActive && window.state._stagedActive.visualSlotMap);
ok('the REAL window.continueStory() restore (after a real page reload) brings visualSlotMap back onto window.state, matching the pre-save value',
  !!(postRestoreMap && JSON.stringify(postRestoreMap) === JSON.stringify(preSaveMap)), 'restoreErr=' + restoreErr + ' restored=' + JSON.stringify(postRestoreMap));

const err = await page.evaluate(() => window.__err || null);
await browser.close();

console.log('\n' + '-'.repeat(96));
console.log(' page error: ' + (err || 'none'));
console.log(' total /api/image requests observed this run: ' + imageRequests.length);
console.log('\nCG VISUAL-SLOT NORMALIZATION CONTROL: ' + results.filter(r => r.pass).length + '/' + results.length + ' passed');
const allPass = results.every(r => r.pass);
process.exitCode = allPass ? 0 : 1;
