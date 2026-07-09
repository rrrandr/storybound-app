// Headless validation of the FF crossover module — extracts the real block from app.js, runs against the
// live proxy. Plan/setup only, ZERO scene generation.
const fs = require('fs'); const vm = require('vm');
const src = fs.readFileSync('/Users/romantsukerman/storybound-app/public/app.js', 'utf8');
const block = src.slice(src.indexOf('// ═══════════ FAMOUS-FATE CROSSOVER'), src.indexOf('\n', src.indexOf('[FF-CROSSOVER] harness ready')));
const BASE = 'http://localhost:3000';
let calls = 0;
async function ffGrokJSON(sys, usr, opts) {
  calls++;
  const res = await fetch(BASE + '/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }], role: 'SPECIALIST_RENDERER', preferredModel: (opts && opts.reasoning) ? 'grok-4-1-fast-reasoning' : 'grok-4-1-fast-non-reasoning', temperature: 0.2, max_tokens: (opts && opts.maxTokens) || 800, convId: 'xtest' }) });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  let raw = ((data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '').replace(/^\s*```[a-z]*\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  try { return JSON.parse(raw); } catch (_) { const a = raw.indexOf('{'), b = raw.lastIndexOf('}'); if (a > -1 && b > -1) { try { return JSON.parse(raw.slice(a, b + 1).replace(/,\s*([}\]])/g, '$1')); } catch (_) {} } return null; }
}
const ctx = { Math, JSON, String, Number, Array, Boolean, Promise, console: { log: (...a) => console.log(...a.filter(x => typeof x !== 'string' || !x.startsWith('color:') && !x.startsWith('%c') ? true : false).map(x => typeof x === 'string' ? x.replace(/%c/g, '') : x)) }, _ffGrokJSON: (...a) => ffGrokJSON(...a), window: {} };
// simpler console: strip %c styling args
ctx.console = { log: (...a) => { const cleaned = []; for (let i = 0; i < a.length; i++) { if (typeof a[i] === 'string' && a[i].includes('%c')) { cleaned.push(a[i].replace(/%c/g, '')); if (typeof a[i + 1] === 'string' && a[i + 1].startsWith('color:')) i++; } else cleaned.push(a[i]); } console.log(...cleaned); } };
vm.createContext(ctx); vm.runInContext(block, ctx, { filename: 'xover' });
const W = ctx.window;

let pass = 0, fail = 0; const fails = [];
const ok = (n, c) => { c ? pass++ : (fail++, fails.push(n)); console.log((c ? '  ✓ ' : '  ✗ FAIL ') + n); };

(async () => {
  console.log('═══ TEST A — MODE CLASSIFIER ═══');
  const expect = {
    'Old Man Logan': ['standard_ff'],
    'Play Old Man Logan as Logan': ['standard_ff'],
    'Miles Morales in Old Man Logan': ['inserted_protagonist_crossover'],
    'Play Miles Morales in the Old Man Logan universe': ['inserted_protagonist_crossover'],
    'Miles replaces Logan in Old Man Logan': ['substitution_au'],
    'Make Miles the Old Man Logan protagonist': ['substitution_au'],
    'Batman as Hamlet': ['substitution_au', 'ambiguous'],
    'Buffy in Pride and Prejudice': ['inserted_protagonist_crossover'],
    'Play as Miles Morales': ['ambiguous', 'standard_ff'],
    'Spider-Man in Lord of the Rings': ['inserted_protagonist_crossover'],
    'Batman Hamlet': ['ambiguous']
  };
  const results = await W._ffCrossoverModeAudit(Object.keys(expect));
  for (const r of results) { ok('"' + r.input + '" → ' + r.mode + ' [want ' + expect[r.input].join('/') + ']', expect[r.input].includes(r.mode)); }

  console.log('\n═══ TEST B+C+E — CONTRACT + ARC + AUDIT (Miles Morales in Old Man Logan) ═══');
  const a = await W._ffCrossoverAudit({ character: 'Miles Morales', world: 'Old Man Logan' });
  const C = a && a.contract, arc = a && a.arc;
  console.log('\n  --- contract shape ---');
  ok('mode = inserted_protagonist_crossover', a.cls.mode === 'inserted_protagonist_crossover');
  ok('embodiedPC = Miles Morales', /miles/i.test(C.embodiedPC || ''));
  ok('characterCanon separate from worldCanon', a.checks.sep);
  ok('worldCanon = Old Man Logan', /old man logan/i.test((C.worldCanon && C.worldCanon.source) || ''));
  ok('Logan present as a major canon character (not replaced)', JSON.stringify(C.worldCanon.majorCanonCharacters || []).toLowerCase().includes('logan'));
  ok('substitutionAllowed = false', C.fusionPolicy.substitutionAllowed === false);
  console.log('    charCanon.mustNotInvent: ' + JSON.stringify((C.characterCanon && C.characterCanon.mustNotInventOrOverwrite) || []).slice(0, 160));
  console.log('    insertion: ' + JSON.stringify((C.fusionPolicy && C.fusionPolicy.insertionPremise) || {}).slice(0, 220));
  console.log('\n  --- inserted arc ---');
  ok('planned arc exists (4-8 beats)', a.checks.bounded);
  ok('has ≥2 world-clock collisions', a.checks.collisions >= 2);
  ok('judge: PC keeps own identity', a.judge && a.judge.pcKeepsOwnIdentity);
  ok('judge: PC does NOT inherit Logan backstory', a.judge && a.judge.pcInheritsWorldProtagBackstory === false);
  ok('judge: Logan NOT erased/replaced', a.judge && a.judge.worldProtagErasedOrReplaced === false);
  ok('judge: does NOT reenact Logan plot', a.judge && a.judge.reenactsWorldProtagPlot === false);
  ok('overall SAFE for FF planning', a.safe === true);
  console.log('    pcWant: ' + (arc.pcWant || '').slice(0, 120));
  console.log('    beats: ' + (arc.beats || []).map(b => (b.kind || '?') + ':' + (b.beat || '').slice(0, 46)).join(' | ').slice(0, 500));
  console.log('    collisions: ' + JSON.stringify(arc.worldClockCollisions || []).slice(0, 240));
  console.log('    climax: ' + (arc.climax || '').slice(0, 140));

  console.log('\n─────── SUMMARY ───────');
  console.log('PASS ' + pass + '/' + (pass + fail) + (fail ? '  ✗ ' + fails.join(' · ') : '  — ALL GREEN'));
  console.log('proxy calls: ' + calls + ' · scene generations: 0');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
