import fs from 'fs';
const FILES = ['_answer_contact_rule_revised.md','_answer_visibility_contact_and_risk.md',
  '_answer_lore_and_silence_reopened.md','_answer_custody_canon.md','_three_final_traces.md'];
const isSep = l => /^\|[\s:|-]+\|[\s:|-]*$/.test(l) && l.includes('-');
const cells = l => l.replace(/^\||\|$/g,'').split('|').map(c => c.trim());

let fixed = 0, skipped = [];
for (const f of FILES) {
  const lines = fs.readFileSync(f,'utf8').split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    const l = lines[i];
    if (!l.startsWith('|') || !isSep(lines[i+1])) continue;
    const c = cells(l);
    if (!c.some(x => x === '')) continue;            // header fully populated — leave alone
    if (c.length !== 2) { skipped.push(f + ':' + (i+1) + '  ' + c.length + ' cols  ' + l.trim()); continue; }
    lines[i] = '| field | detail |';
    fixed++;
  }
  fs.writeFileSync(f, lines.join('\n'));
}
console.log('headers repaired : ' + fixed);
console.log('skipped (not 2-col, reported not guessed): ' + skipped.length);
skipped.forEach(s => console.log('  ' + s));
