// PROXY HEALTH DIAGNOSTIC. Provider-free, $0. NOT A PLANNER SAMPLE.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// THIS IS HEALTH EVIDENCE ABOUT THE LOCAL TRANSPORT, NOT EVIDENCE ABOUT THE PLANNER.
// Nothing here measures model behaviour, alias compliance, or anything about the continuation
// contract. A green run says the function layer can receive and answer a request of the real shape
// and size; it says NOTHING about what the planner would reply.
// ════════════════════════════════════════════════════════════════════════════════════════════════
//
// WHY: run 9 dispatched three planner calls and got
//   "An error occurred with this application.  NO_RESPONSE_FROM_FUNCTION"
// back from the LOCAL serverless proxy on all three. $0.000000 billed — the provider was never
// reached. Before re-spending into that transport, establish whether it answers at all.
//
// HOW IT STAYS PROVIDER-FREE. api/proxy.js validates in a fixed order, all of it BEFORE the
// upstream fetch: method → messages present → response_format shape → model allowlist. So a POST
// carrying the REAL full-size body with response_format.type set to anything but 'json_object'
// is rejected at the third gate, having exercised request receipt, JSON parsing and body size,
// and having spent nothing. The dev log is checked before and after to prove no model was tried.
import fs from 'fs';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const ORIGIN = process.env.SB_ORIGIN || 'http://localhost:3000';
const ENDPOINT = ORIGIN + '/api/proxy';
const DEV_LOG = '_vercel_dev.log';
// The exact body run 9 sent, loaded from the artefact so the shape and size are the real ones.
const REQ_PATH = '_continuation_live_eval_out/run_2026-10-01T18-34-02-074Z/C-durable_s1_request_planner_1.json';
const realBody = JSON.parse(fs.readFileSync(REQ_PATH, 'utf8'));
const realBytes = JSON.stringify(realBody).length;

const tryModelCount = () => {
  try { return (fs.readFileSync(DEV_LOG, 'utf8').match(/Trying model \d+\/\d+/g) || []).length; }
  catch (_) { return -1; }
};

console.log('=== PROXY HEALTH DIAGNOSTIC (provider-free, $0) ===');
console.log('    HEALTH EVIDENCE ONLY — not a planner sample, not contract evidence.\n');
console.log('  real planner body: ' + realBytes + ' bytes, '
  + (realBody.messages || []).length + ' messages, system '
  + ((realBody.messages || [])[0] || {}).content.length + ' chars');
console.log('  role=' + JSON.stringify(realBody.role)
  + ' preferredModel=' + JSON.stringify(realBody.preferredModel)
  + ' max_tokens=' + JSON.stringify(realBody.max_tokens) + '\n');

const modelsTriedBefore = tryModelCount();

const probe = async (label, init, timeoutMs) => {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs || 20000);
  const t0 = Date.now();
  try {
    const res = await fetch(ENDPOINT, Object.assign({ signal: ctl.signal }, init));
    const text = await res.text();
    return { label, ok: true, status: res.status, ms: Date.now() - t0, body: text.slice(0, 300) };
  } catch (e) {
    return { label, ok: false, status: null, ms: Date.now() - t0, error: String(e && e.name === 'AbortError' ? 'TIMEOUT' : (e && e.message)) };
  } finally { clearTimeout(timer); }
};

// ── 1. LIVENESS ──────────────────────────────────────────────────────────────
console.log('1. the function is reachable and answers');
const pOptions = await probe('OPTIONS', { method: 'OPTIONS' }, 15000);
console.log('   OPTIONS → ' + pOptions.status + ' in ' + pOptions.ms + 'ms');
t('OPTIONS returns 204 (CORS preflight path)', pOptions.status === 204,
  JSON.stringify(pOptions));
const pGet = await probe('GET', { method: 'GET' }, 15000);
console.log('   GET     → ' + pGet.status + ' in ' + pGet.ms + 'ms');
t('GET is refused with 405, not a hang', pGet.status === 405, JSON.stringify(pGet));

// ── 2. SMALL-BODY VALIDATION PATH ────────────────────────────────────────────
console.log('\n2. a SMALL body is validated and answered (baseline latency)');
const pSmall = await probe('small', { method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ messages: [], role: 'STRUCTURE_GENERATOR' }) }, 20000);
console.log('   small POST → ' + pSmall.status + ' in ' + pSmall.ms + 'ms  ' + JSON.stringify(pSmall.body || pSmall.error));
t('an empty messages array is refused with 400', pSmall.status === 400, JSON.stringify(pSmall));
t('  and the error names the reason', /Messages array is required/.test(pSmall.body || ''),
  String(pSmall.body || '').slice(0, 120));

// ── 3. THE REAL FULL-SIZE BODY, rejected before any upstream call ────────────
// Same shape, same size as run 9's planner request, with response_format.type deliberately
// invalid so api/proxy.js refuses it at its third validation gate — after receiving and parsing
// the whole body, before selecting or calling a model.
console.log('\n3. the REAL full-size body is received, parsed and answered ($0 — rejected pre-dispatch)');
const fullBody = Object.assign({}, realBody, { response_format: { type: 'json_schema' } });
const REPEATS = 5;
const results = [];
for (let i = 1; i <= REPEATS; i++) {
  const p = await probe('full#' + i, { method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(fullBody) }, 30000);
  results.push(p);
  console.log('   full POST #' + i + ' (' + JSON.stringify(fullBody).length + 'B) → '
    + (p.status === null ? p.error : p.status) + ' in ' + p.ms + 'ms');
}
t('every full-size probe got an HTTP response', results.every(p => p.status !== null),
  JSON.stringify(results.map(p => p.status === null ? p.error : p.status)));
t('  each is the expected 400 invalid_response_format', results.every(p => p.status === 400),
  JSON.stringify(results.map(p => p.status)));
t('  and the body names that gate, proving it got past receipt and parsing',
  results.every(p => /invalid_response_format/.test(p.body || '')),
  String((results[0] || {}).body || '').slice(0, 160));
const msList = results.filter(p => p.status !== null).map(p => p.ms);
const maxMs = msList.length ? Math.max.apply(null, msList) : -1;
console.log('   latencies: ' + JSON.stringify(msList) + 'ms  max=' + maxMs + 'ms');
t('  none of them took longer than 10s (the validation path is not the bottleneck)',
  maxMs >= 0 && maxMs < 10000, 'max=' + maxMs + 'ms');
t('  and none returned NO_RESPONSE_FROM_FUNCTION',
  results.every(p => !/NO_RESPONSE_FROM_FUNCTION/.test(p.body || '')),
  JSON.stringify(results.map(p => /NO_RESPONSE_FROM_FUNCTION/.test(p.body || ''))));

// ── 4. PROVIDER-FREE, PROVEN ─────────────────────────────────────────────────
console.log('\n4. no model was tried — this diagnostic is provider-free, not merely cheap');
const modelsTriedAfter = tryModelCount();
console.log('   dev-log "Trying model" lines: before=' + modelsTriedBefore + ' after=' + modelsTriedAfter);
t('the dev log was readable', modelsTriedBefore >= 0 && modelsTriedAfter >= 0,
  'before=' + modelsTriedBefore + ' after=' + modelsTriedAfter);
t('NOT ONE upstream model attempt was added by these probes',
  modelsTriedAfter === modelsTriedBefore,
  'before=' + modelsTriedBefore + ' after=' + modelsTriedAfter);

// ── 5. CROSS-METHOD SCOPE — is it the payload, or the whole function? ───────
// The decisive question, and it costs nothing: OPTIONS and GET cannot involve a provider or a
// large body at all. If THOSE fail too, the failure is the function layer itself, and no amount of
// payload tuning or retrying will help.
console.log('\n5. is the failure payload-specific, or is the function layer down?');
const allStatuses = [pOptions, pGet, pSmall].concat(results).map(p => p.status);
const everyRequestFailed = allStatuses.every(st => st === 502);
const methodlessFailed = pOptions.status === 502 && pGet.status === 502;
console.log('   statuses across OPTIONS, GET, small POST and 5 full POSTs: ' + JSON.stringify(allStatuses));
if (everyRequestFailed) {
  console.log('   → EVERY request 502s, including OPTIONS and GET, which carry no body and can');
  console.log('     reach no provider. The serverless FUNCTION LAYER IS DOWN. This is not payload');
  console.log('     size, not prompt growth, not upstream latency, and not retryable.');
} else if (methodlessFailed) {
  console.log('   → the bodyless methods fail, so the fault is below the request payload.');
} else {
  console.log('   → bodyless methods succeed, so the fault is payload- or upstream-specific.');
}
t('DIAGNOSIS RECORDED: not all requests failed (a healthy function layer)', !everyRequestFailed,
  everyRequestFailed ? 'ALL requests 502 — function layer down, re-dispatch would fail identically'
                     : '');

// ── 6. SCOPE OF THIS EVIDENCE ────────────────────────────────────────────────
console.log('\n6. scope');
console.log('   This is HEALTH evidence about the local transport. It is NOT evidence about the');
console.log('   planner, the alias contract, or any continuation outcome, whichever way it goes.');
console.log('   A green run means the function receives, parses and answers a body of the real');
console.log('   planner shape and size. It still says nothing about the UPSTREAM call, which this');
console.log('   diagnostic cannot test without spending and deliberately does not.');

console.log('\n' + pass + '/' + (pass + fail) + ' health checks passed');
process.exit(fail ? 1 : 0);
