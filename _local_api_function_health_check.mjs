// LOCAL API FUNCTION HEALTH CHECK — read-only, provider-blocked BY CONSTRUCTION.
//
// Roman: "one read-only API health check against the relevant local function routes, with provider
// calls blocked, to distinguish 'server loads' from 'functions work.'"
//
// The restart proved only that static assets serve (GET / -> 200). That says nothing about whether
// the serverless function layer executes — which is exactly what failed during the live-run
// incident, where every provider route returned Vercel's platform-level NO_RESPONSE_FROM_FUNCTION
// rather than any response the function's own code produced.
//
// HOW PROVIDER CALLS ARE BLOCKED HERE (structurally, not by a gate or a stub):
// All three provider proxies validate the HTTP method at the very top of their handler, BEFORE any
// upstream contact — api/chatgpt-proxy.js:126, api/proxy.js:240, api/mistral-proxy.js:86, each
// `if (req.method !== 'POST') return res.status(405)`. A GET therefore reaches the function, runs
// its own code, and returns the function's OWN 405 — without an API key ever being read or an
// upstream request ever being made. A 405 body authored by the function is positive proof the
// function layer executes; NO_RESPONSE_FROM_FUNCTION / 502 is proof it does not.
//
// /api/config and /api/geo are included as non-provider control routes: they contact no AI provider
// at all, so a healthy response from them isolates "function layer works" from "provider config".
//
// usage: node _local_api_function_health_check.mjs   (no browser, no POST, no provider dispatch)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_local_api_function_health_check_out');
fs.mkdirSync(OUT_DIR, { recursive: true });

const BASE = 'http://localhost:3000';
const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 300) : ''));
};

// GET-only. Every route below is probed with a method the provider proxies reject before dispatch.
const PROVIDER_ROUTES = ['/api/chatgpt-proxy', '/api/proxy', '/api/mistral-proxy'];
const CONTROL_ROUTES = ['/api/config', '/api/geo'];

async function probe(route) {
  const started = Date.now();
  try {
    const res = await fetch(BASE + route, { method: 'GET' });
    const text = await res.text();
    return { route, status: res.status, elapsedMs: Date.now() - started, body: text.slice(0, 400), networkError: null };
  } catch (e) {
    return { route, status: null, elapsedMs: Date.now() - started, body: null, networkError: e && e.message };
  }
}

// Vercel's platform-level failure signature — the exact string observed for every provider route
// during the live-run incident (2026-09-23). Its ABSENCE is what this check is looking for.
const PLATFORM_FAILURE = /NO_RESPONSE_FROM_FUNCTION|An error occurred with this application/i;

(async () => {
  console.log('=== LOCAL API FUNCTION HEALTH CHECK (read-only, GET-only, provider-blocked by construction) ===\n');

  console.log('PROVIDER ROUTES — expect each function\'s OWN 405, never a platform 502:');
  const providerResults = [];
  for (const route of PROVIDER_ROUTES) {
    const r = await probe(route);
    providerResults.push(r);
    const functionExecuted = r.status === 405 && !PLATFORM_FAILURE.test(r.body || '');
    ok(route + ' reached the function layer and got the function\'s OWN response (405 Method Not Allowed), not a platform failure',
      functionExecuted,
      'status=' + r.status + ' networkError=' + r.networkError + ' body=' + (r.body || '').slice(0, 200));
    ok(route + ' response carries NO NO_RESPONSE_FROM_FUNCTION signature (the exact failure seen during the incident)',
      !PLATFORM_FAILURE.test(r.body || ''),
      (r.body || '').slice(0, 200));
    console.log('    status=' + r.status + '  ' + r.elapsedMs + 'ms  body=' + JSON.stringify((r.body || '').slice(0, 120)));
  }

  console.log('\nNON-PROVIDER CONTROL ROUTES — isolate "function layer works" from "provider config":');
  const controlResults = [];
  for (const route of CONTROL_ROUTES) {
    const r = await probe(route);
    controlResults.push(r);
    const healthy = r.status != null && r.status < 500 && !PLATFORM_FAILURE.test(r.body || '');
    ok(route + ' returns a real, non-5xx response from its own code',
      healthy,
      'status=' + r.status + ' networkError=' + r.networkError + ' body=' + (r.body || '').slice(0, 200));
    console.log('    status=' + r.status + '  ' + r.elapsedMs + 'ms  body=' + JSON.stringify((r.body || '').slice(0, 120)));
  }

  const report = { at: new Date().toISOString(), base: BASE, providerResults, controlResults, results };
  fs.writeFileSync(path.join(OUT_DIR, 'health_check.json'), JSON.stringify(report, null, 2));

  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(100));
  console.log('LOCAL API FUNCTION HEALTH CHECK: ' + passed + '/' + results.length + ' passed');
  console.log('NOTE — scope limit, stated plainly: a 405 proves the FUNCTION LAYER executes and responds.');
  console.log('It does NOT prove provider credentials work or that an upstream call would succeed — that');
  console.log('cannot be established without a real (billable) dispatch, which this check deliberately never makes.');
  console.log('written to ' + OUT_DIR + '/health_check.json');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})();
