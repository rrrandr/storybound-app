// Regression guard for finding #5 (mandated recurring PHRASING vs the anti-repetition stack).
// Policy after fix: recur a motif/IMAGE (re-expressed, not re-worded); seed resonant closing
// MOVES, never canned quotable lines. Cultural-register aphorisms (First Favored / oral tradition)
// stay untouched; phrase-entropy + harvesting are NOT modified in this commit.
// FAILS before the fix; PASSES after.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;

// (1) no exact ≤3-word phrase-repeat mandate; (2) no canned quotable lines / adapt framing
const mustBeGone = [
  ['Select one ≤3-word phrase', 'exact ≤3-word phrase-repeat mandate'],
  ['The story would remember this moment.', 'canned closing line'],
  ['Love has a habit of finding the right key.', 'canned motif line'],
  ["Motif hint (adapt, don't copy)", 'canned-line adapt framing (motif)'],
  ['Closing line pattern (adapt)', 'canned-line adapt framing (closing)'],
];
for (const [p, l] of mustBeGone) if (src.includes(p)) { console.error(`FAIL: ${l} still present ("${p}").`); fail = true; }

// (3) replacement instructs motif/image recurrence + resonant closing moves
const mustExist = [
  ['recur at rising stakes', 'motif/image recurrence guidance'],
  ['Closing move (shape, not a line)', 'resonant closing-move seeding'],
  ['Motif move (structural', 'motif-move seeding'],
  // (4) cultural-register aphorism directives remain present (untouched, out of scope)
  ['compressed aphorism', 'First Favored ceremonial cultural-register aphorism'],
  ['oral-tradition aphorisms', 'oral-tradition cultural-register aphorism'],
  // (5) phrase-entropy + harvesting behavior NOT modified in this commit
  ['DISTINCTIVE, MANNERED turns of phrase', 'phrase harvester (unchanged)'],
  ['function buildPhraseEntropyDirective', 'phrase-entropy directive (unchanged)'],
];
for (const [p, l] of mustExist) if (!src.includes(p)) { console.error(`FAIL: ${l} missing ("${p}").`); fail = true; }

if (fail) process.exit(1);
console.log('PASS: motif/image recurrence + closing-move seeds replace mandated phrasing; canned banks gone; cultural aphorisms + entropy/harvest untouched.');
