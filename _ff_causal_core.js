// FF causal-dependency core — deterministic replacement for the 3-class canon classifier. Pure functions.
//
// A canon story is a producer/consumer graph over VARIABLES, each intrinsically one of THREE kinds:
//   STATE — a boolean world fact that can flip (family_alive, journey_started, rent_deadline_active). GATES beats.
//   ROLE  — a substitutable position (guide, final_antagonist, love_interest). A break → REPAIR/FORK/PIVOT by
//           `unique`, inheriting the RELATIONSHIP (preserve) not the identity. Does NOT gate reachability.
//   EVENT — a historical fact, IMMUTABLE once true (family_murdered, bridge_destroyed). Gates beats; can only
//           go false→true (it happens), never true→false (you can't un-happen history).
//
//   stateVariables: [{ id, text, initiallyTrue, confidence, kind:'state'|'role'|'event',
//                      unique?, preserve?, successors? }]   // unique/preserve/successors: ROLE only
//   beats: [{ beatIndex, act, produces:[varId], obligations:{must,should}, dependsOn:[{variable, reason}] }]
//
// Consequence is PURE graph state: advance / advance-colored / repair / fork / skip(→world-clock) / pivot.

var MIN_CONFIDENCE = 0.5;

function varMetaMap(graph) { var m = {}; (graph.stateVariables || []).forEach(function (v) { if (v && v.id) m[v.id] = v; }); return m; }
function kindOf(meta, id) { var v = meta[id]; var k = v && v.kind; if (k === 'role' || k === 'functional') return 'role'; if (k === 'event') return 'event'; return 'state'; } // legacy functional→role, else state
function depVar(d) { return (d && typeof d === 'object') ? d.variable : d; }
function depReason(d) { return (d && typeof d === 'object' && d.reason) ? String(d.reason) : ''; }
function gatingDeps(beat, meta) { return (beat.dependsOn || []).filter(function (d) { return kindOf(meta, depVar(d)) !== 'role'; }); } // state|event gate
function roleDeps(beat, meta) { return (beat.dependsOn || []).filter(function (d) { return kindOf(meta, depVar(d)) === 'role'; }); }

// (1) PRUNE — no consumer = texture; low confidence = adaptation artifact.
function pruneStateVariables(graph) {
  var consumed = {}; (graph.beats || []).forEach(function (b) { (b.dependsOn || []).forEach(function (d) { consumed[depVar(d)] = true; }); });
  var kept = [], noConsumer = [], lowConf = [];
  (graph.stateVariables || []).forEach(function (v) {
    if (!consumed[v.id]) { noConsumer.push(v.id); return; }
    if (typeof v.confidence === 'number' && v.confidence < MIN_CONFIDENCE) { lowConf.push(v.id); return; }
    kept.push(v);
  });
  return { stateVariables: kept, prunedNoConsumer: noConsumer, prunedLowConfidence: lowConf };
}

// (2) HALF-LIFE — a variable expires after its last consumer beat.
function varExpiresAfterBeat(varId, graph) { var last = 0; (graph.beats || []).forEach(function (b) { (b.dependsOn || []).forEach(function (d) { if (depVar(d) === varId && b.beatIndex > last) last = b.beatIndex; }); }); return last; }
function liveVarsAt(cursor, graph) { var live = {}; (graph.beats || []).forEach(function (b) { if (b.beatIndex >= cursor) (b.dependsOn || []).forEach(function (d) { live[depVar(d)] = true; }); }); return Object.keys(live); }

// (3) REACHABILITY — over GATING (state|event) deps only; ROLE breaks don't block (they repair). Fixpoint.
function computeReachableAfter(cursor, graph, varState) {
  var meta = varMetaMap(graph);
  var ahead = (graph.beats || []).filter(function (b) { return b.beatIndex > cursor; }).sort(function (a, b) { return a.beatIndex - b.beatIndex; });
  var reachable = {}; ahead.forEach(function (b) { reachable[b.beatIndex] = true; });
  var changed = true;
  while (changed) {
    changed = false;
    var achievable = {}; Object.keys(varState).forEach(function (id) { if (varState[id] === true) achievable[id] = true; });
    ahead.forEach(function (b) { if (reachable[b.beatIndex]) (b.produces || []).forEach(function (id) { achievable[id] = true; }); });
    ahead.forEach(function (b) { if (reachable[b.beatIndex] && !gatingDeps(b, meta).every(function (d) { return achievable[depVar(d)]; })) { delete reachable[b.beatIndex]; changed = true; } });
  }
  return { reachable: reachable, ahead: ahead, meta: meta };
}

// (4) CONSEQUENCE — takes the STATE DELTA the turn produced. EVENT immutability enforced (a true event can't
// be set false). advance / advance-colored / repair / fork / skip / pivot, all pure.
function resolveCanonProgress(opts) {
  var cursor = opts.cursor, graph = opts.graph, delta = opts.stateDelta || {};
  var meta = varMetaMap(graph);
  var vs = Object.assign({}, opts.varState);
  var applied = {};
  Object.keys(delta).forEach(function (k) {
    if (kindOf(meta, k) === 'event' && vs[k] === true && delta[k] === false) return; // immutable: can't un-happen
    vs[k] = delta[k]; applied[k] = delta[k];
  });
  // The CURRENT beat is completing this turn → its canonical outputs now exist (so downstream reachability
  // sees them), UNLESS the player's delta explicitly falsified that output (e.g. prevented the produced event).
  var _cur = (graph.beats || []).filter(function (b) { return Number(b.beatIndex) === cursor; })[0];
  if (_cur) (_cur.produces || []).forEach(function (id) { if (delta[id] !== false) vs[id] = true; });
  var res = computeReachableAfter(cursor, graph, vs), ahead = res.ahead, reachable = res.reachable;
  if (!ahead.length) return { action: 'exhausted', nextBeat: null, repairs: [], worldClock: [], varState: vs };
  var reachableAhead = ahead.filter(function (b) { return reachable[b.beatIndex]; });
  var deadAhead = ahead.filter(function (b) { return !reachable[b.beatIndex]; }).map(function (b) { return b.beatIndex; });
  var changed = Object.keys(applied).length > 0;
  if (!reachableAhead.length) return { action: 'pivot', nextBeat: null, repairs: [], worldClock: deadAhead, historyRewritten: true, varState: vs };

  var next = reachableAhead[0];
  var brokenRoles = roleDeps(next, meta).filter(function (d) { return vs[depVar(d)] === false; });
  var repairs = brokenRoles.map(function (d) { var v = meta[depVar(d)] || {}; return { variable: depVar(d), function: depReason(d), unique: v.unique, preserve: v.preserve || [], successors: v.successors || [] }; });
  var hasUnique = brokenRoles.some(function (d) { var v = meta[depVar(d)] || {}; return v.unique === true; });
  var hasMaybe = brokenRoles.some(function (d) { var v = meta[depVar(d)] || {}; return v.unique === 'maybe'; });

  var action;
  if (hasUnique) action = 'pivot';
  else if (hasMaybe) action = 'fork';
  else if (deadAhead.length) action = 'skip';
  else if (repairs.length) action = 'repair';
  else if (changed) action = 'advance-colored';
  else action = 'advance';
  return { action: action, nextBeat: action === 'pivot' ? null : next.beatIndex, repairs: repairs, worldClock: deadAhead, historyRewritten: action === 'pivot', varState: vs };
}

// (5) FIDELITY METRIC — "broken" = a variable that started true and the run turned false (loss/rewrite).
function canonFidelity(graph, varState) {
  var meta = varMetaMap(graph), kept = pruneStateVariables(graph).stateVariables;
  var initTrue = {}; kept.forEach(function (v) { initTrue[v.id] = !!v.initiallyTrue; });
  var gate = {}, role = {};
  (graph.beats || []).forEach(function (b) { (b.dependsOn || []).forEach(function (d) { (kindOf(meta, depVar(d)) === 'role' ? role : gate)[depVar(d)] = true; }); });
  var broken = function (id) { return initTrue[id] === true && varState[id] === false; };
  var frac = function (ids) { var a = Object.keys(ids); if (!a.length) return 1; return 1 - a.filter(broken).length / a.length; };
  var all = kept.map(function (v) { return v.id; });
  return { statePreserved: +frac(gate).toFixed(3), rolePreserved: +frac(role).toFixed(3), playerRewrote: +(all.length ? all.filter(broken).length / all.length : 0).toFixed(3) };
}

module.exports = { MIN_CONFIDENCE, pruneStateVariables, varExpiresAfterBeat, liveVarsAt, computeReachableAfter, resolveCanonProgress, canonFidelity, varMetaMap, kindOf };
