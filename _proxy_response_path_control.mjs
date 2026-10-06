// THE PROXY'S OWN RESPONSE PATH, with the UPSTREAM MOCKED. Provider-free, no network, no secrets.
//
// Browser-level fixtures bypass the layer that failed: in the void run every response reached the
// browser as NO_RESPONSE_FROM_FUNCTION while api/proxy.js logged status=200 for real Grok calls.
// This imports the real handler and stubs global.fetch, so the function's own request handling and
// response delivery are exercised without contacting a provider.
//
// A DISPROVEN HYPOTHESIS, recorded: I expected a missing maxDuration to be the cause. It is not —
// api/diag-slow.js sleeping 40s returns HTTP 200 JSON through the same dev runtime. Duration alone
// does not drop a response.
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
console.log('=== 2. AN UPSTREAM THAT NEVER SETTLES ===');
// The failure shape to explain: the function logs success upstream, then the runtime returns
// nothing. If the handler can be left hanging, it will never deliver a response.
{
  stubFetch(() => new Promise(() => {}));   // never resolves
  const req = mkReq({ messages: [{ role: 'system', content: 'x' }],
    model: 'grok-4-1-fast-non-reasoning', max_tokens: 100, role: 'INTIMACY_SPECIALIST' });
  const res = mkRes();
  const raced = await Promise.race([
    handler(req, res).then(() => 'returned').catch(e => 'threw: ' + e.message),
    new Promise(r => setTimeout(() => r('still pending after 6s'), 6000))
  ]);
  console.log('  outcome: ' + raced + ' | ended ' + res.ended);
  t('a hanging upstream leaves the handler without a response — the observed failure shape',
    res.ended === false, 'ended=' + res.ended);
  t('and the handler does NOT impose its own timeout',
    raced === 'still pending after 6s', raced);
}

global.fetch = realFetch;
console.log('');
console.log(pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
