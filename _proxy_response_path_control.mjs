// THE PROXY'S OWN RESPONSE PATH, with the UPSTREAM MOCKED. Provider-free, no network, no secrets.
//
// Browser-level fixtures bypass the layer that failed: in the void run every response reached the
// browser as NO_RESPONSE_FROM_FUNCTION while api/proxy.js logged status=200 for real Grok calls.
// This imports the real handler and stubs global.fetch, so the function's own request handling and
// response delivery are exercised without contacting a provider.
//
// TWO DISPROVEN HYPOTHESES OF MINE, recorded so they are not repeated:
//  1. "the proxies declare no maxDuration, so the runtime cuts them off" — api/diag-slow.js
//     sleeping 40s returns HTTP 200 JSON through the same dev runtime. Duration alone does not
//     drop a response.
//  2. "the proxy has no upstream timeout" — IT HAS ONE. api/proxy.js:179 is
//     XAI_CALL_TIMEOUT_MS = Number(process.env.XAI_CALL_TIMEOUT_MS) || 90000, and line ~451 wraps
//     both the fetch AND the subsequent response.text() in an AbortController that fires at that
//     bound. My earlier test waited SIX SECONDS against a NINETY-SECOND timeout and concluded
//     there was none — and its mock ignored the abort signal entirely, so it would have hung even
//     when a real abort fired. That test could not support the claim.
//     The timeout is now tested properly: the mock HONOURS signal, and XAI_CALL_TIMEOUT_MS is
//     overridden to make the bound fast.
import assert from 'node:assert';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

// A dummy key so the handler's presence check passes. No real credential is read or printed, and
// global.fetch never reaches the network.
process.env.XAI_API_KEY = process.env.XAI_API_KEY || 'test-not-a-real-key';
process.env.GROK_API_KEY = process.env.GROK_API_KEY || 'test-not-a-real-key';

const UPSTREAM_OK = {
  id: 'chatcmpl-test', model: 'grok-4.3',
  choices: [{ message: { role: 'assistant', content: '{"li_dialogue":"Say it again.","li_action":"He does not move.","scene_state":"continue"}' }, finish_reason: 'stop' }],
  usage: { prompt_tokens: 1200, completion_tokens: 80, total_tokens: 1280,
    prompt_tokens_details: { cached_tokens: 128 }, cost_in_usd_ticks: 15000000 }
};

const mkRes = () => {
  const r = { statusCode: null, headers: {}, body: null, ended: false };
  r.status = (c) => { r.statusCode = c; return r; };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.getHeader = (k) => r.headers[k];
  r.json = (o) => { r.body = o; r.ended = true; return r; };
  r.send = (o) => { r.body = o; r.ended = true; return r; };
  r.end = (o) => { if (o !== undefined) r.body = o; r.ended = true; return r; };
  r.write = (o) => { r.body = (r.body || '') + String(o); return true; };
  return r;
};
const mkReq = (body) => ({ method: 'POST', body, query: {}, headers: { 'content-type': 'application/json' } });

const realFetch = global.fetch;
let fetchCalls = [];
const stubFetch = (impl) => { fetchCalls = [];
  global.fetch = async (url, opts) => { fetchCalls.push({ url: String(url), opts }); return impl(url, opts); }; };
const okUpstream = () => stubFetch(async () => ({
  ok: true, status: 200, headers: { get: () => 'application/json' },
  json: async () => UPSTREAM_OK, text: async () => JSON.stringify(UPSTREAM_OK) }));

let handler = null;
try {
  const mod = await import('./api/proxy.js');
  handler = mod.default || mod.handler;
} catch (e) {
  console.log('  FAIL could not import api/proxy.js — ' + e.message);
  process.exit(1);
}
t('the proxy handler imports', typeof handler === 'function');

console.log('=== 1. A HEALTHY UPSTREAM RETURNS A PARSEABLE RESPONSE ===');
{
  okUpstream();
  const req = mkReq({ messages: [{ role: 'system', content: 'x'.repeat(200) }],
    model: 'grok-4-1-fast-non-reasoning', max_tokens: 400, role: 'INTIMACY_SPECIALIST' });
  const res = mkRes();
  let threw = null;
  try { await handler(req, res); } catch (e) { threw = e; }
  console.log('  upstream calls: ' + fetchCalls.length
    + ' | status ' + res.statusCode + ' | ended ' + res.ended);
  t('the handler did not throw', !threw, threw && threw.message);
  t('it contacted the upstream exactly once', fetchCalls.length === 1,
    'calls=' + fetchCalls.length);
  t('it RETURNED A RESPONSE', res.ended === true && res.statusCode === 200,
    'status=' + res.statusCode + ' ended=' + res.ended);
  const body = (typeof res.body === 'string') ? (() => { try { return JSON.parse(res.body); } catch (_) { return null; } })() : res.body;
  t('the body is JSON the runner could parse', !!body && typeof body === 'object');
  t('AND IT CARRIES THE USAGE RECEIPT the runner needs',
    !!(body && body.usage && typeof body.usage.cost_in_usd_ticks === 'number'),
    body ? JSON.stringify(Object.keys(body)) : 'no body');
  if (body && body.usage) {
    console.log('  receipt: ticks=' + body.usage.cost_in_usd_ticks
      + ' -> $' + (body.usage.cost_in_usd_ticks * 1e-10).toFixed(7)
      + ' | cached=' + (body.usage.prompt_tokens_details || {}).cached_tokens);
  }
}

console.log('');
console.log('=== 2. THE PROXY\'S OWN UPSTREAM TIMEOUT, TESTED PROPERLY ===');
// A mock that HONOURS cancellation, with the proxy's own bound overridden to 1.2s so the test is
// fast. If the AbortController works, the handler stops waiting and returns on its own.
{
  process.env.XAI_CALL_TIMEOUT_MS = '1200';
  const mod2 = await import('./api/proxy.js?fresh=' + Date.now());
  const h2 = mod2.default || mod2.handler;
  let sawSignal = false, aborted = false;
  stubFetch((url, opts) => new Promise((resolve, reject) => {
    const sig = opts && opts.signal;
    sawSignal = !!sig;
    if (sig) {
      if (sig.aborted) { aborted = true; const e = new Error('The operation was aborted.');
        e.name = 'AbortError'; return reject(e); }
      sig.addEventListener('abort', () => { aborted = true;
        const e = new Error('The operation was aborted.'); e.name = 'AbortError'; reject(e); });
    }
    // otherwise never settle — only cancellation can end this
  }));
  const req = mkReq({ messages: [{ role: 'system', content: 'x' }],
    model: 'grok-4-1-fast-non-reasoning', max_tokens: 100, role: 'INTIMACY_SPECIALIST' });
  const res = mkRes();
  const t0 = Date.now();
  const outcome = await Promise.race([
    h2(req, res).then(() => 'returned').catch(e => 'threw: ' + e.message),
    new Promise(r => setTimeout(() => r('STILL PENDING after 20s'), 20000))
  ]);
  const elapsed = Date.now() - t0;
  console.log('  bound ' + process.env.XAI_CALL_TIMEOUT_MS + 'ms | outcome: ' + outcome
    + ' | elapsed ' + elapsed + 'ms | signal seen ' + sawSignal + ' | aborted ' + aborted);
  t('the proxy PASSES an abort signal to its upstream fetch', sawSignal === true);
  t('THE UPSTREAM TIMEOUT FIRES and the mock is cancelled', aborted === true);
  t('the handler stops waiting rather than hanging forever', outcome !== 'STILL PENDING after 20s',
    outcome);
  t('and it does so near its configured bound, not at 90s',
    elapsed < 15000, 'elapsed ' + elapsed + 'ms');
  console.log('  -> "the proxy has no upstream timeout" is WITHDRAWN. It has one, it fires, and the');
  console.log('     handler advances its model chain instead of waiting forever.');
  delete process.env.XAI_CALL_TIMEOUT_MS;
}

global.fetch = realFetch;
console.log('');
console.log(pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
