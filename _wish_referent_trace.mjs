// WHICH WISH DOES EACH INSTRUCTION IN THE SCENE 6 REQUEST REFER TO? $0, no provider.
import fs from 'fs';
const req = JSON.parse(fs.readFileSync('_fs_live_out/run_2026-10-06T16-50-01-923Z/wire/050_req.json','utf8'));
const msgs = req.messages || [];
const all = msgs.map(m => String(m.content||'')).join('\n@@MSG@@\n');
const lines = all.split('\n');
const rx = /wish|strength/i;
const seen = new Set();
let shown = 0;
console.log('SCENE 6 AUTHOR REQUEST — every instruction mentioning a wish or strength\n');
for (let i = 0; i < lines.length; i++) {
  const l = lines[i].trim();
  if (!rx.test(l) || l.length < 25 || l.length > 420) continue;
  const key = l.slice(0, 80);
  if (seen.has(key)) continue;
  seen.add(key);
  // label the referent: SEREN's rite wish, LIRAEL's card wish, or unmarked
  let who = 'UNMARKED';
  if (/seren|ward/i.test(l)) who = "SEREN'S (the ward's rite wish)";
  else if (/lirael|i wish|my wish|player|pc\b/i.test(l)) who = "LIRAEL'S (the card wish)";
  console.log('[' + who + ']\n  ' + l.replace(/\s+/g,' ').slice(0, 300) + '\n');
  if (++shown >= 22) break;
}
