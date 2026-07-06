// Proof of the STATE/ROLE/EVENT causal engine — type is intrinsic to the variable; EVENT is immutable.
const C = require('./core');

const GRAPH = {
  stateVariables: [
    { id: 'logan_refuses_violence', kind: 'state', initiallyTrue: true,  confidence: 0.98 },
    { id: 'rent_deadline_active',   kind: 'state', initiallyTrue: false, confidence: 0.95 },
    { id: 'journey_started',        kind: 'state', initiallyTrue: false, confidence: 0.99 },
    { id: 'family_alive',           kind: 'state', initiallyTrue: true,  confidence: 0.95 },
    { id: 'family_murdered',        kind: 'event', initiallyTrue: false, confidence: 0.95 },  // EVENT — immutable once true
    { id: 'prisoner_x_alive',       kind: 'state', initiallyTrue: true,  confidence: 0.70 },
    { id: 'guide',                  kind: 'role',  initiallyTrue: true,  confidence: 0.95, unique: false,
      preserve: ['a companion who needs Logan'], successors: ['another survivor who needs escort', 'a dying messenger'] },
    { id: 'final_antagonist',       kind: 'role',  initiallyTrue: true,  confidence: 0.93, unique: 'maybe',
      preserve: ['fascist inheritor of the American myth'], successors: ['a surviving lieutenant (Zemo)', 'an heir or clone'] },
    { id: 'the_rivalry',            kind: 'role',  initiallyTrue: true,  confidence: 0.9,  unique: true,
      preserve: ['the personal reckoning that IS this story'] },
    { id: 'logan_smiled',           kind: 'state', initiallyTrue: true,  confidence: 0.30 },  // low-confidence → prune
    { id: 'logan_wears_hat',        kind: 'state', initiallyTrue: true,  confidence: 0.90 },  // no consumer → prune
  ],
  beats: [
    { beatIndex: 1, act: 1, produces: ['rent_deadline_active'], dependsOn: [{ variable: 'logan_refuses_violence', reason: 'a standoff not a bloodbath' }] },
    { beatIndex: 2, act: 1, produces: [], dependsOn: [{ variable: 'rent_deadline_active', reason: 'the deadline is the pressure' }, { variable: 'logan_smiled', reason: 'mood' }] },
    { beatIndex: 3, act: 1, produces: ['journey_started'], dependsOn: [{ variable: 'logan_refuses_violence', reason: 'recruited because he would not fight' }, { variable: 'guide', reason: 'the guide brings him onto the road' }] },
    { beatIndex: 4, act: 2, produces: [], dependsOn: [{ variable: 'journey_started', reason: 'no road, no scene' }] },
    { beatIndex: 5, act: 2, produces: [], dependsOn: [{ variable: 'journey_started', reason: 'on the road' }, { variable: 'prisoner_x_alive', reason: 'cannot rescue a dead prisoner' }] }, // side rescue
    { beatIndex: 6, act: 2, produces: [], dependsOn: [{ variable: 'journey_started', reason: 'road beat' }] },
    { beatIndex: 7, act: 3, produces: ['family_murdered'], dependsOn: [{ variable: 'journey_started', reason: 'he returns home' }, { variable: 'family_alive', reason: 'you can only murder the living' }] },
    { beatIndex: 8, act: 3, produces: [], dependsOn: [{ variable: 'family_murdered', reason: 'the revenge needs the murder' }, { variable: 'final_antagonist', reason: 'someone to take revenge on' }, { variable: 'the_rivalry', reason: 'the reckoning that is the story' }] },
  ],
};

let pass = 0, total = 0;
const eq = (n, got, want) => { total++; const ok = JSON.stringify(got) === JSON.stringify(want); if (ok) pass++; console.log(`  ${ok ? '✓' : '✗ FAIL'}  ${n}` + (ok ? '' : `\n        got=${JSON.stringify(got)}\n       want=${JSON.stringify(want)}`)); };
const init = {}; GRAPH.stateVariables.forEach(v => { init[v.id] = v.initiallyTrue; });

// PRUNE
const pr = C.pruneStateVariables(GRAPH);
eq('prune texture (no consumer)', pr.prunedNoConsumer, ['logan_wears_hat']);
eq('prune low-confidence', pr.prunedLowConfidence, ['logan_smiled']);

// STATE break → gates reachability. Kill the gang: breaks logan_refuses_violence AND rent_deadline_active
// (dead collectors, no deadline) → b2 and b3 both die → journey never starts → whole spine collapses → pivot.
eq('STATE break collapses spine → pivot', C.resolveCanonProgress({ cursor: 1, stateDelta: { logan_refuses_violence: false, rent_deadline_active: false }, graph: GRAPH, varState: init }).action, 'pivot');

// STATE break of a side beat → skip, spine continues.
const mid = Object.assign({}, init, { rent_deadline_active: true, journey_started: true });
const letDie = C.resolveCanonProgress({ cursor: 4, stateDelta: { prisoner_x_alive: false }, graph: GRAPH, varState: mid });
eq('STATE side break → skip', letDie.action, 'skip');
eq('STATE side break → advance to surviving beat 6', letDie.nextBeat, 6);

// ROLE break, unique:false → repair (guide substitutes).
const killGuide = C.resolveCanonProgress({ cursor: 2, stateDelta: { guide: false }, graph: GRAPH, varState: Object.assign({}, init, { rent_deadline_active: true }) });
eq('ROLE break (guide, unique:false) → repair', killGuide.action, 'repair');
eq('repair carries successor ladder', killGuide.repairs[0].successors.length > 0, true);

// ROLE break, unique:maybe → fork (antagonist vacuum).
const preClimax = Object.assign({}, init, { journey_started: true, family_alive: false, family_murdered: true });
const killAntag = C.resolveCanonProgress({ cursor: 7, stateDelta: { final_antagonist: false }, graph: GRAPH, varState: preClimax });
eq('ROLE break (final_antagonist, maybe) → fork', killAntag.action, 'fork');

// ROLE break, unique:true → pivot (the rivalry cannot be replaced).
const killRivalry = C.resolveCanonProgress({ cursor: 7, stateDelta: { the_rivalry: false }, graph: GRAPH, varState: preClimax });
eq('ROLE break (the_rivalry, unique:true) → pivot', killRivalry.action, 'pivot');

// EVENT IMMUTABILITY — once family_murdered is true, a delta cannot un-happen it.
const afterMurder = Object.assign({}, init, { journey_started: true, family_murdered: true, family_alive: false });
const unmurder = C.resolveCanonProgress({ cursor: 7, stateDelta: { family_murdered: false }, graph: GRAPH, varState: afterMurder });
eq('EVENT is immutable — family_murdered stays true', unmurder.varState.family_murdered, true);

// EVENT produced EARLY — player kills the family before beat 7. b7 (needs family_alive) dies, but the event is
// produced, so b8 (needs family_murdered) survives → skip b7, continue to the reckoning.
const earlyKill = C.resolveCanonProgress({ cursor: 6, stateDelta: { family_alive: false, family_murdered: true }, graph: GRAPH, varState: Object.assign({}, init, { journey_started: true }) });
eq('EVENT early → skip the canonical murder beat', earlyKill.action, 'skip');
eq('EVENT early → the reckoning (b8) still reachable', earlyKill.nextBeat, 8);

// canon action → no delta → advance.
eq('delta=none → advance', C.resolveCanonProgress({ cursor: 1, stateDelta: {}, graph: GRAPH, varState: init }).action, 'advance');

// DETERMINISM
const runs = Array.from({ length: 50 }, () => C.resolveCanonProgress({ cursor: 7, stateDelta: { final_antagonist: false }, graph: GRAPH, varState: preClimax }).action);
eq('same input × 50 → one label', new Set(runs).size, 1);

console.log(`\nRESULT: ${pass}/${total} ${pass === total ? '✓ ALL PASS — state gates, roles substitute, events are immutable' : '✗ FAILURES'}`);
process.exit(pass === total ? 0 : 1);
