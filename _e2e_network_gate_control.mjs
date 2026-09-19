// FAIL-CLOSED NETWORK GATE — REAL BROWSER CONTROL (Roman, 2026-09-19)
//
// Proves _e2e_network_gate.mjs's contract for real-browser controls in this repo: install the
// gate FIRST, before any navigation; a request matching an explicitly registered stub gets that
// fixed response (no real network egress either way); a request matching NO registered stub is
// aborted BEFORE it ever leaves the browser and recorded as a violation — never a silent
// pass-through, never a real provider call. This is the harness-level fix for the real gap found
// building _first_sacrifice_fate_card_scene2_control.mjs (see
// _first_sacrifice_fate_card_scene2_incident_2026_09_19.md) — a CG scaffold generator hitting a
// raw fetch() entirely outside the app.js-level StoryboundOrchestration stubs.
//
// Self-contained: no dev server required. The page is a minimal in-memory HTML fixture (no
// dependency on public/index.html or localhost:3000 being up) whose script issues real fetch()
// calls to fully-qualified, guaranteed-unreachable destinations (a reserved TEST-NET address,
// RFC 5737) — proving the gate itself, not this app's specific endpoints. Playwright's route
// interception runs before the browser dispatches anything, so "abort" is a real guarantee
// regardless of whether the destination host would ever have answered.
//
// usage: node _e2e_network_gate_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';

const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 400) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

// RFC 5737 TEST-NET-1 — reserved, guaranteed non-routable/unreachable. A stub match here would
// never accidentally succeed against a real server; an unstubbed leak here would hang/fail on its
// own, proving nothing was silently satisfied by a real host.
const ORIGIN = 'http://203.0.113.1';

const FIXTURE_HTML = `<!doctype html><html><body><script>
  window.__results = {};
  async function tryFetch(key, url) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const j = await r.json().catch(function () { return null; });
      window.__results[key] = { ok: true, status: r.status, json: j };
    } catch (e) {
      window.__results[key] = { ok: false, error: String(e && e.message) };
    }
  }
  window.__runFetch = tryFetch;
</script></body></html>`;

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'chrome' });
  } catch (e) {
    console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message));
    process.exit(2);
  }
  const page = await (await browser.newContext()).newPage();

  section('1. INSTALL-FIRST ORDERING — the gate installed before any navigation catches the very first request');
  const gate = await installFailClosedNetworkGate(page);
  ok('installFailClosedNetworkGate resolves before any page has loaded (install-first is possible, not just documented)', true);

  await page.setContent(FIXTURE_HTML);

  // No stub registered yet for /api/mistral-proxy — the very first call to it, with nothing
  // registered, must still be caught (not accidentally allowed through by an empty stub list).
  await page.evaluate((origin) => window.__runFetch('firstCall', origin + '/api/mistral-proxy'), ORIGIN);
  const firstCallResult = await page.evaluate(() => window.__results.firstCall);
  const unstubbedAfterFirst = gate.unstubbed();
  ok('a request with ZERO stubs registered is aborted, not silently allowed through', firstCallResult && firstCallResult.ok === false, JSON.stringify(firstCallResult));
  ok('the unmatched request is recorded as a violation (fail LOCALLY, not silently)', unstubbedAfterFirst.length === 1 && /mistral-proxy/.test(unstubbedAfterFirst[0].url), JSON.stringify(unstubbedAfterFirst));

  section('2. EXPLICIT STUB REGISTRATION — added AFTER install, matched correctly, no real egress');
  gate.stub('/api/mistral-proxy', () => ({ content: 'FIXED STUB CONTENT', usage: { tokens: 0 } }));
  await page.evaluate((origin) => window.__runFetch('secondCall', origin + '/api/mistral-proxy'), ORIGIN);
  const secondCallResult = await page.evaluate(() => window.__results.secondCall);
  ok('once a stub is registered (after install, before this specific traffic), the SAME endpoint now resolves to the fixed stub content', secondCallResult && secondCallResult.ok === true && secondCallResult.json && secondCallResult.json.content === 'FIXED STUB CONTENT', JSON.stringify(secondCallResult));
  ok('registering the stub did not retroactively un-record the earlier violation (calls() is an append-only log)', gate.calls().filter(c => /mistral-proxy/.test(c.url)).length === 2, JSON.stringify(gate.calls()));

  section('3. A DIFFERENT, STILL-UNREGISTERED PATH — caught independently, not conflated with the registered one');
  await page.evaluate((origin) => window.__runFetch('thirdCall', origin + '/api/some-other-proxy'), ORIGIN);
  const thirdCallResult = await page.evaluate(() => window.__results.thirdCall);
  const unstubbedAfterThird = gate.unstubbed();
  ok('an unrelated, still-unregistered /api/** path is independently aborted', thirdCallResult && thirdCallResult.ok === false, JSON.stringify(thirdCallResult));
  ok('both violations (the pre-stub mistral-proxy call and this one) are present — every miss is recorded, not just the first', unstubbedAfterThird.length === 2, JSON.stringify(unstubbedAfterThird));

  section('4. NON-/api/ TRAFFIC IS UNTOUCHED — the gate is scoped, not a blanket network kill');
  let nonApiOk = false, nonApiDetail = '';
  try {
    // Same reserved, non-routable destination, but outside /api/ — the gate must not intercept
    // this at all (Playwright's own connection failure proves the route never engaged; a
    // route.abort() vs. a raw connection failure surface as the same rejected-fetch shape from
    // inside the page, so this checks gate.calls() instead — the authoritative signal).
    await page.evaluate((origin) => window.__runFetch('outOfScope', origin + '/not-api/whatever'), ORIGIN);
    const outOfScopeResult = await page.evaluate(() => window.__results.outOfScope);
    nonApiOk = outOfScopeResult && outOfScopeResult.ok === false; // fails for its own reason (unreachable host), not via this gate
    nonApiDetail = JSON.stringify(outOfScopeResult);
  } catch (e) { nonApiDetail = String(e && e.message); }
  const apiOnlyCalls = gate.calls();
  ok('a non-/api/ request against the same reserved host is never recorded by this gate at all (scoped to /api/**, not a blanket block)', !apiOnlyCalls.some(c => /not-api/.test(c.url)), JSON.stringify(apiOnlyCalls));

  section('5. FAIL-CLOSED GUARANTEE — abort happens even though the destination could never have answered');
  // ORIGIN is RFC 5737 TEST-NET-1 — nothing is listening there. If the gate's abort() were a
  // no-op (or if it silently fell through to a real dispatch), this fetch would hang/timeout on
  // its own rather than reject immediately with the gate's own signal. Confirm it resolved fast.
  const t0 = Date.now();
  await page.evaluate((origin) => window.__runFetch('timingCheck', origin + '/api/timing-probe'), ORIGIN);
  const elapsedMs = Date.now() - t0;
  const timingResult = await page.evaluate(() => window.__results.timingCheck);
  ok('an unstubbed call against an unreachable destination still fails FAST (< 2s) — proof the gate itself rejected it, not a network timeout', timingResult && timingResult.ok === false && elapsedMs < 2000, 'elapsed=' + elapsedMs + 'ms result=' + JSON.stringify(timingResult));

  console.log('\n' + '='.repeat(96));
  console.log('FAIL-CLOSED NETWORK GATE CONTROL: ' + results.filter(r => r.pass).length + '/' + results.length + ' passed');
  await browser.close();
  process.exitCode = results.every(r => r.pass) ? 0 : 1;
})().catch(function (e) { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
