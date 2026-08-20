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

let n = 0;
for (const r of snaps) {
  const owner = String(r.label || r.site || '?').replace(/^window\./,'');
  const res = audit(owner, r.before, r.after);
  if (!res.ok) {
    n++;
    const spec = window.MUTATION_CONTRACTS.owners[owner];
    console.log(`\n⚠ ${owner}  [${spec ? spec.role + '/' + spec.pen : 'UNDECLARED → _default'}]  ${r.before.length}→${r.after.length}`);
    res.violations.forEach(v => console.log('    · ' + v));
  }
}
console.log(n ? `\n${n} authority violation(s) across ${snaps.length} mutating site(s).`
              : `\nNo authority violations across ${snaps.length} mutating site(s).`);
