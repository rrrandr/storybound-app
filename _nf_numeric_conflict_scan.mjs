// ══════════════════════════════════════════════════════════════════════════════════════════
// NUMERIC CONFLICTS IN ONE DELIVERED REQUEST.
//
// NOT a similarity measure and NOT an estimate of removable material. It looks for one narrow,
// checkable thing: two statements in the SAME request that give DIFFERENT NUMBERS for what
// reads as the same quantity — a word budget, a paragraph count, a percentage split, a per-scene
// cadence. That is the class the 90/10-vs-80/20 weighting defect belonged to, and it is decidable
// by reading the two lines rather than by a threshold.
//
// Every hit is a CANDIDATE for a human read, printed with both quotes and their line numbers.
// Some will be legitimately different quantities that share a unit; the scan cannot tell, and
// does not claim to. It exists so the conflicts can be found and judged, not counted.
//
// usage: node _nf_numeric_conflict_scan.mjs [capture.txt]
// ══════════════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';

const FILE = process.argv[2]
  || '/Users/romantsukerman/storybound-app/_nf_fresh_continuation_out/fresh_continuation_author__STRUCTURE_GENERATOR__1.txt';
const lines = fs.readFileSync(FILE, 'utf-8').split('\n');

// Each pattern names a QUANTITY and extracts the number(s) a line states for it.
const QUANTITIES = [
  { q: 'relationship/plot gravity split', re: /\b(\d{2})\s*\/\s*(\d{2})\b/g,
    ctx: /gravity|split|R-plot|A-plot|relationship-weighting|engine/i },
  { q: 'opening word budget', re: /\b(\d{3,4})\s*[–-]\s*(\d{3,4})\s*words\b/gi, ctx: /first|opening|Scene 1/i },
  { q: 'opening word budget (single)', re: /\b(?:first|~)\s*(\d{3,4})\s*words\b/gi, ctx: /first|opening|Scene 1/i },
  { q: 'named-character cap in Scene 1', re: /\bAT MOST (ONE|TWO|THREE|\d+)\b/gi, ctx: /named character|cast|introduce/i },
  { q: 'scar cadence (scenes between)', re: /once every (\d)[–-](\d) scenes/gi, ctx: /scar/i },
  { q: 'near-miss cadence (scenes between)', re: /once every (\d)[–-](\d) scenes/gi, ctx: /near-?miss/i },
  { q: 'offstage-gravity cadence (paragraphs)', re: /per ~?(\d)[–-](\d) paragraphs/gi, ctx: /gravity|offstage|remember/i },
  { q: 'LI-paragraph wanting/wondering floor', re: /\b(\d{2})\s*%/g, ctx: /LI-paragraph|wanting|wondering/i },
  { q: 'exemplar count requested', re: /\b(\d)\s*[–-]\s*(\d)\s*(?:SPECIFIC|GOOD|items|exemplars)/gi, ctx: /exemplar|shapes/i },
];

const hits = {};
lines.forEach((ln, i) => {
  for (const { q, re, ctx } of QUANTITIES) {
    if (ctx && !ctx.test(ln)) continue;
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(ln))) {
      const nums = m.slice(1).filter(Boolean).join('/');
      (hits[q] = hits[q] || []).push({ at: i + 1, nums, quote: ln.trim().slice(0, 190) });
    }
  }
});

const P = console.log;
P('NUMERIC CONFLICT CANDIDATES IN ONE DELIVERED REQUEST');
P('  file  : ' + FILE.split('/').pop());
P('  lines : ' + lines.length.toLocaleString());
P('\n  A hit is two statements giving DIFFERENT numbers for what reads as the same quantity.');
P('  Each needs a human read: a shared unit is not proof of a shared quantity.\n');

let conflicts = 0;
for (const [q, rows0] of Object.entries(hits)) {
  let rows = rows0;
  // TWO NUMBERS ON ONE LINE ARE NOT A DISAGREEMENT. The percentage pattern pulled "90" and
  // "10" separately out of the single TWO-ENGINE GRAVITY sentence that states one 90/10 split,
  // and reported the halves as conflicting values. A conflict requires two DISTINCT LINES.
  const byLine = new Map();
  for (const r of rows) if (!byLine.has(r.at)) byLine.set(r.at, r);
  const perLine = [...byLine.values()];
  const distinct = [...new Set(perLine.map((r) => r.nums))];
  rows = perLine;
  if (distinct.length < 2 || perLine.length < 2) {
    P(`  ·  ${q} — ${rows.length} statement(s), all agree on ${distinct[0] || '—'}`);
    continue;
  }
  conflicts++;
  P(`  ✗  ${q} — ${distinct.length} DIFFERENT values: ${distinct.join('  vs  ')}`);
  for (const v of distinct) {
    const r = rows.find((x) => x.nums === v);
    P(`       ${v.padEnd(9)} L${String(r.at).padStart(5)}  ${r.quote}`);
  }
  P('');
}

P(`  quantities scanned : ${QUANTITIES.length}`);
P(`  with disagreement  : ${conflicts}`);
P('\n  This is a locator over the listed quantities only. It is not a count of the request\'s');
P('  contradictions, and silence on a quantity is not evidence that it agrees everywhere.');
