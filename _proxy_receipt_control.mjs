// ── INDEPENDENT VERIFICATION OF RUNTIME RESPONSE DELIVERY ────────────────────────────────────
// Repeated replies AND usage receipts through the REAL proxy (api/proxy.js), served by the REAL
// project-local Vercel CLI, in a supervised isolated process, with the provider mocked in-process
// and all other external egress refused. The diagnostic endpoints (api/diag-mock.js) are NOT used:
// this exercises the production proxy path end to end.
// Provider-free and $0 — no provider is ever contacted, and the interceptor's own log proves it.
import fs from 'fs';
import { spawn } from 'child_process';

const PORT = Number(process.env.SB_PROXY_PORT || 3999);
const ROUNDS = Number(process.env.SB_PROXY_ROUNDS || 4);
const OUT = '_audit_out/proxy_receipt';
fs.mkdirSync(OUT, { recursive: true });

let pass = 0, fail = 0;
const t = (label, ok, detail) => {
  if (ok) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + (detail ? '  — ' + detail : '')); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const EXECUTABLE = process.execPath;
const CLI = 'node_modules/vercel/dist/index.js';
const ARGV = [CLI, 'dev', '--listen', String(PORT), '--yes'];

console.log('=== PROXY REPLY + RECEIPT DELIVERY (provider-free, $0) ===\n');
t('the project-local Vercel CLI is the one supervised', fs.existsSync(CLI),
  CLI + ' is absent — a global vercel would not satisfy this test');

// THE REAL KEY IS NEVER USED. vercel dev loads .env.local, so XAI_API_KEY is overridden with a
// placeholder: the proxy requires the variable to be present, and the interceptor means nothing is
// ever sent anywhere. This control never reads, logs or forwards the real secret.
const env = { ...process.env,
  XAI_API_KEY: 'mock-key-not-a-secret',
  NODE_OPTIONS: [process.env.NODE_OPTIONS || '', '--require', './_mock_upstream.cjs']
    .join(' ').trim() };

const child = spawn(EXECUTABLE, ARGV, { cwd: process.cwd(), env, stdio: ['ignore', 'pipe', 'pipe'] });
let stdout = '', stderr = '';
child.stdout.on('data', (d) => { stdout += d.toString(); });
child.stderr.on('data', (d) => { stderr += d.toString(); });
let exitCode = null, exitSignal = null, spawnError = null;
child.on('error', (e) => { spawnError = String((e && e.message) || e); });
child.on('exit', (c, s) => { exitCode = c; exitSignal = s; });

console.log('  supervised process: pid=' + child.pid);
console.log('    executable: ' + EXECUTABLE);
console.log('    argv:       ' + JSON.stringify(ARGV));

const base = 'http://127.0.0.1:' + PORT;
let ready = false, readyMs = null;
const t0 = Date.now(), deadline = t0 + 180000;
while (Date.now() < deadline) {
  if (exitCode !== null || exitSignal) break;
  try {
    const r = await fetch(base + '/api/config');
    if (r.status < 500) { ready = true; readyMs = Date.now() - t0; break; }
  } catch (_) {}
  await sleep(1500);
}
t('the supervised server became ready', ready,
  'exitCode=' + exitCode + ' signal=' + exitSignal + ' spawnError=' + spawnError
  + ' — see ' + OUT + '/stderr.log');
if (ready) console.log('    ready in ' + readyMs + 'ms\n');

// ── REPEATED REPLIES AND RECEIPTS THROUGH THE REAL PROXY ────────────────────────────────────
const rounds = [];
if (ready) {
  for (let i = 1; i <= ROUNDS; i++) {
    const body = { role: 'RENDERER', convId: 'receipt-control',
      messages: [{ role: 'system', content: 'You render panels.' },
                 { role: 'user', content: 'Round ' + i + ': describe one panel.' }],
      max_tokens: 200, temperature: 0.7 };
    let rec = { round: i, status: null, ok: false, text: null, usage: null, meta: null, error: null };
    try {
      const r = await fetch(base + '/api/proxy', { method: 'POST',
        headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      rec.status = r.status;
      const j = await r.json().catch(() => null);
      rec.ok = r.ok;
      rec.text = j && j.choices && j.choices[0] && j.choices[0].message
        ? String(j.choices[0].message.content || '') : null;
      rec.usage = (j && j.usage) || null;
      // The proxy returns its own record under _orchestration.
      rec.meta = (j && j._orchestration) || null;
      rec.rawKeys = j ? Object.keys(j) : null;
    } catch (e) { rec.error = String((e && e.message) || e); }
    rounds.push(rec);
    console.log('    round ' + i + ': status=' + rec.status
      + ' textLen=' + (rec.text ? rec.text.length : 0)
      + ' usage=' + (rec.usage ? 'present' : 'ABSENT')
      + (rec.error ? ' error=' + rec.error : ''));
  }
}

const okRounds = rounds.filter((r) => r.status === 200 && r.text && r.text.length > 0);
const receipted = rounds.filter((r) => r.usage
  && Number(r.usage.prompt_tokens) > 0 && Number(r.usage.completion_tokens) > 0);
console.log('');
t('REPEATED replies were delivered through the real proxy',
  okRounds.length === ROUNDS, okRounds.length + ' of ' + ROUNDS + ' rounds returned 200 with text');
t('every delivered reply carried a USAGE RECEIPT',
  receipted.length === ROUNDS, receipted.length + ' of ' + ROUNDS + ' rounds carried usage tokens');
t('the receipts are DISTINCT per round, not one cached body',
  new Set(rounds.map((r) => r.usage && r.usage.prompt_tokens)).size === ROUNDS,
  'prompt_tokens repeated across rounds: '
  + JSON.stringify(rounds.map((r) => r.usage && r.usage.prompt_tokens)));
t('the replies are DISTINCT per round',
  new Set(okRounds.map((r) => r.text)).size === okRounds.length && okRounds.length > 0,
  'identical reply bodies were returned');
t('a cached-token field survived the proxy to the client',
  rounds.length === ROUNDS && rounds.every((r) => r.usage && r.usage.prompt_tokens_details
    && Number(r.usage.prompt_tokens_details.cached_tokens) > 0),
  'cached_tokens did not reach the caller');
t('the proxy reported its own upstream attempt count under _orchestration',
  rounds.length === ROUNDS && rounds.every((r) => r.meta && Number(r.meta.upstreamAttempts) >= 1),
  'upstreamAttempts was absent from the response metadata');

// ── THE MOCK, AND THE EGRESS BLOCK, BOTH PROVEN FROM THE PROCESS'S OWN STDERR ───────────────
const intercepted = (stderr.match(/\[MOCK-UPSTREAM\] intercepted/g) || []).length;
t('the interceptor was installed in the supervised process',
  /\[MOCK-UPSTREAM\] installed/.test(stderr), 'the preload never reported installing');
t('every reply came from the MOCKED upstream, not a provider',
  intercepted >= ROUNDS, 'interceptions=' + intercepted + ' for ' + ROUNDS + ' rounds');
t('no provider host was reached outside the mock',
  !/\[MOCK-UPSTREAM\] BLOCKED external request to api\./.test(stderr),
  'a provider host was refused rather than intercepted — the mock did not cover it');

// ── SHUT DOWN AND CAPTURE REAL TERMINATION STATUS ───────────────────────────────────────────
const stillRunning = exitCode === null && !exitSignal;
if (stillRunning) { try { child.kill('SIGTERM'); } catch (_) {} }
const killDeadline = Date.now() + 20000;
while (Date.now() < killDeadline && exitCode === null && !exitSignal) await sleep(500);
if (exitCode === null && !exitSignal) { try { child.kill('SIGKILL'); } catch (_) {} await sleep(2000); }

const diag = { executable: EXECUTABLE, argv: ARGV, pid: child.pid, cwd: process.cwd(),
  nodeOptions: env.NODE_OPTIONS, port: PORT, rounds: ROUNDS,
  ready, readyMs, exitCode, exitSignal, spawnError,
  interceptions: intercepted, stderrBytes: stderr.length, stdoutBytes: stdout.length };
fs.writeFileSync(OUT + '/diagnostics.json', JSON.stringify(diag, null, 2));
fs.writeFileSync(OUT + '/rounds.json', JSON.stringify(rounds, null, 2));
fs.writeFileSync(OUT + '/stderr.log', stderr);
fs.writeFileSync(OUT + '/stdout.log', stdout);

console.log('\n  SUPERVISION DIAGNOSTICS');
console.log('    executable : ' + diag.executable);
console.log('    argv       : ' + JSON.stringify(diag.argv));
console.log('    pid        : ' + diag.pid);
console.log('    exit code  : ' + diag.exitCode + '   signal: ' + diag.exitSignal);
console.log('    spawn error: ' + diag.spawnError);
console.log('    stderr     : ' + diag.stderrBytes + ' bytes -> ' + OUT + '/stderr.log');
t('the process terminated and its status was captured',
  exitCode !== null || !!exitSignal, 'neither an exit code nor a signal was observed');

console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
