// OPENING COVERAGE — First Sacrifice, Issue 1 opening, corrected 32-state domain.
// Scope: Issue 1 OPENING only. I1/I2/I3 withdrawn; I4 retained but vacuous here.
// Selection: ask-class first (T4), then active-canon requirements, then state eligibility.
// Reports covered / partial / intentionally unsupported SEPARATELY. Pure enumeration.

const INVARIANT = { inquiryOpened: false, interrogationOccurred: true };
const FREE = ['accusationMade', 'reviewPending', 'custodyRevealed', 'assemblyStaged', 'jurisdictionChallengeMade'];
const ORDER = ['accusationMade', 'inquiryOpened', 'reviewPending', 'interrogationOccurred',
  'custodyRevealed', 'assemblyStaged', 'jurisdictionChallengeMade'];

// Atoms that are opening-phase INVARIANTS (always active). Cited in the traces.
const INVARIANT_ATOMS = new Set([
  'interr.julian_questioned_lirael', 'twist.assembly_turned',
  'auth.dohkar_claims_rite_and_ruling', 'auth.julian_standing_to_convene',
  'answer.owned_by_institution', 'answer.entrusted_to_julian',
]);
// Atoms whose activity depends on the state cell.
const STATE_ATOMS = {
  'review.demanded_by_dohkar': c => c.reviewPending,
  'accusation.family_accused': c => c.accusationMade,
};
const isActive = (atom, c) =>
  INVARIANT_ATOMS.has(atom) ? true : (STATE_ATOMS[atom] ? STATE_ATOMS[atom](c) : false);

const CLASSES = ['stop', 'undo', 'escape', 'unseen', 'silence', 'authority', 'solitude'];

const OUTCOMES = [
  { id: 'unm.dohkar_demand_unmade',     ask: 'stop',      requires: ['review.demanded_by_dohkar'] },
  { id: 'unm.time_gives_way',           ask: 'undo',      requires: ['interr.julian_questioned_lirael'] },
  { id: 'unm.the_accusation_unmade',    ask: 'escape',    requires: ['accusation.family_accused'] },
  { id: 'unm.the_claim_unmade',         ask: 'escape',    requires: ['auth.dohkar_claims_rite_and_ruling'], requiresInactive: ['accusation.family_accused'] },
  { id: 'unm.the_turning_forgotten',    ask: 'unseen',    requires: ['twist.assembly_turned'] },
  { id: 'unm.the_custody_unremembered', ask: 'silence',   requires: ['answer.owned_by_institution', 'answer.entrusted_to_julian'] },
  { id: 'unm.standing_dissolved',       ask: 'authority', requires: ['auth.julian_standing_to_convene'] },
  { id: 'unm.the_shunning',             ask: 'solitude',  requires: [] },
];

// Excluded from selection: blocked or withdrawn. Listed so the exclusion is visible, not silent.
const EXCLUDED = [
  { id: 'unm.the_answer_speaks',  ask: 'escape',  why: 'BLOCKED — grant unauthorable (Answer may not establish past causation)' },
  { id: 'unm.witness_scattered',  ask: 'unseen',  why: 'BLOCKED — "incoherent" is outside the closed disposition enum' },
  { id: 'unm.custody_severed',    ask: 'silence', why: 'WITHDRAWN — entrustment is office-bound' },
];

// Authored adjacency fallbacks.
const FALLBACK = { stop: 'undo', unseen: 'solitude' };

const cells = [];
for (let m = 0; m < (1 << FREE.length); m++) {
  const c = { ...INVARIANT };
  FREE.forEach((k, i) => c[k] = !!(m & (1 << i)));
  cells.push(c);
}
const fmt = c => ORDER.map(k => c[k] ? k[0].toUpperCase() : '·').join('');
const eligible = (o, c) => o.requires.every(a => isActive(a, c)) &&
  (o.requiresInactive || []).every(a => !isActive(a, c));

// AMBIGUITY IS A FAILURE, NOT A TIE-BREAK. If more than one outcome in an ask-class is
// eligible in a state, selection would fall to array order — an invalid selection rule.
const AMBIGUOUS = [];
function resolve(cell, ask, hops = 0) {
  const direct = OUTCOMES.filter(o => o.ask === ask && eligible(o, cell));
  if (direct.length > 1) AMBIGUOUS.push(fmt(cell) + '  ask=' + ask + '  → ' + direct.map(o => o.id).join(' | '));
  if (direct.length) return { outcome: direct[0], viaFallback: hops > 0, alternatives: direct.length };
  const next = FALLBACK[ask];
  if (next && hops < 2) return resolve(cell, next, hops + 1);
  return null;
}

console.log('=== FIRST SACRIFICE — ISSUE 1 OPENING — COVERAGE ===\n');
console.log('invariants : inquiryOpened=false, interrogationOccurred=true');
console.log('live exclusions : 0  (I1/I2/I3 withdrawn; I4 retained but vacuous here)');
console.log('VALID STATE CELLS : ' + cells.length);
console.log('ASK-CLASSES       : ' + CLASSES.length);
console.log('SELECTION DOMAIN  : ' + cells.length + ' × ' + CLASSES.length + ' = ' + cells.length * CLASSES.length + ' (state, ask) pairs\n');

let covered = 0, viaFb = 0;
const gaps = [];
const use = {};
for (const cell of cells) for (const ask of CLASSES) {
  const r = resolve(cell, ask);
  if (!r) { gaps.push(fmt(cell) + '  ask=' + ask); continue; }
  covered++; if (r.viaFallback) viaFb++;
  use[r.outcome.id] = (use[r.outcome.id] || 0) + 1;
}

console.log('--- FULLY COVERED ---');
console.log('covered   : ' + covered + ' / ' + cells.length * CLASSES.length);
console.log('  of which resolved via an authored adjacency fallback: ' + viaFb);
console.log('UNCOVERED : ' + gaps.length);
gaps.slice(0, 12).forEach(g => console.log('  ' + g));

console.log('\n--- PARTIAL: outcomes eligible in only some active-canon states ---');
let anyPartial = false;
OUTCOMES.forEach(o => {
  const n = cells.filter(c => eligible(o, c)).length;
  if (n === cells.length) return;
  anyPartial = true;
  console.log('  ' + o.id.padEnd(30) + n + '/' + cells.length + ' states   requires ' + o.requires.join(' + '));
});
if (!anyPartial) console.log('  (none)');

console.log('\n--- INTENTIONALLY UNSUPPORTED ---');
console.log('  ask-classes with no supported outcome : 0');
console.log('  product gaps recorded                 : 0');
console.log('  (excluded entries below are blocked/withdrawn, but their ask-classes are served)');
EXCLUDED.forEach(e => console.log('    ' + e.id.padEnd(30) + 'ask=' + e.ask.padEnd(9) + e.why));

console.log('\n--- per-ask-class resolution ---');
CLASSES.forEach(ask => {
  const n = cells.filter(c => { const r = resolve(c, ask); return r && !r.viaFallback; }).length;
  const f = cells.filter(c => { const r = resolve(c, ask); return r && r.viaFallback; }).length;
  console.log('  ' + ask.padEnd(10) + 'direct ' + String(n).padStart(2) + '/' + cells.length +
    (f ? '   via fallback ' + f : '') + (n + f === cells.length ? '   ✓' : '   ⚠'));
});

console.log('\n--- per-outcome selection reach (of ' + cells.length * CLASSES.length + ' pairs) ---');
OUTCOMES.forEach(o => console.log('  ' + o.id.padEnd(30) + String(use[o.id] || 0).padStart(4) +
  ((use[o.id] || 0) === 0 ? '   ** never selected **' : '')));

console.log('\n--- SELECTION DETERMINACY ---');
console.log('  (state, ask) pairs with more than one eligible outcome: ' + AMBIGUOUS.length);
AMBIGUOUS.slice(0, 12).forEach(a => console.log('    ' + a));
if (AMBIGUOUS.length === 0) {
  console.log('  Every covered pair resolves to EXACTLY ONE outcome under declared eligibility.');
  console.log('  No array-order winner. The coverage figure is FINAL, not provisional.');
} else {
  console.log('  ⚠ COVERAGE IS PROVISIONAL — selection would fall to array order in the pairs above.');
}

console.log('\nCOVERAGE IS NOT APPROVAL.');
process.exit(gaps.length || AMBIGUOUS.length ? 1 : 0);
