import fs from 'fs';
const FILES = ['_answer_contact_rule_revised.md','_answer_visibility_contact_and_risk.md',
  '_answer_lore_and_silence_reopened.md','_answer_custody_canon.md','_three_final_traces.md'];
const isSep = l => /^\|[\s:|-]+\|[\s:|-]*$/.test(l) && l.includes('-');
const cells = l => l.replace(/^\||\|$/g,'').split('|').map(c => c.trim());

let tables = 0, blankHeaders = [], ragged = [];
for (const f of FILES) {
  const lines = fs.readFileSync(f,'utf8').split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    if (!lines[i].startsWith('|') || !isSep(lines[i+1])) continue;
    tables++;
    const h = cells(lines[i]);
    if (h.some(x => x === '')) blankHeaders.push(f + ':' + (i+1) + '  ' + lines[i].trim());
    // column-count consistency across the body
    for (let j = i + 2; j < lines.length && lines[j].startsWith('|'); j++) {
      if (cells(lines[j]).length !== h.length) { ragged.push(f + ':' + (j+1) + '  ' + cells(lines[j]).length + ' vs ' + h.length); break; }
    }
  }
}
console.log('=== Answer-canon table scan ===');
console.log('tables found              : ' + tables);
console.log('BLANK HEADER CELLS remaining: ' + blankHeaders.length);
blankHeaders.forEach(b => console.log('  ' + b));
console.log('ragged column counts       : ' + ragged.length);
ragged.forEach(r => console.log('  ' + r));
