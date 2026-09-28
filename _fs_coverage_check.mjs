// MECHANICAL COVERAGE CHECK — First Sacrifice ISSUE 1 OPENING, revised (v2) Tempt outcome set.
// Scope: Issue 1 OPENING only. Pure enumeration. No page, no provider.
// Reports COVERAGE ONLY. Coverage is not approval: every entry counted is proposed editorial canon.
//
// v2 change: selection is ASK-CLASS first (T4 — match the wish's grammar), then state eligibility,
// then rank. So the domain is no longer 24 states; it is 24 states x 7 ask-classes = 168 pairs.
// A state cell "covered" in v1 can still strand a player whose sentence no eligible outcome answers.

const INVARIANT = { inquiryOpened: false, interrogationOccurred: true };
const FREE = ['accusationMade', 'reviewPending', 'custodyRevealed', 'assemblyStaged', 'jurisdictionChallengeMade'];
const ORDER = ['accusationMade', 'inquiryOpened', 'reviewPending', 'interrogationOccurred',
  'custodyRevealed', 'assemblyStaged', 'jurisdictionChallengeMade'];

const RULES = [
  { id: 'I3', live: true, test: c => c.jurisdictionChallengeMade && !c.accusationMade,
    why: 'a jurisdiction challenge presupposes a charge to contest' },
  { id: 'I4', live: false, test: c => c.reviewPending && c.inquiryOpened,
    why: 'VACUOUS here (inquiryOpened invariantly false); retained for the late matrix' },
];

const CLASSES = ['stop', 'undo', 'escape', 'unseen', 'silence', 'authority', 'solitude'];

const OUTCOMES = [
  { id: 'unm.proceeding_unmade',  rank: 10, ask: 'stop',      revision: true,  test: c => c.reviewPending },
  { id: 'unm.time_gives_way',     rank: 9,  ask: 'undo',      revision: true,  test: () => true },
  { id: 'unm.the_answer_speaks',  rank: 8,  ask: 'escape',    revision: false, test: () => true },
  { id: 'unm.witness_scattered',  rank: 7,  ask: 'unseen',    revision: false, test: c => c.assemblyStaged },
  { id: 'unm.custody_severed',    rank: 6,  ask: 'silence',   revision: true,  test: () => true },
  { id: 'unm.standing_dissolved', rank: 5,  ask: 'authority', revision: true,  test: () => true },
  { id: 'unm.the_shunning',       rank: 4,  ask: 'solitude',  revision: false, test: () => true },
];

// Authored adjacency fallbacks (v2 §1a). Never reach a class the sentence did not ask.
const FALLBACK = { stop: 'undo', unseen: 'solitude' };

const cells = [];
for (let m = 0; m < (1 << FREE.length); m++) {
  const c = { ...INVARIANT };
  FREE.forEach((k, i) => c[k] = !!(m & (1 << i)));
  cells.push(c);
}
const valid = cells.filter(c => !RULES.some(r => r.test(c)));
const fmt = c => ORDER.map(k => c[k] ? k[0].toUpperCase() : '·').join('');

// Resolve one (state, ask-class) pair the way the model says: class, then state, then max rank.
function resolve(cell, ask, hops = 0) {
  const direct = OUTCOMES.filter(o => o.ask === ask && o.test(cell)).sort((a, b) => b.rank - a.rank);
  if (direct.length) return { outcome: direct[0], viaFallback: hops > 0 };
  const next = FALLBACK[ask];
  if (next && hops < 2) return resolve(cell, next, hops + 1);
  return null;
}

console.log('=== FIRST SACRIFICE — ISSUE 1 OPENING — COVERAGE, revised set (v2) ===\n');
console.log('invariants  : inquiryOpened=false, interrogationOccurred=true');
RULES.forEach(r => console.log('  ' + r.id + (r.live ? ' LIVE   ' : ' VACUOUS') +
  ' removes ' + cells.filter(r.test).length + ' — ' + r.why));
console.log('\nVALID STATE CELLS : ' + valid.length + ' of ' + cells.length + ' reachable');
console.log('ASK-CLASSES       : ' + CLASSES.length);
console.log('SELECTION DOMAIN  : ' + valid.length + ' x ' + CLASSES.length + ' = ' + valid.length * CLASSES.length + ' (state, ask) pairs');

let covered = 0, viaFb = 0;
const gaps = [];
const use = {}, sole = {};
for (const cell of valid) {
  for (const ask of CLASSES) {
    const r = resolve(cell, ask);
    if (!r) { gaps.push(fmt(cell) + '  ask=' + ask); continue; }
    covered++;
    if (r.viaFallback) viaFb++;
    use[r.outcome.id] = (use[r.outcome.id] || 0) + 1;
  }
}
console.log('\nCOVERED   : ' + covered + ' / ' + valid.length * CLASSES.length);
console.log('UNCOVERED : ' + gaps.length);
if (gaps.length) gaps.slice(0, 20).forEach(g => console.log('  ' + g));
console.log('resolved via an authored fallback: ' + viaFb);

// A state-cell-only view, for comparison with the v1 number.
const stateCovered = valid.filter(c => CLASSES.some(a => resolve(c, a)));
console.log('\nstate-cell view (v1 comparison): ' + stateCovered.length + ' / ' + valid.length);

console.log('\nper-outcome selection reach (times chosen across the 168 pairs):');
OUTCOMES.slice().sort((a, b) => b.rank - a.rank).forEach(o => {
  const n = use[o.id] || 0;
  console.log('  ' + String(o.rank).padStart(2) + '  ' + o.id.padEnd(26) + String(n).padStart(4) +
    (n === 0 ? '   ** DEAD — never selectable **' : '') +
    (o.revision ? '   [creates a reality revision]' : ''));
});

const dead = OUTCOMES.filter(o => !use[o.id]);
console.log('\nDEAD ENTRIES: ' + (dead.length ? dead.map(o => o.id).join(', ') : 'none'));
console.log('revision-creating outcomes: ' + OUTCOMES.filter(o => o.revision).length + ' of ' + OUTCOMES.length +
  ' unmoored (plus 0 of 6 exact readings — memory never ceases a fact)');
console.log('\nCOVERAGE IS NOT APPROVAL. Every entry counted is proposed editorial canon.');
process.exit(gaps.length || dead.length ? 1 : 0);
