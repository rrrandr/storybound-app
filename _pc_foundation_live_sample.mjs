// ═══ PC FOUNDATION VALIDATION — LIVE, ONE-SAMPLE SCRIPT (NOT CURRENTLY AUTHORIZED TO RUN) ═══
//
// STATUS (2026-09-15, corrective follow-up #3): the FIRST live sample run with this script's
// prior version was graded a FULL FAIL by Roman — not because source-integrity failed (it
// worked: the real request carried Lirael's approved bio/facets/committed Scene 1 facts), but
// because the model still minted uncited permanent canon (an unsupported vanished/dead mother)
// and a contradictory authority claim (Julian, not the presiding Dohkar, "deciding" her guilt).
// The retained response is preserved at
// _audit_out/pc_foundation_samples/2026-09-15_live_sample_01_FAILED.json (untracked evidence,
// never merged). Per that grading, Roman required FOUR corrections before any future sample:
//   1. Bound and account for the body-tell reroll gate (public/app.js ~255712: at most 2 reroll
//      passes) — enforced at the outbound boundary below, not merely hoped for.
//   2. Per-request correlation for usage/latency/model/role/response — the prior version's
//      single "last response wins" listener silently captured the WRONG response once the run
//      had more than one /api/mistral-proxy exchange (exactly what happened in sample #1).
//   3. A provenance-bound output validator (_validatePcFoundationOutput, public/app.js, wired
//      into the prompt's own schema as an optional _provenance block) that REJECTS an uncited or
//      source-contradicting durable claim — proven offline against the ACTUAL failed sample by
//      _pc_foundation_output_validator_control.mjs (13/13, including the exact three named
//      rejections: unsupported family death, unsupported LI intimacy, authority misattribution).
//   4. This script itself now grades the real response through that SAME validator, not just the
//      narrow R1 non-emptiness checks the first version ran.
//
// This script makes exactly one real request per declared cap (1 pcBodyBible + at most 2
// bodyTellReroll, both bounded and aborted-not-silently-allowed if exceeded) — EVERY OTHER
// /api/** route stays stubbed. The raw response is saved locally (untracked evidence), NEVER
// merged into public/starter-scenes.js or any other real source file, and NOTHING here applies a
// merge automatically.
//
// DO NOT RUN THIS SCRIPT WITHOUT ROMAN'S EXPLICIT, SEPARATE AUTHORIZATION FOR THIS SPECIFIC
// SAMPLE. The corrective instruction was explicit: "Do not schedule another paid sample until
// the retained failure is rejected structurally and every model request in the run is bounded
// and correlated" — items 1-4 above are now done and offline-proven; this header records that,
// it is NOT itself an authorization to run.
//
// NEVER: git commit/push/stash/checkout/reset. NEVER touch .env.local. NEVER edit public/app.js,
// public/starter-scenes.js, or any existing proof file.
//
// usage (ONLY WHEN AUTHORIZED): node _pc_foundation_live_sample.mjs   (dev server on :3000)

import { chromium } from 'playwright-core';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {
  installSession, configBody, isAuthOrigin, installEntitledProfileStub, verifySubscriptionBody,
} from './_test_session_env.mjs';

const require = createRequire(import.meta.url);
const { createGovernor, MODEL_LIMITS } = require('./api/_mistral-governor.js');
const { memoryStore } = require('./api/_mistral-governor-store.js');

const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail ? '  — ' + String(detail).slice(0, 500) : '')); };
const note = (s) => console.log('  [NOTE] ' + s);
const section = (t) => console.log('\n=== ' + t + ' ===');

function classifyModelCall(sys, usr, role, model) {
  if (/generating a PROTAGONIST BODY BIBLE for a romance novel/.test(sys)) return 'pcBodyBible';
  if (/rewrite 5 body-tell fields for a romance heroine bible/.test(sys)) return 'bodyTellReroll';
  if (/generating a LOVE-INTEREST BODY BIBLE for a romance novel/.test(sys)) return 'liBodyBible';
  if (/generating an ANTAGONIST BODY BIBLE for a romance novel/.test(sys)) return 'antagonistBodyBible';
  if (/screenplay-native cinematic-romance writer/.test(sys)) return 'cgScreenplay';
  if (/SCENE-SPINE planner/.test(sys) || /"hardBeats"/.test(sys)) return 'sceneSpine';
  if (/STORYBOUND ARCHITECTURE LAWS/.test(sys)) return 'author';
  if (role === 'STRUCTURE_GENERATOR') return 'structureGenerator-unclassified';
  return 'unclassified(role=' + role + ',model=' + model + ')';
}

// Declared contract, N from the real code (public/app.js ~255712: `while (_v.fail && _passes < 2)`).
const CALL_CAPS = { pcBodyBible: 1, bodyTellReroll: 2 };
const attemptCounts = {};
const correlatedAttempts = [];   // [{kind, attemptNumber, request, sys, usr, sysBytes, usrBytes, model, role, maxTokens, temperature, response}]
let contractViolation = null;

const requestCensus = [];
let pcBodyBibleCapturedRequest = null;

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
page.on('console', () => {});

// PER-REQUEST CORRELATION — matched by Playwright Request object identity, not "last response
// wins." route.continue() forwards the SAME request, so response.request() is reference-equal
// to what the route handler saw for that exact exchange.
page.on('response', async (response) => {
  try {
    if (!/\/api\/mistral-proxy\b/.test(response.url())) return;
    const rec = correlatedAttempts.find(a => a.request === response.request() && !a.response);
    if (!rec) return;
    let json = null; try { json = await response.json(); } catch (_) { json = null; }
    rec.response = { status: response.status(), json, at: Date.now() };
  } catch (_) {}
});

await installSession(page);
await page.route('**/sb-test.localhost/**', route => {
  const accept = route.request().headers()['accept'] || '';
  const single = /vnd\.pgrst\.object\+json/.test(accept);
  return route.fulfill({ status: 200, contentType: 'application/json', body: single ? 'null' : '[]' });
});
await installEntitledProfileStub(page, { log: () => {} });

await page.route('**/api/**', async route => {
  const req = route.request(); const url = req.url(); const p = new URL(url).pathname;
  if (/\/api\/config\b/.test(url)) { requestCensus.push({ kind: 'infra:config', url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() }); }
  if (isAuthOrigin(url)) { requestCensus.push({ kind: 'infra:auth-origin', url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); }
  if (/\/api\/verify-subscription\b/.test(url)) { requestCensus.push({ kind: 'infra:verify-subscription', url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(verifySubscriptionBody()) }); }
  if (/\/api\/csp-report\b/.test(url)) { requestCensus.push({ kind: 'infra:csp-report', url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); }
  if (/\/api\/beta-events\b/.test(url)) { requestCensus.push({ kind: 'infra:beta-events', url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); }
  if (req.method() !== 'POST') { requestCensus.push({ kind: 'infra:non-post', url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); }

  let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
  const flat = m => typeof m.content === 'string' ? m.content : (Array.isArray(m.content) ? m.content.map(x => x && x.text || '').join('\n') : '');
  const sys = (b.messages || []).filter(m => m.role === 'system').map(flat).join('\n');
  const usr = (b.messages || []).filter(m => m.role === 'user').map(flat).join('\n');
  const kind = classifyModelCall(sys, usr, b.role, b.model || b.preferredModel);
  const sysBytes = Buffer.byteLength(sys, 'utf8'), usrBytes = Buffer.byteLength(usr, 'utf8');
  const entry = { kind, url: p, role: b.role || null, model: b.model || b.preferredModel || null, maxTokens: b.max_tokens || null, temperature: b.temperature, sysBytes, usrBytes };
  requestCensus.push(entry);

  if (kind === 'pcBodyBible' || kind === 'bodyTellReroll') {
    attemptCounts[kind] = (attemptCounts[kind] || 0) + 1;
    const attemptNumber = attemptCounts[kind];
    const cap = CALL_CAPS[kind];
    correlatedAttempts.push({ kind, attemptNumber, request: req, sys, usr, sysBytes, usrBytes, model: b.model, role: b.role, maxTokens: b.max_tokens, temperature: b.temperature, response: null });
    if (attemptNumber > cap) {
      contractViolation = { kind, attemptNumber, cap };
      note('*** CONTRACT VIOLATION: ' + kind + ' attempt #' + attemptNumber + ' exceeds the declared cap of ' + cap + ' — ABORTING this request, not letting it through ***');
      return route.abort('failed');
    }
    if (kind === 'pcBodyBible') pcBodyBibleCapturedRequest = { url: p, role: b.role, model: b.model, maxTokens: b.max_tokens, temperature: b.temperature, sys, usr, sysBytes, usrBytes };
    note('*** LIVE: letting ' + kind + ' attempt #' + attemptNumber + ' (of at most ' + cap + ') through to the real /api/mistral-proxy ***');
    return route.continue();
  }
  // ANY OTHER CLASSIFIED CALL — must never see one. Stubbed harmlessly (never real), occurrence
  // itself is the finding.
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: '{}' }) });
});

section('REACH FIRST-SACRIFICE STATE (real clicks, no Genesis unlock)');
const t0 = Date.now(); let up = false;
while (Date.now() - t0 < 120000 && !up) {
  try { await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 }); await page.waitForFunction(() => window.state && window._launchStarterStory && window.STARTER_STORIES && window._bakedScene1For, null, { timeout: 60000 }); up = true; }
  catch (_) { await page.waitForTimeout(3000); }
}
if (!up) { ok('server reachable', false, 'server never answered'); await browser.close(); process.exit(2); }
await page.waitForFunction(() => !document.body.classList.contains('booting'), null, { timeout: 60000 }).catch(() => {});
await page.waitForTimeout(2500);

const burgerVisible = await page.evaluate(() => { const b = document.getElementById('burgerBtn'); return !!(b && b.getClientRects().length > 0); });
if (burgerVisible) {
  await page.click('#burgerBtn'); await page.waitForTimeout(400);
  await page.click('.vault-tab[data-vault-section="Account"]'); await page.waitForTimeout(300);
  await page.click('#menuLibraryBtn'); await page.waitForTimeout(1500);
}
const screenNow = await page.evaluate(() => window._currentScreenId);
ok('real Library entry reaches vaultLibraryScreen', screenNow === 'vaultLibraryScreen', screenNow);

await page.click('.library-book[data-story-id="starter_first_sacrifice"]');
await page.waitForTimeout(900);
await page.click('#zoomReadBtn');
await page.waitForTimeout(6000);
const afterRead = await page.evaluate(() => ({ screen: window._currentScreenId, starterId: window.state._starterId }));
ok('real click reaches baked Scene 1 (real starterId, no Genesis unlock performed)', afterRead.screen === 'game' && afterRead.starterId === 'starter_first_sacrifice', JSON.stringify(afterRead));

ok('ZERO model-classified requests fired merely from reaching this point', requestCensus.filter(r => !String(r.kind).startsWith('infra:')).length === 0,
  JSON.stringify(requestCensus.filter(r => !String(r.kind).startsWith('infra:'))));

const foundationCapture = await page.evaluate(() => {
  const s = window.state;
  const block = (typeof window._starterPcFoundationBlock === 'function') ? window._starterPcFoundationBlock(s) : null;
  const source = (typeof window._pcFoundationSourceFacts === 'function') ? window._pcFoundationSourceFacts(s) : null;
  return { block, source, starterId: s._starterId, storyId: s.storyId };
});

section('THE ONE REAL, AUTHORIZED _generatePCBodyBible() CALL (bounded: 1 + at most 2 reroll attempts)');
const censusBeforeIsolatedCall = requestCensus.length;
let genResult = null, genThrew = null;
const callStart = Date.now();
try {
  genResult = await page.evaluate(async () => {
    try { const r = await window._generatePCBodyBible(); return { ok: true, hadResult: !!r, bible: r }; }
    catch (e) { return { ok: false, error: String(e && e.message) }; }
  });
} catch (e) { genThrew = String(e && e.message); }
const callMs = Date.now() - callStart;
await page.waitForTimeout(1500);
ok('_generatePCBodyBible() completed without throwing', genResult && genResult.ok, JSON.stringify({ ok: genResult && genResult.ok, hadResult: genResult && genResult.hadResult }) + (genThrew ? ' threw=' + genThrew : ''));
ok('exactly one pcBodyBible attempt fired', (attemptCounts.pcBodyBible || 0) === 1, 'pcBodyBible attempts=' + (attemptCounts.pcBodyBible || 0));
ok('bodyTellReroll attempts stayed within the declared cap of ' + CALL_CAPS.bodyTellReroll, (attemptCounts.bodyTellReroll || 0) <= CALL_CAPS.bodyTellReroll, 'bodyTellReroll attempts=' + (attemptCounts.bodyTellReroll || 0));
ok('NO CONTRACT VIOLATION occurred', !contractViolation, JSON.stringify(contractViolation));
note('call wall-clock time: ' + callMs + 'ms');

const afterAllQuiet = requestCensus.slice(censusBeforeIsolatedCall).filter(r => r.kind !== 'pcBodyBible' && r.kind !== 'bodyTellReroll');
ok('NOTHING OUTSIDE THE DECLARED CONTRACT fired', afterAllQuiet.length === 0, JSON.stringify(afterAllQuiet));

// Run the REAL validator in-page, before the browser closes — the same function the app itself
// would gate a future merge with, called against the REAL response, not re-implemented here.
let validation = null;
if (genResult && genResult.bible && foundationCapture.source) {
  validation = await page.evaluate(({ bible, source }) => {
    try { return (typeof window._validatePcFoundationOutput === 'function') ? window._validatePcFoundationOutput(bible, source) : { ok: false, rejections: [{ field: '*', reason: 'validator_not_found' }] }; }
    catch (e) { return { ok: false, rejections: [{ field: '*', reason: 'validator_threw', detail: String(e && e.message) }] }; }
  }, { bible: genResult.bible, source: foundationCapture.source });
}

await browser.close();

// ═══════════════════════════════════════ SAVE THE RAW RESPONSES LOCALLY (never merged) ═══════════════════════════════════════
section('RAW RESPONSES — saved locally as untracked evidence, NOT merged, NOT applied anywhere');
const outDir = path.join(process.cwd(), '_audit_out', 'pc_foundation_samples');
try { fs.mkdirSync(outDir, { recursive: true }); } catch (_) {}
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const savePath = path.join(outDir, stamp + '_live_sample.json');
const record = {
  at: new Date().toISOString(),
  starterId: foundationCapture.starterId,
  storyId: foundationCapture.storyId,
  contractViolation,
  attempts: correlatedAttempts.map(a => ({
    kind: a.kind, attemptNumber: a.attemptNumber, model: a.model, role: a.role, maxTokens: a.maxTokens, temperature: a.temperature,
    sysBytes: a.sysBytes, usrBytes: a.usrBytes,
    responseStatus: a.response && a.response.status,
    responseUsage: a.response && a.response.json && a.response.json.usage,
    responseContent: a.response && a.response.json && a.response.json.content,
  })),
  parsedBible: genResult && genResult.bible,
};
try { fs.writeFileSync(savePath, JSON.stringify(record, null, 2)); note('raw response(s) saved to ' + savePath); }
catch (e) { note('failed to save raw response: ' + (e && e.message)); }

// ═══════════════════════════════════════ ACTUAL USAGE / COST — per attempt, correlated ═══════════════════════════════════════
section('ACTUAL USAGE / COST — per attempt, correctly correlated (not "last response wins")');
correlatedAttempts.forEach(a => {
  const usage = a.response && a.response.json && a.response.json.usage;
  note(a.kind + ' attempt #' + a.attemptNumber + ' (model=' + a.model + '): status=' + (a.response && a.response.status) + ' usage=' + JSON.stringify(usage || null));
});
const pcAttempt = correlatedAttempts.find(a => a.kind === 'pcBodyBible');
ok('the pcBodyBible attempt specifically reported a usage block', !!(pcAttempt && pcAttempt.response && pcAttempt.response.json && pcAttempt.response.json.usage),
  pcAttempt ? JSON.stringify(pcAttempt.response && pcAttempt.response.json && pcAttempt.response.json.usage) : 'no pcBodyBible attempt recorded');
note('DOLLAR COST: still UNKNOWN — no sourced ministral-8b-2512 rate exists in this codebase. Real token counts above are exact per attempt, not estimated; only the $/token conversion remains unsourced.');

// ═══════════════════════════════════════ GOVERNOR ADMISSION — post-hoc sanity check ═══════════════════════════════════════
section('GOVERNOR ADMISSION (real api/_mistral-governor.js, real prompt byte-length) — post-hoc sanity check');
if (pcBodyBibleCapturedRequest) {
  const model = pcBodyBibleCapturedRequest.model;
  const limits = MODEL_LIMITS[model];
  const g = createGovernor(memoryStore(), { now: () => Date.now() });
  const admission = await g.admit({ model, messages: [{ role: 'system', content: pcBodyBibleCapturedRequest.sys }, { role: 'user', content: pcBodyBibleCapturedRequest.usr }], maxTokens: pcBodyBibleCapturedRequest.maxTokens, opId: 'pc-foundation-live-sample' });
  note('admission: ' + JSON.stringify(admission) + ' (limits: ' + JSON.stringify(limits) + ')');
  ok('the real governor would have admitted this exact real request', admission.outcome === 'admitted', JSON.stringify(admission));
}

// ═══════════════════════════════════════ THE PROVENANCE VALIDATOR — the real gate, run against the REAL response ═══════════════════════════════════════
section('PC FOUNDATION OUTPUT VALIDATOR — the real gate (public/app.js), run against the REAL response');
const bible = genResult && genResult.bible;
if (bible && foundationCapture.source) {
  ok('the validator produced a verdict', !!validation, JSON.stringify(validation));
  if (validation) {
    note('accepted fields: ' + JSON.stringify(validation.accepted));
    note('rejections: ' + JSON.stringify(validation.rejections));
    ok('PROVENANCE GATE: the real response is ACCEPTED (no durable claim rejected)', validation.ok === true, JSON.stringify(validation.rejections));
    if (!validation.ok) {
      note('*** This sample FAILS the provenance gate — do not propose a merge from it. See rejections above for exactly which claims and why. ***');
    }
  }
  note('FULL RAW BIBLE (for a human R2/R3 cross-check alongside the validator verdict above):\n' + JSON.stringify(bible, null, 2));
} else {
  ok('a bible + source pair existed to validate', false, 'bible=' + !!bible + ' source=' + !!(foundationCapture && foundationCapture.source));
}

console.log('\n' + '='.repeat(70));
const p = results.filter(r => r.pass).length, f = results.length - p;
console.log('PC FOUNDATION LIVE SAMPLE: ' + p + ' passed, ' + f + ' failed');
console.log('R2/R3 verdict comes from the validator above plus a human read of the full bible in the saved JSON — not a free-text guess.');
console.log('NO MERGE WAS APPLIED. Raw response is at ' + savePath + ' only (untracked evidence).');
process.exit(f || contractViolation ? 1 : 0);
