// STAGE 3 — FULL-STACK AUTHOR-OBEDIENCE RUN.  AUTHORIZED (Roman, "go", $0.25).
//
// Difference from the previous run: the payload is the REAL production directive stack, captured
// from the live generation path, not a minimal prompt I wrote.
//
// COST CONTROL — the reason for the two-phase shape:
//   Phase 1 drives real generation in a browser with EVERY /api/ call ABORTED. The app spends
//   nothing; we only harvest the assembled request body. Driving it live and letting its calls
//   through could fire planner, author and audit requests of unknown number — unbounded spend
//   under a fixed ceiling.
//   Phase 2 replays exactly ONE captured author request from Node, _noFallback, under the ceiling,
//   persisting raw + receipt before any evaluation.
//
// Route handling uses abort, never fetch-then-fulfill: the terminated-route deadlock that lost a
// previous paid response is not reachable here.
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright-core';

const AUTHORIZED = process.argv.includes('--authorized');
const CEILING_USD = 0.25;
const MODEL = 'grok-4-1-fast-reasoning';
const PROXY = 'http://localhost:3000/api/proxy';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT = path.join('_tempt_fate_fixtures', 'fsc_fullstack_' + STAMP);

const WISH = 'I want to disappear.';           // -> unm.the_turning_forgotten, assembly = all five
const EXPECT = 'unm.the_turning_forgotten';

fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log(...a);

// ── PHASE 1: harvest the real full-stack payload. ZERO provider calls leave the machine. ────
log('=== PHASE 1 — harvest the production directive stack (all /api/ aborted, $0 spent) ===\n');
const browser = await chromium.launch();
const page = await browser.newPage();
const captured = [];
await page.route('**/api/**', async (route) => {
  try {
    const req = route.request();
    captured.push({ url: req.url(), method: req.method(), postData: req.postData() || null, at: Date.now() });
  } catch (_) {}
  try { await route.abort(); } catch (_) {}     // ABORT, never fetch+fulfill
});
page.on('console', m => { const x = m.text(); if (/\[FSC|\[FPC|\[FSC-GATE|\[FSC-INTEGRITY/.test(x)) log('  page: ' + x); });

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._fscCompileAndPersist === 'function', { timeout: 20000 });

const prep = await page.evaluate(async (wish) => {
  const out = { steps: [] };
  try {
    window.state = window.state || {};
    const rec = window._fscCompileAndPersist(wish, { source: 'fullstack_harvest' });
    out.compiled = rec ? { outcomeId: rec.outcomeId, roster: rec.population && rec.population.roster,
      invokerScope: rec.invokerScope, hasBeat: !!rec.aftermathBeat } : null;
    out.integrity = window._fscPayloadIntegrity ? window._fscPayloadIntegrity() : null;
    out.promptBlock = window._fscPromptBlock ? window._fscPromptBlock() : '';
    out.steps.push('compiled');
  } catch (e) { out.compileErr = String(e && e.message); }
  try {
    const p = window._runCGScreenplayGen(1, '', '');
    out.steps.push('generation invoked');
    await Promise.race([p, new Promise(r => setTimeout(r, 25000))]);
    out.steps.push('generation settled or timed out');
  } catch (e) { out.genErr = String(e && e.message); }
  return out;
}, WISH);
await browser.close();

log('  compiled     : ' + JSON.stringify(prep.compiled));
log('  integrity    : ' + JSON.stringify(prep.integrity));
log('  steps        : ' + prep.steps.join(' → '));
if (prep.compileErr) log('  compileErr   : ' + prep.compileErr);
if (prep.genErr) log('  genErr       : ' + prep.genErr);
log('  /api/ calls attempted by the app (all aborted): ' + captured.length);

fs.writeFileSync(path.join(OUT, 'captured_requests.json'), JSON.stringify(
  captured.map(c => ({ url: c.url, method: c.method, bytes: c.postData ? c.postData.length : 0 })), null, 2));
fs.writeFileSync(path.join(OUT, 'prompt_block.txt'), prep.promptBlock || '');

// Pick the author/scene request: the largest body carrying our compiled consequence.
let authorReq = null;
for (const c of captured) {
  if (!c.postData) continue;
  if (c.postData.indexOf('PRESELECTED CONSEQUENCE') >= 0) {
    if (!authorReq || c.postData.length > authorReq.postData.length) authorReq = c;
  }
}
if (!authorReq) {
  log('\n  NO full-stack author request carrying the compiled consequence was captured.');
  log('  Nothing is dispatched. Evidence: ' + OUT);
  const biggest = captured.filter(c => c.postData).sort((a, b) => b.postData.length - a.postData.length)[0];
  if (biggest) fs.writeFileSync(path.join(OUT, 'largest_captured_body.json'), biggest.postData);
  log('  Largest captured body written for diagnosis (' + (biggest ? biggest.postData.length : 0) + ' bytes).');
  process.exit(3);
}
fs.writeFileSync(path.join(OUT, 'fullstack_request.json'), authorReq.postData);
let body;
try { body = JSON.parse(authorReq.postData); } catch (e) { log('  captured body is not JSON'); process.exit(3); }
const sysLen = (body.messages || []).reduce((n, m) => n + String(m.content || '').length, 0);
log('\n  CAPTURED full-stack author request: ' + (body.messages || []).length + ' messages, '
  + sysLen + ' chars total');
log('  carries the compiled consequence : ' + (authorReq.postData.indexOf('EFFECT BOUNDARY') >= 0));
log('  carries AFTERMATH BEAT           : ' + (authorReq.postData.indexOf('AFTERMATH BEAT') >= 0));
log('  carries FORBIDDEN INVENTIONS     : ' + (authorReq.postData.indexOf('FORBIDDEN INVENTIONS') >= 0));

if (!AUTHORIZED) {
  log('\n=== PHASE 2 SKIPPED — not authorized. Nothing dispatched. ===');
  log('Re-run with --authorized to replay ONE captured request under the $' + CEILING_USD + ' ceiling.');
  process.exit(0);
}

// ── PHASE 2: replay exactly ONE captured request, under the ceiling. ────────────────────────
log('\n=== PHASE 2 — ONE paid dispatch, ceiling $' + CEILING_USD.toFixed(2) + ' ===');
body.model = MODEL; body._sbModelOverride = MODEL; body._noFallback = true;
fs.writeFileSync(path.join(OUT, 'dispatched_body.json'), JSON.stringify(body, null, 2));

let raw = null, status = null, err = null;
const t0 = Date.now();
try {
  const resp = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body) });
  status = resp.status; raw = await resp.text();
} catch (e) { err = String(e && e.message || e); }
const ms = Date.now() - t0;

fs.writeFileSync(path.join(OUT, 'raw_response.txt'), raw == null ? '' : raw);
fs.writeFileSync(path.join(OUT, 'receipt.json'), JSON.stringify(
  { status, ms, err, model: MODEL, at: new Date().toISOString() }, null, 2));
log('  upstream : status=' + status + ' ' + ms + 'ms' + (err ? ' ERR=' + err : '') + ' — persisted');

let text = '', usage = null;
try { const j = JSON.parse(raw); usage = j.usage || null;
  text = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || ''; } catch (_) {}
fs.writeFileSync(path.join(OUT, 'scene.txt'), text);

const measured = usage && usage.cost_in_usd_ticks ? usage.cost_in_usd_ticks * 1e-10 : null;
log('  measured : ' + (measured != null ? '$' + measured.toFixed(6) + '  (cost_in_usd_ticks)' : 'not reported'));
log('  scene    : ' + text.split(/\s+/).filter(Boolean).length + ' words — ' + path.join(OUT, 'scene.txt'));

// ── C2 mechanically first ───────────────────────────────────────────────────────────────────
const TOK = { 'pc:lirael': /\bLirael\b/i, 'named:seren': /\bSeren\b/i, 'named:julian': /\bJulian\b/i,
  'role:first_sacrifice_presiding_dohkar': /\bDohkar\b/i, 'the_assembly': /\b(assembly|crowd|gathering)\b/i };
const roster = (prep.compiled && prep.compiled.roster) || [];
const mentioned = Object.keys(TOK).filter(k => TOK[k].test(text));
log('\n  C2 declared roster : ' + roster.join(', '));
log('     mentioned       : ' + mentioned.join(', '));
log('     outside roster  : ' + mentioned.filter(m => roster.indexOf(m) < 0).join(', ') || '     outside roster  : (none)');
log('  MAGICAL-VISUAL scan: ' + (/\b(glow|glowing|luminous|shimmer|aura|radian|pulsed with light)\b/i.test(text)
  ? 'HIT — possible C3 failure' : 'clean'));

fs.writeFileSync(path.join(OUT, 'verdict_input.json'), JSON.stringify(
  { expect: EXPECT, compiled: prep.compiled, roster, mentioned, usage, measured, words: text.split(/\s+/).filter(Boolean).length }, null, 2));
log('\n  NO VERDICT RENDERED HERE. C1/C3/C4 are human calls against the sealed record.');
log('  evidence : ' + OUT);
