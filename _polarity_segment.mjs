// _polarity_segment.mjs — segments a CAPTURED author payload into instruction blocks.
// Input is the real assembled payload (from _polarity_capture.mjs), NOT app.js source.
// Everything here is measured on text that PROVABLY reached the model.
import fs from 'fs';

const FILE = process.argv[2] || '/tmp/plctl_fatelands-cont.txt';
const raw = fs.readFileSync(FILE, 'utf8');
const SPLIT = '\n\n=====USER=====\n\n';
const iSplit = raw.indexOf(SPLIT);
const sys = iSplit === -1 ? raw : raw.slice(0, iSplit);
const usr = iSplit === -1 ? '' : raw.slice(iSplit + SPLIT.length);

// ── header detection ────────────────────────────────────────────────────────
// A block header is a line that is predominantly UPPERCASE and reads like a title.
// Deliberately permissive on trailing parenthetical/qualifier text ("(HARD — ...)").
function isHeader(line) {
  const l = line.trim();
  if (l.length < 6 || l.length > 200) return false;
  if (/^[-*•\d]/.test(l)) return false;                       // list item, not a header
  const head = l.split(/[(:—–-]/)[0].trim();                  // text before any qualifier
  if (head.length < 5) return false;
  const letters = head.replace(/[^A-Za-z]/g, '');
  if (letters.length < 4) return false;
  const upper = head.replace(/[^A-Z]/g, '').length;
  if (upper / letters.length < 0.85) return false;            // must be near-all-caps
  if (/[.!?]$/.test(l)) return false;                         // sentences aren't headers
  return true;
}

function segment(text, source) {
  const lines = text.split('\n');
  const blocks = [];
  let cur = { header: '(preamble)', source, lines: [], start: 0 };
  lines.forEach((line, i) => {
    if (isHeader(line)) {
      if (cur.lines.join('\n').trim() || cur.header !== '(preamble)') blocks.push(cur);
      cur = { header: line.trim().replace(/[═=]+/g, '').trim() || line.trim(), source, lines: [], start: i };
    } else cur.lines.push(line);
  });
  blocks.push(cur);
  return blocks.map(b => ({ ...b, body: b.lines.join('\n'), chars: b.header.length + 1 + b.lines.join('\n').length }));
}

// ── topic tagging — the user's requested categories ─────────────────────────
const TOPICS = [
  ['interiority',   /\binteriorit|\binner life|\bthought\b|\bfeel(s|ing)?\b|\bemotion/i],
  ['sensory',       /\bsensor|\bsensation|\bsmell|\btexture|\bvisceral|\bsomatic/i],
  ['body-response', /\bbreath|\bpulse\b|\bheartbeat|\bribs\b|\bsternum|\bthroat\b|\bflush|\bshiver|\btremor|\bskin\b/i],
  ['attraction',    /\bdesire\b|\battraction|\blonging|\bwanting\b|\bintimac|\bcharged\b|\bchemistry/i],
  ['atmosphere',    /\batmospher|\bmood\b|\btone\b|\bair (?:thick|between)|\bcharge in the/i],
  ['character-desc',/\bcharacter\+|\bCharacter Plus|\bappearance|\bdescri\w+ (?:him|her|them)|\bnotice filter/i],
  ['clarity',       /\bcold.reader|\bclear\b|\bcomprehen|\blegib|\bconfus|\bunderstand\b/i],
  ['fantasy-ground',/\bcanon\b|\blore\b|\bmagic\b|\binvent\w*\b|\bsigil|\bward\b|\bgrounding/i],
  ['prose-style',   /\bprose\b|\bsentence|\bparagraph|\bmetaphor|\bstyle\b|\bvoice\b|\bregister\b/i],
];
const tagsFor = t => TOPICS.filter(([, re]) => re.test(t)).map(([n]) => n);

// ── polarity heuristic (a SORT KEY, not the classification) ─────────────────
const NEG = /\bdo not\b|\bdon't\b|\bnever\b|\bavoid\b|\bban(?:ned)?\b|\bforbidden\b|\bno more than\b|\bstop\b|\bwithout\b/gi;
const POS = /\bmust\b|\bshould\b|\brequired?\b|\bat least\b|\balways\b|\bevery\b|\bmandat/gi;
const count = (t, re) => (t.match(re) || []).length;

const blocks = [...segment(sys, 'SYS'), ...segment(usr, 'USR')]
  .filter(b => b.chars > 40)
  .map(b => {
    const t = b.header + '\n' + b.body;
    return { ...b, tags: tagsFor(t), neg: count(t, NEG), pos: count(t, POS) };
  });

// ── app.js callsite for each block header ───────────────────────────────────
const app = fs.readFileSync('public/app.js', 'utf8').split('\n');
function callsite(header) {
  const probe = header.split(/[(—–]/)[0].trim().slice(0, 40);
  if (probe.length < 8) return null;
  for (let i = 0; i < app.length; i++) if (app[i].includes(probe)) return i + 1;
  return null;
}

const total = blocks.reduce((a, b) => a + b.chars, 0);
const out = blocks
  .map(b => ({ header: b.header.slice(0, 96), source: b.source, chars: b.chars,
               pct: +(100 * b.chars / total).toFixed(2), tags: b.tags, neg: b.neg, pos: b.pos,
               line: callsite(b.header), body: b.body }))
  .sort((a, b) => b.chars - a.chars);

fs.writeFileSync('_validate_out/polarity_blocks.json', JSON.stringify(out, null, 2));

console.log(`payload ${FILE}`);
console.log(`  sys=${sys.length}  usr=${usr.length}  blocks=${blocks.length}\n`);
console.log('════ 40 LARGEST BLOCKS ════');
console.log('  chars    pct  src  app.js   topics                              header');
for (const b of out.slice(0, 40)) {
  console.log(`  ${String(b.chars).padStart(6)} ${String(b.pct).padStart(5)}%  ${b.source}  ${String(b.line ?? '—').padStart(6)}  ${b.tags.join(',').padEnd(34).slice(0, 34)}  ${b.header.slice(0, 60)}`);
}

console.log('\n════ CHARS BY TOPIC (blocks may carry several tags) ════');
const byTopic = {};
for (const b of out) for (const t of b.tags) byTopic[t] = (byTopic[t] || 0) + b.chars;
Object.entries(byTopic).sort((a, b) => b[1] - a[1])
  .forEach(([t, c]) => console.log(`  ${t.padEnd(16)} ${String(c).padStart(7)}  ${(100 * c / total).toFixed(1)}%`));

const untagged = out.filter(b => !b.tags.length).reduce((a, b) => a + b.chars, 0);
console.log(`  ${'(untagged)'.padEnd(16)} ${String(untagged).padStart(7)}  ${(100 * untagged / total).toFixed(1)}%`);
console.log('\nfull dump → _validate_out/polarity_blocks.json');
