// FREE. Replays a captured run against the RUNTIME authority auditor.
// SINGLE SOURCE OF TRUTH: both the contracts and the detector logic are extracted
// from public/app.js — this file reimplements nothing.
import fs from 'fs';
const dir = process.argv[2];
if (!dir) { console.error('usage: node _contract_audit.mjs <_validate_out/RUNDIR>'); process.exit(1); }
const app = fs.readFileSync('public/app.js','utf8');

const reg = app.match(/window\.MUTATION_CONTRACTS\s*=\s*(\{[\s\S]*?\n\});/);
if (!reg) { console.error('MUTATION_CONTRACTS not found in public/app.js'); process.exit(1); }
const fn = app.match(/window\._auditMutation\s*=\s*(function[\s\S]*?\n\};)/);
if (!fn) { console.error('_auditMutation not found in public/app.js'); process.exit(1); }

// minimal window/state shim so the extracted function runs unchanged
const window = { MUTATION_CONTRACTS: JSON.parse(reg[1]), state: {} };
const state = window.state;
const audit = eval('(' + fn[1].replace(/;$/,'') + ')');
window._auditMutation = audit;

const load = f => { try { return JSON.parse(fs.readFileSync(`${dir}/${f}`,'utf8')); } catch(_) { return []; } };
const snaps = [...load('textsnap.json'), ...load('rawsnap_full.json'), ...load('rawsnap.json')]
  .filter(r => r && r.before && r.after && r.before !== r.after);

// Coverage: which declared owners were actually EXERCISED by this capture?
// "did not fire" must never be read as "passed" — that was the original trap.
// Four states, and "ran but declined to write" is deliberately NOT the same evidence
// as "wrote and stayed in contract". Collapsing them was the original trap.
const seen = new Map();          // owner -> strongest claim we can make
const RANK = { 'NO-OP': 0, 'WROTE·PASS': 1, INCONCLUSIVE: 2, 'WROTE·FAIL': 3 };
const setState = (o, st) => {
  if (!seen.has(o) || RANK[st] > RANK[seen.get(o)]) seen.set(o, st);
};
// any snap record proves the owner RAN; changed text proves it WROTE
for (const f of ['textsnap.json','rawsnap_full.json','rawsnap.json'])
  for (const r of (load(f) || [])) {
    if (!r || !r.label) continue;
    const o = String(r.label).replace(/^window\./,'');
    const wrote = (r.before && r.after && r.before !== r.after) ||
                  (r.beforeLen !== undefined && r.afterLen !== undefined && r.beforeLen !== r.afterLen && r.beforeLen > 0);
    setState(o, wrote ? 'WROTE·PASS' : 'NO-OP');
  }

let n = 0;
for (const r of snaps) {
  const owner = String(r.label || r.site || '?').replace(/^window\./,'');
  const res = audit(owner, r.before, r.after);
  if (!res.ok) {
    n++;
    if (res.status === 'INCONCLUSIVE') { console.log(`\n? ${owner}  AUDIT INCONCLUSIVE — ${res.violations.join(', ')}`); setState(owner,'INCONCLUSIVE'); continue; }
    setState(owner, 'WROTE\u00b7FAIL');
    const spec = window.MUTATION_CONTRACTS.owners[owner];
    console.log(`\n⚠ ${owner}  [${spec ? spec.role + '/' + spec.pen : 'UNDECLARED → _default'}]  ${r.before.length}→${r.after.length}`);
    res.violations.forEach(v => console.log('    · ' + v));
  }
}
console.log(n ? `\n${n} finding(s) (violation or INCONCLUSIVE) across ${snaps.length} mutating site(s).`
              : `\nNo authority violations across ${snaps.length} mutating site(s).`);

// ── FOUR-STATE ADJUDICATION TABLE ──────────────────────────────────────────
console.log('\nADJUDICATION');
const owners = Object.keys(window.MUTATION_CONTRACTS.owners);
const pad = (x,w) => String(x).padEnd(w);
for (const o of owners) {
  const spec = window.MUTATION_CONTRACTS.owners[o];
  const st = seen.get(o) || 'UNTESTED';
  const NOTE = {
    'UNTESTED':    'never exercised — NOT evidence of safety',
    'NO-OP':       'ran and declined to write — weak evidence',
    'WROTE·PASS':  'wrote, stayed within contract',
    'WROTE·FAIL':  'wrote, VIOLATED contract',
    'INCONCLUSIVE':'audit could not complete'
  };
  console.log('  ' + pad(o,32) + pad(st,14) + (spec.pen === 'REMOVED' ? '[pen removed] ' : '') + (NOTE[st] || ''));
}
const untested = owners.filter(o => !seen.has(o));
const noop = owners.filter(o => seen.get(o) === 'NO-OP');
console.log(`\n  ${untested.length} UNTESTED · ${noop.length} ran-but-declined · ${owners.length} declared owners total.`);
if (untested.length || noop.length) console.log('  Neither state is evidence that the pass is safe.');
