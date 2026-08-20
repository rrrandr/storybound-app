// FREE. Replays a captured run's snaps against _mutation_contracts.json and reports
// AUTHORITY VIOLATIONS mechanically — not prose opinions.
import fs from 'fs';
const dir = process.argv[2];
if (!dir) { console.error('usage: node _contract_audit.mjs <_validate_out/RUNDIR>'); process.exit(1); }
// SINGLE SOURCE OF TRUTH: parse the registry out of app.js rather than duplicating it.
const _appSrc = fs.readFileSync('public/app.js','utf8');
const _m = _appSrc.match(/window\.MUTATION_CONTRACTS\s*=\s*(\{[\s\S]*?\n\});/);
if (!_m) { console.error('MUTATION_CONTRACTS not found in public/app.js'); process.exit(1); }
const C = JSON.parse(_m[1]);
const load = f => { try { return JSON.parse(fs.readFileSync(`${dir}/${f}`,'utf8')); } catch(_) { return []; } };
const snaps = [...load('textsnap.json'), ...load('rawsnap.json')].filter(r => r && r.before && r.after && r.before !== r.after);

const quotes  = t => (String(t).match(/[“"][^”"]{8,400}[”"]/g) || []);
const proper  = t => new Set((String(t).match(/\b[A-Z][a-z]{2,}\b/g) || [])
                    .filter(w => !/^(The|And|But|Her|His|She|Him|They|Then|When|What|That|This|With|From|Every|Someone|Protocol|Weave|Script|First|Favored)$/.test(w)));
const firstP  = t => (String(t).match(/\bI\s/g) || []).length;
const thirdP  = t => (String(t).match(/\b(she|her)\s(?:stepped|crossed|held|seized|tore|felt|watched|lowered)/gi) || []).length;

let violations = 0;
for (const r of snaps) {
  const owner = String(r.label || r.site || '?');
  const spec = C.owners[owner] || C.owners[owner.replace(/^window\./,'')] || null;
  const rules = spec ? (spec.may_not || []) : C._default.may_not;
  const all = rules.includes('*');
  const v = [];
  const qB = quotes(r.before), qA = quotes(r.after);
  const newQ = qA.filter(q => !qB.includes(q));
  if ((all || rules.includes('create_dialogue')) && newQ.length) v.push(`create_dialogue (+${newQ.length}): ${newQ[0].slice(0,70)}…`);
  if ((all || rules.includes('remove_dialogue')) && qA.length < qB.length) v.push(`remove_dialogue (${qB.length}→${qA.length})`);
  const pB = proper(r.before), pA = proper(r.after);
  const added = [...pA].filter(x => !pB.has(x));
  const lost  = [...pB].filter(x => !pA.has(x));
  if ((all || rules.includes('create_named_entity')) && added.length) v.push(`create_named_entity: ${added.slice(0,4).join(', ')}`);
  if (lost.length) v.push(`lost_named_entity: ${lost.slice(0,4).join(', ')}`);
  if ((all || rules.includes('change_pov')) && firstP(r.before) > 3 && (firstP(r.after) < firstP(r.before) * 0.5 || thirdP(r.after) > thirdP(r.before)))
    v.push(`change_pov (I: ${firstP(r.before)}→${firstP(r.after)}, 3rd: ${thirdP(r.before)}→${thirdP(r.after)})`);
  if (v.length) {
    violations++;
    console.log(`\n⚠ ${owner}  [${spec ? spec.role + '/' + spec.pen : 'UNDECLARED'}]  ${r.before.length}→${r.after.length}`);
    v.forEach(x => console.log('    · ' + x));
  }
}
console.log(violations ? `\n${violations} authority violation(s) across ${snaps.length} mutating site(s).`
                       : `\nNo authority violations across ${snaps.length} mutating site(s).`);
