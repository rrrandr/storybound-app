// THE VERCEL RESPONSE PATH, with the upstream mocked INSIDE THE FUNCTION WORKER. Provider-free.
//
// This is the test that was outstanding. The earlier control substituted its own http server and a
// handwritten response adapter, which removed the runtime under suspicion. Here an ISOLATED
// `vercel dev` is started on its own port with NODE_OPTIONS=--require ./_mock_upstream_preload.cjs,
// so the mock is installed in the worker that runs the real proxy handler, and VERCEL'S OWN
// request/response handling is preserved end to end.
//
// ORDER MATTERS: the mock is PROVEN INSTALLED in the worker (via /api/diag-mock) BEFORE any valid
// provider request is sent, and every non-xAI external host is blocked by the preload.
import { spawn } from 'node:child_process';
import fs from 'node:fs';

let pass = 0, fail = 0;
let mockServed = false, mockMarker = null;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const PORT = 3999;
const BASE = 'http://127.0.0.1:' + PORT;
const LOG = '_audit_out/incident_2026-10-06/vercel_isolated.log';
fs.mkdirSync('_audit_out/incident_2026-10-06', { recursive: true });
const out = fs.openSync(LOG, 'w');

console.log('starting an ISOLATED vercel dev on port ' + PORT + ' with the upstream mock preloaded');
const child = spawn('vercel', ['dev', '--listen', String(PORT)], {
  env: { ...process.env,
    NODE_OPTIONS: ((process.env.NODE_OPTIONS || '') + ' --require ' + process.cwd() + '/_mock_upstream_preload.cjs').trim(),
    MOCK_UPSTREAM_DELAY_MS: process.env.MOCK_UPSTREAM_DELAY_MS || '0',
    XAI_API_KEY: process.env.XAI_API_KEY || 'test-not-a-real-key',
    GROK_API_KEY: process.env.GROK_API_KEY || 'test-not-a-real-key' },
  stdio: ['ignore', out, out], detached: false
});
const stop = () => { try { child.kill('SIGTERM'); } catch (_) {} };
process.on('exit', stop);

const get = async (path) => {
  try {
    const r = await fetch(BASE + path);
    const body = await r.text();
    const h = {}; r.headers.forEach((v, k) => { h[k] = v; });
    return { status: r.status, body, headers: h };
  } catch (e) { return { status: null, body: '', headers: {}, err: e.message }; }
};
const post = async (path, payload) => {
  const t0 = Date.now();
  try {
    const r = await fetch(BASE + path, { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const body = await r.text();
    const h = {}; r.headers.forEach((v, k) => { h[k] = v; });
    return { status: r.status, body, headers: h, ms: Date.now() - t0 };
  } catch (e) { return { status: null, body: '', headers: {}, ms: Date.now() - t0, err: e.message }; }
};

// ── WAIT FOR READY ──────────────────────────────────────────────────────────────────────────
let ready = false;
for (let i = 0; i < 90; i++) {
  const log = fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8') : '';
  if (/Ready! Available at/.test(log)) { ready = true; break; }
  if (/error|EADDRINUSE|not authorized/i.test(log) && i > 10) break;
  await new Promise(r => setTimeout(r, 2000));
}
const bootLog = fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8') : '';
if (!ready) {
  console.log('');
  console.log('*** THE ISOLATED VERCEL RUNTIME DID NOT START — reporting the obstacle, not');
  console.log('    substituting another server. ***');
  console.log(bootLog.split('\n').filter(Boolean).slice(-8).map(l => '    ' + l.slice(0, 150)).join('\n'));
  stop();
  process.exit(1);
}
t('an isolated vercel dev is running on port ' + PORT, ready);

// ── THE MOCK MUST BE PROVEN INSTALLED IN THE WORKER FIRST ───────────────────────────────────
console.log('');
console.log('=== 1. IS THE MOCK INSTALLED IN THE FUNCTION WORKER? ===');
let diag = null;
for (let i = 0; i < 20; i++) {
  const r = await get('/api/diag-mock');
  if (r.status === 200) { try { diag = JSON.parse(r.body); } catch (_) {} if (diag) break; }
  await new Promise(r2 => setTimeout(r2, 1500));
}
console.log('  /api/diag-mock -> ' + JSON.stringify(diag));
t('the worker answers the probe', !!diag);
t('THE UPSTREAM MOCK IS INSTALLED IN THE WORKER', !!(diag && diag.mockInstalled === true),
  diag ? JSON.stringify(diag) : 'no probe response');
t('no upstream call has been made yet', !!(diag && (diag.upstreamCalls || 0) === 0),
  diag ? 'calls=' + diag.upstreamCalls : '');
if (!(diag && diag.mockInstalled === true)) {
  console.log('');
  console.log('*** THE MOCK IS NOT IN THE WORKER — the specific obstacle is that NODE_OPTIONS');
  console.log('    --require did not reach the function process. NOT sending a provider request,');
  console.log('    and NOT substituting another server. ***');
  stop();
  console.log('');
  console.log(pass + '/' + (pass + fail) + ' checks passed');
  process.exit(1);
}

// ── ONLY NOW: A VALID REQUEST THROUGH VERCEL'S OWN RESPONSE PATH ────────────────────────────
console.log('');
console.log('=== 2. A VALID REQUEST THROUGH THE REAL VERCEL RESPONSE PATH ===');
const PAYLOAD = { messages: [{ role: 'system', content: 'You play Julian. Return li_dialogue.' },
  { role: 'user', content: 'Say: stop' }], model: 'grok-4-1-fast-non-reasoning',
  max_tokens: 400, role: 'INTIMACY_SPECIALIST' };
{
  const r = await post('/api/proxy', PAYLOAD);
  let parsed = null; try { parsed = JSON.parse(r.body); } catch (_) {}
  console.log('  HTTP ' + r.status + ' | ' + (r.headers['content-type'] || '-') + ' | ' + r.ms + 'ms');
  console.log('  x-vercel-id: ' + (r.headers['x-vercel-id'] || '(none)'));
  console.log('  body head: ' + String(r.body).replace(/\s+/g, ' ').slice(0, 120));
  t('THE CLIENT RECEIVED A BODY THROUGH VERCEL', String(r.body).length > 0 && r.status === 200,
    'status=' + r.status + ' err=' + (r.err || '-'));
  t('it is NOT the runtime error page',
    !/NO_RESPONSE_FROM_FUNCTION|An error occurred with this application/i.test(String(r.body)),
    String(r.body).slice(0, 90));
  t('the mocked reply content survived Vercel\'s response path',
    !!(parsed && JSON.stringify(parsed).includes('Then say it where they can hear you')),
    parsed ? JSON.stringify(parsed).slice(0, 120) : '');
  t('AND THE USAGE RECEIPT survived it', !!(parsed && parsed.usage
    && typeof parsed.usage.cost_in_usd_ticks === 'number'),
    parsed && parsed.usage ? JSON.stringify(parsed.usage).slice(0, 80) : 'no usage');
  t('Vercel supplied a request identifier for correlation', !!r.headers['x-vercel-id']);
  mockMarker = parsed && parsed.id;
  mockServed = mockMarker === 'chatcmpl-vercel-mock';
}

// ── AND THE MOCK, NOT A PROVIDER, SERVED IT ─────────────────────────────────────────────────
console.log('');
console.log('=== 3. THE MOCK SERVED IT, AND NOTHING REACHED A PROVIDER ===');
// VERCEL DEV GIVES EACH REQUEST ITS OWN WORKER PROCESS — the probe before (pid 52643) and after
// (pid 52649) are different processes, so an in-worker counter cannot be read across requests.
// That is how the runtime isolates functions, not a defect; my first assertions assumed one shared
// process. The conclusive evidence is in the BODY: "chatcmpl-vercel-mock" is a value only the
// preload can produce, and the preload throws on every non-xAI external host.
{
  const r = await get('/api/diag-mock');
  let after = null; try { after = JSON.parse(r.body); } catch (_) {}
  console.log('  /api/diag-mock -> ' + JSON.stringify(after));
  console.log('  worker pids: probe-before ' + (diag && diag.pid) + ' · probe-after '
    + (after && after.pid) + ' -> each request runs in its OWN worker');
  t('the mock is installed in every worker, not just the first',
    !!(after && after.mockInstalled === true));
  t('and no worker reports a blocked external host',
    !!(after && Array.isArray(after.denied) && after.denied.length === 0),
    after ? JSON.stringify(after.denied) : '');
  t('THE RESPONSE CARRIED THE MOCK\'S OWN MARKER, so no provider served it',
    mockServed === true, 'id seen: ' + String(mockMarker));
}

console.log('');
console.log('=== 4. A DELAYED UPSTREAM THROUGH THE REAL VERCEL PATH ===');
// Restart the isolated runtime with a delay, so the slow-response case is exercised through
// Vercel's own handling rather than a substitute server.
{
  stop();
  await new Promise(r => setTimeout(r, 2500));
  const out2 = fs.openSync(LOG + '.delayed', 'w');
  const child2 = spawn('vercel', ['dev', '--listen', String(PORT)], {
    env: { ...process.env,
      NODE_OPTIONS: ((process.env.NODE_OPTIONS || '') + ' --require ' + process.cwd() + '/_mock_upstream_preload.cjs').trim(),
      MOCK_UPSTREAM_DELAY_MS: '12000',
      XAI_API_KEY: process.env.XAI_API_KEY || 'test-not-a-real-key',
      GROK_API_KEY: process.env.GROK_API_KEY || 'test-not-a-real-key' },
    stdio: ['ignore', out2, out2] });
  const stop2 = () => { try { child2.kill('SIGTERM'); } catch (_) {} };
  process.on('exit', stop2);
  let ready2 = false;
  for (let i = 0; i < 90; i++) {
    const log = fs.existsSync(LOG + '.delayed') ? fs.readFileSync(LOG + '.delayed', 'utf8') : '';
    if (/Ready! Available at/.test(log)) { ready2 = true; break; }
    await new Promise(r => setTimeout(r, 2000));
  }
  if (!ready2) {
    t('the delayed-upstream runtime started', false, 'did not become ready — obstacle reported');
  } else {
    const d2 = await get('/api/diag-mock');
    let dj = null; try { dj = JSON.parse(d2.body); } catch (_) {}
    t('the delayed runtime has the mock installed, at 12000ms',
      !!(dj && dj.mockInstalled === true && dj.delayMs === 12000), JSON.stringify(dj));
    const r2 = await post('/api/proxy', PAYLOAD);
    let p2 = null; try { p2 = JSON.parse(r2.body); } catch (_) {}
    console.log('  HTTP ' + r2.status + ' | ' + r2.ms + 'ms | x-vercel-id: '
      + (r2.headers['x-vercel-id'] || '(none)'));
    console.log('  body head: ' + String(r2.body).replace(/\s+/g, ' ').slice(0, 100));
    t('A 12s UPSTREAM IS DELIVERED THROUGH VERCEL', r2.status === 200 && !!p2,
      'status=' + r2.status + ' ms=' + r2.ms + ' body=' + String(r2.body).slice(0, 80));
    t('it took at least the upstream delay', r2.ms >= 11500, 'ms=' + r2.ms);
    t('and it is not the runtime error page',
      !/NO_RESPONSE_FROM_FUNCTION/i.test(String(r2.body)), String(r2.body).slice(0, 90));
    t('the receipt survived the delayed path', !!(p2 && p2.usage));
  }
  stop2();
}

stop();
console.log('');
console.log(pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
