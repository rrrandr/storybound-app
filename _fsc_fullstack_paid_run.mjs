// STAGE 3 — FULL-STACK PAID OBEDIENCE RUN. AUTHORIZED (Roman, "go", $0.25 whole exercise).
// Phase 1 harvests the real terminal author request with every provider call ABORTED ($0).
// Phase 2 replays exactly ONE captured request per outcome, _noFallback, measuring after each
// and refusing the next if the remaining ceiling cannot cover it.
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright-core';

const CEILING = 0.25;
const MODEL = 'grok-4-1-fast-reasoning';
const PROXY = 'http://localhost:3000/api/proxy';
const OUT = '_tempt_fate_fixtures/fsc_paid_' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log(...a);

const RUNS = [
  { key: 'time_gives_way', wish: 'I wish this had never happened to me.', expect: 'unm.time_gives_way' },
  { key: 'turning_forgotten', wish: 'I want to disappear.', expect: 'unm.the_turning_forgotten' }
];

const MARKERS = [/FORBIDDEN INVENTIONS/i, /SCENE DIRECTIVES/i, /DIRECTIVE/, /write the scene/i,
  /screenplay-native|cinematic-romance writer|prose author/i];

async function harvest(run) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const calls = [];
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    let body = null; try { body = req.postData(); } catch (_) {}
    calls.push({ bytes: body ? body.length : 0, body });
    try { await route.abort(); } catch (_) {}
  });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._fscCompileAndPersist === 'function', { timeout: 20000 });
  const info = await page.evaluate(async (wish) => {
    window.state = window.state || {};
    const rec = window._fscCompileAndPersist(wish, { source: 'paid_fullstack' });
    const o = { outcomeId: rec && rec.outcomeId,
      roster: rec && rec.population && rec.population.roster,
      invokerScope: rec && rec.invokerScope, block: window._fscPromptBlock() };
    try { await Promise.race([window._runCGScreenplayGen(1, '', ''), new Promise(r => setTimeout(r, 30000))]); }
    catch (e) { o.err = String(e && e.message); }
    o.deliveryFailure = window.state._fscDeliveryFailure || null;
    return o;
  }, run.wish);
  await browser.close();
  const authored = calls.filter(c => c.body).map(c => {
    let msgs = null; try { msgs = (JSON.parse(c.body).messages || []).length; } catch (_) {}
    return { ...c, msgs, marks: MARKERS.reduce((n, rx) => n + (rx.test(c.body) ? 1 : 0), 0),
      hasConsequence: c.body.indexOf('OUTCOME: ' + info.outcomeId) >= 0 };
  }).filter(r => r.marks >= 2 && r.msgs === 2).sort((a, b) => b.bytes - a.bytes);
  return { info, terminal: authored[0] || null, attempted: calls.length };
}

let spent = 0;
const results = [];
log('=== FULL-STACK PAID RUN — ceiling $' + CEILING.toFixed(2) + ' for the whole exercise ===\n');

for (const run of RUNS) {
  log('── ' + run.key + ' ──');
  const { info, terminal, attempted } = await harvest(run);
  log('  compiled : ' + info.outcomeId + '  roster=' + (info.roster || []).length
    + '  invokerScope=' + info.invokerScope);
  log('  harvest  : ' + attempted + ' provider calls attempted, all aborted ($0)');
  if (info.deliveryFailure) { log('  DELIVERY FAILURE recorded — not dispatching.'); continue; }
  if (info.outcomeId !== run.expect) { log('  UNEXPECTED outcome — not dispatching.'); continue; }
  if (!terminal) { log('  no terminal author request captured — not dispatching.'); continue; }
  log('  terminal : ' + terminal.bytes + ' bytes, carries the sealed consequence: ' + terminal.hasConsequence);
  if (!terminal.hasConsequence) { log('  CONSEQUENCE ABSENT — refusing to spend.'); continue; }

  fs.writeFileSync(path.join(OUT, run.key + '_request.json'), terminal.body);
  fs.writeFileSync(path.join(OUT, run.key + '_block.txt'), info.block || '');

  // Budget gate. After the first measurement, use it as the estimate for the next.
  const estimate = results.length && results[0].measured ? results[0].measured : 0.12;
  if (spent + estimate > CEILING) {
    log('  REFUSED — remaining ceiling $' + (CEILING - spent).toFixed(4)
      + ' cannot cover an estimated $' + estimate.toFixed(4) + '. Not dispatched.');
    results.push({ key: run.key, dispatched: false, reason: 'ceiling' });
    continue;
  }

  const body = JSON.parse(terminal.body);
  body.model = MODEL; body._sbModelOverride = MODEL; body._noFallback = true;
  let raw = null, status = null, err = null;
  const t0 = Date.now();
  try {
    const resp = await fetch(PROXY, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body) });
    status = resp.status; raw = await resp.text();
  } catch (e) { err = String(e && e.message || e); }
  const ms = Date.now() - t0;
  // PERSIST BEFORE EVALUATION.
  fs.writeFileSync(path.join(OUT, run.key + '_raw.txt'), raw == null ? '' : raw);
  fs.writeFileSync(path.join(OUT, run.key + '_receipt.json'),
    JSON.stringify({ status, ms, err, model: MODEL, at: new Date().toISOString() }, null, 2));

  let text = '', usage = null;
  try { const j = JSON.parse(raw); usage = j.usage || null;
    text = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || ''; } catch (_) {}
  fs.writeFileSync(path.join(OUT, run.key + '_scene.txt'), text);
  const measured = usage && usage.cost_in_usd_ticks ? usage.cost_in_usd_ticks * 1e-10 : null;
  if (measured) spent += measured;
  log('  upstream : status=' + status + ' ' + ms + 'ms' + (err ? ' ERR=' + err : ''));
  log('  measured : ' + (measured != null ? '$' + measured.toFixed(6) : 'not reported')
    + '   running total $' + spent.toFixed(6) + ' of $' + CEILING.toFixed(2));
  log('  scene    : ' + text.split(/\s+/).filter(Boolean).length + ' words');
  results.push({ key: run.key, dispatched: true, measured, text, roster: info.roster,
    invokerScope: info.invokerScope, outcomeId: info.outcomeId });
}

// ── C2 mechanically, before any reading ─────────────────────────────────────────────────────
log('\n' + '='.repeat(70) + '\nC2 — MECHANICAL ROSTER CHECK (scored first)\n' + '='.repeat(70));
const TOK = { 'pc:lirael': /\bLirael\b/i, 'named:seren': /\bSeren\b/i, 'named:julian': /\bJulian\b/i,
  'role:first_sacrifice_presiding_dohkar': /\bDohkar\b/i, 'the_assembly': /\b(assembly|crowd|gathering)\b/i };
results.filter(r => r.dispatched).forEach(r => {
  const mentioned = Object.keys(TOK).filter(k => TOK[k].test(r.text));
  const outside = mentioned.filter(m => (r.roster || []).indexOf(m) < 0);
  log('\n  ' + r.key + '  (' + r.outcomeId + ')');
  log('    declared roster : ' + (r.roster || []).join(', '));
  log('    mentioned       : ' + mentioned.join(', '));
  log('    OUTSIDE roster  : ' + (outside.length ? outside.join(', ') : '(none)'));
  log('    magical-visual  : ' + (/\b(glow|glowing|luminous|shimmer|aura|radian)\b/i.test(r.text)
    ? 'HIT — possible C3 failure' : 'clean'));
  r.mentioned = mentioned; r.outside = outside;
});

fs.writeFileSync(path.join(OUT, 'verdict_input.json'), JSON.stringify(results, null, 2));
log('\n  TOTAL MEASURED : $' + spent.toFixed(6) + ' of $' + CEILING.toFixed(2));
log('  evidence       : ' + OUT);
log('\n  NO VERDICT RENDERED HERE. C1/C3/C4 are human calls against the sealed record.');
