// ═══ BIBLE ARTIFACT LEDGER CONTROL (2026-09-13) ═══
// Proves the durable, explicit per-story per-role state machine (absent -> pending ->
// committed|failed, fingerprinted, attempt-tracked) added to _generatePCBodyBible /
// _generateLIBodyBible actually holds — driven through the REAL production functions
// (window._generatePCBodyBible / _generateLIBodyBible), not a reimplementation, exactly as the
// existing proven coalescing control already does. Two scenarios Roman specifically required:
//   (A) the REAL delayed retry-after-failure path (not a same-tick race) — a genuine first-attempt
//       failure (all three tiers exhausted), then a LATER, separate call succeeds — proving the
//       failure is recorded, the retry is recognized and logged as deliberate, and exactly ONE
//       canonical bible reaches state.pcBodyBible.
//   (B) a CONFLICTING-RESULT RED control — a slow, stale in-flight attempt whose declared inputs
//       have since changed (a real explicit refresh started and committed FIRST, faster) must be
//       discarded on late arrival, never overwriting the newer canonical value.
// NEVER git commit/push/stash/checkout/reset. NEVER touch .env.local. NO paid model calls — every
// /api/** answered locally. No DOM forcing — drives the real launch chain, then calls the real
// window._generatePCBodyBible()/_generateLIBodyBible() functions directly (the same pattern the
// existing, already-accepted coalescing scenario in _tiered_provider_policy_control.mjs uses).
import { chromium } from 'playwright-core';
import { installSession, configBody, isAuthOrigin, installEntitledProfileStub } from './_test_session_env.mjs';
const F = await import('./_seed_fixtures.generated.mjs');

const rows = [];
const ok = (n, p, d) => { rows.push([n, !!p]); console.log((p ? 'PASS ' : 'FAIL ') + n + (p ? '' : '  — ' + String(d).slice(0, 900))); };

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

function baseRoute(state, extra) {
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
function isPcBible(sys) { return /DISTINGUISHING FEATURE \(anti-calcification ROTATION — HARD\): this character/.test(sys); }
function fulfillMistralSuccess(route, contentObj) {
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'ctrl', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify(contentObj) } }] }) });
}
function fulfillFail(route) {
  return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'stub_induced_failure' }) });
}

// ═══════════════════════════════════════════════════════ (A) REAL DELAYED RETRY-AFTER-FAILURE ═══════════════════════════════════════════════════════
{
  let pcRequestCount = 0;
  const { browser, page, consoleLines } = await boot(baseRoute(null, async (route, req, url, p) => {
    if (!/\/api\/(mistral-proxy|proxy|chatgpt-proxy)\b/.test(url)) return false;
    let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
    const sys = (b.messages || []).filter(m => m.role === 'system').map(m => m.content).join('\n');
    if (!isPcBible(sys)) { fulfillMistralSuccess(route, { ok: true }); return true; }
    pcRequestCount++;
    // ALL THREE TIERS genuinely fail for pc on the FIRST attempt (request #1 = mistral, #2 = grok,
    // #3 = openai terminal) — a REAL total-exhaustion failure, not a synthetic same-tick race.
    if (pcRequestCount <= 3) { fulfillFail(route); return true; }
    // The SECOND, later, separate call (request #4 onward) succeeds.
    fulfillMistralSuccess(route, F.PC_BIBLE); return true;
  }));

  const first = await page.evaluate(async () => {
    const r = await window._generatePCBodyBible();
    const ledger = (window.state._bibleArtifacts || {}).pc;
    return { result: r, ledgerStatus: ledger && ledger.status, ledgerAttempt: ledger && ledger.attempt, ledgerError: ledger && ledger.error };
  });
  // NAMED INFRASTRUCTURE FAILURE (Roman, corrective follow-up #10, 2026-09-15) — a genuine
  // all-tiers-exhausted failure now returns a distinctly-shaped, retry-eligible failure record
  // (never null, never confusable with a real bible) instead of collapsing to null. This is the
  // REAL fix the live sample's actual 502 exposed: the old bare-null return let
  // _generatePCBodyBible's truthy check mis-mark a failed operation as committed.
  ok('DELAYED-RETRY: a genuine first-attempt failure (all 3 tiers exhausted) is recorded explicitly — status=failed, a real reason, a NAMED failure record (never null, never a bible)',
    first.result && first.result.__pcFoundationOutcome === 'PC_FOUNDATION_UPSTREAM_FAILURE' && first.result.retryEligible === true
    && Array.isArray(first.result.attempts) && first.result.attempts.length === 3
    && first.ledgerStatus === 'failed' && !!first.ledgerError, JSON.stringify(first));
  ok('DELAYED-RETRY: the failure record\'s 3 attempts are each correlated (requestId/tier/provider/httpStatus), not a flattened blob',
    first.result && first.result.attempts.every(a => a.requestId && a.tier && a.provider && a.httpStatus === 500 && a.hadContent === false && a.outcome === 'failed'),
    JSON.stringify(first.result && first.result.attempts));

  // Simulate the delayed second call from a DIFFERENT lifecycle entry point — same declared inputs
  // (no explicit refresh), calling the SAME real function again, exactly as _runEnsureCGScaffold's
  // own independent call site would minutes later in real production.
  const second = await page.evaluate(async () => {
    const r = await window._generatePCBodyBible();
    const ledger = (window.state._bibleArtifacts || {}).pc;
    return { result: r, hasFields: !!(r && r.signature_feature), ledgerStatus: ledger && ledger.status, ledgerAttempt: ledger && ledger.attempt, matchesState: r === window.state.pcBodyBible };
  });
  const retryLogged = consoleLines.some(l => l.indexOf('[BIBLE-ARTIFACT] pc retrying after a recorded failure') === 0);
  ok('DELAYED-RETRY: the later call is recognized + LOGGED as a deliberate retry after the recorded failure (not silently indistinguishable from a fresh first attempt)', retryLogged, JSON.stringify(consoleLines.filter(l => l.indexOf('[BIBLE-ARTIFACT]') === 0)));
  ok('DELAYED-RETRY: the retry succeeds and commits — status=committed, attempt=2, exactly one canonical bible reaches state.pcBodyBible', second.result && second.hasFields && second.ledgerStatus === 'committed' && second.ledgerAttempt === 2 && second.matchesState, JSON.stringify(second));

  await browser.close();
}

// ═══════════════════════════════════════════════════════ (B) CONFLICTING-RESULT RED CONTROL ═══════════════════════════════════════════════════════
{
  let pcAttemptSeen = 0;
  let releaseSlowAttempt = null;
  const slowGate = new Promise(res => { releaseSlowAttempt = res; });
  const { browser, page, consoleLines } = await boot(baseRoute(null, async (route, req, url, p) => {
    if (!/\/api\/(mistral-proxy|proxy|chatgpt-proxy)\b/.test(url)) return false;
    let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
    const sys = (b.messages || []).filter(m => m.role === 'system').map(m => m.content).join('\n');
    if (!isPcBible(sys)) { fulfillMistralSuccess(route, { ok: true }); return true; }
    pcAttemptSeen++;
    if (pcAttemptSeen === 1) {
      // ATTEMPT 1 (stale, about to be superseded): hold the response until explicitly released,
      // AFTER attempt 2 has already committed — a real late-arrival, not a synthetic same-tick race.
      await slowGate;
      fulfillMistralSuccess(route, Object.assign({}, F.PC_BIBLE, { signature_feature: 'STALE-ATTEMPT-1-CONTENT — must never reach state.pcBodyBible' }));
      return true;
    }
    // ATTEMPT 2 (the real, newer, canonical attempt — a genuine explicit refresh): resolves fast.
    fulfillMistralSuccess(route, Object.assign({}, F.PC_BIBLE, { signature_feature: 'CANONICAL-ATTEMPT-2-CONTENT' }));
    return true;
  }));

  // Kick off attempt 1; DO NOT await it yet — it is being held by the route stub.
  const attempt1Promise = page.evaluate(() => window._generatePCBodyBible());
  // Give attempt 1 a moment to genuinely register as pending in the ledger before triggering the refresh.
  await page.waitForTimeout(300);
  const midFlightStatus = await page.evaluate(() => { const l = (window.state._bibleArtifacts || {}).pc; return { status: l && l.status, attempt: l && l.attempt }; });
  ok('CONFLICT: attempt 1 is genuinely pending (not yet resolved) before the refresh starts', midFlightStatus.status === 'pending' && midFlightStatus.attempt === 1, JSON.stringify(midFlightStatus));

  // A REAL explicit refresh: an input that changes the fingerprint (world) changes mid-flight —
  // exactly the "inputs changed" case the ledger is designed to detect and log.
  await page.evaluate(() => { window.state.picks.world = window.state.picks.world === 'Fantasy' ? 'Modern' : 'Fantasy'; });
  const attempt2Result = await page.evaluate(() => window._generatePCBodyBible());
  const afterAttempt2 = await page.evaluate(() => { const l = (window.state._bibleArtifacts || {}).pc; return { status: l && l.status, attempt: l && l.attempt, stateFeature: window.state.pcBodyBible && window.state.pcBodyBible.signature_feature }; });
  const refreshLogged = consoleLines.some(l => l.indexOf('[BIBLE-ARTIFACT] pc EXPLICIT REFRESH') === 0);
  ok('CONFLICT: the input change is recognized + LOGGED as an explicit refresh (fingerprint changed), attempt 2 committed as CANONICAL', refreshLogged && afterAttempt2.status === 'committed' && afterAttempt2.attempt === 2 && afterAttempt2.stateFeature === 'CANONICAL-ATTEMPT-2-CONTENT', JSON.stringify(afterAttempt2));

  // NOW release the stale attempt 1 — it resolves AFTER attempt 2 already committed.
  releaseSlowAttempt();
  await attempt1Promise;
  await page.waitForTimeout(300);
  const afterStaleArrival = await page.evaluate(() => { const l = (window.state._bibleArtifacts || {}).pc; return { status: l && l.status, attempt: l && l.attempt, stateFeature: window.state.pcBodyBible && window.state.pcBodyBible.signature_feature }; });
  const discardLogged = consoleLines.some(l => l.indexOf('[BIBLE-ARTIFACT] pc attempt 1 resolved AFTER being superseded') === 0);
  ok('CONFLICT (RED CASE PROVEN GREEN): the stale attempt 1 late-arrival is discarded — state.pcBodyBible is STILL the canonical attempt-2 content, ledger STILL committed/attempt=2, discard explicitly logged (no silent overwrite, no split-brain)',
    discardLogged && afterStaleArrival.status === 'committed' && afterStaleArrival.attempt === 2 && afterStaleArrival.stateFeature === 'CANONICAL-ATTEMPT-2-CONTENT', JSON.stringify(afterStaleArrival));

  await browser.close();
}

const fails = rows.filter(r => !r[1]).length;
console.log('\nBIBLE ARTIFACT LEDGER CONTROL: ' + rows.length + ' rows · ' + (rows.length - fails) + ' passed · ' + fails + ' failed');
process.exit(fails ? 1 : 0);
