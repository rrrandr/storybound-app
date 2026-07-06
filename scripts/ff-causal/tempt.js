// TEMPT FATE branch-law proof against the Logan reference graph. A Tempt is a deliberate CAUSAL delta at the
// current beat; the resolver's PIVOT = the timeline branch (played forward). EVENT immutability enforces the
// branch law's temporal rule ("rewrite events only at the point they occur, never retroactively") for free.
const C = require('./core');
const G = require('../../docs/logan-reference-graph.json');
const init = {}; G.stateVariables.forEach(v => { init[v.id] = !!v.initiallyTrue; });
// State the moment the massacre beat (b12) is reached: on the road, family still alive, murder not yet produced.
const atMassacre = Object.assign({}, init, { journey_started: true, hawkeye_companion: true, rent_deadline_active: false });
// State AFTER the massacre (b13): the event has HAPPENED and is now immutable history.
const afterMassacre = Object.assign({}, atMassacre, { family_murdered: true });

const T = [
  { name: 'TEMPT "save my family" — AT the massacre beat (b12)', cursor: 12, varState: atMassacre, delta: { family_murdered: false }, wantAction: 'pivot', wantBranch: true,
    why: 'preventing the murder at its own beat collapses the revenge arc → the story BRANCHES forward into the survived timeline' },
  { name: 'TEMPT "save my family" — RETROACTIVELY, after (b13)',  cursor: 13, varState: afterMassacre, delta: { family_murdered: false }, wantAction: null, wantBranch: false, wantImmutable: 'family_murdered',
    why: 'the murder already happened — EVENT immutability blocks the retroactive un-happening; no branch (the branch law forbids retroactive rewrites)' },
  { name: 'TEMPT minor "I recall one extra clue" (no causal flip)', cursor: 5, varState: atMassacre, delta: {}, wantAction: 'advance', wantBranch: false,
    why: 'a small wish flips nothing structural → no branch, the present simply continues' },
];

let pass = 0;
for (const t of T) {
  const r = C.resolveCanonProgress({ cursor: t.cursor, stateDelta: t.delta, graph: G, varState: t.varState });
  const branched = r.action === 'pivot';
  let ok = (branched === t.wantBranch) && (t.wantAction == null || r.action === t.wantAction);
  if (t.wantImmutable) ok = ok && (r.varState[t.wantImmutable] === true); // the event stayed true (guard held)
  if (ok) pass++;
  console.log(`  ${ok ? '✓' : '✗ FAIL'}  ${t.name}\n       → ${r.action}${branched ? '  (BRANCH → play forward)' : '  (no branch)'}` + (t.wantImmutable ? `  immutable ${t.wantImmutable}=${r.varState[t.wantImmutable]}` : ''));
  if (!ok) console.log(`       expected: ${t.wantBranch ? 'branch' : 'no branch'}${t.wantAction ? ' / ' + t.wantAction : ''} — ${t.why}`);
}
console.log(`\nRESULT: ${pass}/${T.length} Tempt-branch scenarios ${pass === T.length ? '✓ PASS — Tempt = pivot-at-current-beat; immutability = no-retroactive, both free from the engine' : '✗ FAIL'}`);
process.exit(pass === T.length ? 0 : 1);
