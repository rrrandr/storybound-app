// DOES THE LOCAL RUNTIME DELIVER THE PROXY'S RESPONSE TO THE CLIENT? Provider-free.
//
// Codex 2026-10-06: importing the handler with a fabricated `res` tests handler behaviour, NOT
// whether Vercel delivers the body to the client. api/diag-slow.js closed only the "plain function"
// case. This exercises THE ACTUAL PROXY ENDPOINT over HTTP through the running local runtime.
//
// PROVIDER-FREE BY CONSTRUCTION: every request below returns on a path that runs BEFORE any
// upstream fetch — a non-POST method (api/proxy.js:248) and a missing messages array (:280-281).
// No xAI request is made, so nothing can be billed, and the question under test is purely whether
// the handler's response reaches the client.
import assert from 'node:assert';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const BASE = 'http://localhost:3000';
const hit = async (path, init) => {
  const t0 = Date.now();
  let r = null, body = '', err = null;
  try {
    r = await fetch(BASE + path, init);
    body = await r.text();
  } catch (e) { err = e.message; }
  const ms = Date.now() - t0;
  const headers = {};
  if (r) r.headers.forEach((v, k) => { headers[k] = v; });
  return { status: r ? r.status : null, contentType: headers['content-type'] || null,
    headers, body, ms, err };
};
const idsOf = (h) => {
  const out = {};
  Object.keys(h).forEach(k => { if (/x-vercel|x-request|x-matched|server|x-amz|cf-ray/i.test(k)) out[k] = h[k]; });
  return out;
};

console.log('=== 0. THE RUNTIME IS UP ===');
{
  const r = await hit('/', { method: 'GET' });
  t('the local server answers', r.status === 200, 'status=' + r.status + ' err=' + r.err);
}

console.log('');
console.log('=== 1. THE ACTUAL PROXY ENDPOINT, NON-POST (returns before any upstream call) ===');
{
  const r = await hit('/api/proxy', { method: 'GET' });
  console.log('  HTTP ' + r.status + ' | ' + r.contentType + ' | ' + r.ms + 'ms');
  console.log('  body: ' + r.body.replace(/\s+/g, ' ').slice(0, 120));
  console.log('  request identifiers: ' + JSON.stringify(idsOf(r.headers)));
  t('THE CLIENT RECEIVED A BODY from /api/proxy', r.body.length > 0, 'empty body');
  t('it is not the runtime error page',
    !/NO_RESPONSE_FROM_FUNCTION|An error occurred with this application/i.test(r.body), r.body.slice(0, 80));
  t('and it is the handler\'s own JSON', /application\/json/.test(r.contentType || ''),
    'content-type=' + r.contentType);
}

console.log('');
console.log('=== 2. THE PROXY ENDPOINT, POST WITH NO MESSAGES (api/proxy.js:280) ===');
{
  const r = await hit('/api/proxy', { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: 'grok-4.3' }) });
  console.log('  HTTP ' + r.status + ' | ' + r.contentType + ' | ' + r.ms + 'ms');
  console.log('  body: ' + r.body.replace(/\s+/g, ' ').slice(0, 140));
  console.log('  request identifiers: ' + JSON.stringify(idsOf(r.headers)));
  let parsed = null; try { parsed = JSON.parse(r.body); } catch (_) {}
  t('THE CLIENT RECEIVED THE HANDLER\'S 400 BODY', r.status === 400 && !!parsed,
    'status=' + r.status);
  t('and it carries the handler\'s own message, delivered intact',
    !!(parsed && /Messages array is required/i.test(parsed.error || '')),
    parsed ? JSON.stringify(parsed).slice(0, 100) : r.body.slice(0, 100));
  t('so the runtime DOES deliver this endpoint\'s responses',
    !/NO_RESPONSE_FROM_FUNCTION/i.test(r.body));
}

console.log('');
console.log('=== 3. THE OTHER TWO PROVIDER PROXIES DELIVER TOO ===');
for (const ep of ['/api/chatgpt-proxy', '/api/mistral-proxy']) {
  const r = await hit(ep, { method: 'GET' });
  const bad = /NO_RESPONSE_FROM_FUNCTION|An error occurred with this application/i.test(r.body);
  console.log('  ' + ep.padEnd(20) + ' HTTP ' + String(r.status).padEnd(4) + (r.contentType || '-')
    + ' | ' + r.ms + 'ms | ' + (bad ? 'RUNTIME ERROR PAGE' : 'handler body'));
  t(ep + ' delivers a handler body, not the runtime error page', !bad, r.body.slice(0, 70));
}

console.log('');
console.log('=== 4. HANDLER COMPLETION vs DELIVERY, CORRELATED ===');
// Correlate what the handler logged with what the client got, using a marker the client chooses.
{
  const marker = 'delivery-probe-' + Date.now();
  const r = await hit('/api/proxy?probe=' + marker, { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: 'grok-4.3' }) });
  console.log('  marker: ' + marker);
  console.log('  client got: HTTP ' + r.status + ' | ' + (r.body || '').replace(/\s+/g, ' ').slice(0, 90));
  const log = (await import('node:fs')).readFileSync('_vercel_dev.log', 'utf8');
  const sawMarker = log.includes(marker);
  console.log('  dev log mentions the marker: ' + sawMarker
    + ' (the proxy does not echo query markers, so absence is expected)');
  t('the client received a complete body for a request it can identify',
    r.status === 400 && (r.body || '').length > 0);
  t('and nothing in this probe produced a runtime error page',
    !/NO_RESPONSE_FROM_FUNCTION/i.test(r.body || ''));
}

console.log('');
console.log('WHAT THIS ESTABLISHES: the local runtime DOES deliver these endpoints\' responses on');
console.log('paths that return before any upstream call. It therefore does NOT reproduce the void');
console.log('run\'s failure, which remains UNREPRODUCED and UNEXPLAINED — and that is the honest');
console.log('state. The failure needed a real upstream call in flight, which is not provider-free.');
console.log('');
console.log(pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
