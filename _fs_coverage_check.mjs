// OPENING STATE-DOMAIN CALCULATOR — First Sacrifice, Issue 1 opening.
// STRUCTURAL DOMAIN ONLY. This script no longer computes coverage: every prior coverage figure
// is stale (see _i3_withdrawal.md), and re-claiming coverage is out of scope for this pass.
//
// Scope resolved 2026-09-28: Issue 1 OPENING only.
// I3 WITHDRAWN 2026-09-28: a jurisdiction challenge can rest on Julian's already-active
// accusatory interrogation ("an accusation through desirability", app.js:131286), which is an
// opening invariant — so it excluded no real state.

const INVARIANT = { inquiryOpened: false, interrogationOccurred: true };
const FREE = ['accusationMade', 'reviewPending', 'custodyRevealed', 'assemblyStaged', 'jurisdictionChallengeMade'];
const ORDER = ['accusationMade', 'inquiryOpened', 'reviewPending', 'interrogationOccurred',
  'custodyRevealed', 'assemblyStaged', 'jurisdictionChallengeMade'];

// Invalid-cell rules still declared for the opening phase.
const RULES = [
  { id: 'I1', state: 'WITHDRAWN', live: false, test: null,
    why: 'unsupported — the seed orders the inquiry against preliminary process, not the accusation' },
  { id: 'I2', state: 'WITHDRAWN', live: false, test: null,
    why: 'vacuous and contradicted — interrogationOccurred is an aftermath truth' },
  { id: 'I3', state: 'WITHDRAWN', live: false, test: c => c.jurisdictionChallengeMade && !c.accusationMade,
    why: "a challenge rests on Julian's interrogation-as-accusation, invariant in the opening" },
  { id: 'I4', state: 'RETAINED', live: false, test: c => c.reviewPending && c.inquiryOpened,
    why: 'vacuous here (inquiryOpened invariantly false); carried forward to the late matrix' },
];

const cells = [];
for (let m = 0; m < (1 << FREE.length); m++) {
  const c = { ...INVARIANT };
  FREE.forEach((k, i) => c[k] = !!(m & (1 << i)));
  cells.push(c);
}
const fmt = c => ORDER.map(k => c[k] ? k[0].toUpperCase() : '·').join('');
const live = RULES.filter(r => r.live);
const valid = cells.filter(c => !live.some(r => r.test(c)));

console.log('=== FIRST SACRIFICE — ISSUE 1 OPENING — STATE DOMAIN ===\n');
console.log('invariants     : inquiryOpened=false, interrogationOccurred=true (seed-pinned)');
console.log('free predicates: ' + FREE.length + '  → ' + cells.length + ' reachable opening states\n');
console.log('invalid-cell rules:');
RULES.forEach(r => console.log('  ' + r.id + '  ' + r.state.padEnd(9) +
  (r.live ? 'LIVE   ' : 'not live') + '  — ' + r.why));

console.log('\nLIVE EXCLUSIONS : ' + live.length);
console.log('VALID CELLS     : ' + valid.length + ' of ' + cells.length);
if (!live.length) {
  console.log('\n  The opening domain is now defined ENTIRELY by its two invariants.');
  console.log('  No invalid-cell rule excludes anything in this phase.');
}

// Cells restored by withdrawing I3.
const i3 = RULES.find(r => r.id === 'I3');
const restored = cells.filter(i3.test);
console.log('\n--- cells restored by withdrawing I3: ' + restored.length + ' ---');
console.log('(' + ORDER.map(k => k[0].toUpperCase()).join('') + ')  jurisdiction challenged, family accusation NOT made');
restored.forEach(c => {
  const on = FREE.filter(k => c[k] && k !== 'jurisdictionChallengeMade');
  console.log('  ' + fmt(c) + '   ' + (on.length ? on.join(' + ') : '(nothing else set)'));
});

console.log('\nCOVERAGE IS NOT COMPUTED HERE. Every prior 24/24 result is STALE.');
