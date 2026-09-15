// ═══ PC FOUNDATION PROVIDER-FAILOVER + BUDGET-CONTRACT CONTROL (Roman, corrective follow-up #10, 2026-09-15) ═══
//
// The one authorized live sample (2026-09-15) hit a real Mistral 502 on the primary tier. Roman's
// review of that result found two things worth fixing BEFORE any further paid call:
//   1. `_generatePCBodyBible()` collapsed a genuine infrastructure failure (all 3 provider tiers
//      exhausted) into `{ok:true, hadResult:false}` at the caller level — indistinguishable from
//      "the model legitimately produced nothing." Fixed: a NAMED, distinctly-shaped failure record
//      (`__pcFoundationOutcome: 'PC_FOUNDATION_UPSTREAM_FAILURE'`), never confusable with a real
//      bible, carrying provider/httpStatus/requestId/hadContent for every physical attempt.
//   2. The prior live-sample harness's CALL_CAPS = {pcBodyBible: 1} conflated "one logical
//      PC-foundation OPERATION" with "one physical provider REQUEST" — but the real, standing
//      routing policy is Mistral primary -> Grok fallback -> terminal OpenAI, ALL as ONE logical
//      operation, so a bound of exactly 1 physical request blocked the app's own legitimate
//      failover chain from ever running. This file proves the corrected, precise contract:
//
//        ONE LOGICAL PC-FOUNDATION OPERATION = 1 to 3 physical requests (provider failover,
//          each tier fires ONLY after the PRIOR tier's real HTTP/network call failed or returned
//          empty content; stops the instant any tier succeeds) PLUS 0 to 2 physical requests
//          (body-tell rerolls, EACH a single direct mistral-small-latest call, reachable ONLY
//          after the foundation operation above already produced a bible with real content —
//          structurally impossible after an upstream failure, proven in scenario 5 below).
//
//        MAXIMUM PHYSICAL REQUESTS FOR ONE FUTURE AUTHORIZED OPERATION: 3 (foundation tiers)
//          + 2 (rerolls) = 5. STOP CONDITIONS: foundation tiers stop at first success or after
//          openai/terminal fails (operation is then PC_FOUNDATION_UPSTREAM_FAILURE, retry-eligible,
//          zero further physical requests attempted for that operation); rerolls stop at the
//          first diversity-pass OR after 2 attempts, whichever comes first (best-effort accepted).
//
// Drives the REAL production functions (window._generatePCBodyBible, window._callTieredProvider,
// window._classifyBodyTellFamily) through a real Playwright page, exactly as
// _bible_artifact_ledger_control.mjs and _tiered_provider_policy_control.mjs already do — never a
// reimplementation. NEVER git commit/push/stash/checkout/reset. NEVER touch .env.local. NO paid
// model calls — every /api/** answered locally.

import { chromium } from 'playwright-core';
import { installSession, configBody, isAuthOrigin, installEntitledProfileStub } from './_test_session_env.mjs';
const F = await import('./_seed_fixtures.generated.mjs');

const rows = [];
const ok = (n, p, d) => { rows.push([n, !!p]); console.log((p ? 'PASS ' : 'FAIL ') + n + (p ? '' : '  — ' + String(d).slice(0, 900))); };
const note = (s) => console.log('  [NOTE] ' + s);
const section = (t) => console.log('\n=== ' + t + ' ===');

function isPcBible(sys) { return /DISTINGUISHING FEATURE \(anti-calcification ROTATION — HARD\): this character/.test(sys); }
function isBodyTellReroll(sys) { return /rewrite 5 body-tell fields for a romance heroine bible/.test(sys); }
function fulfillMistralSuccess(route, contentObj) {
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'ctrl', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify(contentObj) } }] }) });
}
function fulfillRerollSuccess(route, fieldsObj) {
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: JSON.stringify(fieldsObj) }) });
}
function fulfillFail(route, status) {
  return route.fulfill({ status: status || 500, contentType: 'application/json', body: JSON.stringify({ error: 'stub_induced_failure' }) });
}

async function boot(routeFn) {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  const consoleLines = [];
  page.on('console', m => consoleLines.push(m.text()));
  await installSession(page);
  await page.route('**/sb-test.localhost/**', route => {
    const accept = route.request().headers()['accept'] || '';
    return route.fulfill({ status: 200, contentType: 'application/json', body: /vnd\.pgrst\.object\+json/.test(accept) ? 'null' : '[]' });
  });
  await installEntitledProfileStub(page);
  await page.route('**/api/**', routeFn);
  const t0 = Date.now(); let up = false;
  while (Date.now() - t0 < 120000 && !up) {
    try {
      await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 });
      await page.waitForFunction(() => window.state && window._launchStarterStory && window.STARTER_STORIES, null, { timeout: 60000 });
      up = true;
    } catch (_) { await page.waitForTimeout(3000); }
  }
  if (!up) throw new Error('server never became ready');
  await page.waitForFunction(() => !document.body.classList.contains('booting'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const list = Array.isArray(window.STARTER_STORIES) ? window.STARTER_STORIES : Object.values(window.STARTER_STORIES || {});
    const def = list.find(d => d && d.id === 'starter_first_sacrifice');
    window._launchStarterStory(def);
  });
  await page.waitForTimeout(2000);
  return { browser, page, consoleLines };
}

function baseRoute(extra) {
  return async (route) => {
    const req = route.request();
    const url = req.url(); const p = new URL(url).pathname;
    if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
    if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (F.PASSTHROUGH.test(url)) return route.continue();
    if (/\/api\/consume-fortune\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, fortunesRemaining: 9999 }) });
    if (/\/api\/(geo|csp-report|beta-events|verify-subscription|bug-report-awards|image|bfl-kontext)\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (F.LOCAL[p]) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(F.LOCAL[p]) });
    const handled = await extra(route, req, url, p);
    if (handled) return;
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  };
}

// A PC bible fixture whose 5 tell fields deliberately collide on HANDS (4 of 5 mention
// hand/thumb) — the REAL F.PC_BIBLE fixture already does this (confirmed by direct read of
// _seed_fixtures.generated.mjs before writing this file), so scenario 4 reuses it verbatim
// rather than hand-building a second, independently-drifting copy of "what collides."
const COLLIDING_PC_BIBLE = F.PC_BIBLE;
// A reroll response that ALSO collides on HANDS, deliberately, both passes — proves the loop
// stops at the declared cap of 2 even when diversity is NEVER achieved (best-effort accepted),
// rather than only proving the happy path where a reroll happens to fix it on pass 1.
const STILL_COLLIDING_REROLL = { stress_tic: 'her hand tightens on the rail', desire_tell: 'her fingers trace the edge of the table', impatience_tell: 'her hand taps twice against her thigh', confidence_tell: 'her fingers steady on the tool', vulnerability_tell: 'her hand curls shut' };

// ══════════════════════════════════════════════════════════════════════════════════════
section('SCENARIO 1 — Mistral 502 -> Grok success (2 physical requests, one logical operation)');
{
  let pcCount = 0;
  const { browser, page } = await boot(baseRoute(async (route, req, url, p) => {
    if (!/\/api\/(mistral-proxy|proxy|chatgpt-proxy)\b/.test(url)) return false;
    let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
    const sys = (b.messages || []).filter(m => m.role === 'system').map(m => m.content).join('\n');
    if (!isPcBible(sys)) { fulfillMistralSuccess(route, { ok: true }); return true; }
    pcCount++;
    if (pcCount === 1) { ok('S1: attempt#1 hit /api/mistral-proxy (primary tier)', /\/api\/mistral-proxy\b/.test(url), url); fulfillFail(route, 502); return true; }
    if (pcCount === 2) { ok('S1: attempt#2 hit /api/proxy (grok fallback), only after attempt#1 failed', /\/api\/proxy\b/.test(url), url); fulfillMistralSuccess(route, { signature_feature: 'x', stress_tic: 'watches the door', desire_tell: 'leans in', impatience_tell: 'checks the clock', confidence_tell: 'meets his eyes', vulnerability_tell: 'looks away first' }); return true; }
    ok('S1: NO third physical request fires once tier 2 succeeds', false, 'pcCount=' + pcCount); fulfillFail(route, 500); return true;
  }));
  const r = await page.evaluate(async () => {
    const bible = await window._generatePCBodyBible();
    return { bible, tierLog: window._providerTierLog.filter(e => e.role === 'pcBodyBible') };
  });
  ok('S1: exactly 2 physical pcBodyBible-classified requests fired', pcCount === 2, 'pcCount=' + pcCount);
  ok('S1: a REAL bible was returned (not a failure record)', !!(r.bible && r.bible.signature_feature && !r.bible.__pcFoundationOutcome), JSON.stringify(r.bible));
  ok('S1: _providerTierLog shows attempt#1=mistral/primary then attempt#2=grok/fallback, correlated', r.tierLog.length === 2 && r.tierLog[0].tier === 'primary' && r.tierLog[0].provider === 'mistral' && r.tierLog[1].tier === 'fallback' && r.tierLog[1].provider === 'grok' && r.tierLog[1].fallbackReason, JSON.stringify(r.tierLog));
  await browser.close();
}

// ══════════════════════════════════════════════════════════════════════════════════════
section('SCENARIO 2 — Mistral + Grok both fail -> terminal OpenAI success (3 physical requests)');
{
  let pcCount = 0;
  const { browser, page } = await boot(baseRoute(async (route, req, url, p) => {
    if (!/\/api\/(mistral-proxy|proxy|chatgpt-proxy)\b/.test(url)) return false;
    let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
    const sys = (b.messages || []).filter(m => m.role === 'system').map(m => m.content).join('\n');
    if (!isPcBible(sys)) { fulfillMistralSuccess(route, { ok: true }); return true; }
    pcCount++;
    if (pcCount === 1) { fulfillFail(route, 502); return true; }
    if (pcCount === 2) { fulfillFail(route, 503); return true; }
    // The openai/chatgpt-proxy tier's dispatch branch reads d3.content DIRECTLY (never the
    // choices-envelope fallback mistral/grok both accept) — confirmed by direct read of
    // _tieredProviderDispatch before writing this fixture, so the terminal-tier success stub
    // MUST use the flat {content} shape, not fulfillMistralSuccess's choices envelope.
    if (pcCount === 3) { ok('S2: attempt#3 hit /api/chatgpt-proxy (openai terminal), only after tiers 1+2 failed', /\/api\/chatgpt-proxy\b/.test(url), url); fulfillRerollSuccess(route, { signature_feature: 'x', stress_tic: 'watches the door', desire_tell: 'leans in', impatience_tell: 'checks the clock', confidence_tell: 'meets his eyes', vulnerability_tell: 'looks away first' }); return true; }
    ok('S2: NO fourth physical request fires once the terminal tier succeeds', false, 'pcCount=' + pcCount); fulfillFail(route, 500); return true;
  }));
  const r = await page.evaluate(async () => {
    const bible = await window._generatePCBodyBible();
    return { bible, tierLog: window._providerTierLog.filter(e => e.role === 'pcBodyBible') };
  });
  ok('S2: exactly 3 physical pcBodyBible-classified requests fired (the maximum for the foundation operation alone)', pcCount === 3, 'pcCount=' + pcCount);
  ok('S2: a REAL bible was returned via the terminal tier', !!(r.bible && r.bible.signature_feature && !r.bible.__pcFoundationOutcome), JSON.stringify(r.bible));
  ok('S2: _providerTierLog shows all 3 tiers in order (primary, fallback, terminal), each correlated with a fallbackReason from the prior failure', r.tierLog.length === 3 && r.tierLog.map(e => e.tier).join(',') === 'primary,fallback,terminal' && r.tierLog[1].fallbackReason && r.tierLog[2].fallbackReason, JSON.stringify(r.tierLog));
  await browser.close();
}

// ══════════════════════════════════════════════════════════════════════════════════════
section('SCENARIO 3 — all tiers fail: NAMED PC_FOUNDATION_UPSTREAM_FAILURE, never a silent no-op');
{
  let pcCount = 0;
  const { browser, page } = await boot(baseRoute(async (route, req, url, p) => {
    if (!/\/api\/(mistral-proxy|proxy|chatgpt-proxy)\b/.test(url)) return false;
    let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
    const sys = (b.messages || []).filter(m => m.role === 'system').map(m => m.content).join('\n');
    if (!isPcBible(sys)) { fulfillMistralSuccess(route, { ok: true }); return true; }
    pcCount++;
    fulfillFail(route, 502); return true;
  }));
  const r = await page.evaluate(async () => {
    const bible = await window._generatePCBodyBible();
    const ledger = (window.state._bibleArtifacts || {}).pc;
    return { bible, ledger, lastFailure: window.state._pcFoundationLastFailure, pcBodyBibleOnState: window.state.pcBodyBible || null };
  });
  ok('S3: exactly 3 physical requests were made (the declared maximum for one foundation operation), never more', pcCount === 3, 'pcCount=' + pcCount);
  ok('S3: the outcome is the NAMED failure record, not null and not a bible-shaped object', r.bible && r.bible.__pcFoundationOutcome === 'PC_FOUNDATION_UPSTREAM_FAILURE', JSON.stringify(r.bible));
  ok('S3: retryEligible is explicitly true', r.bible && r.bible.retryEligible === true);
  ok('S3: all 3 physical attempts are individually correlated in the failure record (requestId/provider/httpStatus/hadContent)',
    r.bible && Array.isArray(r.bible.attempts) && r.bible.attempts.length === 3
    && r.bible.attempts.every((a, i) => a.requestId === 'pcBodyBible#' + (i + 1) && a.provider && a.httpStatus === 502 && a.hadContent === false && a.outcome === 'failed'),
    JSON.stringify(r.bible && r.bible.attempts));
  ok('S3: the bible ledger records status=failed with a real reason (retry-eligible per _bibleArtifactBefore\'s own already-real retry-after-failure branch)', r.ledger && r.ledger.status === 'failed' && !!r.ledger.error, JSON.stringify(r.ledger));
  ok('S3: state.pcBodyBible was NEVER set — no silent partial success', r.pcBodyBibleOnState === null);
  ok('S3: state._pcFoundationLastFailure is stamped with the same named record — the UI/state path can react to this without ever mistaking it for content', r.lastFailure && r.lastFailure.__pcFoundationOutcome === 'PC_FOUNDATION_UPSTREAM_FAILURE');
  await browser.close();
}

// ══════════════════════════════════════════════════════════════════════════════════════
section('SCENARIO 4 — valid foundation, then exactly 2 permitted body-tell rerolls (both still colliding, best-effort accepted, cap respected)');
{
  let pcCount = 0, rerollCount = 0;
  const { browser, page } = await boot(baseRoute(async (route, req, url, p) => {
    if (!/\/api\/(mistral-proxy|proxy|chatgpt-proxy)\b/.test(url)) return false;
    let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
    const sys = (b.messages || []).filter(m => m.role === 'system').map(m => m.content).join('\n');
    if (isBodyTellReroll(sys)) {
      rerollCount++;
      ok('S4: reroll attempt#' + rerollCount + ' hit /api/mistral-proxy directly (single provider, no failover chain)', /\/api\/mistral-proxy\b/.test(url), url);
      fulfillRerollSuccess(route, STILL_COLLIDING_REROLL);
      return true;
    }
    if (!isPcBible(sys)) { fulfillMistralSuccess(route, { ok: true }); return true; }
    pcCount++;
    ok('S4: exactly 1 physical pcBodyBible request (primary tier succeeds immediately)', pcCount === 1, 'pcCount=' + pcCount);
    fulfillMistralSuccess(route, COLLIDING_PC_BIBLE);
    return true;
  }));
  const r = await page.evaluate(async () => {
    const bible = await window._generatePCBodyBible();
    return { bible };
  });
  ok('S4: exactly 1 physical pcBodyBible request total for the foundation operation', pcCount === 1, 'pcCount=' + pcCount);
  ok('S4: exactly 2 reroll attempts fired — the declared cap, no more', rerollCount === 2, 'rerollCount=' + rerollCount);
  ok('S4: a real bible was returned despite the reroll never achieving diversity (best-effort accepted after the cap, not silently dropped)', !!(r.bible && r.bible.signature_feature && !r.bible.__pcFoundationOutcome), JSON.stringify(r.bible));
  ok('S4: the bible\'s tell fields reflect the LAST reroll attempt (rewritten, not the original colliding set)', r.bible && r.bible.stress_tic === STILL_COLLIDING_REROLL.stress_tic, r.bible && r.bible.stress_tic);
  note('MAXIMUM PHYSICAL REQUESTS THIS SCENARIO DEMONSTRATES: 1 (foundation) + 2 (reroll) = 3, matching the declared budget contract\'s per-operation ceiling of 5 (3 foundation-tier failover + 2 reroll) with margin unused since the primary tier succeeded immediately.');
  await browser.close();
}

// ══════════════════════════════════════════════════════════════════════════════════════
section('SCENARIO 5 — no rerolls after a failed/no-content foundation (structural, not just asserted)');
{
  let pcCount = 0, rerollCount = 0;
  const { browser, page } = await boot(baseRoute(async (route, req, url, p) => {
    if (!/\/api\/(mistral-proxy|proxy|chatgpt-proxy)\b/.test(url)) return false;
    let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
    const sys = (b.messages || []).filter(m => m.role === 'system').map(m => m.content).join('\n');
    if (isBodyTellReroll(sys)) { rerollCount++; fulfillRerollSuccess(route, STILL_COLLIDING_REROLL); return true; }
    if (!isPcBible(sys)) { fulfillMistralSuccess(route, { ok: true }); return true; }
    pcCount++;
    fulfillFail(route, 502); // ALL THREE tiers fail — no bible is ever produced.
    return true;
  }));
  const r = await page.evaluate(async () => {
    const bible = await window._generatePCBodyBible();
    return { bible };
  });
  ok('S5: 3 physical foundation-tier requests fired (all failed)', pcCount === 3, 'pcCount=' + pcCount);
  ok('S5: ZERO body-tell reroll requests fired — structurally unreachable, since the reroll gate lives after successful bible parsing, which a total upstream failure never reaches', rerollCount === 0, 'rerollCount=' + rerollCount);
  ok('S5: the outcome is still the named failure record, consistent with scenario 3', r.bible && r.bible.__pcFoundationOutcome === 'PC_FOUNDATION_UPSTREAM_FAILURE');

  // Second call: also no-content-but-not-thrown (all tiers respond 200 with empty content) — a
  // DIFFERENT failure shape (empty content, not an HTTP error) that must ALSO gate rerolls off.
  const { browser: browser2, page: page2 } = await boot(baseRoute(async (route, req, url, p) => {
    if (!/\/api\/(mistral-proxy|proxy|chatgpt-proxy)\b/.test(url)) return false;
    let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
    const sys = (b.messages || []).filter(m => m.role === 'system').map(m => m.content).join('\n');
    if (isBodyTellReroll(sys)) { rerollCount++; fulfillRerollSuccess(route, STILL_COLLIDING_REROLL); return true; }
    if (!isPcBible(sys)) { fulfillMistralSuccess(route, { ok: true }); return true; }
    // `return route.fulfill(...)` would return route.fulfill's OWN resolved value (undefined,
    // since fulfill() resolves void) as this async closure's return — baseRoute's `if (handled)
    // return;` would then see a falsy value and call route.fulfill() a SECOND time, crashing with
    // "Route is already handled!". Every other branch in this file avoids this by returning the
    // literal `true` on its own statement; matched here too.
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'ctrl', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: '' } }] }) });
    return true;
  }));
  const r2 = await page2.evaluate(async () => {
    const bible = await window._generatePCBodyBible();
    return { bible };
  });
  ok('S5b: empty-content-on-every-tier ALSO produces the named failure (via _callTieredProvider\'s own "empty content" tier-fail path), not a silent null', r2.bible && r2.bible.__pcFoundationOutcome === 'PC_FOUNDATION_UPSTREAM_FAILURE', JSON.stringify(r2.bible));
  ok('S5b: ZERO reroll requests fired for the empty-content failure path either (rerollCount unchanged across both sub-scenarios)', rerollCount === 0, 'rerollCount=' + rerollCount);
  await browser.close(); await browser2.close();
}

// ══════════════════════════════════════════════════════════════════════════════════════
// SCENARIO 6 (Roman, corrective follow-up #11, 2026-09-15) — the REAL failure shape the second
// live sample actually observed: all THREE independent provider routes (mistral-proxy, proxy,
// chatgpt-proxy) return the SAME error — a Vercel-dev-server "NO_RESPONSE_FROM_FUNCTION" 502,
// with a PLAIN-TEXT body (not JSON), and no usable content from ANY tier. Confirmed (dry, zero
// provider contact) via a direct curl to /api/config — a provider-agnostic endpoint — returning
// the IDENTICAL error at the time of that run: strong evidence the failure sits at the local
// dev-server/serverless-runtime layer (very likely resource exhaustion — 521 leaked
// @vercel/node/dist/dev-server.mjs child processes, ~1.7GB RSS, were found running at the time),
// not three independent provider outages, not a shared proxy/dispatcher BUG in this app's own
// code, and not per-provider handler defects. This scenario proves the APP's own handling of
// that exact real shape is safe regardless of which layer eventually turns out to be at fault:
// no crash on a non-JSON error body, a correctly named failure, and — the specific defensive
// check Roman asked for — that even a caller who naively hands the failure record itself to the
// validator/merge boundary (as if it were a bible) gets a clean refusal, never a crash, never a
// partial commit. ──
section('SCENARIO 6 — common-dispatch failure across all tiers (the REAL observed shape: identical 502 + plain-text NO_RESPONSE_FROM_FUNCTION body on every tier)');
{
  let pcCount = 0;
  const REAL_BODY = 'An error occurred with this application.\n\nNO_RESPONSE_FROM_FUNCTION\n';
  const { browser, page } = await boot(baseRoute(async (route, req, url, p) => {
    if (!/\/api\/(mistral-proxy|proxy|chatgpt-proxy)\b/.test(url)) return false;
    let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
    const sys = (b.messages || []).filter(m => m.role === 'system').map(m => m.content).join('\n');
    if (!isPcBible(sys)) { fulfillMistralSuccess(route, { ok: true }); return true; }
    pcCount++;
    // PLAIN TEXT, not JSON — matches the real observed shape exactly (contentType text/plain,
    // status 502). _tieredProviderDispatch's error path already uses r.text(), never r.json(),
    // on failure — this proves that choice was correct, not merely untested.
    route.fulfill({ status: 502, contentType: 'text/plain', body: REAL_BODY });
    return true;
  }));
  const r = await page.evaluate(async () => {
    const before = JSON.stringify(window.state._pcPortfolio || null);
    const bible = await window._generatePCBodyBible();
    // DEFENSIVE CHECK: a caller who forgot to check __pcFoundationOutcome and handed the failure
    // record itself to the real validator/merge boundary, exactly as a bible — must be refused
    // cleanly, never crash, never partially commit.
    let mergeOnFailureObject = null;
    try { mergeOnFailureObject = window._commitValidatedPcFoundation(window.state, bible); }
    catch (e) { mergeOnFailureObject = { threw: String(e && e.message) }; }
    const after = JSON.stringify(window.state._pcPortfolio || null);
    return { bible, before, after, mergeOnFailureObject, pcBodyBibleOnState: window.state.pcBodyBible || null };
  });
  ok('S6: all 3 physical attempts fired with the REAL observed error shape (502, plain-text NO_RESPONSE_FROM_FUNCTION)', pcCount === 3, 'pcCount=' + pcCount);
  ok('S6: the non-JSON error body did NOT crash dispatch — a clean named failure resulted, not an unhandled exception', r.bible && r.bible.__pcFoundationOutcome === 'PC_FOUNDATION_UPSTREAM_FAILURE', JSON.stringify(r.bible));
  ok('S6: all 3 attempts in the failure record report httpStatus:502 and hadContent:false, correlated per-attempt', r.bible && r.bible.attempts.every(a => a.httpStatus === 502 && a.hadContent === false), JSON.stringify(r.bible && r.bible.attempts));
  ok('S6: state.pcBodyBible was never set', r.pcBodyBibleOnState === null);
  ok('S6: state._pcPortfolio is byte-identical before and after this failed operation — zero mutation', r.before === r.after, JSON.stringify({ before: r.before, after: r.after }));
  ok('S6: [DEFENSIVE] passing the failure record itself to _commitValidatedPcFoundation (simulating a caller that forgot to check __pcFoundationOutcome) is cleanly REFUSED, never crashes, never partially commits',
    r.mergeOnFailureObject && r.mergeOnFailureObject.committed === false && !r.mergeOnFailureObject.threw, JSON.stringify(r.mergeOnFailureObject));
  await browser.close();
}

console.log('\n' + '='.repeat(70));
const pass = rows.filter(r => r[1]).length, fail = rows.length - pass;
console.log('PC FOUNDATION PROVIDER-FAILOVER + BUDGET-CONTRACT CONTROL: ' + rows.length + ' rows · ' + pass + ' passed · ' + fail + ' failed');
console.log('\nBUDGET CONTRACT FOR A FUTURE AUTHORIZATION (report, not a claim about this run\'s cost):');
console.log('  ONE logical PC-foundation operation = 1-3 physical requests (Mistral primary -> Grok');
console.log('  fallback -> OpenAI terminal, each ONLY after the prior tier genuinely failed or returned');
console.log('  empty content; stops at first success). PLUS 0-2 physical body-tell reroll requests,');
console.log('  reachable ONLY after the foundation operation above already produced real bible content');
console.log('  (never after an upstream failure — proven structurally in scenario 5, both HTTP-error and');
console.log('  empty-content failure shapes). MAXIMUM PHYSICAL REQUESTS FOR ONE AUTHORIZED OPERATION: 5.');
console.log('  STOP CONDITIONS: foundation tiers stop at first success, or after the terminal (3rd) tier');
console.log('  fails (operation becomes PC_FOUNDATION_UPSTREAM_FAILURE, zero further requests attempted');
console.log('  for that operation); rerolls stop at first diversity-pass or after 2 attempts (best-effort).');
process.exit(fail ? 1 : 0);
