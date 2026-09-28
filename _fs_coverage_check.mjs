// MECHANICAL DRAFT-COVERAGE CHECK — First Sacrifice matrix. Pure computation. No page, no provider.
// Reports COVERAGE ONLY. Coverage is not approval: a cell may be covered by a draft awaiting approval.
const P = ['accusationMade','inquiryOpened','reviewPending','interrogationOccurred',
           'custodyRevealed','assemblyStaged','jurisdictionChallengeMade'];

const I3 = { id:'I3', why:'a jurisdiction challenge presupposes a charge to contest',
             test: c => c.jurisdictionChallengeMade && !c.accusationMade };
const I4 = { id:'I4', why:'preliminary review may be DEMANDED but not CONVENED; the inquiry supersedes it',
             test: c => c.reviewPending && c.inquiryOpened };
// Evidence-pinned constants for the OPENING scope (aftermathTruths + the WHERE AND WHEN rule):
const O_PIN = { id:'O-pin', why:'inquiryOpened is false and interrogationOccurred is true in every opening state',
                test: c => c.inquiryOpened || !c.interrogationOccurred };

const OPENING = ['unm.band_unremarked','unm.witness_dispersal','unm.procedural_delay',
                 'unm.julian_standing_questioned','unm.custody_unraised'];
const OUTCOMES = [
  { id:'unm.band_unremarked',            rank:10, test: c => !c.accusationMade },
  { id:'unm.witness_dispersal',          rank:9,  test: c => c.assemblyStaged && !c.inquiryOpened },
  { id:'unm.record_order_unread',        rank:9,  test: c => c.accusationMade && c.jurisdictionChallengeMade && c.inquiryOpened && !c.reviewPending },
  { id:'unm.procedural_delay',           rank:8,  test: c => c.reviewPending },
  { id:'unm.restriction_unnamed',        rank:8,  test: c => c.accusationMade && c.jurisdictionChallengeMade && c.custodyRevealed },
  { id:'unm.julian_standing_questioned', rank:7,  test: c => c.interrogationOccurred && !c.jurisdictionChallengeMade },
  { id:'unm.custody_unraised',           rank:6,  test: c => !c.custodyRevealed },
  { id:'unm.hearer_unnamed',             rank:6,  test: c => c.accusationMade && c.custodyRevealed && !c.reviewPending },
  { id:'unm.absent_accuser_noted',       rank:5,  test: c => c.accusationMade && c.interrogationOccurred && c.jurisdictionChallengeMade },
];

const ALL = [];
for (let m = 0; m < (1 << P.length); m++) { const c = {}; P.forEach((k,i) => c[k] = !!(m & (1<<i))); ALL.push(c); }
const fmt = c => P.map(k => c[k] ? k[0].toUpperCase() : '·').join('');

function run(title, rules, pool, note) {
  const valid = ALL.filter(c => !rules.some(r => r.test(c)));
  const outs  = OUTCOMES.filter(o => pool.includes(o.id));
  const unc   = valid.filter(c => !outs.some(o => o.test(c)));
  console.log('\n\n=== ' + title + ' ===');
  rules.forEach(r => console.log('  ' + r.id.padEnd(6) + 'invalidates ' + String(ALL.filter(r.test).length).padStart(3) + ' — ' + r.why));
  console.log('  VALID CELLS : ' + valid.length + ' of 128');
  console.log('  outcomes in scope: ' + outs.length + '  (' + outs.map(o=>o.id.replace('unm.','')).join(', ') + ')');
  console.log('  COVERED     : ' + (valid.length - unc.length) + ' / ' + valid.length);
  console.log('  UNCOVERED   : ' + unc.length);
  if (unc.length) { console.log('  uncovered (' + P.map(k=>k[0].toUpperCase()).join('') + '):');
    unc.slice(0,16).forEach(c => console.log('    ' + fmt(c)));
    if (unc.length > 16) console.log('    … ' + (unc.length-16) + ' more'); }
  console.log('  per-outcome reach:');
  const sole = {};
  valid.forEach(c => { const h = outs.filter(o=>o.test(c)); if (h.length===1) sole[h[0].id]=(sole[h[0].id]||0)+1; });
  outs.forEach(o => { const n = valid.filter(o.test).length;
    console.log('    ' + String(o.rank).padStart(2) + '  ' + o.id.padEnd(32) + String(n).padStart(3)
      + (n===0 ? '   ** DEAD in this scope **' : '') + (sole[o.id] ? '   (SOLE cover for ' + sole[o.id] + ')' : '')); });
  if (note) console.log('  ' + note);
  return unc.length;
}

console.log('predicates: ' + P.length + ' → ' + ALL.length + ' raw cells');
console.log('EXCLUDED THROUGHOUT: unm.adverse_event_deferred (rank 4) — its eligibility ("some adverse row');
console.log('scheduled and unheld") is not expressible in these seven predicates. Including it could only');
console.log('ADD coverage, never remove it, so every figure below is a FLOOR.');

const a = run('READING 1 — evidence-backed rules only, one matrix across Issue 1',
  [I3, I4], OUTCOMES.map(o=>o.id));
const b = run('READING 2 — matrix scoped to the OPENING, as its title says',
  [I3, I4, O_PIN], OPENING,
  'The four LATE outcomes are out of scope here by construction; they govern the late region.');
process.exit(a + b ? 1 : 0);
