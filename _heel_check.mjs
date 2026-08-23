// Unobservable micro-gesture detector. The heel tic recurred in 3 of 4 scenes; banning the
// noun alone just yields "boot toe", so this matches the CATEGORY — a foot doing something
// no narrator could see from across a room.
import fs from 'fs';
const PAT = [
  [/\b(?:heels?)\b[^.]{0,40}\b(?:press|presse[sd]|scrap\w+|grind\w+|bounc\w+|lift\w+|settl\w+|dug|dent)\b/i, 'heel micro-gesture'],
  [/\b(?:press|scrap|grind|bounc|dug)\w*\b[^.]{0,25}\b(?:heels?)\b/i, 'heel micro-gesture (inverted)'],
  [/\bboot toe\b|\bball of (?:his|her|their|my) foot\b|\btoe of (?:his|her|their|my) boot\b/i, 'foot substitute'],
  [/\b(?:by |a )?half a (?:degree|beat|inch|step|breath|turn)\b/i, 'false precision'],
  [/\ba fraction of an? (?:inch|second|degree|beat)\b/i, 'false precision'],
  [/\bby (?:a )?(?:degree|inch|hair|shade)s?\b|\ba quarter turn\b|\ba shade (?:warmer|cooler|darker|lighter)\b/i, 'false precision'],
];
let n = 0;
for (const f of process.argv.slice(2)) {
  let t = ''; try { t = fs.readFileSync(f, 'utf8'); } catch (_) { continue; }
  const hits = PAT.flatMap(([rx, l]) => { const m = rx.exec(t); return m ? [{ l, q: t.slice(Math.max(0, m.index - 45), m.index + 70).replace(/\s+/g, ' ') }] : []; });
  n += hits.length;
  console.log(`  ${hits.length ? 'FLAG ' : 'clean'}  ${f.split('/').pop()}`);
  for (const h of hits) console.log(`     [${h.l}] …${h.q}…`);
}
console.log(n ? `\n${n} hit(s): a gesture nobody could see, or a measurement of something unmeasurable.\n` : '\nNo foot tics, no false precision.\n');
