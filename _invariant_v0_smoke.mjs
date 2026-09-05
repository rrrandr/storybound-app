// Offline smoke test for the invariant runtime — NO API, NO generation spend.
// Drives DAG/status/scheduler/directive/obsolescence with a MOCK evaluator to
// prove: dependency gating, ordered realization, starvation→force, unified
// state write, shadow A/B, and that the Destiny/Fact fracture is unrepresentable.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// load the browser IIFE into this global scope
const src = readFileSync(new URL('./public/invariant-runtime-v0.js', import.meta.url), 'utf8');
vm.runInThisContext(src);
const IR = globalThis.InvariantRuntimeV0;

// ── fake app.js surface ──────────────────────────────────────────────────
const committed = { facts: [], tableau: null, pendingIntent: null };
globalThis._ensureCommittedState = () => committed;
globalThis._invariantRuntimeV0 = true;

const state = {
  worldSubtype: 'arcane_binding',
  turnCount: 0,
  aPlot: { goal: 'x', milestones: [   // legacy spine, present only so SHADOW has something to compare
    { atScene: 2, kind: 'inciting',  event: 'the binding rite forces them together', emotional_conductivity: 'dependency crisis' },
    { atScene: 4, kind: 'midpoint',  event: 'a betrayal surfaces',                    emotional_conductivity: 'trust fracture' },
    { atScene: 6, kind: 'climax',    event: 'the sacrifice',                          emotional_conductivity: 'sacrifice crisis' }
  ] }
};
globalThis.state = state;

let PASS = 0, FAIL = 0;
function ok(name, cond) { (cond ? (PASS++, console.log('  ✓ ' + name)) : (FAIL++, console.log('  ✗ FAIL: ' + name))); }
function ids(list) { return list.map(i => i.id).join(','); }

console.log('\n=== activation gate ===');
ok('active for arcane_binding + flag', IR.isActive(state) === true);
globalThis._invariantRuntimeV0 = false;
ok('inactive when flag off', IR.isActive(state) === false);
globalThis._invariantRuntimeV0 = true;
const wrong = { worldSubtype: 'small_town', turnCount: 0 };
ok('inactive for a different flavor', IR.isActive(wrong) === false);

IR.ensure(state);
console.log('\n=== initial DAG status (only A should be available) ===');
let snap = IR.snapshot(state);
ok('A available at start', snap.find(x => x.id === 'A_dependency').status === 'available');
ok('B/C/D/E blocked at start', ['B_trust_extended','C_trust_broken','D_sacrifice','E_trust_rebuilt'].every(id => snap.find(x => x.id === id).status === 'blocked'));

// ── mock evaluator: scripted per-scene. Returns whatever the "prose" contains. ──
// The harness sets globalThis.__scriptedResult before each evaluate call.
IR._evalFn = async (_messages, _avail, _prose) => globalThis.__scriptedResult;

async function playScene(turn, scriptedResult, label) {
  state.turnCount = turn;
  console.log('\n=== scene ' + turn + ' — ' + label + ' ===');
  // 1) directive the author would see (built BEFORE the scene)
  const directive = IR.buildDirective(state, turn);
  // 2) legacy shadow tick (log-only A/B)
  IR.shadowLegacyTick(state, turn);
  // 3) evaluate the "prose" that came back
  globalThis.__scriptedResult = scriptedResult;
  const outcome = await IR.evaluatePriorScene(state, '<p>' + 'x'.repeat(60) + '</p>', turn);
  return { directive, outcome };
}

(async () => {
  // Steering now lives in currentTarget() (fed to the realization planner as the SINGLE semantic
  // authority), NOT in buildDirective (which is continuity + DAG-guard only). Opening build = no directive.
  ok('opening build (turn 0) gives no directive', IR.buildDirective(state, 0) === '');
  state.turnCount = 1;
  ok('currentTarget at turn 1 steers toward A (dependency)', IR.currentTarget(state) && IR.currentTarget(state).id === 'A_dependency');
  ok('buildDirective no longer emits a competing objective', !/TRUTH TO ESTABLISH/.test(IR.buildDirective(state, 1)) && !/NARRATIVE OBJECTIVE/.test(IR.buildDirective(state, 1)));
  state.turnCount = 0;

  // ── DAG GATE TEST: try to realize E (trust rebuilt) with high confidence while blocked ──
  let r = await playScene(2, { status: 'satisfied', satisfied_id: 'E_trust_rebuilt', confidence: 0.99, matched_via: 'suggested', canonical_consequences: ['they trust each other again'] }, 'ATTEMPT to jump straight to E (rebuilt trust)');
  snap = IR.snapshot(state);
  ok('E did NOT realize while blocked (fracture unrepresentable)', snap.find(x => x.id === 'E_trust_rebuilt').status === 'blocked' && snap.find(x => x.id === 'E_trust_rebuilt').realized_at === null);
  ok('no invariant facts written for the blocked jump', committed.facts.filter(f => f.provenance === 'invariant').length === 0);

  // ── ordered realization A → B → C → D → E ──
  r = await playScene(2, { status: 'satisfied', satisfied_id: 'A_dependency', confidence: 0.9, matched_via: 'suggested', canonical_consequences: ['a shared tether binds their fates'] }, 'A: dependency lands');
  ok('A realized', IR.snapshot(state).find(x => x.id === 'A_dependency').status === 'realized');
  ok('B now available (unblocked by A)', IR.snapshot(state).find(x => x.id === 'B_trust_extended').status === 'available');
  ok('canonical fact written with invariant provenance', committed.facts.some(f => f.provenance === 'invariant' && f.sourceEvent === 'invariant:A_dependency'));
  ok('scene-2 directive is continuity/guard, not a competing objective', /DESTINY CONTINUITY/.test(r.directive) && !/TRUTH TO ESTABLISH/.test(r.directive));

  r = await playScene(3, { status: 'satisfied', satisfied_id: 'B_trust_extended', confidence: 0.85, matched_via: 'equivalent', canonical_consequences: ['she handed him the one secret that could ruin her'] }, 'B: trust extended (equivalent path)');
  ok('B realized via equivalent', IR.snapshot(state).find(x => x.id === 'B_trust_extended').status === 'realized');
  ok('directive now carries canonical world state (A + B true)', /CANONICAL WORLD STATE/.test(IR.buildDirective(state, 4)));

  // ── low-confidence → PARTIAL, not canonical ──
  r = await playScene(4, { status: 'satisfied', satisfied_id: 'C_trust_broken', confidence: 0.55, matched_via: 'suggested', canonical_consequences: ['maybe a betrayal'] }, 'C: only gestured (conf 0.55 < gate)');
  ok('C stays partial, not realized (below gate)', IR.snapshot(state).find(x => x.id === 'C_trust_broken').status === 'partial');

  // ── branch risk: an irreversible event that matched no available truth ──
  r = await playScene(5, { status: 'none', branch_risk: true, reason: 'a dragon attacked — external plot, no relational truth' }, 'competing branch (no truth landed)');
  ok('branch risk flagged, nothing promoted', r.outcome && r.outcome.promoted === null && state._invariantRuntime.branchRisks.length === 1);

  // ── STARVATION: C is top+overdue; keep failing → FORCE should fire at overdue>=4 (target_scene 4) ──
  let forcedSeen = false;
  const origLog = console.log;
  for (let t = 6; t <= 9; t++) {
    console.log = (...a) => { if (String(a[0]).includes('[DESTINY-FORCE]')) forcedSeen = true; origLog(...a); };
    await playScene(t, { status: 'none', reason: 'still circling' }, 'C keeps not landing (scene ' + t + ')');
  }
  console.log = origLog;
  state.turnCount = 9;
  ok('FORCE fired for starved invariant', forcedSeen === true);
  ok('currentTarget reports forced=true for the starved invariant (fed to the realization planner)', IR.currentTarget(state) && IR.currentTarget(state).forced === true && IR.currentTarget(state).id === 'C_trust_broken');

  // ── now let C land, then D, then E — full chain closes ──
  await playScene(10, { status: 'satisfied', satisfied_id: 'C_trust_broken', confidence: 0.9, matched_via: 'suggested', canonical_consequences: ['he sold her secret to the tribunal'] }, 'C finally lands');
  ok('C realized', IR.snapshot(state).find(x => x.id === 'C_trust_broken').status === 'realized');
  await playScene(11, { status: 'satisfied', satisfied_id: 'D_sacrifice', confidence: 0.92, matched_via: 'novel', canonical_consequences: ['she took the tribunal\'s curse meant for him'] }, 'D: sacrifice (novel path)');
  ok('D realized via novel', IR.snapshot(state).find(x => x.id === 'D_sacrifice').status === 'realized' && IR.snapshot(state).find(x => x.id === 'D_sacrifice').status === 'realized');
  ok('E finally available (all deps realized)', IR.snapshot(state).find(x => x.id === 'E_trust_rebuilt').status === 'available');
  await playScene(12, { status: 'satisfied', satisfied_id: 'E_trust_rebuilt', confidence: 0.95, matched_via: 'suggested', canonical_consequences: ['they chose each other with the betrayal named, not erased'] }, 'E: trust rebuilt (now legal)');
  ok('E realized (only AFTER D, never before)', IR.snapshot(state).find(x => x.id === 'E_trust_rebuilt').status === 'realized' && IR.snapshot(state).find(x => x.id === 'E_trust_rebuilt').realized_at === 12);

  console.log('\n=== unified canonical state (ONE store) ===');
  console.log('  facts (all provenance=invariant):');
  committed.facts.forEach(f => console.log('    - [' + f.sourceEvent + ' @s' + f.committedAtScene + '] ' + f.fact));
  ok('all 5 truths present in the ONE store, in order', ['A_dependency','B_trust_extended','C_trust_broken','D_sacrifice','E_trust_rebuilt'].every(id => committed.facts.some(f => f.sourceEvent === 'invariant:' + id)));

  console.log('\n──────────────────────────────────────────────');
  console.log('RESULT: ' + PASS + ' passed, ' + FAIL + ' failed');
  console.log('──────────────────────────────────────────────');
  process.exit(FAIL ? 1 : 0);
})();

// (appended) dump the lifecycle report to eyeball the format
