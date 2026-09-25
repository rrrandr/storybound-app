// SAY/DO CATEGORIES 4 & 5 — TEST-FIRST TRACE. ZERO dispatches, $0.
//
// This is a DIAGNOSTIC, not a fix. Per the original test plan both categories are test-first:
// trace what production does today, then decide whether anything needs building. Nothing in
// public/app.js is modified by this pass.
//
//   Category 4 — game complaints. A detector ALREADY EXISTS (_detectWallBreakSignal, six
//   categories including model-name-complaint, plot-memory-complaint and interface). The job is to
//   find out what it does and does not cover, NOT to build a second one.
//
//   Category 5 — weak responses. These must NOT be blocked. The job is to trace how they reach the
//   planner and author, and whether anything downstream inflates them into a decision the player
//   never made.
//
// usage: node _saydo_cat4_cat5_trace_control.mjs

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_saydo_cat4_cat5_out');
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '\n        → ' + String(detail).slice(0, 400) : ''));
};
const note = (t) => console.log('    ' + t);
function section(t) { console.log('\n=== ' + t + ' ==='); }

// Roman's category-4 inputs, plus the in-character negative controls that must NOT be caught.
const CAT4 = [
  { id: 'model-complaint',   text: 'Claude messed this up.',            expectCaught: true,  kind: 'subjective/model' },
  { id: 'boring',            text: 'This game is boring.',              expectCaught: null,  kind: 'subjective frustration' },
  { id: 'continuity',        text: 'You forgot what happened.',         expectCaught: true,  kind: 'continuity claim' },
  { id: 'button-broken',     text: 'The Continue button is broken.',    expectCaught: null,  kind: 'bug report' },
  { id: 'NEG-ceremony',      text: 'This ceremony is boring.',          expectCaught: false, kind: 'in-character' },
  { id: 'NEG-oath',          text: 'You forgot your oath.',             expectCaught: false, kind: 'in-character' }
];
// Category 5 — weak but legitimate. None of these may be blocked or rewritten.
const CAT5 = ['I don\'t know', 'whatever', '...', 'sure'];

(async () => {
  console.log('=== SAY/DO CATEGORIES 4 & 5 — TEST-FIRST TRACE (zero dispatches, $0) ===');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window._detectWallBreakSignal && window._sayDoWallBreakFallback
    && window.sanitizeShortInput, { timeout: 30000 });

  // The REAL Submit-path transform, in the order the handler applies it.
  const submitPath = (text) => page.evaluate((t) => {
    const detected = window._detectWallBreakSignal(t);
    const sanitized = window.sanitizeShortInput(t, 2000);
    const afterFallbackAction = window._sayDoWallBreakFallback(sanitized, 'action');
    const afterFallbackDialogue = window._sayDoWallBreakFallback(sanitized, 'dialogue');
    return { detected, sanitized, afterFallbackAction, afterFallbackDialogue,
      sanitizedToEmpty: sanitized === '', changedByFallback: afterFallbackAction !== sanitized };
  }, text);

  section('1. CATEGORY 4 — WHAT THE EXISTING DETECTOR ALREADY COVERS');
  const cat4 = [];
  for (const c of CAT4) {
    const r = await submitPath(c.text);
    cat4.push({ ...c, ...r });
    note((c.id + ':').padEnd(18) + JSON.stringify(c.text).padEnd(34)
      + ' → ' + (r.detected ? ('CAUGHT [' + r.detected.category + ']') : 'not caught')
      + (r.sanitizedToEmpty ? '  +BLANKED by sanitize' : '')
      + (r.changedByFallback ? '  +fallback substituted' : ''));
  }
  fs.writeFileSync(path.join(OUT_DIR, 'cat4.json'), JSON.stringify(cat4, null, 2));

  const byId = {}; cat4.forEach((r) => { byId[r.id] = r; });
  ok('a detector ALREADY EXISTS and is reachable — nothing here needs a second one',
    typeof (await page.evaluate(() => typeof window._detectWallBreakSignal)) === 'string');
  ok('"Claude messed this up." is caught as a MODEL complaint',
    byId['model-complaint'].detected && byId['model-complaint'].detected.category === 'model-name-complaint',
    JSON.stringify(byId['model-complaint'].detected));
  ok('"You forgot what happened." is caught as a CONTINUITY complaint',
    byId['continuity'].detected && byId['continuity'].detected.category === 'plot-memory-complaint',
    JSON.stringify(byId['continuity'].detected));

  section('2. CATEGORY 4 — THE NEGATIVE CONTROLS MUST SURVIVE');
  // These are the whole reason a complaint detector is dangerous: the same words in character.
  ok('in-character "This ceremony is boring." is NOT caught',
    !byId['NEG-ceremony'].detected, JSON.stringify(byId['NEG-ceremony'].detected));
  ok('...and reaches the story unchanged',
    byId['NEG-ceremony'].afterFallbackAction === byId['NEG-ceremony'].sanitized
    && !byId['NEG-ceremony'].sanitizedToEmpty, JSON.stringify(byId['NEG-ceremony']));
  ok('in-character "You forgot your oath." is NOT caught — the pattern requires the/what/that',
    !byId['NEG-oath'].detected, JSON.stringify(byId['NEG-oath'].detected));
  ok('...and reaches the story unchanged',
    byId['NEG-oath'].afterFallbackAction === byId['NEG-oath'].sanitized
    && !byId['NEG-oath'].sanitizedToEmpty);

  section('3. CATEGORY 4 — THE GAPS, MEASURED');
  const gaps = cat4.filter((r) => r.expectCaught === null && !r.detected);
  gaps.forEach((g) => note('GAP: ' + JSON.stringify(g.text) + '  (' + g.kind + ') — enters story canon verbatim'));
  ok('MEASURED: subjective frustration ("This game is boring.") is NOT covered',
    !byId['boring'].detected, JSON.stringify(byId['boring'].detected));
  ok('MEASURED: a real bug report ("The Continue button is broken.") is NOT covered',
    !byId['button-broken'].detected, JSON.stringify(byId['button-broken'].detected));
  ok('...and both currently reach the story as literal canon text',
    byId['boring'].afterFallbackAction === byId['boring'].sanitized
    && byId['button-broken'].afterFallbackAction === byId['button-broken'].sanitized);

  section('4. CATEGORY 4 — ALL CAUGHT COMPLAINTS GET THE SAME RESPONSE');
  // Roman's point: a bug report, a continuity claim and subjective frustration are different
  // things and should not collapse to one behaviour. The taxonomy EXISTS in the detector; the
  // HANDLING does not use it.
  const caught = cat4.filter((r) => r.detected);
  const distinctCategories = [...new Set(caught.map((r) => r.detected.category))];
  const distinctOutputs = [...new Set(caught.map((r) => r.afterFallbackAction))];
  note('categories detected: ' + JSON.stringify(distinctCategories));
  note('distinct outputs:    ' + JSON.stringify(distinctOutputs));
  ok('the detector DOES distinguish complaint kinds — the taxonomy already exists',
    distinctCategories.length >= 2, JSON.stringify(distinctCategories));
  ok('MEASURED: but every caught complaint collapses to ONE identical fallback, so the taxonomy\n'
    + '     is computed and then discarded',
    distinctOutputs.length === 1, JSON.stringify(distinctOutputs));
  ok('...and that fallback is a neutral placeholder, not authored prose — so nothing a complaint\n'
    + '     said enters canon',
    distinctOutputs[0] === 'a brief, unplaceable pause, as if she lost her train of thought',
    JSON.stringify(distinctOutputs[0]));

  section('5. CATEGORY 5 — WEAK INPUT MUST NOT BE BLOCKED OR REWRITTEN');
  const cat5 = [];
  for (const t of CAT5) {
    const r = await submitPath(t);
    cat5.push({ text: t, ...r });
    note(JSON.stringify(t).padEnd(16) + ' → sanitized=' + JSON.stringify(r.sanitized)
      + (r.detected ? ('  CAUGHT[' + r.detected.category + ']') : '')
      + (r.changedByFallback ? '  SUBSTITUTED' : '  passes through'));
  }
  fs.writeFileSync(path.join(OUT_DIR, 'cat5.json'), JSON.stringify(cat5, null, 2));
  ok('no weak response is caught by any detector', cat5.every((r) => !r.detected),
    JSON.stringify(cat5.filter((r) => r.detected)));
  ok('none is substituted or rewritten', cat5.every((r) => !r.changedByFallback));
  ok('none is blanked by sanitize — "..." and "sure" survive intact',
    cat5.every((r) => r.sanitized === r.text), JSON.stringify(cat5.map((r) => r.sanitized)));

  section('6. CATEGORY 5 — WHAT THE AUTHOR IS TOLD ABOUT A WEAK MOVE');
  // The risk is not blocking; it is INFLATION downstream. buildPlayerImpactDirective tells the
  // author the input is CANON and the scene must react "proportionally" — correct for a strong
  // move, and the place where a shrug could be turned into a decision.
  const impact = await page.evaluate((weak) => {
    const s = window.state; s._starterId = 'starter_first_sacrifice';
    const out = {};
    weak.forEach((t) => {
      s._playerImpactRead = { raw: { do: t, say: '' }, mustReact: false, class: [], fate: null };
      out[t] = window.buildPlayerImpactDirective ? window.buildPlayerImpactDirective() : '(absent)';
    });
    // And the same weak input if something upstream marked it high-impact.
    s._playerImpactRead = { raw: { do: weak[0], say: '' }, mustReact: true, class: ['divergent'], fate: null };
    out.__mustReact = window.buildPlayerImpactDirective ? window.buildPlayerImpactDirective() : '(absent)';
    delete s._playerImpactRead;
    return out;
  }, CAT5);
  fs.writeFileSync(path.join(OUT_DIR, 'impact_directives.txt'),
    Object.entries(impact).map(([k, v]) => '### ' + k + '\n' + v).join('\n\n'));
  const anyWeak = impact[CAT5[0]];
  ok('a weak move still reaches the author as the player\'s literal input',
    anyWeak.indexOf(CAT5[0]) !== -1, anyWeak.slice(0, 200));
  ok('MEASURED: the directive tells the author the input is CANON and the scene must react\n'
    + '     "proportionally" — which for a shrug is exactly where inflation could happen',
    /literal input is CANON/.test(anyWeak) && /react to it proportionally/.test(anyWeak));
  ok('MEASURED: it contains NO instruction to preserve uncertainty, hesitation or weak assent',
    !/uncertain|hesitat|weak|shrug|non-?committal|resign/i.test(anyWeak), anyWeak.slice(0, 300));
  ok('MEASURED: and nothing forbids converting a weak move into a decision the player never made',
    !/never (turn|convert|escalate)/i.test(anyWeak));
  ok('the high-impact variant escalates harder still — "the moment escalates or breaks from the plan"',
    /the moment escalates or breaks from the plan/.test(impact.__mustReact));

  section('7. CONTAINMENT — THIS PASS CHANGED NOTHING');
  const src = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
  ok('no category-4 detector was added — the existing one is the only one',
    (src.match(/function _detectWallBreakSignal/g) || []).length === 1);
  ok('no weak-input blocker was added',
    !/weak(Input|Response)(Block|Gate|Reject)/i.test(src));
  ok('zero provider dispatches', gate.trackedCalls().filter((c) => c.real).length === 0);

  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify({ results, cat4, cat5 }, null, 2));
  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(86));
  console.log('  ' + passed + '/' + results.length + ' assertions passed');
  if (passed !== results.length) console.log('  FAILED: ' + results.filter((r) => !r.pass).map((r) => r.name).join(' | '));
  console.log('\n  This is a TRACE. It changes nothing and proposes nothing on its own —');
  console.log('  the measured gaps are in the report for a decision.');
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
})().catch((e) => { console.error('CONTROL ERROR:', e && e.stack || e); process.exit(2); });
