// GOLDEN-SCENARIO regression suite (Roman's 3 canonical divergences) against the Logan REFERENCE graph.
// Permanent benchmark: the causal engine must produce these exact outcomes forever. Pure (no LLM) — it feeds
// the EXPECTED delta (what the classifier produces; separately verified live) into the resolver.
const C = require('./core');
const G = require('../../docs/logan-reference-graph.json');
const init = {}; G.stateVariables.forEach(v => { init[v.id] = !!v.initiallyTrue; });

const SCEN = [
  { name: 'S1  unsheathe claws + slaughter the gang', cursor: 1, delta: { claws_sheathed: false, rent_deadline_active: false }, wantAction: 'pivot',
    why: 'the vow is whole_story — breaking it makes every canon beat unreachable; the story leaves canon entirely' },
  { name: 'S2  pay the rent in full',                 cursor: 1, delta: { rent_deadline_active: false },                     wantAction: 'skip',
    why: 'the deadline is a LOCAL pressure — its beat is skipped (world-clocked) but the road/murder/revenge spine survives' },
  { name: 'S3  stand still and endure',               cursor: 1, delta: {},                                                  wantAction: 'advance',
    why: 'nothing causal changed → the canon simply proceeds' },
];

let pass = 0;
for (const s of SCEN) {
  const r = C.resolveCanonProgress({ cursor: s.cursor, stateDelta: s.delta, graph: G, varState: init });
  const ok = r.action === s.wantAction;
  if (ok) pass++;
  console.log(`  ${ok ? '✓' : '✗ FAIL'}  ${s.name}  →  ${r.action}` + (ok ? '' : `  (wanted ${s.wantAction})`) + (r.worldClock && r.worldClock.length ? `  world-clock:[${r.worldClock}]` : '') + (r.nextBeat ? `  next:b${r.nextBeat}` : ''));
  if (!ok) console.log(`         expected because: ${s.why}`);
}

// Reference-graph health metrics (the numbers to benchmark future generators against).
const meta = C.varMetaMap(G);
const consumers = {}; G.beats.forEach(b => (b.dependsOn || []).forEach(d => { consumers[d.variable] = (consumers[d.variable] || 0) + 1; }));
const nVars = G.stateVariables.length;
const avgConf = (G.stateVariables.reduce((a, v) => a + (v.confidence || 0), 0) / nVars).toFixed(2);
const avgCons = (Object.values(consumers).reduce((a, n) => a + n, 0) / nVars).toFixed(1);
const kinds = { state: 0, role: 0, event: 0 }; G.stateVariables.forEach(v => kinds[C.kindOf(meta, v.id)]++);
console.log(`\n  [REFERENCE METRICS] vars=${nVars} (state ${kinds.state}·role ${kinds.role}·event ${kinds.event}) · avgConf=${avgConf} · avgConsumers=${avgCons} · beats=${G.beats.length}`);
console.log(`\nRESULT: ${pass}/${SCEN.length} golden scenarios ${pass === SCEN.length ? '✓ PASS' : '✗ FAIL'}`);
process.exit(pass === SCEN.length ? 0 : 1);
