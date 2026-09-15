// ═══ PC FOUNDATION VALIDATION — LIVE, ONE-OPERATION SCRIPT (NOT CURRENTLY AUTHORIZED TO RUN) ═══
//
// THE 2026-09-15 RUN under this file's PRIOR version consumed its one authorized attempt on a
// genuine Mistral 502 — an infrastructure failure, not a content result (see
// _audit_out/pc_foundation_samples/2026-09-15T06-46-14-761Z_live_sample.json). Roman's review of
// that outcome required a corrective pass, dry-only, BEFORE any further paid call:
//   1. `_generatePCBodyBible()` used to collapse a genuine all-tiers-exhausted failure into
//      `{ok:true, hadResult:false}` — indistinguishable from "the model produced nothing." Fixed
//      (public/app.js): a NAMED, distinctly-shaped failure record
//      (`__pcFoundationOutcome:'PC_FOUNDATION_UPSTREAM_FAILURE'`, never a bible-shaped object),
//      carrying provider/httpStatus/requestId/hadContent for every physical attempt, plus a
//      durable `state._pcFoundationLastFailure` the UI/state path can react to. Proven offline —
//      `_pc_foundation_provider_failover_control.mjs`, 28/28, and `_bible_artifact_ledger_control.mjs`'s
//      real-browser DELAYED-RETRY scenario, both against the REAL production functions.
//   2. THE BUDGET CONTRACT WAS WRONG, not just the harness's bound: the prior CALL_CAPS.pcBodyBible=1
//      conflated "one logical PC-foundation OPERATION" with "one physical provider REQUEST" — but
//      the real, standing routing policy is Mistral primary -> Grok fallback -> terminal OpenAI,
//      ALL as ONE logical operation, each tier firing only after the prior one genuinely failed.
//      A cap of 1 physical request blocked that legitimate failover chain from ever running (this
//      is exactly what happened on 2026-09-15: the primary 502'd, and the harness blocked the
//      Grok/OpenAI retries the app itself would have tried). CORRECTED CONTRACT, below:
//
//        ONE LOGICAL PC-FOUNDATION OPERATION = 1 to 3 physical requests (provider failover:
//          primary/mistral -> fallback/grok -> terminal/openai, each ONLY after the prior tier's
//          real HTTP/network call failed or returned empty content; stops the instant any tier
//          succeeds) PLUS 0 to 2 physical requests (body-tell rerolls: EACH a single direct
//          mistral-small-latest call, reachable ONLY after the foundation operation above already
//          produced a bible with real content — structurally impossible after an upstream failure,
//          proven in `_pc_foundation_provider_failover_control.mjs` scenario 5, both the
//          HTTP-error and the empty-content failure shapes).
//
//        MAXIMUM PHYSICAL REQUESTS FOR ONE AUTHORIZED OPERATION: 3 + 2 = 5.
//        STOP CONDITIONS: foundation tiers stop at first success, or after the terminal (3rd)
//          tier fails (the operation is then PC_FOUNDATION_UPSTREAM_FAILURE, retry-eligible, zero
//          further physical requests attempted for THIS operation); rerolls stop at the first
//          diversity-pass or after 2 attempts, whichever comes first (best-effort accepted).
//        CALL_CAPS below is updated to this corrected contract: {pcBodyBible: 3, bodyTellReroll: 2}.
//
// HISTORY: the FIRST live sample (an earlier script version, before the reroll/correlation/
// provenance corrective passes) was graded a FULL FAIL — the model minted uncited permanent canon
// (an unsupported vanished/dead mother) and a contradictory authority claim (Julian, not the
// presiding Dohkar, "deciding" her guilt). Retained at
// _audit_out/pc_foundation_samples/2026-09-15_live_sample_01_FAILED.json (untracked evidence,
// never merged). Since then: bounded/correlated reroll accounting; a provenance-bound,
// claim-level-entailment output validator (_validatePcFoundationOutput) rejecting
// uncited/unsupported/contradicting/misattributed durable claims — proven offline
// (_pc_foundation_output_validator_control.mjs, 62/62, including the exact three named rejections
// against the ACTUAL failed sample); the merge boundary (_commitValidatedPcFoundation) WIRED into
// _facetIndex (f12ff9b) and the CG/OAS identity resolver root-caused, not worked around (a165d1a)
// — both literary and CG/OAS real author payloads proven to receive an accepted merge exactly
// once, with zero provenance/citation leakage (_pc_foundation_real_path_integration_proof.mjs,
// 187/187, fully outbound-stubbed); and now (this pass) the named infrastructure-failure state
// and the corrected budget contract above.
//
// UNLIKE EVERY VERSION BEFORE 2026-09-15: the merge below runs against this run's REAL
// `window.state` (this one ephemeral Playwright browser session — nothing shared, nothing
// persisted unless Save & Exit is clicked, which this script never does), not a throwaway
// sandboxed object, because the authorized verdict is exactly "accepted and merged into the
// usable PC portfolio" — a sandboxed merge could not honestly claim that. An accepted response
// commits additively to state._pcPortfolio.facets (seed's own facets untouched, concat not
// overwrite); a rejected response leaves state completely untouched — _commitValidatedPcFoundation
// validates first and is pure/local until its one atomic write point, exactly as proven offline.
//
// This script makes at most 5 real physical requests total per the corrected contract above,
// enforced and aborted-not-silently-allowed at the outbound boundary if exceeded — EVERY OTHER
// /api/** route stays stubbed. The raw response(s) are saved locally (untracked evidence)
// regardless of verdict, including an infrastructure-failure verdict.
//
// DO NOT RUN THIS SCRIPT WITHOUT ROMAN'S EXPLICIT, SEPARATE AUTHORIZATION FOR THAT SPECIFIC RUN.
// This header records the CORRECTED contract for whenever that authorization comes; it is not
// itself an authorization to run.
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
// CORRECTED BUDGET CONTRACT (Roman, corrective follow-up #10, 2026-09-15) — see header. pcBodyBible
// is a CLASSIFICATION (every provider tier's request matches the same system-prompt anchor), so 3
// is the cap on ONE logical foundation operation's PHYSICAL failover requests (primary/mistral,
// fallback/grok, terminal/openai), never "1 operation = 1 request." bodyTellReroll is unchanged.
const CALL_CAPS = { pcBodyBible: 3, bodyTellReroll: 2 };
const attemptCounts = {};
const correlatedAttempts = [];   // [{requestId, kind, attemptNumber, request, sys, usr, sysBytes, usrBytes, model, role, maxTokens, temperature, outcome, response}]
const blockedAttempts = [];      // over-cap attempts, named and recorded, never silently dropped
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
    const requestId = kind + '#' + attemptNumber;
    if (attemptNumber > cap) {
      blockedAttempts.push({ requestId, kind, attemptNumber, cap, role: b.role, model: b.model, outcome: 'blocked_over_cap' });
      contractViolation = { kind, attemptNumber, cap };
      note('*** CONTRACT VIOLATION: ' + requestId + ' exceeds the declared cap of ' + cap + ' for ' + kind + ' — recorded as a BLOCKED ATTEMPT and ABORTED, never let through ***');
      return route.abort('failed');
    }
    correlatedAttempts.push({ requestId, kind, attemptNumber, request: req, sys, usr, sysBytes, usrBytes, model: b.model, role: b.role, maxTokens: b.max_tokens, temperature: b.temperature, outcome: 'completed', response: null });
    if (kind === 'pcBodyBible') pcBodyBibleCapturedRequest = { url: p, role: b.role, model: b.model, maxTokens: b.max_tokens, temperature: b.temperature, sys, usr, sysBytes, usrBytes };
    note('*** LIVE: letting ' + requestId + ' (of at most ' + cap + ' for ' + kind + ') through to the real /api/mistral-proxy — this run may legitimately make the primary plus up to ' + CALL_CAPS.bodyTellReroll + ' rerolls, never reported as "one call" ***');
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

section('THE ONE REAL, AUTHORIZED _generatePCBodyBible() OPERATION (bounded: up to 3 physical failover requests + at most 2 reroll attempts = 5 max)');
const censusBeforeIsolatedCall = requestCensus.length;
let genResult = null, genThrew = null;
const callStart = Date.now();
try {
  genResult = await page.evaluate(async () => {
    try {
      const r = await window._generatePCBodyBible();
      // NO SILENT SUCCESS (Roman, corrective follow-up #10, 2026-09-15) — a named infrastructure
      // failure is a TRUTHY object; `ok:true, hadResult:!!r` alone would call this "content
      // received." Distinguished explicitly here so the harness's own report can never claim
      // "accepted" for an operation that produced no bible at all.
      const isUpstreamFailure = !!(r && r.__pcFoundationOutcome === 'PC_FOUNDATION_UPSTREAM_FAILURE');
      return { ok: true, hadResult: !!r, isUpstreamFailure, bible: isUpstreamFailure ? null : r, failure: isUpstreamFailure ? r : null };
    }
    catch (e) { return { ok: false, error: String(e && e.message) }; }
  });
} catch (e) { genThrew = String(e && e.message); }
const callMs = Date.now() - callStart;
await page.waitForTimeout(1500);
ok('_generatePCBodyBible() completed without throwing', genResult && genResult.ok, JSON.stringify({ ok: genResult && genResult.ok, hadResult: genResult && genResult.hadResult, isUpstreamFailure: genResult && genResult.isUpstreamFailure }) + (genThrew ? ' threw=' + genThrew : ''));
if (genResult && genResult.isUpstreamFailure) {
  note('*** INFRASTRUCTURE FAILURE, NOT A CONTENT RESULT: ' + JSON.stringify(genResult.failure, null, 2) + ' ***');
}
// This product may LEGITIMATELY make up to 3 physical pcBodyBible-classified requests for ONE
// logical operation (provider failover: primary/mistral, fallback/grok, terminal/openai — each
// ONLY after the prior tier genuinely failed) plus up to CALL_CAPS.bodyTellReroll reroll attempts
// — never reported as "one call." Every physical attempt (0 to the cap, of either kind) is
// individually accounted for by request id/role/model/usage/outcome.
ok('pcBodyBible physical requests stayed within the declared cap of ' + CALL_CAPS.pcBodyBible + ' (1 to ' + CALL_CAPS.pcBodyBible + ' are ALL legitimate — provider failover, not a violation)',
  (attemptCounts.pcBodyBible || 0) >= 1 && (attemptCounts.pcBodyBible || 0) <= CALL_CAPS.pcBodyBible, 'pcBodyBible attempts=' + (attemptCounts.pcBodyBible || 0));
ok('bodyTellReroll attempts stayed within the declared cap of ' + CALL_CAPS.bodyTellReroll + ' (0 to ' + CALL_CAPS.bodyTellReroll + ' are ALL legitimate)',
  (attemptCounts.bodyTellReroll || 0) <= CALL_CAPS.bodyTellReroll, 'bodyTellReroll attempts=' + (attemptCounts.bodyTellReroll || 0));
ok('rerolls only occurred if the operation actually produced content (never after an upstream failure)',
  !(genResult && genResult.isUpstreamFailure) || (attemptCounts.bodyTellReroll || 0) === 0,
  'isUpstreamFailure=' + (genResult && genResult.isUpstreamFailure) + ' bodyTellReroll attempts=' + (attemptCounts.bodyTellReroll || 0));
ok('NO CONTRACT VIOLATION occurred (no physical request exceeded either cap)', !contractViolation, JSON.stringify(contractViolation));
ok('blocked-attempts ledger agrees with the contract-violation flag', (blockedAttempts.length > 0) === !!contractViolation, JSON.stringify(blockedAttempts));
note('BLOCKED ATTEMPTS (over-cap, named and recorded, never silently dropped): ' + JSON.stringify(blockedAttempts, null, 2));
note('call wall-clock time: ' + callMs + 'ms');
note('TOTAL PHYSICAL REQUESTS THIS OPERATION MADE: ' + ((attemptCounts.pcBodyBible || 0) + (attemptCounts.bodyTellReroll || 0)) + ' (max allowed: ' + (CALL_CAPS.pcBodyBible + CALL_CAPS.bodyTellReroll) + ')');

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

// Run the REAL merge boundary in-page too, before the browser closes — against THIS RUN'S REAL
// window.state (authorized 2026-09-15: the verdict must be "accepted and merged into the usable
// PC portfolio", which a sandboxed object could not honestly demonstrate). This state exists only
// in this one ephemeral Playwright page; nothing is persisted unless Save & Exit is clicked, which
// never happens here — no real reader, no shared/production state is touched.
let mergeResult = null;
let portfolioBefore = null, facetIndexBefore = null;
if (genResult && genResult.bible) {
  portfolioBefore = await page.evaluate(() => window.state._pcPortfolio || null);
  facetIndexBefore = await page.evaluate(() => {
    try {
      const idx = window._facetIndex(window.state, { sceneNumber: 2 });
      const pcKey = Object.keys(idx).filter(k => k.indexOf('pc:') === 0)[0];
      return pcKey ? { key: pcKey, facetIds: (idx[pcKey].facets || []).map(f => f.facet_id) } : null;
    } catch (e) { return { error: String(e && e.message) }; }
  });
  mergeResult = await page.evaluate((bible) => {
    try {
      const result = window._commitValidatedPcFoundation(window.state, bible);
      return { result, portfolioAfter: window.state._pcPortfolio || null };
    } catch (e) { return { error: String(e && e.message) }; }
  }, genResult.bible);
}

let facetIndexAfter = null;
if (mergeResult) {
  facetIndexAfter = await page.evaluate(() => {
    try {
      const idx = window._facetIndex(window.state, { sceneNumber: 2 });
      const pcKey = Object.keys(idx).filter(k => k.indexOf('pc:') === 0)[0];
      return pcKey ? { key: pcKey, facetIds: (idx[pcKey].facets || []).map(f => f.facet_id) } : null;
    } catch (e) { return { error: String(e && e.message) }; }
  });
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
  note(a.requestId + ' (' + a.kind + ', role=' + a.role + ', model=' + a.model + ', outcome=' + a.outcome + '): status=' + (a.response && a.response.status) + ' usage=' + JSON.stringify(usage || null));
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
      note('*** This sample FAILS the provenance gate — the merge boundary below will refuse it. See rejections above for exactly which claims and why. ***');
    }
  }
  note('FULL RAW BIBLE (for a human R2/R3 cross-check alongside the validator verdict above):\n' + JSON.stringify(bible, null, 2));
} else {
  ok('a bible + source pair existed to validate', false, 'bible=' + !!bible + ' source=' + !!(foundationCapture && foundationCapture.source));
}

// ═══════════════════════════════════════ THE MERGE BOUNDARY — validate first, then commit or refuse; THIS RUN'S REAL window.state ═══════════════════════════════════════
section('MERGE BOUNDARY (_commitValidatedPcFoundation) — result against THIS RUN\'S REAL window.state (authorized 2026-09-15)');
let finalVerdict = 'INCOMPLETE';
if (mergeResult) {
  note('portfolio BEFORE merge attempt: ' + JSON.stringify(portfolioBefore));
  note('facetIndex BEFORE merge attempt (pc: entry): ' + JSON.stringify(facetIndexBefore));
  note('merge result: ' + JSON.stringify(mergeResult));
  note('facetIndex AFTER merge attempt (pc: entry): ' + JSON.stringify(facetIndexAfter));
  if (validation && validation.ok) {
    ok('VERDICT: ACCEPTED and merged — commit reports committed:true', mergeResult.result && mergeResult.result.committed === true, JSON.stringify(mergeResult));
    ok('the merged facet_id(s) are reachable via _facetIndex (the SAME chain the real literary/CG author payload consumes)',
      !!(facetIndexAfter && facetIndexAfter.facetIds && mergeResult.result && mergeResult.result.mergedFacetIds &&
         mergeResult.result.mergedFacetIds.every(id => facetIndexAfter.facetIds.indexOf(id) !== -1)),
      JSON.stringify({ merged: mergeResult.result && mergeResult.result.mergedFacetIds, resolved: facetIndexAfter && facetIndexAfter.facetIds }));
    finalVerdict = (mergeResult.result && mergeResult.result.committed === true) ? 'ACCEPTED_AND_MERGED' : 'ACCEPTED_BUT_MERGE_FAILED (contradiction — investigate)';
  } else {
    ok('VERDICT: REJECTED — merge refuses, zero mutation (portfolio before === after)',
      mergeResult.result && mergeResult.result.committed === false && JSON.stringify(portfolioBefore) === JSON.stringify(mergeResult.portfolioAfter),
      JSON.stringify(mergeResult));
    finalVerdict = 'REJECTED_ZERO_MUTATION';
  }
} else if (genResult && genResult.isUpstreamFailure) {
  note('INFRASTRUCTURE FAILURE, not a content result — no bible was ever generated to validate or merge: ' + JSON.stringify(genResult.failure));
  finalVerdict = 'INFRASTRUCTURE_FAILURE_RETRY_ELIGIBLE';
} else {
  note('no bible to attempt a merge with.');
  finalVerdict = 'NO_BIBLE_GENERATED';
}

console.log('\n' + '='.repeat(70));
const p = results.filter(r => r.pass).length, f = results.length - p;
console.log('PC FOUNDATION LIVE SAMPLE: ' + p + ' passed, ' + f + ' failed');
console.log('FINAL VERDICT: ' + finalVerdict);
console.log('SCOPE (Roman, 2026-09-15): this establishes FOUNDATION-CLAIM COMPLIANCE ONLY — whether the');
console.log('real response\'s durable claims are cited and source-supported per _validatePcFoundationOutput,');
console.log('and (if accepted) whether the merge actually reaches the usable PC portfolio via _facetIndex.');
console.log('It says NOTHING about Scene 2 prose quality, an A/50 read, or any other narrative-quality');
console.log('judgment, and NOTHING about a growth arc — those are separate, later questions this sample');
console.log('does not answer.');
console.log('The merge boundary above ran against THIS RUN\'S REAL window.state (one ephemeral Playwright');
console.log('page) — nothing was persisted, since Save & Exit was never clicked; no shared/production');
console.log('state was touched.');
console.log('Raw response is at ' + savePath + ' only (untracked evidence).');
process.exit(f || contractViolation ? 1 : 0);
