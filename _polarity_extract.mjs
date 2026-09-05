// _polarity_extract.mjs — pulls the individual DIRECTIVE SENTENCES about interiority /
// body-response / sensory texture / atmosphere / desire out of the captured payload blocks.
// Output is small enough to classify by reading. Polarity is a SORT KEY here, not a verdict.
import fs from 'fs';

const blocks = JSON.parse(fs.readFileSync('_validate_out/polarity_blocks.json', 'utf8'));

// the specific pathologies Roman named in the four-arm scoring
const PATH = {
  'body':       /\bbreath\w*|\bpulse\b|\bheartbeat|\bribs\b|\bsternum|\bthroat\b|\bflush\w*|\bshiver\w*|\btremor|\bstomach|\bspine\b|\bchest\b|\bskin\b|\bblood (?:went|ran)/i,
  'gaze':       /\bgaze\b|\bglance\b|\bstare\w*|\beyes?\b|\bfingers?\b|\bknuckle|\bmouth\b|\bjaw\b/i,
  'atmosphere': /\batmospher\w*|\bthe air\b|\bcharged?\b|\bhum(?:s|med|ming)?\b|\bpress(?:ure|ed) of the (?:room|air)|\bweather|\blight (?:fell|slant)/i,
  'desire':     /\bdesire\b|\bache\w*\b|\blonging\b|\byearn\w*|\bhunger\w*|\bcrav\w+|\bwant(?:ing)?\b|\bheat\b|\barousal/i,
  'sensory':    /\bsensor\w*|\bsensation\w*|\btexture\b|\bsmell\w*|\bscent\b|\btaste\w*|\bsound of\b|\bvisceral|\bsomatic/i,
  'interior':   /\binteriorit\w*|\binner (?:life|weather|state)|\bfelt\b|\bfeeling\b|\bemotional (?:temperature|weather|charge)/i,
};

const NEG = /\bdo not\b|\bdon't\b|\bnever\b|\bavoid\b|\bbanned?\b|\bforbidden\b|\bnot\b|\bwithout\b|\bstop\b|\bno\b|\brather than\b|\binstead of\b|\bless\b|\bfewer\b|\bat most\b/i;
const POS = /\bmust\b|\bshould\b|\brequired?\b|\bREQUIRED\b|\bat least\b|\balways\b|\bevery\b|\bmandator\w*|\bHARD\b|\bgive\b|\bmake\b|\bshow\b|\bkeep\b|\bwrite\b|\brender\b|\bland\b|\bcarry\b/i;

// split into sentence-ish units, preserving bullet/line structure (these prompts are line-oriented)
function units(text) {
  return text.split(/\n+/).flatMap(line =>
    line.split(/(?<=[.!?;])\s+(?=[A-Z"“(])/)
  ).map(s => s.trim()).filter(s => s.length > 25 && s.length < 600);
}

const rows = [];
for (const b of blocks) {
  for (const u of units(b.header + '\n' + b.body)) {
    const hits = Object.entries(PATH).filter(([, re]) => re.test(u)).map(([k]) => k);
    if (!hits.length) continue;
    const neg = NEG.test(u), pos = POS.test(u);
    rows.push({
      block: b.header.slice(0, 62), line: b.line, chars: b.chars,
      pathos: hits.join('+'),
      lean: neg && pos ? 'MIXED' : neg ? 'neg' : pos ? 'POS' : '—',
      text: u.replace(/\s+/g, ' '),
    });
  }
}

fs.writeFileSync('_validate_out/polarity_sentences.json', JSON.stringify(rows, null, 2));

// Which blocks contribute the most POSITIVE (demand-leaning) pathology sentences?
const byBlock = {};
for (const r of rows) {
  const k = r.block;
  byBlock[k] = byBlock[k] || { block: k, line: r.line, chars: r.chars, POS: 0, neg: 0, MIXED: 0, '—': 0, total: 0 };
  byBlock[k][r.lean]++; byBlock[k].total++;
}
const ranked = Object.values(byBlock).sort((a, b) => b.POS - a.POS);

console.log(`pathology-touching sentences: ${rows.length}  across ${ranked.length} blocks\n`);
console.log('════ BLOCKS RANKED BY DEMAND-LEANING PATHOLOGY SENTENCES ════');
console.log('  POS  neg  MIX   —   app.js   block');
for (const b of ranked.slice(0, 30)) {
  console.log(`  ${String(b.POS).padStart(3)}  ${String(b.neg).padStart(3)}  ${String(b.MIXED).padStart(3)} ${String(b['—']).padStart(3)}   ${String(b.line ?? '—').padStart(6)}   ${b.block}`);
}
const tot = { POS: 0, neg: 0, MIXED: 0, '—': 0 };
for (const r of rows) tot[r.lean]++;
console.log(`\n  TOTALS  demand-leaning=${tot.POS}  ban-leaning=${tot.neg}  mixed=${tot.MIXED}  neutral=${tot['—']}`);
console.log('\nsentences → _validate_out/polarity_sentences.json');
