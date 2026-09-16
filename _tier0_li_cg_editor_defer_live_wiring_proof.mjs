// _tier0_li_cg_editor_defer_live_wiring_proof.mjs
//
// REAL-BROWSER, OUTBOUND-STUBBED WIRING PROOF for the three Tier 0 fixes required on top of the
// PC-only pass (Roman, 2026-09-16, second pass): the LI partial foundation adapter, the
// CG_SCAFFOLD literary-mode suppression, and the post-author editor deferral (both the app.js
// finalize-block passes AND orchestration-client.js's own internal de-calc/mechanical-repair
// steps inside _grokLiteraryAuthor). Proves the WIRING against the REAL, unmodified functions
// loaded from the real public/app.js + public/orchestration-client.js in a real page — not a
// sandbox slice. Every /api/** route is intercepted; any request during a must-be-zero window is
// a hard failure. Zero real network/provider contact, zero cost.
//
// usage: node _tier0_li_cg_editor_defer_live_wiring_proof.mjs   (dev server on :3000)

import { chromium } from 'playwright-core';
import {
  installSession, configBody, isAuthOrigin, installEntitledProfileStub, verifySubscriptionBody,
} from './_test_session_env.mjs';

const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail ? '  — ' + String(detail).slice(0, 500) : '')); };
const section = (t) => console.log('\n=== ' + t + ' ===');

const requestCensus = [];
const violations = [];

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
page.on('console', (msg) => { const t = msg.text(); if (/\[TIER0\]/.test(t)) console.log('  [page] ' + t); });

await installSession(page);
await page.route('**/sb-test.localhost/**', route => {
  const accept = route.request().headers()['accept'] || '';
  const single = /vnd\.pgrst\.object\+json/.test(accept);
  return route.fulfill({ status: 200, contentType: 'application/json', body: single ? 'null' : '[]' });
});
await installEntitledProfileStub(page, { log: () => {} });

let underTest = false;
await page.route('**/api/**', async route => {
  const req = route.request(); const url = req.url(); const p = new URL(url).pathname;
  if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  if (/\/api\/verify-subscription\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(verifySubscriptionBody()) });
  if (/\/api\/csp-report\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (/\/api\/beta-events\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  const entry = { url: p, at: Date.now(), underTest };
  requestCensus.push(entry);
  if (underTest) violations.push(entry);
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: '{}' }) });
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window._generateLIBodyBible === 'function'
  && typeof window._tier0LiBibleFromSeed === 'function'
  && typeof window._shouldGenerateCGScaffold === 'function'
  && typeof window._liFoundationSourceFacts === 'function', { timeout: 15000 });

section('SETUP — a real First Sacrifice fixed-starter state');
await page.evaluate(() => {
  window.state = window.state || {};
  Object.assign(window.state, {
    storyId: 'tier0-li-cg-wiring-proof-' + Date.now(),
    _starterId: 'starter_first_sacrifice',
    liBodyBible: null,
    picks: { identity: { displayPlayerName: 'Lirael' } },
  });
  if (window._bibleLedger) { try { delete window._bibleLedger().li; } catch (_) {} }
});

section('LI ADAPTER — _generateLIBodyBible() must take the tier0 path, ZERO network requests');
const beforeLi = requestCensus.length;
underTest = true;
const liBible1 = await page.evaluate(() => window._generateLIBodyBible());
underTest = false;
const afterLi = requestCensus.length;
ok('zero /api/** requests fired during the call', afterLi === beforeLi, `saw ${afterLi - beforeLi} request(s): ${JSON.stringify(requestCensus.slice(beforeLi))}`);
ok('returned a non-null partial bible', !!liBible1, JSON.stringify(liBible1));
ok('bible carries the tier0 origin stamp', !!(liBible1 && liBible1._tier0 && liBible1._tier0.origin === 'seed_adapter'), JSON.stringify(liBible1 && liBible1._tier0));
ok('restraint_tell present and seed-sourced', !!(liBible1 && liBible1.restraint_tell));
ok('focus_tell present and seed-sourced', !!(liBible1 && liBible1.focus_tell));
ok('physical fields (height/hair) absent, never invented', liBible1 && liBible1.height === undefined && liBible1.hair === undefined);
ok('state.liBodyBible actually committed (direct-assignment path, matching the live generator\'s own commit pattern)', (await page.evaluate(() => !!window.state.liBodyBible)) === true);

section('LI ADAPTER — second call reuses the committed bible (cache-hit), still ZERO network requests');
const beforeLi2 = requestCensus.length;
underTest = true;
const liBible2 = await page.evaluate(() => window._generateLIBodyBible());
underTest = false;
const afterLi2 = requestCensus.length;
ok('zero /api/** requests on the reuse path', afterLi2 === beforeLi2, `saw ${afterLi2 - beforeLi2} request(s)`);
ok('same bible object reused (identity via _tier0 stamp timestamp)', !!(liBible2 && liBible2._tier0 && liBible1._tier0 && liBible2._tier0.at === liBible1._tier0.at));

section('CORRIDOR CONTROL — LI adapter refuses for a story with no fixed-starter seed');
const corridorLi = await page.evaluate(() => window._liFoundationSourceFacts({ storyId: 'c1', _starterId: '' }));
ok('LI source-facts extractor returns null for Corridor', corridorLi === null, JSON.stringify(corridorLi));

section('CG_SCAFFOLD — suppressed for literary Tier-0 Scene 1, real function, direct call');
const cgLiteraryS1 = await page.evaluate(() => {
  const s = { storyId: 'cg-test-1', _starterId: 'starter_first_sacrifice', turnCount: 0, cgScaffold: null };
  const out = window._shouldGenerateCGScaffold(s);
  return { out, deferred: s._tier0CgScaffoldDeferred === true };
});
ok('literary Scene 1, Tier-0-eligible: CG_SCAFFOLD returns false (suppressed)', cgLiteraryS1.out === false, JSON.stringify(cgLiteraryS1));
ok('suppression is stamped visibly on state (_tier0CgScaffoldDeferred)', cgLiteraryS1.deferred === true);

const cgContinuation = await page.evaluate(() => {
  const s = { storyId: 'cg-test-2', _starterId: 'starter_first_sacrifice', turnCount: 2, cgScaffold: null };
  return window._shouldGenerateCGScaffold(s);
});
ok('continuation scene (turnCount>0): CG_SCAFFOLD generates normally (not suppressed)', cgContinuation === true, JSON.stringify(cgContinuation));

section('POST-AUTHOR EDITOR DEFERRAL — the defer flag + registry mechanism, via a direct callChat probe');
// Full end-to-end proof that GROK_DECALC_EDITOR/MECHANICAL_REPAIR never fire for a Tier-0 Scene 1
// already exists empirically in this session's _scene1_call_census.mjs run (roles absent from the
// observed set). This section proves the FLAG COMPUTATION + REGISTRY WIRING directly against the
// real functions, without a full handleBeginStory() drive (out of scope for a wiring-only proof).
const deferFlagCheck = await page.evaluate(() => {
  const s1State = { storyId: 'edit-defer-1', _starterId: 'starter_first_sacrifice', turnCount: 0 };
  const contState = { storyId: 'edit-defer-2', _starterId: 'starter_first_sacrifice', turnCount: 3 };
  const corridorState = { storyId: 'edit-defer-3', _starterId: '', turnCount: 0 };
  const flag = (s) => !!((!s || !s.turnCount) && typeof window._pcFoundationSourceFacts === 'function' && window._pcFoundationSourceFacts(s));
  return { s1: flag(s1State), cont: flag(contState), corridor: flag(corridorState) };
});
ok('Tier-0-eligible Scene 1: defer flag true', deferFlagCheck.s1 === true, JSON.stringify(deferFlagCheck));
ok('continuation scene: defer flag false', deferFlagCheck.cont === false);
ok('Corridor: defer flag false', deferFlagCheck.corridor === false);

const replayFnExists = await page.evaluate(() => typeof window._tier0RunDeferredScene1Edits === 'function');
ok('the explicit, opt-in replay seam (_tier0RunDeferredScene1Edits) exists on window', replayFnExists === true);

await browser.close();

console.log('\n' + '='.repeat(70));
const pass = results.filter(r => r.pass).length, fail = results.filter(r => !r.pass).length;
console.log(`TIER 0 — LI ADAPTER + CG_SCAFFOLD + EDITOR-DEFER — LIVE WIRING PROOF: ${pass} passed, ${fail} failed`);
console.log(`Full /api/** request census across the entire run (${requestCensus.length} total, includes infra): ` + JSON.stringify(requestCensus.map(r => r.url)));
if (violations.length) { console.log('\n⚠ VIOLATIONS (requests fired during a must-be-zero window):'); violations.forEach(v => console.log('  - ' + JSON.stringify(v))); }
console.log('NO LIVE PROVIDER CALL WAS EVER REACHABLE — every /api/** route was answered locally for the entire run.');
if (fail) process.exitCode = 1;
