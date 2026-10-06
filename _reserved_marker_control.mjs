// RESERVED-CONTENT MARKERS: the venue "The Open" vs ordinary open doors. Provider-free, $0.
//
// The live run's scene-7 proposal was refused as staging reserved content:
//   "The Dohkar's summons for review echoes through open doors into the streets."
// The guard harvests markers from the reserved truth by taking CAPITALISED words and lowercasing
// them, so the venue "The Open" becomes the marker "open" — then matched by bare substring. That
// is a FALSE POSITIVE: the proposal makes a PRELIMINARY REVIEW public, which the seed permits.
// The exact proposal is preserved below as a permanent regression case.
import { chromium } from 'playwright-core';
import fs from 'fs';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

// THE EXACT REJECTED PROPOSAL, from _fs_live_out/run_2026-10-06T16-50-01-923Z/wire/058_res.json
const LIVE_SCENE7 = {
  state_change: "The Dohkar's summons for review echoes through open doors into the streets.",
  tactical_move: "Make the Dohkar's review summons public so rumors begin spreading through the city",
  forces_choice: "forces Lirael to choose between answering the public review or shielding the scar's truth"
};

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._detectReservedContentBreach === 'function'
  || typeof window._reservedGroupsInForce === 'function', { timeout: 30000 }).catch(() => {});

const exported = await page.evaluate(() => ({
  breach: typeof window._detectReservedContentBreach,
  groups: typeof window._reservedGroupsInForce
}));
console.log('exports: ' + JSON.stringify(exported));
if (exported.breach !== 'function') {
  console.log('  _detectReservedContentBreach is not exported — testing the MATCHER RULE directly');
}

// The rule under test, lifted from the committed source so the shipped regex is what runs.
const src = fs.readFileSync('public/app.js', 'utf8');
const ordRx = src.match(/var _ORDINARY_WORD_MARKER = (\/\^[^\n]+\/);/)[1];
const ruleSrc = `
  var _ORDINARY_WORD_MARKER = ${ordRx};
  return function (text, m) {
    var esc = String(m).replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');
    if (_ORDINARY_WORD_MARKER.test(m)) {
      return new RegExp('\\\\b' + esc.charAt(0).toUpperCase() + esc.slice(1) + 's?\\\\b').test(text);
    }
    return new RegExp('\\\\b' + esc + 's?\\\\b', 'i').test(text);
  };`;
const markerHit = new Function(ruleSrc)();
const textOf = (p) => [p.state_change, p.local_objective, p.tactical_move, p.forces_choice]
  .filter(x => typeof x === 'string').join(' ');

console.log('');
console.log('=== THE LIVE FALSE POSITIVE ===');
{
  const text = textOf(LIVE_SCENE7);
  const hits = ['dohkar', 'open', 'chayr'].filter(m => markerHit(text, m));
  console.log('  proposal: ' + LIVE_SCENE7.state_change);
  console.log('  markers hit now: ' + JSON.stringify(hits));
  t('"open doors" no longer counts as the venue "The Open"', !hits.includes('open'));
  t('and fewer than two markers hit, so the guard does not fire', hits.length < 2,
    JSON.stringify(hits));
  t('the Dohkar marker still matches, as it should', markerHit(text, 'dohkar'));
}

console.log('');
console.log('=== PROTECTION IS NOT WEAKENED ===');
const cases = [
  ['genuinely convening at the venue',
    'The Dohkar convenes the inquiry at The Open before a Chayr and two Dohkars.',
    ['dohkar', 'open', 'chayr'], true],
  ['the venue named with a definite article',
    'Lirael is summoned to the Open to answer before the Dohkar.',
    ['dohkar', 'open'], true],
  ['ordinary doors, with the Dohkar present',
    "The Dohkar's summons echoes through open doors into the streets.",
    ['dohkar', 'open'], false],
  ['an opened door, past tense',
    'The Dohkar opened the summons and read it aloud.', ['dohkar', 'open'], false],
  ['opening a session, gerund',
    'The Dohkar is opening the preliminary review this afternoon.', ['dohkar', 'open'], false],
  ['Chayr named with the Dohkar — still a breach',
    'A Chayr and two Dohkars will sit on the matter.', ['dohkar', 'chayr'], true]
];
for (const [label, text, markers, shouldFire] of cases) {
  const hits = markers.filter(m => markerHit(text, m));
  const fires = hits.length >= 2;
  t((shouldFire ? 'FIRES: ' : 'does NOT fire: ') + label, fires === shouldFire,
    'hits=' + JSON.stringify(hits));
}

console.log('');
console.log('=== WORD BOUNDARIES ===');
t('a non-ordinary marker still matches case-insensitively',
  markerHit('the dohkar spoke', 'dohkar') && markerHit('The Dohkar spoke', 'dohkar'));
t('and it matches its plural', markerHit('two Dohkars sat', 'dohkar'));
t('but not inside another word', !markerHit('dohkarian customs', 'dohkar'));

await browser.close();
console.log('');
console.log(pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
