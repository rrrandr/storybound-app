// CUMULATIVE CANON REGRESSION — every rule ever added, checked every run.
// A test that only asserts the newest rules reports green while older ones rot.
// usage: node _canon_regression.mjs <_validate_out/RUNDIR>
import fs from 'fs';
const dir = process.argv[2];
if (!dir) { console.error('usage: node _canon_regression.mjs <_validate_out/RUNDIR>'); process.exit(1); }

const read = (...names) => { for (const n of names) { try { return fs.readFileSync(`${dir}/${n}`,'utf8'); } catch(_) {} } return ''; };
let prose = read('all_prose.txt','all_final.txt');
if (!prose) prose = ['scene1_final.txt','scene2_final.txt','scene3_final.txt','final.txt']
  .map(f => read(f)).filter(Boolean).join('\n\n');
if (!prose) { console.error('no prose found in ' + dir); process.exit(1); }
const S1 = prose.slice(0, Math.max(2200, Math.floor(prose.length * 0.45)));

const has = (rx, t = prose) => rx.test(t);
const count = (rx, t = prose) => (t.match(rx) || []).length;

// id · rule · check(): true = PASS · detail
const RULES = [
  ['⑤f', 'rite order: cost spoken before the desire',
    () => { const o = S1.search(/\b(?:I offer|I give)\b/i);
            const d = S1.search(/\bso that\b|\bso she may\b|\bthat she may\b/i);
            return o >= 0 && d >= 0 && o < d; }],
  ['⑤g', 'offering is a MEMORY, not an abstraction',
    () => has(/\b(?:offer|give)[^.!?]{0,60}\bmemor(?:y|ies)\b/i, S1)],
  ['⑤g', 'offering is SPOKEN as dialogue',
    () => has(/[""][^""]{0,180}(?:I offer|I give)[^""]{0,200}[""]/i, S1)],
  ['⑤h', 'twist is immediate — no deferred irony',
    () => !has(/(years later|would later|in time she would|one day she would|it would be years)/i, S1)],
  ['⑤h', 'twist uses someone/something ALREADY PRESENT',
    () => has(/(already present|among those|stepped forward|rose from|turned toward|in the clearing|spoke the name)/i, S1)],
  ['⑤i', 'price stays INSIDE the offering (no unoffered faculty)',
    () => !['voice','sight','hands','years','breath'].some(w =>
      new RegExp(`(?:took|takes|taken|stripped|stole)[^.!?]{0,60}\\b${w}\\b|\\b${w}\\b[^.!?]{0,40}(?:was taken|stripped away)`,'i').test(S1))],
  ['⑤j', 'Tempt Fate never CHOSEN by a character',
    () => !has(/\b(?:I|she|he)\s+(?:chose|choose|played|drew|took)\s+[""]?Tempt Fate/i)],
  ['⑤k', 'no rule-recitation / enumerated violations',
    () => !has(/(beneficiary was not|counted the fractures|the target had no name|an open price)/i)],
  ['⑤l', "world's own nouns — no generic substitution",
    () => count(/\belder\b/i) === 0 && !has(/\bthe (?:priest|old one)\b/i)],
  ['⑤m', 'blank-page proverb only when the price is OPEN',
    () => !has(/blank page/i) || has(/(take what you will|whatever the (?:cost|price)|name your own price|whatever it costs)/i)],
  ['FATE', 'Fate manifests nothing — no apparition',
    () => !has(/(stepped from the trees|apparition|summoned figure|wearing (?:a|his|her) face|took the shape of)/i)],
  ['RITE', 'no invented seal/binding/circle machinery',
    () => !has(/(broke the (?:seal|circle)|the binding (?:failed|broke)|unsealed[^.!?]{0,30}(?:wish|rite))/i)],
  ['CALC', 'no colour-drain calcification',
    () => !has(/(went bone-white|lost its last fleck|colou?r (?:drained|left|fled|drain)|drained of colou?r)/i)],
  ['CALC', 'no heel tic monoculture',
    () => count(/\bheel(?:s)?\b[^.!?]{0,40}(?:lifted|scraped|dug|grinding|pressed|tapped)/gi) <= 1],
  ['LI',   'attraction not asserted via eyes/gaze cliché',
    () => !has(/(his gaze held mine|eyes held mine|held (?:my|her) gaze)/i)],
  ['SPINE','no characters outside the declared cast',
    () => !has(/\b(?:Mira|Thorne|Hunched Eye)\b/)],
  ['SPINE','Seren is named, not "the youth"',
    () => count(/\bSeren\b/) > 0 && count(/the youth/i) === 0],
  ['FMT',  'no markdown leaking into prose',
    () => !has(/\*\*/)],
  ['FMT',  'no unresolved template tokens',
    () => !has(/\{[A-Z][A-Z0-9_]{2,23}\}/)],
  ['POV',  'first person holds — no third-person PC verbs',
    () => count(/\bLirael\s+(?:stepped|crossed|felt|watched|tore|raised|knew)\b/g) === 0],
];

let pass = 0, fail = [];
console.log(`\nCANON REGRESSION — ${dir}  (${prose.length} chars of prose)\n`);
for (const [id, rule, fn] of RULES) {
  let ok = false; try { ok = !!fn(); } catch (_) { ok = false; }
  if (ok) pass++; else fail.push(`${id} ${rule}`);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(6)} ${rule}`);
}
console.log(`\n  ${pass}/${RULES.length} canon rules hold.`);
if (fail.length) { console.log('\n  REGRESSIONS:'); fail.forEach(f => console.log('    ✗ ' + f)); }
process.exitCode = fail.length ? 1 : 0;
