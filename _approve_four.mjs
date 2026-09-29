import fs from 'fs';
const sub = (f, a, b) => {
  let s = fs.readFileSync(f, 'utf8');
  if (!s.includes(a)) throw new Error('ANCHOR MISSING in ' + f + ': ' + a.slice(0, 60));
  fs.writeFileSync(f, s.split(a).join(b));
};
const T = '_final_traces_and_gap_authoring.md';

// ---- 3. custody_unremembered: the Therefore line was dropped in an earlier splice. Add it. ----
sub(T,
  '| cost | **`she_forgets_whose_it_is`** — a **knowledge loss**, not a predicted action. See §5d. |\n\n### 5b-i.',
  '| cost | **`she_forgets_whose_it_is`** — a **knowledge loss**, not a predicted action. See §5d. |\n\n' +
  '**Therefore:** no one in that clearing can remember **whose the Answer is**. It is in Lirael\'s hands, and\n' +
  '**the question *whose is this* cannot be asked** — not because anyone decided to let it go, but because the\n' +
  'fact that would prompt it is gone from them.\n\n' +
  '**The question *why did he hand it over* is untouched and remains askable**, since they still remember the\n' +
  'handoff. **The silence covers ownership and entrustment, and nothing else.**\n\n' +
  '> *(This line was lost in an earlier section splice and is restored here in its corrected form — the\n' +
  '> version it replaces wrongly said "the question of why simply does not arise", which §5b-iii contradicts.)*\n\n' +
  '### 5b-i.');

console.log('Therefore line restored in corrected form');
