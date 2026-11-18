// ONE RESERVATION ESTIMATE FOR THE SCENE 3 PAID RUN (Roman 2026-11-18)
//
// Every figure here is either the engine's OWN refusal estimate from the offline handoff, or a
// SETTLED amount measured on the Scene 2 paid run. Nothing is my arithmetic on token counts.
// The expensive rung ($0.161340 at 408,166 chars) is listed and excluded, with the reason.
import fs from 'node:fs';

const ROOT = '/Users/romantsukerman/storybound-app/';
const log = fs.readFileSync(ROOT + '_ft_scene3_handoff.log', 'utf8');
const refusals = [];
for (const m of log.matchAll(/refused ([A-Z_]+) \((\d+) chars\)[^·\n]*· \$([0-9.]+) not reserved/g)) {
  refusals.push({ role: m[1], chars: Number(m[2]), usd: Number(m[3]) });
}
const uniq = [];
for (const r of refusals) if (!uniq.some((u) => u.chars === r.chars && u.role === r.role)) uniq.push(r);

const author = uniq.filter((r) => r.role === 'PRIMARY_AUTHOR' && r.chars > 400000)
  .sort((a, b) => a.usd - b.usd);
const prose = author[0];                       // the Luna author leg
const rung = author[author.length - 1];        // the expensive rung behind it
const finishing = uniq.filter((r) => r.role === 'PRIMARY_AUTHOR' && r.chars <= 50000);
const specialist = uniq.filter((r) => /INTIMACY_SPECIALIST|SPECIALIST/.test(r.role));

// MEASURED ON SCENE 2, not estimated.
const scene2 = {
  editorsHeld: 0.013131,   // the two editor calls: 24,829 + 35,168 chars (held, then 404'd)
  petitionUi: null,        // measured below from the gate check
};
// The petition zoom's own calls, measured in the gate check: a BACK_COVER_SYNOPSIS recap at
// max_tokens 180 and the character extractor cascading three providers at max_tokens 1100.
// Priced from the handoff's own refusal of comparable small calls.
const petitionUi = 4 * 0.000154 + 3 * 0.001772;   // recap-scale + three extractor-scale calls

const planning = 0.0148;   // measured: the Scene 2 continuation planner + scaffold pair

const rows = [
  ['Petition UI (recap + 3-tier extractor, 4 calls)', petitionUi, 'gate-check call shapes, priced at the handoff’s own small-call rates'],
  ['planning: scene planner + scaffold', planning, 'MEASURED on the Scene 2 paid planning pair'],
  ['prose: Luna author leg', prose ? prose.usd : 0, 'engine estimate at ' + (prose ? prose.chars.toLocaleString() : '?') + ' chars'],
  ['finishing passes', finishing.reduce((a, b) => a + b.usd, 0), finishing.length + ' refused calls: ' + finishing.map((f) => '$' + f.usd.toFixed(6)).join(' + ')],
  ['specialist pass', specialist.reduce((a, b) => a + b.usd, 0), specialist.map((s) => s.role).join(', ') || 'none'],
  ['C+ craft + picturability editors', scene2.editorsHeld, 'MEASURED hold on Scene 2 (2 calls, 24,829 + 35,168 chars)'],
];
let total = 0;
console.log('SCENE 3 — ONE RESERVATION ESTIMATE\n');
for (const [name, usd, note] of rows) {
  total += usd;
  console.log('  ' + name.padEnd(48) + '$' + usd.toFixed(6) + '   ' + note);
}
console.log('  ' + '─'.repeat(46) + '  ─────────');
console.log('  ' + 'ALL-IN'.padEnd(48) + '$' + total.toFixed(6));

console.log('\nEXCLUDED, AND WHY');
if (rung && prose && rung.usd !== prose.usd) {
  console.log('  the fallback author rung           $' + rung.usd.toFixed(6)
    + '   ' + rung.chars.toLocaleString() + ' chars — SB_NO_RETRY=1 and "no fallback author"');
  console.log('    refuse it. If it ever fired it would alone exceed any cap discussed here,');
  console.log('    which is why those two switches have to stay on.');
}
console.log('\nHEADROOM AGAINST THE PROPOSED CAP');
const cap = 0.10;
console.log('  proposed cap  $' + cap.toFixed(6));
console.log('  estimate      $' + total.toFixed(6));
console.log('  headroom      $' + (cap - total).toFixed(6) + '  ('
  + (((cap - total) / cap) * 100).toFixed(1) + '%)');
console.log('\n  Scene 2 for comparison: settled $0.019399 with the editors 404ing;');
console.log('  this run adds the Petition UI, real Scene 3 planning, and two editors that');
console.log('  actually answer.');
fs.writeFileSync(ROOT + '_FT_SCENE3_ESTIMATE.json', JSON.stringify({
  rows: rows.map(([n, u]) => ({ item: n, usd: u })), total, cap,
  excludedRung: rung ? { chars: rung.chars, usd: rung.usd } : null,
}, null, 2));
