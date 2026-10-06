// A HANDLER-OVER-HTTP TEST with the upstream mocked in-process. Provider-free.
//
// RELABELLED (Codex 2026-10-06). This does NOT close the Vercel response-delivery gap: it creates
// its own http.createServer and supplies a handwritten `vres` adapter, which REMOVES the very
// runtime implicated in the failure. What it does establish is that the real handler, given a
// representative delayed upstream response, processes it and writes a complete body — including
// the usage receipt — over a real socket to a real client.
//
// The Vercel-runtime test is _vercel_runtime_mock_control.mjs.
//
// Codex 2026-10-06: the 400/405 checks return BEFORE the relevant work — useful smoke tests, not
// the requested response-path test. And "a real paid upstream call is required" was not
// established. It is not: the upstream can be intercepted inside the process that runs the actual
// proxy handler, so a representative DELAYED provider response is received, processed, and
// delivered over real HTTP to a real client.
//
// EXTERNAL NETWORK IS DENIED, not merely unused: global.fetch is replaced, and any attempt to
// reach a non-mocked host throws and is reported. Nothing can reach a provider.
import http from 'node:http';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

process.env.XAI_API_KEY = process.env.XAI_API_KEY || 'test-not-a-real-key';
process.env.GROK_API_KEY = process.env.GROK_API_KEY || 'test-not-a-real-key';

// ── DENY EXTERNAL NETWORK, AND MOCK THE UPSTREAM ────────────────────────────────────────────
const escaped = [];
const upstreamCalls = [];
let UPSTREAM_DELAY_MS = 0;
const UPSTREAM_BODY = {
  id: 'chatcmpl-mocked', model: 'grok-4.3',
  choices: [{ message: { role: 'assistant', content: JSON.stringify({
    li_dialogue: 'Then say it where they can hear you.',
    li_action: 'He does not move.', scene_state: 'continue' }) }, finish_reason: 'stop' }],
  usage: { prompt_tokens: 1200, completion_tokens: 80, total_tokens: 1280,
    prompt_tokens_details: { cached_tokens: 128 }, cost_in_usd_ticks: 15000000 }
};
global.fetch = async (url, opts) => {
  const u = String(url);
  if (!/^https:\/\/api\.x\.ai\//.test(u)) {
    escaped.push(u);
    throw new Error('EXTERNAL NETWORK DENIED by the test: ' + u);
  }
  upstreamCalls.push({ url: u, at: Date.now() });
  // A REPRESENTATIVE DELAYED PROVIDER RESPONSE — the shape and the latency of the real thing,
  // honouring cancellation so the proxy's AbortController still governs.
  await new Promise((resolve, reject) => {
    const sig = opts && opts.signal;
    const timer = setTimeout(resolve, UPSTREAM_DELAY_MS);
    if (sig) sig.addEventListener('abort', () => { clearTimeout(timer);
      const e = new Error('The operation was aborted.'); e.name = 'AbortError'; reject(e); });
  });
  return { ok: true, status: 200, headers: { get: () => 'application/json' },
    json: async () => UPSTREAM_BODY, text: async () => JSON.stringify(UPSTREAM_BODY) };
};

// ── A REAL HTTP SERVER RUNNING THE ACTUAL PROXY HANDLER ─────────────────────────────────────
const mod = await import('./api/proxy.js');
const handler = mod.default || mod.handler;
let handlerCompletedAt = null, handlerReqId = null;

const server = http.createServer(async (req, res) => {
  const reqId = 'probe-' + Math.random().toString(36).slice(2, 10);
  res.setHeader('x-probe-request-id', reqId);
  let raw = '';
  for await (const chunk of req) raw += chunk;
  let body = {}; try { body = JSON.parse(raw || '{}'); } catch (_) {}
  const q = Object.fromEntries(new URL(req.url, 'http://x').searchParams);
  // the shim a serverless runtime provides; the HANDLER and the DELIVERY are real
  const vres = {
    statusCode: 200,
    status(c) { this.statusCode = c; res.statusCode = c; return this; },
    setHeader(k, v) { res.setHeader(k, v); return this; },
    getHeader(k) { return res.getHeader(k); },
    json(o) { res.setHeader('content-type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(o)); handlerCompletedAt = Date.now(); handlerReqId = reqId; return this; },
    send(o) { res.end(typeof o === 'string' ? o : JSON.stringify(o));
      handlerCompletedAt = Date.now(); handlerReqId = reqId; return this; },
    end(o) { res.end(o); handlerCompletedAt = Date.now(); handlerReqId = reqId; return this; }
  };
  try { await handler({ ...req, method: req.method, body, query: q, headers: req.headers }, vres); }
  catch (e) { if (!res.writableEnded) { res.statusCode = 500;
    res.end(JSON.stringify({ error: 'handler threw: ' + e.message })); } }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const BASE = 'http://127.0.0.1:' + port;
console.log('actual proxy handler served over real HTTP at ' + BASE);
console.log('upstream api.x.ai is MOCKED in-process; every other host is DENIED');

// a real client, using node's http (not the stubbed fetch)
const clientPost = (payload) => new Promise((resolve) => {
  const data = JSON.stringify(payload);
  const t0 = Date.now();
  const req = http.request(BASE + '/api/proxy', { method: 'POST',
    headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } },
    (res) => {
      let b = '';
      res.on('data', c => { b += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers,
        body: b, ms: Date.now() - t0 }));
    });
  req.on('error', e => resolve({ status: null, headers: {}, body: '', ms: Date.now() - t0, err: e.message }));
  req.write(data); req.end();
});

const PAYLOAD = { messages: [{ role: 'system', content: 'You play Julian. Return li_dialogue.' },
  { role: 'user', content: 'Say: stop' }], model: 'grok-4-1-fast-non-reasoning',
  max_tokens: 400, role: 'INTIMACY_SPECIALIST' };

console.log('');
console.log('=== 1. AN UPSTREAM RESPONSE RECEIVED, PROCESSED AND DELIVERED ===');
UPSTREAM_DELAY_MS = 0;
{
  handlerCompletedAt = null;
  const r = await clientPost(PAYLOAD);
  let parsed = null; try { parsed = JSON.parse(r.body); } catch (_) {}
  console.log('  HTTP ' + r.status + ' | ' + (r.headers['content-type'] || '-') + ' | ' + r.ms + 'ms');
  console.log('  upstream calls made: ' + upstreamCalls.length + ' | escaped to real network: '
    + escaped.length);
  console.log('  body head: ' + r.body.replace(/\s+/g, ' ').slice(0, 110));
  t('the handler reached the (mocked) upstream', upstreamCalls.length >= 1);
  t('NOTHING escaped to the real network', escaped.length === 0, JSON.stringify(escaped.slice(0, 2)));
  t('THE CLIENT RECEIVED A BODY over real HTTP', r.body.length > 0 && r.status === 200,
    'status=' + r.status);
  t('it is the processed provider response, not an error page', !!parsed
    && !/NO_RESPONSE_FROM_FUNCTION/.test(r.body));
  t('the reply content survived the round trip',
    !!(parsed && JSON.stringify(parsed).includes('Then say it where they can hear you')),
    parsed ? JSON.stringify(parsed).slice(0, 120) : '');
  t('AND THE USAGE RECEIPT survived it', !!(parsed && parsed.usage
    && typeof parsed.usage.cost_in_usd_ticks === 'number'),
    parsed && parsed.usage ? JSON.stringify(parsed.usage).slice(0, 90) : 'no usage');
  // CORRELATION: request -> handler completion -> client receipt
  console.log('  correlation: client saw x-probe-request-id=' + r.headers['x-probe-request-id']
    + ' | handler completed for ' + handlerReqId);
  t('request, handler completion and client receipt CORRELATE',
    !!handlerCompletedAt && handlerReqId === r.headers['x-probe-request-id'],
    'handlerReqId=' + handlerReqId + ' clientId=' + r.headers['x-probe-request-id']);
}

console.log('');
console.log('=== 2. A SLOW (12s) UPSTREAM IS STILL DELIVERED ===');
UPSTREAM_DELAY_MS = 12000;
{
  handlerCompletedAt = null;
  const before = upstreamCalls.length;
  const r = await clientPost(PAYLOAD);
  let parsed = null; try { parsed = JSON.parse(r.body); } catch (_) {}
  console.log('  HTTP ' + r.status + ' | ' + r.ms + 'ms | upstream calls +'
    + (upstreamCalls.length - before));
  t('a 12s upstream response IS delivered to the client', r.status === 200 && !!parsed,
    'status=' + r.status + ' ms=' + r.ms);
  t('and it took at least the upstream delay', r.ms >= 11500, 'ms=' + r.ms);
  t('the receipt still arrives', !!(parsed && parsed.usage));
  t('nothing escaped the mock', escaped.length === 0);
  // NO LATENCY-BAND CLAIM. The historical success logs were never attributed to the void run, so
  // "the void run's latency band" was not mine to assert. 12s is simply a slow-but-plausible
  // upstream, chosen to exercise the delay path.
  console.log('  -> a 12s upstream response is processed and written out by the handler.');
  console.log('     This says nothing about the void run, which is NOT reproduced here.');
}

server.close();
console.log('');
console.log(pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
