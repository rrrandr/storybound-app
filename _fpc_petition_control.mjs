// PETITION PRE-AUTHOR CONSEQUENCE CARRIER — control. Provider-free, drives the real module.
// Asserts that every reachable Petition verdict path compiles to structured facts BEFORE the
// author sees anything: sealed roster, exact changed/unchanged facts, authored roster-scoped
// aftermathBeat, and the same effect boundary + forbidden-inventions block as Tempt.
import fs from 'fs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
const S = SRC.indexOf('// STAGE 3 — ISSUE 1 OPENING CONSEQUENCE COMPILER');
if (S < 0) { console.error('FATAL: compiler section not found'); process.exit(1); }
const win = {}; globalThis.window = win;
new Function('window', SRC.slice(S - 100))(win);

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };
const reset = () => { win.state = { _starterId: 'starter_first_sacrifice', _fscDeltas: [], _fscCompiled: [], _fpcCompiled: [] }; };

console.log('=== PETITION CARRIER ===\n');

console.log('A. surface');
['_fpcCompile','_fpcCompileAndPersist','_fpcPromptBlock','_fpcResolveLatitude']
  .forEach(fn => t('exports ' + fn, typeof win[fn] === 'function'));
t('shared boundary renderer is exported', typeof win._fscRenderBoundary === 'function');

// ── Every reachable verdict path compiles ───────────────────────────────────────────────────
console.log('\nB. every reachable verdict path compiles to structured facts');
const PATHS = [
  { name: 'guaranteed first petition', vi: { guaranteedFirst: true }, expect: 'granted_kernel', changes: 1 },
  { name: 'verdict NOT GRANTED',       vi: { accepted: false },       expect: 'not_granted',    changes: 0 }
];
PATHS.forEach(p => {
  reset();
  const r = win._fpcCompileAndPersist('I wish someone would speak for me.', p.vi, {});
  t(p.name + ' -> ' + p.expect, r.verdictPath === p.expect, r.verdictPath);
  t('  changed facts are explicit (' + p.changes + ')', r.changed.length === p.changes);
  t('  unchanged note is explicit', typeof r.unchangedNote === 'string' && r.unchangedNote.length > 10);
});

// ── The latitude path is RESOLVED at compile, not left to the author ────────────────────────
console.log('\nC. the honor/twist/ignore latitude is resolved before the author sees it');
const seen = new Set();
for (let i = 0; i < 40; i++) {
  reset();
  const r = win._fpcCompileAndPersist('wish number ' + i, {}, { seed: 'seed-' + i });
  seen.add(r.verdictPath);
  t2(r);
}
function t2(r) { if (!['honored','subverted','resisted'].includes(r.verdictPath)) { fail++;
  console.log('  FAIL latitude resolved to an unknown path — ' + r.verdictPath); } }
t('latitude always resolves to exactly one sealed verdict',
  [...seen].every(v => ['honored','subverted','resisted'].includes(v)), [...seen].join(','));
t('all three latitude outcomes are reachable', seen.size === 3, [...seen].join(','));
reset();
const d1 = win._fpcCompile('same wish', {}, { seed: 'fixed' });
const d2 = win._fpcCompile('same wish', {}, { seed: 'fixed' });
t('resolution is deterministic for the same sealed invocation', d1.verdictPath === d2.verdictPath);

// ── Sealed roster and explicit exclusion ────────────────────────────────────────────────────
console.log('\nD. sealed roster and explicit exclusion');
reset();
const rk = win._fpcCompileAndPersist('let something go my way', { guaranteedFirst: true }, {});
t('roster is sealed and explicit', Array.isArray(rk.population.roster) && rk.population.roster.length >= 1);
t('roster contains the invoker', rk.population.roster.indexOf('pc:lirael') >= 0);
t('invokerScope recorded', rk.invokerScope === 'in_population');
t('NOT AFFECTED is derived, not blank',
  rk.notAffected.length === 4 && rk.notAffected.indexOf('named:julian') >= 0, rk.notAffected.join(','));
t('the author is never left to infer the affected party',
  rk.population.roster.length + rk.notAffected.length === 5);

// ── Authored, roster-scoped aftermathBeat ───────────────────────────────────────────────────
console.log('\nE. authored aftermath beat, roster-scoped');
Object.keys(win._FPC_VERDICTS).forEach(k => {
  const v = win._FPC_VERDICTS[k];
  t(k + ' has an authored aftermathBeat', !!(v.aftermathBeat && v.aftermathBeat.text.length > 40));
  t('  ' + k + ' beat mentions no unaffected named party',
    !/\bJulian\b|\bSeren\b|\bDohkar\b/.test(v.aftermathBeat.text) || v.roster.length > 1);
});

// ── The payload carries the SAME boundary as Tempt ──────────────────────────────────────────
console.log('\nF. payload parity with Tempt');
reset();
win._fpcCompileAndPersist('I wish someone would speak for me.', { guaranteedFirst: true }, {});
const p = win._fpcPromptBlock();
t('payload is non-empty', p.length > 0);
t('labelled PETITION FATE', /PETITION FATE/.test(p));
t('carries AFFECTED', /AFFECTED — exactly these people/.test(p));
t('carries NOT AFFECTED with individuals named',
  /NOT AFFECTED — these present people/.test(p) && /Julian/.test(p) && /Seren/.test(p));
t('carries EFFECT LIMITED TO', /EFFECT LIMITED TO/.test(p));
t('carries MUST REMAIN TRUE', /MUST REMAIN TRUE/.test(p));
t('carries a REQUIRED aftermath beat', /AFTERMATH BEAT — REQUIRED/.test(p));
t('scopes the beat to the AFFECTED list', /Scope it to the AFFECTED list only/.test(p));
t('carries FORBIDDEN INVENTIONS', /FORBIDDEN INVENTIONS/.test(p));
t('forbids visible wish-energy', /visible wish-energy/.test(p));
t('forbids extra cost', /no cost or penalty beyond/.test(p));
t('forbids new canon', /no new canon fact/.test(p));
t('forbids an Answer verdict', /never delivers a verdict/.test(p));

console.log('\nG. the not-granted path asserts nothing changed');
reset();
win._fpcCompileAndPersist('please, anything', { accepted: false }, {});
const png = win._fpcPromptBlock();
t('states that nothing changes', /nothing changes\. The ask does not land\./.test(png));
t('still requires an aftermath beat', /AFTERMATH BEAT — REQUIRED/.test(png));
t('beat is the near-miss, scoped to the invoker only', /almost happened/.test(png));

console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + '  ' + pass + '/' + (pass + fail) + ' assertions');
process.exit(fail === 0 ? 0 : 1);
