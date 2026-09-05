// momentum_smoke.mjs — FREE local smoke-test of the landed SCENE-SPINE branch + both momentum arms.
// No generation, no API spend: just load the served app headless, capture console errors, and assert
// the momentum surface (SCENE-SPINE flags, Arm A/B entrypoints, analyzer, corpus selector) is intact.
import { chromium } from 'playwright-core';

const URL = 'http://localhost:3000/';
const errors = [];
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + (e && e.message)));

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && typeof window.state === 'object', { timeout: 30000 });
// let late scripts (momentum modules) finish attaching
await page.waitForFunction(() => typeof window._verifyDelivery === 'function' && typeof window._momentumEval === 'function', { timeout: 15000 }).catch(() => {});

const surface = await page.evaluate(() => ({
  // Arm B (my modules)
  verifyDelivery: typeof window._verifyDelivery,
  runTransitionRetry: typeof window._runTransitionRetry,
  momentumEval: typeof window._momentumEval,
  momentumCorpus: typeof window._momentumCorpus,
  authorChatCapture: typeof window._authorChatCapture,
  transitionRetryDump: typeof window.__transitionRetryDump,
  // Arm A default flags (landed, default-ON except placement/mandate)
  spineDefaultOn: window._stateChangeSpineV0 !== false,         // true = SCENE-SPINE base directive active
  windowV1Default: window.__transitionWindowV1 === true,        // false expected (placement variant off)
  mandateDefault: window._deliveryMandate === 'B' ? 'B' : 'A',  // 'A' expected
  retryExpDefault: window.__transitionRetryExperiment === true, // false expected (default OFF)
  // shared: the historical library accessor + prose corpus presence in THIS (fresh) context
  auditTail: typeof window._auditTail,
  auditCount: (typeof window._auditTail === 'function') ? (window._auditTail(9999) || []).length : -1,
  proseCorpusLen: (() => { try { return (JSON.parse(localStorage.getItem('sb_prose_corpus') || '[]') || []).length; } catch (e) { return -1; } })(),
  // prose entrypoint present
  orchestrateTurn: typeof (window.generateOrchestatedTurn) // may be inner-scoped → undefined is expected/fine
}));

// Smoke assertions: Arm B surface must be live, SCENE-SPINE defaults correct, no console errors.
const checks = {
  'Arm B verifier live':        surface.verifyDelivery === 'function',
  'Arm B retry live':           surface.runTransitionRetry === 'function',
  'analyzer live':              surface.momentumEval === 'function',
  'corpus selector live':       surface.momentumCorpus === 'function',
  'author capture wrapper live':surface.authorChatCapture === 'function',
  'SCENE-SPINE default ON':     surface.spineDefaultOn === true,
  'placement variant OFF':      surface.windowV1Default === false,
  'mandate default A':          surface.mandateDefault === 'A',
  'retry exp default OFF':      surface.retryExpDefault === false,
  'no console/page errors':     errors.length === 0
};

console.log('\n=== MOMENTUM SMOKE — surface ===');
console.log(JSON.stringify(surface, null, 2));
console.log('\n=== checks ===');
let pass = true;
for (const [k, v] of Object.entries(checks)) { console.log((v ? '  ✓ ' : '  ✗ ') + k); if (!v) pass = false; }
if (errors.length) { console.log('\n--- console/page errors (' + errors.length + ') ---'); errors.slice(0, 15).forEach(e => console.log('  • ' + e.slice(0, 300))); }
console.log('\nRESULT: ' + (pass ? 'PASS — SCENE-SPINE + both arms load clean' : 'FAIL — see ✗ above'));
await browser.close();
process.exit(pass ? 0 : 1);
