// MONOTONIC ELAPSED-TIME LOGGING — REAL BROWSER CONTROL (Roman, 2026-09-19)
//
// Incident 3 this proves the fix for: reporting the live Boundary-sample OAS-opener attempt, a
// chat-turn hand-converted the gate's wall-clock Date.now() epoch ms (at/settledAt) into a local
// clock-time string and got it backwards — making a real dispatch->settle pair that actually
// settled ~14.8s AFTER dispatch (settledAt 1789845424302 > at 1789845409473, numerically correct in
// the persisted record) READ as if settlement preceded dispatch. The persisted data itself was
// never wrong; nothing in the record's shape forced a reader away from hand-subtracting two
// wall-clock numbers, which is exactly where the mistake happened.
//
// Fix (see _e2e_network_gate.mjs): every tracked record now also carries atMono/settledAtMono
// (performance.now(), Node's monotonic clock — https://nodejs.org/api/perf_hooks.html, immune to
// wall-clock/timezone/DST adjustments) and elapsedMs, computed ONCE by the gate itself at
// settlement time from the monotonic pair. A downstream reader (human or script) now has an
// authoritative duration to read directly instead of ever subtracting timestamps by hand.
//
// This control proves, against the real, unmodified _e2e_network_gate.mjs, with a KNOWN delay so
// elapsedMs can be checked against ground truth:
//   1. atMono is recorded at dispatch time, before settlement (present while still pending).
//   2. elapsedMs is null while pending, and becomes a real number only once settled.
//   3. elapsedMs never reads negative — settledAtMono >= atMono strictly holds.
//   4. elapsedMs closely matches the REAL, KNOWN delay imposed by a deliberately slow stub —
//      not merely "positive", but numerically correct to a tight tolerance.
//   5. the persisted JSONL 'response' event carries elapsedMs directly (no downstream reader needs
//      to compute anything from at/settledAt to get a correct duration).
//   6. the same holds for a genuine terminal network error (closed local port), not just success.
//   7. atMono/settledAtMono are never equal to the wall-clock at/settledAt (proving they really are
//      a distinct, monotonic timebase, not just Date.now() renamed).
//
// Fully dry — no real provider is ever reached.
// usage: node _e2e_network_gate_monotonic_elapsed_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_e2e_network_gate_monotonic_elapsed_control_out');
fs.mkdirSync(OUT_DIR, { recursive: true });
const LOG_FILE = path.join(OUT_DIR, 'run.jsonl');
try { fs.unlinkSync(LOG_FILE); } catch (_) {}

const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 400) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }
function readLog() { try { return fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)); } catch (_) { return []; } }

const ORIGIN = 'http://203.0.113.1'; // RFC 5737 TEST-NET-1 — reserved, guaranteed unreachable

const FIXTURE_HTML = `<!doctype html><html><body><script>
  window.__results = {};
  window.__runFetch = async function (key, url) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'grok-4-1-fast-reasoning', messages: [{role:'system',content:'x'}] }) });
      const j = await r.json().catch(function () { return null; });
      window.__results[key] = { ok: true, status: r.status, json: j };
    } catch (e) {
      window.__results[key] = { ok: false, error: String(e && e.message) };
    }
  };
</script></body></html>`;

(async () => {
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext()).newPage();

  section('A. KNOWN-DELAY STUB — elapsedMs checked against real ground truth, not just "positive"');

  const gate = await installFailClosedNetworkGate(page, { logFile: LOG_FILE });
  const KNOWN_DELAY_MS = 2500;
  gate.stub('/api/proxy', async () => {
    await new Promise((r) => setTimeout(r, KNOWN_DELAY_MS));
    return { choices: [{ message: { content: 'monotonic-timed reply' } }], usage: { prompt_tokens: 1000, completion_tokens: 50 } };
  });
  await page.setContent(FIXTURE_HTML);

  gate.setPhase('monotonic-test', 1);
  const fetchPromise = page.evaluate(({ k, origin }) => window.__runFetch(k, origin + '/api/proxy'), { k: 'monoDelayed', origin: ORIGIN });

  // Mid-flight: the record must exist, atMono must be a real number, elapsedMs must still be null.
  await new Promise((r) => setTimeout(r, 400)); // well inside the 2500ms delay
  const midFlight = gate.trackedCalls('monotonic-test');
  ok('a tracked record exists immediately after dispatch, before settlement', midFlight.length === 1, JSON.stringify(midFlight));
  ok('atMono is a real, positive number recorded at dispatch time (not undefined/null)', typeof midFlight[0].atMono === 'number' && midFlight[0].atMono > 0, JSON.stringify(midFlight[0]));
  ok('elapsedMs is still null while the request is genuinely pending — not a stale/zero placeholder', midFlight[0].elapsedMs === null, JSON.stringify(midFlight[0]));
  ok('atMono is numerically distinct from the wall-clock at (a real second timebase, not Date.now() renamed)', midFlight[0].atMono !== midFlight[0].at, JSON.stringify(midFlight[0]));

  const settled = await gate.waitForSettlement('monotonic-test', { watchdogMs: 5000 });
  await fetchPromise;
  const rec = settled[0];

  ok('settledAtMono is recorded and is >= atMono — elapsedMs can never read as negative / "settled before dispatch"', typeof rec.settledAtMono === 'number' && rec.settledAtMono >= rec.atMono, JSON.stringify(rec));
  ok('elapsedMs is a real number now that settlement occurred', typeof rec.elapsedMs === 'number', JSON.stringify(rec));
  ok('elapsedMs matches the REAL, KNOWN delay (' + KNOWN_DELAY_MS + 'ms) to a tight tolerance — proves the field is a correct duration, not just "some positive number"', Math.abs(rec.elapsedMs - KNOWN_DELAY_MS) < 400, rec.elapsedMs + 'ms vs known ' + KNOWN_DELAY_MS + 'ms');
  ok('elapsedMs exactly equals settledAtMono - atMono (internally consistent, not independently derived elsewhere)', Math.abs(rec.elapsedMs - (rec.settledAtMono - rec.atMono)) < 0.001, JSON.stringify(rec));

  const logAfterA = readLog();
  const responseEvent = logAfterA.find((e) => e.kind === 'response' && e.roleTag === 'monotonic-test');
  ok('the persisted JSONL response event carries elapsedMs directly — a future incident report reads this field, never hand-subtracts at/settledAt again', !!responseEvent && typeof responseEvent.elapsedMs === 'number' && Math.abs(responseEvent.elapsedMs - KNOWN_DELAY_MS) < 400, JSON.stringify(responseEvent));
  ok('the persisted dispatch event carries atMono (so a mid-kill process still leaves a monotonic anchor on disk, not just a wall-clock one)', logAfterA.some((e) => e.kind === 'dispatch' && e.roleTag === 'monotonic-test' && typeof e.atMono === 'number'), JSON.stringify(logAfterA.filter((e) => e.roleTag === 'monotonic-test')));

  section('B. TERMINAL NETWORK ERROR — elapsedMs also correct for a settled failure, not just a settled success');
  gate.closePhase();
  const LOCAL_CLOSED_PORT = 'http://127.0.0.1:1'; // real ECONNREFUSED-class failure, no provider ever reached
  gate.allowRealPaths(['/api/timing-probe']);
  gate.setPhase('monotonic-network-error-test', 1);
  const fetchPromiseB = page.evaluate(({ origin }) => window.__runFetch('monoErr', origin + '/api/timing-probe'), { origin: LOCAL_CLOSED_PORT });
  const settledB = await gate.waitForSettlement('monotonic-network-error-test', { watchdogMs: 5000 });
  await fetchPromiseB;
  const recB = settledB[0];

  ok('a genuine terminal network error also gets a real, non-negative elapsedMs (settlement via failure is still settlement)', !!recB.networkError && typeof recB.elapsedMs === 'number' && recB.elapsedMs >= 0, JSON.stringify(recB));
  ok('settledAtMono >= atMono holds for the network-error path too', recB.settledAtMono >= recB.atMono, JSON.stringify(recB));

  const finalLog = readLog();
  const netErrEvent = finalLog.find((e) => e.kind === 'network-error' && e.roleTag === 'monotonic-network-error-test');
  ok('the persisted network-error event also carries elapsedMs directly', !!netErrEvent && typeof netErrEvent.elapsedMs === 'number', JSON.stringify(netErrEvent));

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('MONOTONIC ELAPSED-TIME LOGGING CONTROL: ' + results.filter(r => r.pass).length + '/' + results.length + ' passed');
  process.exitCode = results.every(r => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
