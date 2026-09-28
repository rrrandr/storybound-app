// MECHANICAL COVERAGE CHECK — First Sacrifice ISSUE 1 OPENING matrix.
// Scope RESOLVED (Roman, 2026-09-28): this matrix governs the Issue 1 OPENING only.
// Late Issue 1 gets its own declared phase matrix and outcome set; it is NOT modelled here.
// Pure enumeration. No page, no provider. Reports COVERAGE ONLY — coverage is not approval.

// Two predicates are now DECLARED INVARIANTS of the opening phase, not free variables.
const INVARIANT = { inquiryOpened: false, interrogationOccurred: true };
const FREE = ['accusationMade','reviewPending','custodyRevealed','assemblyStaged','jurisdictionChallengeMade'];

const RULES = [
  { id:'I3', live:true,  why:'a jurisdiction challenge presupposes a charge to contest',
    test: c => c.jurisdictionChallengeMade && !c.accusationMade },
  { id:'I4', live:false, why:'review vs inquiry supersession — VACUOUS here (inquiryOpened is invariantly false); retained for the late matrix',
    test: c => c.reviewPending && c.inquiryOpened },
];

// Opening-phase outcome set. unm.restriction_unnamed is present by PHASE EXTENSION:
// its eligibility predicate, facts, cost, rank and wording anchors are unchanged.
const OUTCOMES = [
  { id:'unm.band_unremarked',            rank:10, test: c => !c.accusationMade },
  { id:'unm.witness_dispersal',          rank:9,  test: c => c.assemblyStaged && !c.inquiryOpened },
  { id:'unm.procedural_delay',           rank:8,  test: c => c.reviewPending },
  { id:'unm.restriction_unnamed',        rank:5,  test: c => c.accusationMade && c.jurisdictionChallengeMade && c.custodyRevealed, ext:true },
  { id:'unm.julian_standing_questioned', rank:7,  test: c => c.interrogationOccurred && !c.jurisdictionChallengeMade },
  { id:'unm.custody_unraised',           rank:6,  test: c => !c.custodyRevealed },
];

const cells = [];
for (let m = 0; m < (1 << FREE.length); m++) {
  const c = { ...INVARIANT }; FREE.forEach((k,i) => c[k] = !!(m & (1<<i))); cells.push(c);
}
const ORDER = ['accusationMade','inquiryOpened','reviewPending','interrogationOccurred','custodyRevealed','assemblyStaged','jurisdictionChallengeMade'];
const fmt = c => ORDER.map(k => c[k] ? k[0].toUpperCase() : '·').join('');

const valid = cells.filter(c => !RULES.some(r => r.test(c)));
const unc   = valid.filter(c => !OUTCOMES.some(o => o.test(c)));

console.log('=== FIRST SACRIFICE — ISSUE 1 OPENING MATRIX — COVERAGE ===\n');
console.log('scope       : Issue 1 OPENING only (Flag A resolved 2026-09-28)');
console.log('invariants  : inquiryOpened=false, interrogationOccurred=true  (seed-pinned, §6.5)');
console.log('free preds  : ' + FREE.length + ' → ' + cells.length + ' reachable opening states');
console.log('              (the 7-predicate domain of 128 is not the opening domain; 96 of those');
console.log('               states violate an invariant and are unreachable in this phase)');
RULES.forEach(r => console.log('  ' + r.id + (r.live ? ' LIVE   ' : ' VACUOUS') + ' removes ' + cells.filter(r.test).length + ' — ' + r.why));
console.log('\nVALID CELLS : ' + valid.length);
console.log('COVERED     : ' + (valid.length - unc.length) + ' / ' + valid.length);
console.log('UNCOVERED   : ' + unc.length);
if (unc.length) { console.log('\nuncovered (' + ORDER.map(k=>k[0].toUpperCase()).join('') + '):');
  unc.forEach(c => console.log('  ' + fmt(c))); }

console.log('\nper-outcome reach:');
const sole = {};
valid.forEach(c => { const h = OUTCOMES.filter(o=>o.test(c)); if (h.length===1) sole[h[0].id]=(sole[h[0].id]||0)+1; });
OUTCOMES.forEach(o => { const n = valid.filter(o.test).length;
  console.log('  ' + String(o.rank).padStart(2) + '  ' + o.id.padEnd(32) + String(n).padStart(3)
    + (n===0 ? '  ** DEAD **' : '') + (sole[o.id] ? '  (SOLE cover for ' + sole[o.id] + ')' : '')
    + (o.ext ? '  [phase extension]' : '')); });

console.log('\nEXCLUDED: unm.adverse_event_deferred (rank 4) — eligibility not expressible in these');
console.log('predicates; it can only ADD coverage, so the figures above are a floor.');
console.log('\nCOVERAGE IS NOT APPROVAL. Every entry counted is proposed editorial canon.');
process.exit(unc.length ? 1 : 0);
