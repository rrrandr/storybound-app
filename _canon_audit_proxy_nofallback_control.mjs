// PROXY-LEVEL NO-FALLBACK CONTROL — ZERO network, $0.
//
// WHY THIS EXISTS, AND WHY THE BROWSER CONTROL COULD NOT DO IT.
// _canon_audit_selective_integration_control.mjs stubs /api/proxy, so it intercepts the request
// BEFORE api/proxy.js runs. Its "exactly one request" assertion is therefore about BROWSER
// requests, and is structurally blind to what the proxy then does upstream. api/proxy.js runs its
// own model chain and `continue`s to the next entry on a timeout or fetch error — so ONE client
// audit could become THREE upstream xAI calls, every one of them billable. That is precisely the
// containment failure the grok-4.7 run hit.
//
// This control invokes the REAL handler in-process with a stubbed global fetch, which is the only
// vantage point from which upstream attempts are countable at all.
//
// usage: node _canon_audit_proxy_nofallback_control.mjs

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// api/proxy.js is an ES module with a default export; importing it gives the REAL handler.
const handler = (await import('./api/proxy.js')).default;

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '\n        → ' + String(detail).slice(0, 400) : ''));
};
function section(t) { console.log('\n=== ' + t + ' ==='); }

function mockRes() {
  const r = { statusCode: 200, body: null, headers: {} };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  return r;
}
// The handler reads req.headers.origin for CORS before anything else.
const REQ = (body) => ({ method: 'POST', headers: { origin: 'http://localhost:3000' }, body });
const BODY = (extra) => Object.assign({
  role: 'STRUCTURE_GENERATOR',
  preferredModel: 'grok-4.3',
  reasoningEffort: 'high',
  max_tokens: 2000,
  temperature: 0,
  messages: [{ role: 'system', content: 'You are a CANON AUDITOR' }, { role: 'user', content: 'plan' }]
}, extra || {});

// Capture every UPSTREAM call the handler makes, and control whether it succeeds.
let upstream = [];
let mode = 'ok';
const realFetch = global.fetch;
global.fetch = async (url, opts) => {
  let b = null; try { b = JSON.parse(opts && opts.body); } catch (_) {}
  upstream.push({ url: String(url), model: b && b.model, effort: b && b.reasoning && b.reasoning.effort });
  if (mode === 'timeout') { const e = new Error('aborted'); e.name = 'AbortError'; throw e; }
  if (mode === 'fetcherr') throw new Error('socket hang up');
  return {
    ok: true, status: 200, headers: { get: () => null },
    text: async () => JSON.stringify({
      choices: [{ message: { content: '{"verdict":"pass","violations":[]}' } }],
      usage: { prompt_tokens: 3200, completion_tokens: 80,
        completion_tokens_details: { reasoning_tokens: 900 }, cost_in_usd_ticks: 53000000 }
    })
  };
};

process.env.XAI_API_KEY = process.env.XAI_API_KEY || 'test-key-not-used-no-network';

(async () => {
  console.log('=== PROXY NO-FALLBACK CONTROL (zero network, $0) ===');
  console.log('  global.fetch is stubbed — no request leaves this process.\n');

  section('1. WITHOUT _noFallback: ONE client request becomes THREE upstream calls');
  upstream = []; mode = 'timeout';
  let res = mockRes();
  await handler(REQ(BODY({ _sbModelOverride: 'grok-4.3' })), res);
  const withoutFlag = upstream.length;
  console.log('    upstream attempts: ' + withoutFlag + '  models: ' + JSON.stringify(upstream.map((u) => u.model)));
  ok('RED PROOF — the chain retries, so a single audit can cost multiple billable calls',
    withoutFlag > 1, 'attempts=' + withoutFlag);
  ok('...and every retry calls grok-4.3 again, so _sbModelOverride pins the MODEL but not the COUNT',
    upstream.every((u) => u.model === 'grok-4.3'), JSON.stringify(upstream.map((u) => u.model)));

  section('2. WITH _noFallback under a FORCED TIMEOUT: exactly one upstream call');
  upstream = []; mode = 'timeout';
  res = mockRes();
  await handler(REQ(BODY({ _sbModelOverride: 'grok-4.3', _noFallback: true })), res);
  console.log('    upstream attempts: ' + upstream.length + '   status: ' + res.statusCode);
  ok('EXACTLY ONE upstream xAI call, proven where it is countable', upstream.length === 1,
    'attempts=' + upstream.length);
  ok('...and the failure is RETURNED, not silently retried',
    res.statusCode >= 400, 'status=' + res.statusCode);

  section('3. WITH _noFallback under a FETCH ERROR: same guarantee');
  upstream = []; mode = 'fetcherr';
  res = mockRes();
  await handler(REQ(BODY({ _sbModelOverride: 'grok-4.3', _noFallback: true })), res);
  console.log('    upstream attempts: ' + upstream.length + '   status: ' + res.statusCode);
  ok('exactly one upstream call on a transport error too', upstream.length === 1, 'attempts=' + upstream.length);

  section('3b. WITH _noFallback under a TIMEOUT: same guarantee');
  // The mock has carried a 'timeout' mode (AbortError, what the AbortController produces) since this
  // control was written, but nothing ever asserted it. A timeout is the case most likely to retry
  // silently — the request looks unfinished rather than refused — so it is proven explicitly here.
  upstream = []; mode = 'timeout';
  res = mockRes();
  await handler(REQ(BODY({ _sbModelOverride: 'grok-4.3', _noFallback: true })), res);
  console.log('    upstream attempts: ' + upstream.length + '   status: ' + res.statusCode);
  ok('exactly one upstream call on a TIMEOUT (AbortError) as well',
    upstream.length === 1, 'attempts=' + upstream.length);
  ok('...and the timeout is RETURNED as an error, not converted into a retry',
    res.statusCode >= 400, 'status=' + res.statusCode);
  // RED for the same case: without the flag, a timeout walks the whole chain.
  upstream = []; mode = 'timeout';
  res = mockRes();
  await handler(REQ(BODY({ _sbModelOverride: 'grok-4.3' })), res);
  console.log('    RED (no flag, timeout) upstream attempts: ' + upstream.length);
  ok('RED — WITHOUT the flag a timeout retries, so ONE client call bills several times',
    upstream.length > 1, 'attempts=' + upstream.length);

  section('4. THE SUCCESS PATH REPORTS WHAT ACTUALLY ANSWERED');
  upstream = []; mode = 'ok';
  res = mockRes();
  await handler(REQ(BODY({ _sbModelOverride: 'grok-4.3', _noFallback: true })), res);
  const orch = (res.body && res.body._orchestration) || {};
  console.log('    _orchestration: ' + JSON.stringify(orch));
  ok('one upstream call on success', upstream.length === 1, 'attempts=' + upstream.length);
  ok('upstreamAttempts === 1 is REPORTED, so a caller can verify containment',
    orch.upstreamAttempts === 1, JSON.stringify(orch.upstreamAttempts));
  ok('resolvedModel names the model actually called, not the chain label',
    orch.resolvedModel === 'grok-4.3', JSON.stringify(orch.resolvedModel));
  ok('the upstream request really did name grok-4.3 at reasoning high',
    upstream[0] && upstream[0].model === 'grok-4.3' && upstream[0].effort === 'high',
    JSON.stringify(upstream[0]));
  ok('the provider\'s own cost ticks survive for per-audit telemetry',
    res.body && res.body.usage && res.body.usage.cost_in_usd_ticks === 53000000);

  section('5. _noFallback DOES NOT LEAK INTO OTHER CALLERS');
  upstream = []; mode = 'timeout';
  res = mockRes();
  await handler(REQ(BODY({})), res);   // no flag at all
  ok('a caller that omits the flag keeps its full fallback chain, unchanged',
    upstream.length === withoutFlag, 'attempts=' + upstream.length + ' vs baseline ' + withoutFlag);

  global.fetch = realFetch;
  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(86));
  console.log('  ' + passed + '/' + results.length + ' assertions passed');
  if (passed !== results.length) console.log('  FAILED: ' + results.filter((r) => !r.pass).map((r) => r.name).join(' | '));
  process.exit(passed === results.length ? 0 : 1);
})().catch((e) => { global.fetch = realFetch; console.error('CONTROL ERROR:', e && e.stack || e); process.exit(2); });
