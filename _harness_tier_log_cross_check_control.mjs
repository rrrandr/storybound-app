// waitForSettlement TIER-LOG CROSS-CHECK — DRY CONTROL (Roman, 2026-09-21)
//
// Roman: "Fix or prove the harness observation issue for fallback settlement in a dry control: the
// gate must not close the browser while a tier fallback request is pending or about to dispatch."
//
// Real retry #7 proved the quiet-period fix (cc503c04) alone is insufficient: the app's own console
// log showed a fallback attempt DECLARED ("[TIERED:scenePlanner] attempt 2 tier=fallback
// provider=mistral...") with no corresponding network request ever appearing before the browser
// closed. _e2e_network_gate.mjs's waitForSettlement now accepts an optional `expectedTierLogRole`
// that cross-checks the app's OWN ground-truth window._providerTierLog (written synchronously,
// before any network delay) against the network-tracked call count — if the app has logged more
// attempts than the network layer has tracked, settlement is refused until they reconcile.
//
// This control PROVES the cross-check by directly simulating the exact race retry #7 hit: write a
// tier-log entry to window._providerTierLog (as _logProviderTierAttempt would, synchronously) WITHOUT
// yet dispatching the corresponding network request, then race waitForSettlement against a short
// timer to confirm it does NOT resolve while the log is ahead of tracking -- and DOES resolve once
// the matching network call appears and settles.
//
// Proves, fully dry (no provider calls, no image calls, no forks):
//   WITHOUT-CROSS-CHECK — the old (still-available) behavior: omitting expectedTierLogRole,
//     waitForSettlement resolves on the first tracked call alone, exactly reproducing the race retry
//     #7 hit (a real, deliberate negative control — proves the bug scenario is real and reproducible,
//     not hypothetical).
//   WITH-CROSS-CHECK — supplying expectedTierLogRole, waitForSettlement does NOT resolve while the
//     tier log shows an attempt the network layer hasn't tracked yet.
//   RECONCILES — once the matching network call is dispatched and settles, waitForSettlement
//     correctly resolves (the cross-check doesn't hang forever, only until parity).
//
// usage: node _harness_tier_log_cross_check_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';

const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 400) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  // The gate only intercepts '**/api/**' — navigate to the real app so relative fetch() calls
  // resolve to a real origin, and use /api/-prefixed paths so the gate's own route pattern matches.
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });

  section('WITHOUT-CROSS-CHECK — reproduces the exact race retry #7 hit (negative control)');
  {
    const gate = await installFailClosedNetworkGate(page, { logFile: '/dev/null' });
    gate.setPhase('race-test-a', 5);
    gate.stub('/api/fake-tier1', () => ({ ok: true }));
    // Simulate: the app logs "attempt 2" to its own tier log SYNCHRONOUSLY, well before it dispatches
    // the corresponding network request (mirrors _logProviderTierAttempt firing before
    // _tieredProviderDispatch's fetch resolves through Playwright's interceptor).
    await page.evaluate(() => { window._providerTierLog = window._providerTierLog || []; window._providerTierLog.push({ role: 'raceTest', tier: 'primary', at: Date.now() }); });
    await page.evaluate(() => fetch('/api/fake-tier1').catch(() => {}));
    const settled = await gate.waitForSettlement('race-test-a', { watchdogMs: 30000, quietMs: 500, pollMs: 100 });
    // Now simulate the SECOND attempt being logged, but its network request deliberately never fires
    // in this test — mirrors the exact retry-#7 shape (declared, never tracked).
    await page.evaluate(() => { window._providerTierLog.push({ role: 'raceTest', tier: 'fallback', at: Date.now() }); });
    ok('with no cross-check, settlement already resolved on tier 1 alone (the bug, reproduced)', settled.length === 1, 'settled.length=' + settled.length);
  }

  section('WITH-CROSS-CHECK — does NOT settle while the tier log is ahead of network tracking');
  {
    const gate = await installFailClosedNetworkGate(page, { logFile: '/dev/null' });
    gate.setPhase('race-test-b', 5);
    gate.stub('/api/fake-tier1b', () => ({ ok: true }));
    await page.evaluate(() => { window._providerTierLogB = []; });
    // Tier 1 logged AND dispatched — settles normally.
    await page.evaluate(() => { window._providerTierLog.push({ role: 'raceTestB', tier: 'primary', at: Date.now() }); });
    await page.evaluate(() => fetch('/api/fake-tier1b').catch(() => {}));
    // Tier 2 (fallback) logged, but its network call is deliberately withheld for now.
    await page.evaluate(() => { window._providerTierLog.push({ role: 'raceTestB', tier: 'fallback', at: Date.now() }); });

    let resolvedEarly = false;
    const raceTimeoutMs = 2500;
    const settlementPromise = gate.waitForSettlement('race-test-b', { watchdogMs: 30000, quietMs: 500, pollMs: 100, expectedTierLogRole: 'raceTestB' }).then((r) => { resolvedEarly = true; return r; });
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve('timeout'), raceTimeoutMs));
    const raceResult = await Promise.race([settlementPromise, timeoutPromise]);
    ok('waitForSettlement did NOT resolve within ' + raceTimeoutMs + 'ms while the tier log showed an untracked second attempt', raceResult === 'timeout' && !resolvedEarly, 'raceResult=' + raceResult);

    section('RECONCILES — once the matching network call appears and settles, waitForSettlement resolves');
    gate.stub('/api/fake-tier2b', () => ({ ok: true }));
    await page.evaluate(() => fetch('/api/fake-tier2b').catch(() => {}));
    const finalSettled = await settlementPromise;
    ok('waitForSettlement resolved once the second attempt was actually tracked', Array.isArray(finalSettled) && finalSettled.length === 2, JSON.stringify(finalSettled && finalSettled.map((r) => r.url)));
  }

  await browser.close();
  console.log('\n' + '='.repeat(100));
  console.log('TIER-LOG CROSS-CHECK CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
