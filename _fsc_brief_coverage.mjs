// BRIEF COVERAGE. Provider-free, no network. Which outcomes have an AUTHORED brief, and which
// still fall back to composed sentences? The brief is now the ONLY Fate material the writer sees,
// so a thin one is a real gap — this makes it visible instead of silent.
import { chromium } from 'playwright-core';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => Array.isArray(window._FSC_OUTCOMES), { timeout: 20000 });

const rows = await page.evaluate(() => window._FSC_OUTCOMES.map(o => {
  const brief = window._fscAuthorBrief({
    outcomeId: o.id, authorBrief: o.authorBrief, delta: o.ceases && o.ceases.length
      ? { establishes: o.establishes, temporalOperation: o.temporalOperation } : null,
    aftermathBeat: o.aftermathBeat, opensChoicePending: o.opensChoicePending });
  return { id: o.id, authored: !!o.authorBrief, cls: o.cls,
    chars: brief.length, text: brief, lines: brief.split("\n").filter(l => l.trim().length > 20).length };
}));
await browser.close();

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

console.log('=== AUTHOR-BRIEF COVERAGE (no network, $0) ===\n');
console.log('  outcome                        authored  lines  chars  class');
rows.forEach(r => console.log('  ' + r.id.padEnd(30) + (r.authored ? '  yes   ' : '  NO    ')
  + String(r.lines).padStart(5) + String(r.chars).padStart(7) + '  ' + r.cls));

const authored = rows.filter(r => r.authored);
const composed = rows.filter(r => !r.authored);
console.log('\n  ' + authored.length + '/' + rows.length + ' outcomes have an AUTHORED brief.');
console.log('  ' + composed.length + ' still fall back to composed sentences: '
  + composed.map(r => r.id).join(', '));

console.log('\nA. every outcome produces SOME brief — none is silently empty');
t('no outcome yields an empty brief', rows.every(r => r.chars > 0),
  rows.filter(r => !r.chars).map(r => r.id).join(','));

console.log('\nB. the two LIVE-TESTED outcomes are authored, not composed');
['unm.time_gives_way', 'unm.the_turning_forgotten'].forEach(id => {
  const r = rows.find(x => x.id === id);
  t(id + ' has an authored brief', !!r && r.authored);
  t('  it is substantial (3+ lines)', !!r && r.lines >= 3, r && (r.lines + ' lines'));
});

console.log('\nC. NO brief carries machine vocabulary — checked against the brief TEXT');
const SPEC = ['OUTCOME:', 'CEASES', 'NOW TRUE', 'COST:', 'AFFECTED', 'active canon',
  'decision gate', 'FORBIDDEN', 'aftermathBeat', 'invokerScope', 'population.', 'temporalOperation',
  'historical_replacement', 'memory_perception', 'unm.', 'twist.', 'interr.', 'answer.'];
const dirty = rows.map(r => ({ id: r.id, hits: SPEC.filter(s => r.text.indexOf(s) >= 0) }))
  .filter(r => r.hits.length);
t('no brief contains spec vocabulary, ids or field names',
  dirty.length === 0, dirty.map(d => d.id + ':[' + d.hits.join(',') + ']').join(' '));
t('no brief contains a forbidden-token list', !rows.some(r => /"[a-z ]+", "/.test(r.text)));
t('no brief mentions a price, debt or cost',
  !rows.some(r => /\b(cost|price|debt|toll|payment|uncounted)\b/i.test(r.text)),
  rows.filter(r => /\b(cost|price|debt|toll|payment|uncounted)\b/i.test(r.text)).map(r => r.id).join(','));
// NO brief may hand the author verdict vocabulary. Scoped deliberately: "ruling" and "preside" are
// the SEALED atoms' own words for Julian's office (auth.julian_standing_void names a "ruling on
// Lirael's conduct"), and banning them outright flagged standing_dissolved for quoting its own
// record. What must never appear is a judgement frame, or one attached to the Answer.
t('NO brief carries verdict/jury/charge vocabulary',
  !rows.some(r => /\b(verdict|jury|gavel|tribunal|judgement|judgment|charge)\b/i.test(r.text)),
  rows.filter(r => /\b(verdict|jury|gavel|tribunal|judgement|judgment|charge)\b/i.test(r.text))
    .map(r => r.id).join(','));
t('  and NO brief attaches a judgement frame to the Answer',
  !rows.some(r => /\bthe Answer\b[^.]{0,70}\b(verdict|judge|jury|sentence|ruling|gavel|arbiter)\b/i.test(r.text)
    || /\b(verdict|judge|jury|sentence|ruling|gavel|arbiter)\b[^.]{0,70}\bthe Answer\b/i.test(r.text)),
  rows.filter(r => /\bthe Answer\b[^.]{0,70}\b(verdict|judge|jury)\b/i.test(r.text)).map(r => r.id).join(','));
t('  the Answer is described by its PHYSICAL PRESENCE only',
  rows.filter(r => /\bthe Answer\b/.test(r.text)).every(r =>
    /\b(in (?:his|her|Lirael\u2019s) hands|rests|kept|placed|holds|holding)\b/i.test(r.text)),
  rows.filter(r => /\bthe Answer\b/.test(r.text)).map(r => r.id).join(','));
t('no brief mentions glow, shimmer or wish-energy',
  !rows.some(r => /\b(glow\w*|shimmer\w*|luminous|aura|wish-energy)\b/i.test(r.text)),
  rows.filter(r => /\b(glow\w*|shimmer\w*|luminous|aura|wish-energy)\b/i.test(r.text)).map(r => r.id).join(','));
// ── HISTORY-RESIDUE RULE ──────────────────────────────────────────────────────────────────────
// A brief may state current governing facts and show the sealed aftermath reaction. It may NOT
// describe an erased event as missing, absent, forgotten, expected, repeated, or felt as a hole in
// the world. These are the exact phrasings the first eight briefs shipped with.
const RESIDUE_RX = [
  /\bgone from behind\b/i, /\bcannot locate\b/i, /\bwhat is missing\b/i, /\bwhat has gone\b/i,
  /\bmeant to do\b/i, /\bfinds nothing there\b/i, /\bcloses on nothing\b/i,
  /\bexpected a ruling\b/i, /\bdoes not come\b/i, /\bwaits for a pronouncement\b/i,
  /\bno memory of\b/i, /\bwho agreed to something\b/i
];
const residue = rows.map(r => ({ id: r.id, hits: RESIDUE_RX.filter(rx => rx.test(r.text)).map(String) }))
  .filter(r => r.hits.length);
t('no brief describes an erased event as missing, absent or expected',
  residue.length === 0, residue.map(r => r.id + ':' + r.hits.join('|')).join('  '));
// The characters need not narrate the intervention; the reader may understand it.
t('no brief tells the author the characters recognise the wish as the cause',
  !rows.some(r => /\bthe words of (?:her|his|the) wish came true\b|\bbecause of (?:her|the) wish\b/i.test(r.text)),
  rows.filter(r => /\bwords of (?:her|his|the) wish came true\b/i.test(r.text)).map(r => r.id).join(','));
t('no brief mentions replay, erasure or a count',
  !rows.some(r => /\b(replay\w*|erased|a second time|the first time|again\b)/i.test(r.text)),
  rows.filter(r => /\b(replay\w*|erased|a second time|the first time|again\b)/i.test(r.text)).map(r => r.id).join(','));

console.log('\nD. COVERAGE IS A LIVE-RUN GATE');
t('ALL 8 outcomes have an authored brief — no live test may run below 8/8',
  composed.length === 0, composed.length + ' still composed: ' + composed.map(r => r.id).join(','));
t('every brief is substantial (300+ chars)', rows.every(r => r.chars >= 300),
  rows.filter(r => r.chars < 300).map(r => r.id + ':' + r.chars).join(','));
t('every brief carries at least three sentences of present reality',
  rows.every(r => (r.text.match(/[.!?]\s/g) || []).length >= 3),
  rows.filter(r => (r.text.match(/[.!?]\s/g) || []).length < 3).map(r => r.id).join(','));
t('no brief is a generic fallback', rows.every(r => r.authored));

console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + '  ' + pass + '/' + (pass + fail) + ' assertions'
  + '   — ' + composed.length + ' briefs still to author');
process.exit(fail === 0 ? 0 : 1);
