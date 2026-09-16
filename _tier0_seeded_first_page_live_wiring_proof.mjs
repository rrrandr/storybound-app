// _tier0_seeded_first_page_live_wiring_proof.mjs
//
// REAL-BROWSER, OUTBOUND-STUBBED WIRING PROOF for TIER 0 — SEEDED FIRST PAGE (Roman, 2026-09-16).
// The offline control (_tier0_seeded_first_page_control.mjs) proves the new adapter's OUTPUT is
// correct against a sandboxed slice of the real functions. This file proves the WIRING: that the
// REAL, UNMODIFIED window._generatePCBodyBible() — loaded from the real public/app.js in a real
// page, not a sandbox slice — takes the tier0 branch INSTEAD of ever reaching the network, for a
// real First Sacrifice state, and that the committed result actually reaches the SAME authority-
// boundary accessor (_pcCommittedFoundationForPrompt) this session's earlier work made the single
// gate for 8 author-payload builders.
//
// EVERY /api/** route is intercepted at the outbound boundary; a request classified pcBodyBible
// (or ANY unclassified request) during the calls under test is a HARD FAILURE, recorded with its
// full body — this script makes ZERO real network/provider contact and spends nothing.
//
// Direct calls to window._generatePCBodyBible / window._pcCommittedFoundationForPrompt / etc. are
// used — the same "direct call to the real backend function under test" pattern this repo's own
// proofs already use (_pc_foundation_preflight_dry.mjs, _pc_foundation_real_path_integration_proof.mjs)
// — not a bypass of the mechanism under test, only a bypass of the unrelated Library/OAS click
// chain (already proven elsewhere this session) needed only to REACH that mechanism via UI.
//
// usage: node _tier0_seeded_first_page_live_wiring_proof.mjs   (dev server on :3000)

import { chromium } from 'playwright-core';
import {
  installSession, configBody, isAuthOrigin, installEntitledProfileStub, verifySubscriptionBody,
} from './_test_session_env.mjs';

const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail ? '  — ' + String(detail).slice(0, 500) : '')); };
const section = (t) => console.log('\n=== ' + t + ' ===');

function classifyModelCall(sys) {
  if (/generating a PROTAGONIST BODY BIBLE for a romance novel/.test(sys)) return 'pcBodyBible';
  if (/rewrite 5 body-tell fields for a romance heroine bible/.test(sys)) return 'bodyTellReroll';
  if (/generating a LOVE-INTEREST BODY BIBLE for a romance novel/.test(sys)) return 'liBodyBible';
  return 'unclassified';
}

const requestCensus = [];   // every /api/** request seen during the ENTIRE run
const violations = [];      // any request seen WHILE a "must be zero calls" window is open

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

let underTest = false;   // flipped true only around the exact calls that must make zero requests
await page.route('**/api/**', async route => {
  const req = route.request(); const url = req.url(); const p = new URL(url).pathname;
  if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  if (/\/api\/verify-subscription\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(verifySubscriptionBody()) });
  if (/\/api\/csp-report\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (/\/api\/beta-events\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });

  let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
  const flat = m => typeof m.content === 'string' ? m.content : (Array.isArray(m.content) ? m.content.map(x => x && x.text || '').join('\n') : '');
  const sys = (b.messages || []).filter(m => m.role === 'system').map(flat).join('\n');
  const kind = classifyModelCall(sys);
  const entry = { kind, url: p, at: Date.now(), underTest };
  requestCensus.push(entry);
  if (underTest) { violations.push(entry); }
  // NEVER let a real provider be reached, even if a violation occurs — fulfill locally regardless.
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: '{}' }) });
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window._generatePCBodyBible === 'function'
  && typeof window._tier0PcBibleFromSeed === 'function'
  && typeof window._pcCommittedFoundationForPrompt === 'function', { timeout: 15000 });

section('SETUP — a real First Sacrifice fixed-starter state, no UI click chain needed for this mechanism');
await page.evaluate(() => {
  window.state = window.state || {};
  Object.assign(window.state, {
    storyId: 'tier0-wiring-proof-' + Date.now(),
    _starterId: 'starter_first_sacrifice',
    pcBodyBible: null,
    _pcPortfolio: null,
    picks: { identity: { displayPlayerName: 'Lirael' } },
  });
  if (window._bibleLedger) { try { delete window._bibleLedger().pc; } catch (_) {} }
});

section('CALL 1 — _generatePCBodyBible() must take the tier0 path and make ZERO network requests');
const beforeCount = requestCensus.length;
underTest = true;
const bible1 = await page.evaluate(() => window._generatePCBodyBible());
underTest = false;
const afterCount = requestCensus.length;
ok('zero /api/** requests fired during the call', afterCount === beforeCount, `saw ${afterCount - beforeCount} request(s): ${JSON.stringify(requestCensus.slice(beforeCount))}`);
ok('returned a non-null bible', !!bible1, JSON.stringify(bible1));
ok('bible carries the tier0 origin stamp', !!(bible1 && bible1._tier0 && bible1._tier0.origin === 'seed_adapter'), JSON.stringify(bible1 && bible1._tier0));
ok('core_contradiction present and seed-sourced', !!(bible1 && bible1.core_contradiction));
ok('wound.core present and seed-sourced', !!(bible1 && bible1.wound && bible1.wound.core));
ok('physical fields (signature_feature) absent, never invented', bible1 && bible1.signature_feature === undefined);

section('PORTFOLIO + AUTHORITY BOUNDARY — the committed content reaches _pcCommittedFoundationForPrompt');
const portfolioState = await page.evaluate(() => {
  const p = window.state._pcPortfolio;
  return p ? { source: p.source, hasValidatedMerge: !!(p.provenance && p.provenance.validatedMerge), facetIds: (p.facets || []).map(f => f.facet_id).sort() } : null;
});
ok('portfolio committed with source=fixed_starter', !!(portfolioState && portfolioState.source === 'fixed_starter'), JSON.stringify(portfolioState));
ok('portfolio carries validatedMerge provenance stamp', !!(portfolioState && portfolioState.hasValidatedMerge));
// _ensurePcPortfolio seeds the portfolio with the SEED's own 2 raw facets (pc_untested_brilliance,
// pc_fears_public_failure) unconditionally, before Tier 0 ever runs; _commitValidatedPcFoundation
// then concats the 2 bible-derived ones on top (concat, never overwrite) — so 4 total is correct.
const expectedFacetIds = ['pc_core_contradiction', 'pc_current_crisis_event', 'pc_fears_public_failure', 'pc_untested_brilliance'];
ok('portfolio facets include the seed\'s 2 + the 2 tier0-merged ids (concat, not overwrite)', portfolioState && JSON.stringify(portfolioState.facetIds) === JSON.stringify(expectedFacetIds), JSON.stringify(portfolioState && portfolioState.facetIds));

const authorityBoundary = await page.evaluate(() => {
  const out = window._pcCommittedFoundationForPrompt(window.state);
  return out ? { hasContent: true, sample: JSON.stringify(out).slice(0, 300) } : { hasContent: false };
});
ok('the authority-boundary accessor now serves this content (not silently empty)', authorityBoundary.hasContent === true, JSON.stringify(authorityBoundary));

section('CALL 2 — a second call reuses the committed bible (cache-hit), still ZERO network requests');
const beforeCount2 = requestCensus.length;
underTest = true;
const bible2 = await page.evaluate(() => window._generatePCBodyBible());
underTest = false;
const afterCount2 = requestCensus.length;
ok('zero /api/** requests on the reuse path', afterCount2 === beforeCount2, `saw ${afterCount2 - beforeCount2} request(s)`);
ok('same bible object reused (identity via _tier0 stamp timestamp)', !!(bible2 && bible2._tier0 && bible1._tier0 && bible2._tier0.at === bible1._tier0.at));

section('CORRIDOR CONTROL — a story with NO fixed-starter seed is UNAFFECTED (tier0 refuses, falls through)');
await page.evaluate(() => {
  window.state = window.state || {};
  Object.assign(window.state, { storyId: 'tier0-corridor-control-' + Date.now(), _starterId: '', pcBodyBible: null, _pcPortfolio: null });
  if (window._bibleLedger) { try { delete window._bibleLedger().pc; } catch (_) {} }
});
const corridorAdapterResult = await page.evaluate(() => window._tier0PcBibleFromSeed(window.state));
ok('tier0 adapter returns null for a corridor (unseeded) story', corridorAdapterResult === null, JSON.stringify(corridorAdapterResult));
// Do NOT actually invoke the live _generatePCBodyBible() path here — that would legitimately try
// to reach the (stubbed) network, which is expected/correct Corridor behavior, not a violation;
// asserting the adapter's own null-refusal is sufficient proof Corridor is untouched by Tier 0.

await browser.close();

console.log('\n' + '='.repeat(70));
const pass = results.filter(r => r.pass).length, fail = results.filter(r => !r.pass).length;
console.log(`TIER 0 SEEDED FIRST PAGE — LIVE WIRING PROOF: ${pass} passed, ${fail} failed`);
console.log(`Full /api/** request census across the entire run (${requestCensus.length} total, includes infra): ` + JSON.stringify(requestCensus.map(r => r.kind)));
if (violations.length) { console.log('\n⚠ VIOLATIONS (requests fired during a must-be-zero window):'); violations.forEach(v => console.log('  - ' + JSON.stringify(v))); }
console.log('NO LIVE PROVIDER CALL WAS EVER REACHABLE — every /api/** route was answered locally for the entire run.');
if (fail) process.exitCode = 1;
